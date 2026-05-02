#!/usr/bin/env node
/**
 * Full skip-trace enrichment pass.
 *
 *   1. Re-runs BatchData skip-trace on every bot lead, capturing the
 *      FULL response (all phones, all emails, relatives, addresses).
 *   2. Validates each phone via Twilio Lookup (line type + carrier).
 *   3. Validates each email via NeverBounce (deliverable / catch-all / disposable).
 *   4. Stores the unified result in homeowner_requests.skiptrace_data
 *      JSONB column.
 *   5. Updates the legacy phone + email columns to point at the
 *      best-validated mobile + best-deliverable email so existing UI
 *      keeps working.
 *
 * Usage:
 *   node scripts/enrich-full-skiptrace.mjs [--limit=N] [--dry-run] [--only-missing]
 *
 * Cost per lead: ~$0.25 (BatchData) + ~$0.005-0.025 (Twilio for 1-5 phones)
 *                + ~$0.008-0.024 (NeverBounce for 1-3 emails) ≈ $0.27-0.30
 *
 * For 100 leads ≈ $30 worst case.
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\\n$/g, "").trim()
    out[line.slice(0, eq).trim()] = val
  }
  return out
}
const VENV = parseEnvFile(path.resolve(process.cwd(), ".env.vercel.production"))
const env = (n) => process.env[n] || VENV[n] || ""

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const BATCHDATA_KEY = env("FALCO_BATCHDATA_API_KEY") || env("BATCHDATA_API_KEY")
const TWILIO_SID = env("TWILIO_ACCOUNT_SID")
const TWILIO_TOKEN = env("TWILIO_AUTH_TOKEN")
const NEVERBOUNCE_KEY = env("NEVERBOUNCE_API_KEY")

const argLimit = (() => {
  const m = process.argv.find((a) => a.startsWith("--limit="))
  return m ? parseInt(m.split("=")[1], 10) : null
})()
const DRY = process.argv.includes("--dry-run")
const ONLY_MISSING = process.argv.includes("--only-missing")

const required = { SUPABASE_URL, SUPABASE_KEY, BATCHDATA_KEY, TWILIO_SID, TWILIO_TOKEN, NEVERBOUNCE_KEY }
for (const [k, v] of Object.entries(required)) {
  if (!v) {
    console.error(`Missing ${k}`)
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// ─── Address splitter (mirror of refresh-dialer) ────────────────────────
function splitAddress(full) {
  if (!full) return null
  // "1234 Foo St, City, ST 12345" or "1234 Foo St City ST 12345"
  const m = full.match(/^([^,]+?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5})/)
  if (m) {
    return { street: m[1].trim(), city: m[2].trim(), state: m[3], zip: m[4] }
  }
  const m2 = full.match(/^(.+?)\s+([A-Za-z .]+?)\s+([A-Z]{2})\s+(\d{5})/)
  if (m2) {
    return { street: m2[1].trim(), city: m2[2].trim(), state: m2[3], zip: m2[4] }
  }
  return null
}

// ─── BatchData ──────────────────────────────────────────────────────────
async function batchSkipTrace(parts, ownerName) {
  const url = "https://api.batchdata.com/api/v1/property/skip-trace"
  const requestBody = { propertyAddress: parts }
  if (ownerName) requestBody.ownerName = ownerName
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BATCHDATA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests: [requestBody] }),
  })
  if (!res.ok) {
    return { ok: false, status: res.status, error: await res.text().catch(() => "") }
  }
  const json = await res.json()
  return { ok: true, raw: json }
}

// ─── Twilio Lookup ──────────────────────────────────────────────────────
const twilioCache = new Map()
async function twilioValidate(rawNumber) {
  const digits = String(rawNumber).replace(/\D/g, "")
  if (digits.length < 10) return null
  const e164 = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+${digits}`
  if (twilioCache.has(e164)) return twilioCache.get(e164)
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64")
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
    if (!res.ok) {
      const result = { valid: false, reason: `http_${res.status}`, checked_at: new Date().toISOString() }
      twilioCache.set(e164, result)
      return result
    }
    const json = await res.json()
    const lti = json.line_type_intelligence || {}
    const result = {
      valid: true,
      line_type: lti.type || "unknown",
      carrier: lti.carrier_name || null,
      country_code: json.country_code || null,
      checked_at: new Date().toISOString(),
    }
    twilioCache.set(e164, result)
    return result
  } catch (err) {
    return { valid: false, reason: "exception", error: String(err), checked_at: new Date().toISOString() }
  }
}

// ─── NeverBounce ────────────────────────────────────────────────────────
const nbCache = new Map()
async function neverbounceValidate(email) {
  const e = String(email).trim().toLowerCase()
  if (!e || !e.includes("@")) return null
  if (nbCache.has(e)) return nbCache.get(e)
  // Single-check API: GET https://api.neverbounce.com/v4/single/check?key=...&email=...
  const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(NEVERBOUNCE_KEY)}&email=${encodeURIComponent(e)}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const result = { valid: false, reason: `http_${res.status}`, checked_at: new Date().toISOString() }
      nbCache.set(e, result)
      return result
    }
    const json = await res.json()
    // result: "valid"|"invalid"|"disposable"|"catchall"|"unknown"
    const result = {
      result: json.result || "unknown",
      flags: json.flags || [],
      suggested_correction: json.suggested_correction || null,
      checked_at: new Date().toISOString(),
    }
    nbCache.set(e, result)
    return result
  } catch (err) {
    return { result: "error", error: String(err), checked_at: new Date().toISOString() }
  }
}

// ─── Normalize BatchData response ───────────────────────────────────────
function normalizeBatchResponse(raw) {
  const persons = raw?.results?.persons
  if (!Array.isArray(persons)) return []
  return persons.map((p) => {
    const name = {
      first: p.name?.first || p.firstName || "",
      middle: p.name?.middle || p.middleName || "",
      last: p.name?.last || p.lastName || "",
      full: p.name?.full || p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
    }
    const phones = []
    const phArr = p.phoneNumbers || p.phones || []
    if (Array.isArray(phArr)) {
      for (const ph of phArr) {
        const digits = String(ph.number || ph.phone || "").replace(/\D/g, "")
        if (!digits || digits.length < 10) continue
        const number = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
        phones.push({
          number,
          type: ph.type || ph.phoneType || null,
          score: typeof ph.score === "number" ? ph.score : null,
          dnc: !!ph.dnc,
          reachable: !!ph.reachable,
          tested: !!ph.tested,
          date_last_seen: ph.dateLastSeen || ph.lastSeen || null,
        })
      }
    }
    const emails = []
    const emArr = p.emails || []
    if (Array.isArray(emArr)) {
      for (const em of emArr) {
        const eaddr = String(em.email || em).trim().toLowerCase()
        if (!eaddr || !eaddr.includes("@")) continue
        emails.push({
          email: eaddr,
          score: typeof em.score === "number" ? em.score : null,
          date_last_seen: em.dateLastSeen || em.lastSeen || null,
        })
      }
    }
    const addresses = []
    const adArr = p.addresses || []
    if (Array.isArray(adArr)) {
      for (const ad of adArr) {
        addresses.push({
          street: ad.street || ad.line1 || "",
          city: ad.city || "",
          state: ad.state || "",
          zip: ad.zip || ad.postalCode || "",
          type: ad.type || (ad.current ? "current" : "history"),
        })
      }
    }
    const relatives = []
    const relArr = p.relatives || p.relations || []
    if (Array.isArray(relArr)) {
      for (const rel of relArr) {
        relatives.push({
          name: rel.name?.full || rel.fullName || `${rel.firstName || ""} ${rel.lastName || ""}`.trim(),
          age: rel.age || null,
          relationship: rel.relationship || rel.type || null,
        })
      }
    }
    return {
      name,
      age: p.age || null,
      dob: p.dateOfBirth || p.dob || null,
      phones,
      emails,
      addresses,
      relatives,
    }
  })
}

// ─── Pick "best" phone + email for legacy fields ────────────────────────
function pickBestPhone(persons) {
  const all = []
  for (const p of persons) {
    for (const ph of p.phones) {
      all.push(ph)
    }
  }
  // Filter to twilio-valid mobile, dedupe by number
  const mobiles = all.filter(
    (p) =>
      p.twilio &&
      p.twilio.valid &&
      p.twilio.line_type === "mobile" &&
      !p.dnc
  )
  const sortedMobiles = mobiles.sort((a, b) => (b.score || 0) - (a.score || 0))
  if (sortedMobiles.length > 0) return sortedMobiles[0]
  // Fall back to any non-DNC, non-landline
  const fallback = all
    .filter((p) => !p.dnc && p.twilio && p.twilio.line_type !== "landline")
    .sort((a, b) => (b.score || 0) - (a.score || 0))
  if (fallback.length > 0) return fallback[0]
  // Last resort: any non-DNC
  const last = all.filter((p) => !p.dnc).sort((a, b) => (b.score || 0) - (a.score || 0))
  return last[0] || null
}

function pickBestEmail(persons) {
  const all = []
  for (const p of persons) {
    for (const em of p.emails) {
      all.push(em)
    }
  }
  // Prefer NeverBounce-valid, then catchall, then unknown
  const valid = all.filter((e) => e.neverbounce?.result === "valid")
  if (valid.length) return valid.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
  const catchall = all.filter((e) => e.neverbounce?.result === "catchall")
  if (catchall.length) return catchall.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
  const unknown = all.filter((e) => e.neverbounce?.result === "unknown")
  if (unknown.length) return unknown.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
  return all.sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null
}

// ─── Main loop ──────────────────────────────────────────────────────────
async function main() {
  let q = supabase
    .from("homeowner_requests")
    .select("id, pipeline_lead_key, property_address, full_name, owner_name_records, phone, email, skiptrace_fetched_at")
    .eq("source", "bot")
    .order("property_value", { ascending: false, nullsFirst: false })
  if (ONLY_MISSING) q = q.is("skiptrace_fetched_at", null)
  if (argLimit) q = q.limit(argLimit)

  const { data: leads, error } = await q
  if (error) {
    console.error("Lead fetch failed:", error.message)
    process.exit(1)
  }

  console.log(`Enriching ${leads.length} leads${DRY ? " (DRY RUN)" : ""}\n`)

  let totalPhones = 0
  let totalEmails = 0
  let totalRelatives = 0
  let cost = 0

  for (const [i, lead] of leads.entries()) {
    const parts = splitAddress(lead.property_address)
    if (!parts) {
      console.log(`[${i + 1}/${leads.length}] SKIP — unparsable address: ${lead.property_address}`)
      continue
    }
    const ownerName = lead.full_name || lead.owner_name_records || null
    process.stdout.write(`[${i + 1}/${leads.length}] ${parts.street}, ${parts.city} ... `)

    // 1. BatchData skip-trace
    const bd = await batchSkipTrace(parts, ownerName)
    cost += 0.25
    if (!bd.ok) {
      console.log(`BD failed (${bd.status})`)
      continue
    }
    const persons = normalizeBatchResponse(bd.raw)

    // 2. Twilio Lookup on every phone
    for (const p of persons) {
      for (const ph of p.phones) {
        ph.twilio = await twilioValidate(ph.number)
        if (ph.twilio) cost += 0.005
        await new Promise((r) => setTimeout(r, 60))
      }
    }
    // 3. NeverBounce on every email
    for (const p of persons) {
      for (const em of p.emails) {
        em.neverbounce = await neverbounceValidate(em.email)
        if (em.neverbounce) cost += 0.008
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    const phoneCount = persons.reduce((s, p) => s + p.phones.length, 0)
    const emailCount = persons.reduce((s, p) => s + p.emails.length, 0)
    const relCount = persons.reduce((s, p) => s + p.relatives.length, 0)
    totalPhones += phoneCount
    totalEmails += emailCount
    totalRelatives += relCount

    const bestPhone = pickBestPhone(persons)
    const bestEmail = pickBestEmail(persons)

    const skiptraceData = {
      provider: "batchdata",
      fetched_at: new Date().toISOString(),
      persons,
    }

    if (!DRY) {
      const update = {
        skiptrace_data: skiptraceData,
        skiptrace_fetched_at: new Date().toISOString(),
        phone_refreshed_at: new Date().toISOString(),
      }
      if (bestPhone) {
        update.phone = bestPhone.number
        update.phone_metadata = bestPhone.twilio || null
      }
      if (bestEmail && !lead.email) {
        update.email = bestEmail.email
      }
      const { error: upErr } = await supabase
        .from("homeowner_requests")
        .update(update)
        .eq("id", lead.id)
      if (upErr) {
        // If unique-constraint blocks, retry without email
        const fallback = { ...update }
        delete fallback.email
        await supabase.from("homeowner_requests").update(fallback).eq("id", lead.id)
      }
    }

    console.log(
      `${persons.length}p ${phoneCount}ph ${emailCount}em ${relCount}rel · best phone: ${bestPhone?.number || "—"} (${bestPhone?.twilio?.line_type || "?"})`
    )
  }

  console.log(`\n─── Done ───`)
  console.log(`  Leads enriched: ${leads.length}`)
  console.log(`  Phones captured: ${totalPhones}`)
  console.log(`  Emails captured: ${totalEmails}`)
  console.log(`  Relatives captured: ${totalRelatives}`)
  console.log(`  Estimated cost: $${cost.toFixed(2)}`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
