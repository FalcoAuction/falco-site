#!/usr/bin/env node
/**
 * BatchData skip-trace expansion for active foreclosure leads —
 * pulls alternate phones (and relatives) so the dialer has 2-5 numbers
 * to try per homeowner instead of just one.
 *
 * The audit (2026-05-14) found 84 of 105 active foreclosure-family
 * leads have a primary phone but ZERO alternates. When the primary
 * doesn't pick up there's no fallback. BatchData skip-trace returns
 * 2-5 phones per person plus 3-5 relatives — we already extract them
 * via rankPhones() in skiptrace-batchdata.mjs but never write them.
 * This script writes them.
 *
 * Targets: active MTN foreclosure-family leads (Patrick 2026-05-14
 * locks BatchData spend to this pool only).
 *   source = 'bot'
 *   distress_type IN (PRE_FORECLOSURE | TRUSTEE_NOTICE | LIS_PENDENS
 *                     | SOT | NOD | FORECLOSURE)
 *   trustee_sale_date >= today
 *   phone IS NOT NULL (already have primary)
 *   alternate_phones is empty OR has < 2 entries (room to grow)
 *
 * Cost: ~$0.25/lead skip-trace. 84 leads = ~$21 worst-case.
 *
 * Run:
 *   node scripts/batchdata-expand-alternates-foreclosure.mjs            # dry run, 5 leads
 *   node scripts/batchdata-expand-alternates-foreclosure.mjs --apply    # apply, 84 leads
 *   node scripts/batchdata-expand-alternates-foreclosure.mjs --apply --limit 20
 *
 * Env: same as enrich-batchdata.mjs.
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// ─────────────────── Env loading ──────────────────────────────────────────

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
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : APPLY ? 100 : 5

const COST_PER_SKIPTRACE = 0.25

// ─────────────────── Address parsing ────────────────────────────────────

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

// ─────────────────── BatchData skip-trace ───────────────────────────────

const SKIPTRACE_URL = "https://api.batchdata.com/api/v1/property/skip-trace"

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

function normalizeDigits(raw) {
  const d = String(raw || "").replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) return d.slice(1)
  if (d.length === 10) return d
  return null
}

/**
 * Rank phones from a BatchData response. Higher rank = better.
 * Returns full BatchData phone records (not just the number) so we
 * can carry tested/reachable/dnc/score/lineType into alternate_phones.
 */
function extractRankedPhones(payload) {
  const persons = payload?.results?.persons || []
  if (!Array.isArray(persons) || persons.length === 0) return []
  const all = []
  for (const person of persons) {
    const phones = person.phoneNumbers || person.phones || person.ownerPhones || []
    for (const p of phones) {
      if (typeof p !== "object" || p === null) continue
      const number = normalizeDigits(p.number || p.phone)
      if (!number) continue
      all.push({
        number,
        lineType: p.lineType || p.line_type || null,
        dnc: Boolean(p.dnc),
        score: Number(p.score) || 0,
        tested: Boolean(p.tested),
        reachable: Boolean(p.reachable),
        carrier: p.carrier || null,
      })
    }
  }
  // De-dupe by number; sort by composite rank (non-DNC > reachable > tested > score)
  const byNumber = new Map()
  for (const p of all) {
    const prev = byNumber.get(p.number)
    if (!prev) {
      byNumber.set(p.number, p)
    } else {
      // Merge — keep best metadata across hits
      prev.tested = prev.tested || p.tested
      prev.reachable = prev.reachable || p.reachable
      prev.dnc = prev.dnc || p.dnc // dnc=true wins (safer)
      prev.score = Math.max(prev.score, p.score)
      prev.lineType = prev.lineType || p.lineType
      prev.carrier = prev.carrier || p.carrier
    }
  }
  const list = Array.from(byNumber.values())
  list.sort((a, b) => {
    const rankA = (a.dnc ? 0 : 1000) + (a.reachable ? 500 : 0) + (a.tested ? 100 : 0) + a.score
    const rankB = (b.dnc ? 0 : 1000) + (b.reachable ? 500 : 0) + (b.tested ? 100 : 0) + b.score
    return rankB - rankA
  })
  return list
}

// ─────────────────── Main ────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

function fmtPhone(d) {
  if (!d) return "—"
  const x = String(d).replace(/\D/g, "")
  if (x.length === 10) return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`
  return x
}

const FORECLOSURE_DISTRESS = [
  "PRE_FORECLOSURE", "PREFORECLOSURE", "TRUSTEE_NOTICE",
  "LIS_PENDENS", "SOT", "SUBSTITUTION_OF_TRUSTEE",
  "NOD", "NOTICE_OF_DEFAULT", "FORECLOSURE",
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes)" : "DRY RUN"}`)
  console.log(`limit: ${LIMIT}`)
  console.log(`target: active MTN foreclosure-family leads with primary phone, few/no alternates`)
  console.log(`cost estimate: ~$${COST_PER_SKIPTRACE.toFixed(2)}/lead`)
  console.log("---")

  const today = new Date().toISOString().slice(0, 10)

  const { data: leads, error } = await supabase
    .from("homeowner_requests")
    .select(
      "id, property_address, county, distress_type, trustee_sale_date, " +
      "full_name, owner_name_records, phone, alternate_phones"
    )
    .eq("source", "bot")
    .in("distress_type", FORECLOSURE_DISTRESS)
    .gte("trustee_sale_date", today)
    .not("phone", "is", null)
    .order("trustee_sale_date", { ascending: true })
    .limit(500)

  if (error) {
    console.error("Supabase fetch:", error.message)
    process.exit(1)
  }

  // Filter to leads with < 2 alternates (room to grow)
  const candidates = leads.filter((l) => {
    const alts = Array.isArray(l.alternate_phones) ? l.alternate_phones : []
    return alts.length < 2
  }).slice(0, LIMIT)

  console.log(`fetched ${leads.length} active foreclosure leads with phone, ${candidates.length} have <2 alternates`)
  console.log(`worst-case spend if all process: $${(candidates.length * COST_PER_SKIPTRACE).toFixed(2)}`)
  console.log("---")

  let processed = 0
  let added = 0
  let skippedNoNew = 0
  let failed = 0
  let phonesWritten = 0
  let estCost = 0

  for (let i = 0; i < candidates.length; i++) {
    const lead = candidates[i]
    const tag = `[${i + 1}/${candidates.length}]`
    const rawAddr = lead.property_address || ""
    const parts = splitAddress(rawAddr)
    if (!parts) {
      console.log(`${tag} SKIP unparseable "${rawAddr}"`)
      failed++
      continue
    }

    const owner = lead.owner_name_records || lead.full_name || null
    const primary = normalizeDigits(lead.phone)
    const existingAlts = Array.isArray(lead.alternate_phones) ? lead.alternate_phones : []
    const existingNumbers = new Set([
      ...(primary ? [primary] : []),
      ...existingAlts.map((a) => normalizeDigits(a.number)).filter(Boolean),
    ])

    try {
      const st = await bdSkipTrace(parts, owner)
      const ranked = extractRankedPhones(st)
      estCost += COST_PER_SKIPTRACE

      // New phones = ones not already in our set
      const newPhones = ranked.filter((p) => !existingNumbers.has(p.number))
      if (newPhones.length === 0) {
        console.log(`${tag} no-new ${parts.street}, ${parts.city}  (${ranked.length} returned, all already known)`)
        skippedNoNew++
        continue
      }

      // Merge: existing + new, capped at 5 alternates so payload stays sane
      const merged = [...existingAlts, ...newPhones.map((p) => ({
        number: p.number,
        lineType: p.lineType,
        dnc: p.dnc,
        score: p.score,
        tested: p.tested,
        reachable: p.reachable,
        carrier: p.carrier,
      }))].slice(0, 5)

      console.log(
        `${tag} +${newPhones.length} alts ${parts.street}, ${parts.city}  ` +
        newPhones.map((p) => `${fmtPhone(p.number)}${p.dnc ? "[DNC]" : ""}${p.lineType ? `[${p.lineType}]` : ""}`).join(", ")
      )

      if (APPLY) {
        const { error: upErr } = await supabase
          .from("homeowner_requests")
          .update({
            alternate_phones: merged,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
        if (upErr) {
          console.log(`     write FAIL: ${upErr.message}`)
          failed++
          continue
        }
        // Provenance — one row per new phone
        for (const p of newPhones) {
          try {
            await supabase.from("lead_field_provenance").insert({
              lead_id: lead.id,
              field_name: "alternate_phone",
              value: p.number,
              source: "batchdata_skiptrace_expansion",
              confidence: p.dnc ? 0.4 : (p.reachable ? 0.85 : 0.65),
              metadata: {
                line_type: p.lineType,
                dnc: p.dnc,
                reachable: p.reachable,
                tested: p.tested,
                carrier: p.carrier,
                script: "batchdata-expand-alternates-foreclosure",
              },
            })
          } catch {}
        }
        phonesWritten += newPhones.length
      }
      processed++
      added += newPhones.length
    } catch (e) {
      console.log(`${tag} FAIL: ${e.message}`)
      failed++
    }

    // Polite delay between leads
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log("---")
  console.log(`SUMMARY: processed=${processed} new_alternates_found=${added} no_new=${skippedNoNew} failed=${failed}`)
  if (APPLY) console.log(`new alternate phones written: ${phonesWritten}`)
  console.log(`Estimated BatchData spend: $${estCost.toFixed(2)}`)
  if (!APPLY) console.log("(dry run — re-run with --apply to write)")
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
