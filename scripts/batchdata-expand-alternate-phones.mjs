#!/usr/bin/env node
/**
 * Skip-trace expansion for MTN foreclosure-family leads that have a
 * primary phone but NO alternate_phones populated.
 *
 * Why: BatchData returns 2-5 phones per skip-trace plus relatives'
 * phones. Our audit found 84 active foreclosure-family leads (out of
 * 105) where alternate_phones is empty/null — meaning Chris/Patrick
 * have exactly one phone to try per lead. When that primary doesn't
 * pick up, there's no fallback. Expanding alternates surfaces the
 * other 1-4 phones per lead so the dialer has shots #2, #3, #4 ready.
 *
 * Companion to scripts/batchdata-rerun-incomplete-foreclosure.mjs
 * (which fills GAP leads — missing phone, missing owner, missing
 * value). This one fills DEPTH on leads that already have a primary.
 *
 * Run:
 *   node scripts/batchdata-expand-alternate-phones.mjs              # dry run
 *   node scripts/batchdata-expand-alternate-phones.mjs --apply       # write
 *   node scripts/batchdata-expand-alternate-phones.mjs --apply --limit 100
 *
 * Env: same as enrich-batchdata.mjs (FALCO_BATCHDATA_API_KEY +
 * Supabase service-role).
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// ─────────────────── Env loading (matches sibling scripts) ────────────────────

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\\n$/g, "").trim()
    out[line.slice(0, eq).trim()] = val
  }
  return out
}

const ROOT = path.resolve(process.cwd())
const VERCEL_ENV = parseEnvFile(path.join(ROOT, ".env.vercel.production"))
const LOCAL_ENV = parseEnvFile(path.join(ROOT, ".env.local"))
const BOTS_ENV = parseEnvFile(path.join(ROOT, "..", "falco-distress-bots", ".env"))
const env = (n) => process.env[n] || VERCEL_ENV[n] || LOCAL_ENV[n] || BOTS_ENV[n] || ""

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const BD_KEY = env("FALCO_BATCHDATA_API_KEY") || env("BATCHDATA_API_KEY")

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase config")
  process.exit(1)
}
if (!BD_KEY) {
  console.error("Missing FALCO_BATCHDATA_API_KEY")
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const limitIdx = args.indexOf("--limit")
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : APPLY ? 100 : 10

// BatchData skip-trace pricing — ~$0.25 per lookup.
const COST_PER_SKIPTRACE = 0.25

// ─────────────────── BatchData skip-trace ─────────────────────────────────────

const SKIPTRACE_URL = "https://api.batchdata.com/api/v1/property/skip-trace"

const ADDR_FULL = /^(?<street>.+?),\s*(?<city>[^,]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/
const ADDR_LOOSE = /^(?<street>.+?)\s+(?<city>[A-Za-z .'-]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/

function splitAddress(raw) {
  const text = (raw || "").trim().replace(/\s+/g, " ").replace(/,\s*$/, "")
  if (!text) return null
  const m1 = text.match(ADDR_FULL)
  if (m1) return { street: m1.groups.street.trim(), city: m1.groups.city.trim(), state: m1.groups.state, zip: m1.groups.zip }
  const m2 = text.match(ADDR_LOOSE)
  if (m2) return { street: m2.groups.street.trim(), city: m2.groups.city.trim(), state: m2.groups.state, zip: m2.groups.zip }
  return null
}

async function bdSkipTrace(parts, ownerName) {
  const body = { propertyAddress: parts }
  if (ownerName) body.ownerName = ownerName
  const res = await fetch(SKIPTRACE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${BD_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [body] }),
  })
  if (!res.ok) throw new Error(`skip-trace HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

/**
 * Rank phones by a composite score. Higher = better candidate.
 * Order: (not DNC) > (reachable) > (tested) > raw score.
 */
function rankPhones(phones) {
  if (!Array.isArray(phones)) return []
  return phones
    .map((p) => {
      if (typeof p !== "object" || p === null) return null
      const number = String(p.number || p.phone || "").replace(/\D/g, "")
      if (!number || number.length < 10) return null
      const score = Number(p.score) || 0
      const tested = Boolean(p.tested)
      const reachable = Boolean(p.reachable)
      const dnc = Boolean(p.dnc)
      const normalized =
        number.length === 11 && number.startsWith("1") ? number.slice(1) : number
      return {
        number: normalized,
        lineType: p.lineType || p.line_type || null,
        carrier: p.carrier || null,
        score,
        tested,
        reachable,
        dnc,
        rank: (dnc ? 0 : 1000) + (reachable ? 500 : 0) + (tested ? 100 : 0) + score,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
}

function extractSkipTrace(payload) {
  const persons = payload?.results?.persons || []
  if (!Array.isArray(persons) || persons.length === 0) return null
  const allPhones = []
  for (const person of persons) {
    const phones = person.phoneNumbers || person.phones || person.ownerPhones || []
    allPhones.push(...phones)
  }
  return { rankedPhones: rankPhones(allPhones), personCount: persons.length }
}

// ─────────────────────────────────── Main ────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

function fmtPhone(d) {
  if (!d) return "—"
  const x = String(d).replace(/\D/g, "")
  if (x.length === 10) return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`
  return x
}

const FORECLOSURE_DISTRESS = [
  "PRE_FORECLOSURE", "PREFORECLOSURE", "TRUSTEE_NOTICE",
  "LIS_PENDENS", "SOT", "NOD", "FORECLOSURE",
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes)" : "DRY RUN"}`)
  console.log(`limit: ${LIMIT}`)
  console.log(`target: active foreclosure leads with a primary phone but no alternates`)
  console.log("---")

  const today = new Date().toISOString().slice(0, 10)

  // Pull active foreclosure-family leads with primary phone present.
  // We'll filter to "no alternates" client-side since Supabase JSONB
  // array-length comparisons are awkward.
  const { data: leads, error } = await supabase
    .from("homeowner_requests")
    .select(
      "id, property_address, county, full_name, owner_name_records, " +
      "phone, alternate_phones, trustee_sale_date, distress_type"
    )
    .eq("source", "bot")
    .in("distress_type", FORECLOSURE_DISTRESS)
    .gte("trustee_sale_date", today)
    .not("phone", "is", null)
    .order("trustee_sale_date", { ascending: true })
    .limit(LIMIT * 4)

  if (error) {
    console.error("Supabase fetch:", error.message)
    process.exit(1)
  }

  // Filter to leads that lack alternates
  const candidates = leads.filter((l) => {
    if (!l.phone || !l.phone.trim()) return false
    const alts = l.alternate_phones
    if (!alts) return true
    if (!Array.isArray(alts)) return true
    return alts.length === 0
  }).slice(0, LIMIT)

  console.log(
    `fetched ${leads.length} active foreclosure leads with primary phone; ` +
    `${candidates.length} have no alternate_phones populated`
  )
  console.log("---")

  let processed = 0
  let foundAlts = 0
  let totalAltPhonesAdded = 0
  let noNew = 0
  let failed = 0
  let estCost = 0

  for (let i = 0; i < candidates.length; i++) {
    const lead = candidates[i]
    const tag = `[${i + 1}/${candidates.length}]`
    const rawAddr = lead.property_address || ""
    const parts = splitAddress(rawAddr.trim().replace(/[\r\n\t]+/g, " "))

    if (!parts) {
      console.log(`${tag} SKIP unparseable "${rawAddr}"`)
      failed++
      continue
    }

    const ownerForSt = lead.owner_name_records || lead.full_name || null
    const primaryDigits = (lead.phone || "").replace(/\D/g, "").replace(/^1/, "")

    try {
      const result = await bdSkipTrace(parts, ownerForSt)
      const extracted = extractSkipTrace(result)
      estCost += COST_PER_SKIPTRACE

      if (!extracted || extracted.rankedPhones.length === 0) {
        console.log(`${tag} ${parts.street} — no phones returned`)
        noNew++
        continue
      }

      // Exclude the existing primary; keep the rest as alternates
      const newAlts = extracted.rankedPhones.filter((p) => {
        return p.number !== primaryDigits
      })

      if (newAlts.length === 0) {
        console.log(
          `${tag} ${parts.street} — only primary returned (${extracted.rankedPhones.length} total)`
        )
        noNew++
        continue
      }

      const altPayload = newAlts.slice(0, 5).map((p) => ({
        number: p.number,
        lineType: p.lineType,
        carrier: p.carrier,
        dnc: p.dnc,
        score: p.score,
        tested: p.tested,
        reachable: p.reachable,
      }))

      console.log(
        `${tag} ${parts.street} — adding ${altPayload.length} alts: ` +
        altPayload.map((p) => fmtPhone(p.number) + (p.dnc ? "[DNC]" : "")).join(", ")
      )

      if (APPLY) {
        const { error: upErr } = await supabase
          .from("homeowner_requests")
          .update({
            alternate_phones: altPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
        if (upErr) {
          console.log(`     write FAIL: ${upErr.message}`)
          failed++
          continue
        }
        // Provenance — record each alternate phone surfaced
        try {
          await supabase.from("lead_field_provenance").insert({
            lead_id: lead.id,
            field_name: "alternate_phones",
            value: JSON.stringify(altPayload.map((p) => p.number)),
            source: "batchdata_skiptrace_alt_expansion",
            confidence: 0.8,
            metadata: {
              count: altPayload.length,
              script: "batchdata-expand-alternate-phones",
            },
          })
        } catch {}
      }
      foundAlts++
      totalAltPhonesAdded += altPayload.length
    } catch (e) {
      console.log(`     skiptrace FAIL: ${e.message}`)
      failed++
    }

    processed++
    // Polite delay — BatchData rate-limits aggressively
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log("---")
  console.log(
    `SUMMARY: processed=${processed} found_alts=${foundAlts} ` +
    `total_alt_phones_added=${totalAltPhonesAdded} no_new=${noNew} failed=${failed}`
  )
  console.log(`Estimated BatchData spend: $${estCost.toFixed(2)}`)
  if (!APPLY) console.log("(dry run — re-run with --apply to write)")
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
