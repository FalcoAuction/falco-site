#!/usr/bin/env node
/**
 * BatchData skip-trace pass against falco-site Supabase.
 *
 * Replaces the homeowner_requests.phone field for every bot lead with the
 * highest-confidence owner phone returned by BatchData's skip-trace API.
 * Also writes email if available.
 *
 * Why: existing phones on bot leads are a mix of (a) earlier BatchData
 * skip-trace data and (b) trustee firm / lender / notice contacts scraped
 * from foreclosure PDFs. The latter are useless for homeowner outreach
 * (Chris ends up calling the law firm, not the seller). This pass
 * replaces all phone data with verified owner contacts.
 *
 * Run:
 *   node scripts/skiptrace-batchdata.mjs                # dry run, top 5
 *   node scripts/skiptrace-batchdata.mjs --apply        # apply, all leads
 *   node scripts/skiptrace-batchdata.mjs --apply --limit 10
 *
 * Env: same as enrich-batchdata.mjs.
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// -----------------------------------------------------------------------------
// Config + env
// -----------------------------------------------------------------------------

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
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : APPLY ? 200 : 5

const ESTIMATED_COST_PER_LEAD_USD = 0.25 // BatchData skip-trace typical pricing

// -----------------------------------------------------------------------------
// BatchData skip-trace API
// -----------------------------------------------------------------------------

const SKIP_TRACE_URL = "https://api.batchdata.com/api/v1/property/skip-trace"

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

/**
 * Rank phones returned by BatchData. Higher rank = better candidate.
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
      return {
        number: number.length === 11 && number.startsWith("1") ? number.slice(1) : number,
        score,
        tested,
        reachable,
        dnc,
        // composite rank: prioritize non-DNC + reachable + tested + score
        rank: (dnc ? 0 : 1000) + (reachable ? 500 : 0) + (tested ? 100 : 0) + score,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
}

function rankEmails(emails) {
  if (!Array.isArray(emails)) return []
  return emails
    .map((e) => {
      if (typeof e !== "object" || e === null) return null
      const addr = String(e.email || e.address || "").trim().toLowerCase()
      if (!addr || !addr.includes("@")) return null
      return { email: addr, score: Number(e.score) || 0 }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
}

async function skipTrace(parts, ownerName) {
  const requestBody = { propertyAddress: parts }
  if (ownerName) requestBody.ownerName = ownerName

  const res = await fetch(SKIP_TRACE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BD_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests: [requestBody] }),
  })

  if (!res.ok) {
    throw new Error(`skip-trace HTTP ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  const persons = json?.results?.persons || []
  if (!Array.isArray(persons) || persons.length === 0) {
    return null
  }

  // Aggregate phones + emails across all returned persons (BatchData sometimes
  // returns multiple person matches — owner + spouse + relatives)
  const allPhones = []
  const allEmails = []
  for (const person of persons) {
    const phones = person.phoneNumbers || person.phones || person.ownerPhones || []
    const emails = person.emails || person.emailAddresses || []
    allPhones.push(...phones)
    allEmails.push(...emails)
  }

  const rankedPhones = rankPhones(allPhones)
  const rankedEmails = rankEmails(allEmails)
  const firstPerson = persons[0] || {}
  const fullName =
    firstPerson.fullName ||
    [firstPerson.firstName, firstPerson.lastName].filter(Boolean).join(" ").trim() ||
    null

  return {
    primaryPhone: rankedPhones[0] || null,
    secondaryPhone: rankedPhones[1] || null,
    extraPhones: rankedPhones.slice(2),
    primaryEmail: rankedEmails[0]?.email || null,
    extraEmails: rankedEmails.slice(1).map((e) => e.email),
    ownerName: fullName,
    raw: { personCount: persons.length, phoneCount: allPhones.length, emailCount: allEmails.length },
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

function fmtPhone(digits) {
  if (!digits) return "—"
  const d = String(digits).replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return d
}

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes)" : "DRY RUN"}`)
  console.log(`limit: ${LIMIT}`)
  console.log(`estimated cost per lead: $${ESTIMATED_COST_PER_LEAD_USD}`)
  console.log("---")

  // Foreclosure-family gate ON by default (Patrick 2026-05-14). Pass
  // --all-distress to lift the filter.
  const ALL_DISTRESS = args.includes("--all-distress")
  const FORECLOSURE_DISTRESS = [
    "PRE_FORECLOSURE", "PREFORECLOSURE", "TRUSTEE_NOTICE",
    "LIS_PENDENS", "SOT", "SUBSTITUTION_OF_TRUSTEE",
    "NOD", "NOTICE_OF_DEFAULT", "FORECLOSURE",
  ]

  let q = supabase
    .from("homeowner_requests")
    .select("id, full_name, owner_name_records, property_address, county, phone, email, distress_type")
    .eq("source", "bot")
  if (!ALL_DISTRESS) q = q.in("distress_type", FORECLOSURE_DISTRESS)
  const { data: leads, error } = await q
    .order("submitted_at", { ascending: true })
    .limit(LIMIT)

  if (error) {
    console.error("Supabase fetch error:", error.message)
    process.exit(1)
  }

  console.log(`fetched ${leads.length} bot leads`)
  console.log(`estimated cost if all hit: $${(leads.length * ESTIMATED_COST_PER_LEAD_USD).toFixed(2)}`)
  console.log("---")

  let success = 0
  let noMatch = 0
  let skipped = 0
  let failed = 0
  let phoneAdded = 0
  let phoneReplaced = 0
  let emailAdded = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const tag = `[${i + 1}/${leads.length}]`
    const addr = lead.property_address || ""
    const parts = splitAddress(addr)
    if (!parts) {
      console.log(`${tag} SKIP no-parse "${addr}"`)
      skipped++
      continue
    }

    const ownerName = lead.owner_name_records || lead.full_name || null

    try {
      const result = await skipTrace(parts, ownerName)
      if (!result || !result.primaryPhone) {
        console.log(`${tag} NO-MATCH ${parts.street}, ${parts.city}`)
        noMatch++
        continue
      }

      const newPhone = result.primaryPhone.number
      const dncTag = result.primaryPhone.dnc ? " [DNC]" : ""
      const oldPhone = (lead.phone || "").replace(/\D/g, "")
      const phoneChange =
        oldPhone === newPhone ? "same" : oldPhone ? "REPLACE" : "ADD"

      console.log(
        `${tag} OK ${fmtPhone(newPhone)}${dncTag} (${phoneChange})` +
          (result.primaryEmail ? ` · email: ${result.primaryEmail}` : "") +
          (result.secondaryPhone ? ` · 2nd: ${fmtPhone(result.secondaryPhone.number)}` : "") +
          ` · ${parts.street}`
      )

      if (APPLY) {
        const writePayload = {
          phone: newPhone,
          updated_at: new Date().toISOString(),
        }
        if (result.primaryEmail && !lead.email) {
          writePayload.email = result.primaryEmail
        }
        if (result.ownerName && !lead.owner_name_records) {
          writePayload.owner_name_records = result.ownerName
        }

        let { error: upErr } = await supabase
          .from("homeowner_requests")
          .update(writePayload)
          .eq("id", lead.id)

        // Fallback: if a unique constraint blocked the email, retry phone-only
        if (upErr && /unique constraint|duplicate key/i.test(upErr.message)) {
          const phoneOnlyPayload = {
            phone: newPhone,
            updated_at: new Date().toISOString(),
          }
          const retry = await supabase
            .from("homeowner_requests")
            .update(phoneOnlyPayload)
            .eq("id", lead.id)
          if (retry.error) {
            console.log(`     ↳ write FAIL (phone-only retry also failed): ${retry.error.message}`)
            failed++
            continue
          }
          console.log(`     ↳ phone-only fallback OK (email skipped due to dup constraint)`)
          upErr = null
        } else if (upErr) {
          console.log(`     ↳ write FAIL: ${upErr.message}`)
          failed++
          continue
        }

        if (phoneChange === "ADD") phoneAdded++
        else if (phoneChange === "REPLACE") phoneReplaced++
        if (result.primaryEmail && !lead.email) emailAdded++
      }
      success++
    } catch (err) {
      console.log(`${tag} FAIL ${parts.street}: ${err.message}`)
      failed++
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  console.log("---")
  console.log(
    `SUMMARY: success=${success} no-match=${noMatch} skipped=${skipped} failed=${failed}`
  )
  if (APPLY) {
    console.log(`WRITES: phones-added=${phoneAdded} phones-replaced=${phoneReplaced} emails-added=${emailAdded}`)
  }
  console.log(`Estimated cost: $${(success * ESTIMATED_COST_PER_LEAD_USD).toFixed(2)}`)
  if (!APPLY) console.log("(dry run — re-run with --apply to write)")
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
