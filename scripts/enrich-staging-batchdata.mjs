#!/usr/bin/env node
/**
 * BatchData property enrichment for STAGING rows.
 *
 * Targets homeowner_requests_staging rows that have a phone (from the
 * skiptrace sweep) + an upcoming trustee sale but NO property_value —
 * the exact rows blocked at the auto-promote quality gate.
 *
 * Per row: address verify → property lookup (all-attributes) →
 * write property_value (AVM), mortgage_balance (from open-lien data
 * when present, else 80%-LTV amortization off last sale), owner name
 * if missing. Details stashed in phone_metadata.batchdata_property.
 *
 * Usage:
 *   node scripts/enrich-staging-batchdata.mjs --dry --limit=3   # inspect payloads
 *   node scripts/enrich-staging-batchdata.mjs --apply --limit=150
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    out[line.slice(0, eq).trim()] = val.replace(/\\n$/g, "").trim()
  }
  return out
}
const ROOT = path.resolve(process.cwd())
const VENV = parseEnvFile(path.join(ROOT, ".env.vercel.production"))
const LENV = parseEnvFile(path.join(ROOT, ".env.local"))
const BOTS = parseEnvFile(path.join(ROOT, "..", "falco-distress-bots", ".env"))
const env = (n) => process.env[n] || VENV[n] || LENV[n] || BOTS[n] || ""

const BATCHDATA_KEY = env("FALCO_BATCHDATA_API_KEY")
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if (!BATCHDATA_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing creds (FALCO_BATCHDATA_API_KEY / SUPABASE_URL / SERVICE_ROLE_KEY)")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const DRY = !APPLY
const LIMIT = (() => {
  const m = process.argv.find((a) => a.startsWith("--limit="))
  return m ? parseInt(m.split("=")[1], 10) : 150
})()

const VERIFY_URL = "https://api.batchdata.com/api/v1/address/verify"
const LOOKUP_URL = "https://api.batchdata.com/api/v1/property/lookup/all-attributes"

const ADDR_FULL_RE = /^(?<street>.+?),\s*(?<city>[^,]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/
const ADDR_LOOSE_RE = /^(?<street>.+?)\s+(?<city>[A-Za-z .'-]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/
function splitAddress(raw) {
  const text = (raw || "").trim().replace(/\s+/g, " ").replace(/,\s*$/, "")
  if (!text) return null
  const m1 = text.match(ADDR_FULL_RE)
  if (m1) return { street: m1.groups.street.trim(), city: m1.groups.city.trim(), state: m1.groups.state, zip: m1.groups.zip }
  const m2 = text.match(ADDR_LOOSE_RE)
  if (m2) return { street: m2.groups.street.trim(), city: m2.groups.city.trim(), state: m2.groups.state, zip: m2.groups.zip }
  return null
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${BATCHDATA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url.split("/").pop()} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

function dig(obj, ...path) {
  let cur = obj
  for (const k of path) {
    if (cur == null) return null
    cur = cur[k]
  }
  return cur
}
const intOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : null
}

// TN 30y average rates by purchase year (mirror of bots mortgage_estimator)
const RATES = {
  1995: 7.93, 1996: 7.81, 1997: 7.6, 1998: 6.94, 1999: 7.44, 2000: 8.05, 2001: 6.97,
  2002: 6.54, 2003: 5.83, 2004: 5.84, 2005: 5.87, 2006: 6.41, 2007: 6.34, 2008: 6.03,
  2009: 5.04, 2010: 4.69, 2011: 4.45, 2012: 3.66, 2013: 3.98, 2014: 4.17, 2015: 3.85,
  2016: 3.65, 2017: 3.99, 2018: 4.54, 2019: 3.94, 2020: 3.11, 2021: 2.96, 2022: 5.34,
  2023: 6.81, 2024: 6.74, 2025: 6.85, 2026: 6.5,
}
function estimateBalance(lastSalePrice, lastSaleDate) {
  if (!lastSalePrice || !lastSaleDate) return null
  const year = parseInt(String(lastSaleDate).slice(0, 4), 10)
  if (!Number.isFinite(year) || year < 1995) return null
  const principal = lastSalePrice * 0.8
  const rate = (RATES[year] ?? 6.5) / 100 / 12
  const n = 360
  const monthsElapsed = Math.max(0, Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (30.44 * 86400000)))
  if (monthsElapsed >= n) return null
  const pmt = (principal * rate) / (1 - Math.pow(1 + rate, -n))
  const bal = principal * Math.pow(1 + rate, monthsElapsed) - pmt * ((Math.pow(1 + rate, monthsElapsed) - 1) / rate)
  return bal > 1000 ? Math.round(bal) : null
}

function extract(payload) {
  const p = dig(payload, "results", "properties", 0) || {}
  const val = p.valuation || {}
  const sale = p.sale || {}
  const owner = p.owner || {}
  const avm = intOrNull(val.estimatedValue) ?? intOrNull(val.value) ?? intOrNull(val.avm)

  // Mortgage: try open-lien / mortgage structures first
  let lienBalance = null
  let lienSource = null
  const openLien = p.openLien || p.openLiens || null
  const mortgages = (openLien && (openLien.mortgages || openLien.liens)) || p.currentMortgages || p.mortgageHistory || null
  if (Array.isArray(mortgages) && mortgages.length > 0) {
    let sum = 0
    for (const m of mortgages) {
      const b =
        intOrNull(m.currentEstimatedBalance) ??
        intOrNull(m.estimatedBalance) ??
        intOrNull(m.currentBalance) ??
        intOrNull(m.amount) ??
        intOrNull(m.loanAmount)
      if (b) sum += b
    }
    if (sum > 1000) {
      lienBalance = sum
      lienSource = "BATCHDATA_OPEN_LIEN"
    }
  }
  if (!lienBalance) {
    const totalBal =
      intOrNull(dig(p, "openLien", "totalOpenLienBalance")) ??
      intOrNull(dig(p, "valuation", "ltv") ? null : null)
    if (totalBal) {
      lienBalance = totalBal
      lienSource = "BATCHDATA_OPEN_LIEN_TOTAL"
    }
  }

  const lastSalePrice = intOrNull(sale.lastSalePrice ?? sale.transferAmount)
  const lastSaleDate = sale.lastSaleDate ?? sale.transferDate ?? null
  if (!lienBalance) {
    const est = estimateBalance(lastSalePrice, lastSaleDate)
    if (est) {
      lienBalance = est
      lienSource = "LTV80_AMORTIZED"
    }
  }

  return {
    avm,
    lienBalance,
    lienSource,
    lastSalePrice,
    lastSaleDate,
    ownerName: typeof owner.fullName === "string" ? owner.fullName.trim() || null : null,
    _lienKeysSeen: Object.keys(p).filter((k) => /lien|mortgage|loan|deed/i.test(k)),
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY"} · limit ${LIMIT}`)
  const { data: rows, error } = await supabase
    .from("homeowner_requests_staging")
    .select("id, property_address, county, full_name, owner_name_records, trustee_sale_date, phone, phone_metadata, bot_source")
    .eq("staging_status", "pending")
    .is("property_value", null)
    .not("phone", "is", null)
    .gte("trustee_sale_date", new Date().toISOString().slice(0, 10))
    .order("trustee_sale_date", { ascending: true })
    .limit(LIMIT)
  if (error) {
    console.error("query failed:", error.message)
    process.exit(1)
  }
  console.log(`${rows.length} staging rows to enrich`)

  let done = 0, noAvm = 0, noMortgage = 0, addrFail = 0, apiErr = 0
  for (const row of rows) {
    const parts = splitAddress(row.property_address)
    if (!parts) {
      addrFail++
      console.log(`  ~ unparseable: ${(row.property_address || "").slice(0, 60)}`)
      continue
    }
    let payload
    try {
      const hash = await (async () => {
        const j = await post(VERIFY_URL, { requests: [parts] })
        const a = j?.results?.addresses?.[0]
        if (!a?.hash) throw new Error("no verify hash")
        return a.hash
      })()
      payload = await post(LOOKUP_URL, { requests: [{ hash }] })
    } catch (e) {
      apiErr++
      console.log(`  x ${parts.street}: ${String(e.message).slice(0, 120)}`)
      if (apiErr >= 3 && done === 0) {
        console.error("3 consecutive API errors with no successes — aborting (account-level problem?)")
        break
      }
      continue
    }

    const f = extract(payload)
    if (DRY) {
      console.log(`  DRY ${parts.street} · avm=${f.avm} · mortgage=${f.lienBalance} (${f.lienSource}) · lastSale=${f.lastSalePrice}@${f.lastSaleDate} · owner=${f.ownerName}`)
      console.log(`      lien-ish keys on property: ${JSON.stringify(f._lienKeysSeen)}`)
      done++
      continue
    }
    if (!f.avm) {
      noAvm++
      continue
    }
    if (!f.lienBalance) noMortgage++

    const pm = row.phone_metadata && typeof row.phone_metadata === "object" ? row.phone_metadata : {}
    pm.batchdata_property = {
      avm: f.avm,
      mortgage_balance: f.lienBalance,
      mortgage_source: f.lienSource,
      last_sale_price: f.lastSalePrice,
      last_sale_date: f.lastSaleDate,
      enriched_at: new Date().toISOString(),
    }
    const update = { property_value: f.avm, phone_metadata: pm }
    if (f.lienBalance) update.mortgage_balance = f.lienBalance
    if (f.ownerName && !(row.owner_name_records || "").trim()) update.owner_name_records = f.ownerName
    if (f.ownerName && !(row.full_name || "").trim()) update.full_name = f.ownerName

    const { error: uErr } = await supabase.from("homeowner_requests_staging").update(update).eq("id", row.id)
    if (uErr) {
      console.log(`  x update ${row.id}: ${uErr.message}`)
      continue
    }
    done++
    console.log(`  + ${parts.street} · $${f.avm.toLocaleString()} · mtg ${f.lienBalance ? "$" + f.lienBalance.toLocaleString() : "none"} (${f.lienSource || "-"})`)
    await new Promise((r) => setTimeout(r, 250))
  }
  console.log(`\ndone=${done} noAvm=${noAvm} noMortgage=${noMortgage} addrFail=${addrFail} apiErr=${apiErr}`)
  console.log(`est cost: $${(done * 0.2).toFixed(2)} (rough)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
