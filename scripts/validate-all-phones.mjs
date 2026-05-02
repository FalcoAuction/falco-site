#!/usr/bin/env node
/**
 * One-shot: run Twilio Lookup on every bot lead with a phone number,
 * store the result in phone_metadata. Tells us per number:
 *   - is it a real number (valid)
 *   - line type (mobile / landline / voip)
 *   - carrier
 *
 * Cost: $0.005 per lookup. ~$0.50 for 100 numbers. Free at the start
 * (Twilio gives free trial credit).
 *
 * Usage:
 *   TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/validate-all-phones.mjs [--dry-run]
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// Inline env-file parser — same as other scripts. Strips quotes + bug \n.
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

const SID = env("TWILIO_ACCOUNT_SID")
const TOKEN = env("TWILIO_AUTH_TOKEN")
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const DRY = process.argv.includes("--dry-run")

if (!SID || !TOKEN) {
  console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE creds")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

async function lookup(rawNumber) {
  // Normalize to E.164 — assume US for 10-digit, prepend +1
  const digits = String(rawNumber).replace(/\D/g, "")
  if (digits.length < 10) return { valid: false, reason: "too_short" }
  const e164 =
    digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+${digits}`

  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString("base64")
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { valid: false, reason: `http_${res.status}`, raw: body.slice(0, 200) }
  }
  const json = await res.json()
  const lti = json.line_type_intelligence || {}
  return {
    valid: true,
    line_type: lti.type || "unknown",
    carrier_name: lti.carrier_name || null,
    country_code: json.country_code || null,
    mobile_country_code: lti.mobile_country_code || null,
    mobile_network_code: lti.mobile_network_code || null,
    checked_at: new Date().toISOString(),
  }
}

const { data: leads, error } = await supabase
  .from("homeowner_requests")
  .select("id, pipeline_lead_key, property_address, phone")
  .eq("source", "bot")
  .not("phone", "is", null)
  .not("phone", "eq", "")
  .order("property_value", { ascending: false, nullsFirst: false })

if (error) {
  console.error("Lead fetch failed:", error.message)
  process.exit(1)
}

console.log(`Validating ${leads.length} phones${DRY ? " (DRY RUN)" : ""}...\n`)

const buckets = { mobile: 0, landline: 0, voip: 0, fixedVoip: 0, nonFixedVoip: 0, invalid: 0, other: 0 }
const results = []

for (const lead of leads) {
  process.stdout.write(`${lead.phone.padEnd(14)} ${lead.property_address?.slice(0, 50).padEnd(52)} `)
  let result
  try {
    result = await lookup(lead.phone)
  } catch (err) {
    result = { valid: false, reason: "exception", error: String(err) }
  }
  const tag = result.valid ? (result.line_type || "valid") : `INVALID(${result.reason})`
  console.log(tag, result.carrier_name ? `· ${result.carrier_name}` : "")

  // Bucket
  if (!result.valid) buckets.invalid++
  else if (result.line_type === "mobile") buckets.mobile++
  else if (result.line_type === "landline") buckets.landline++
  else if (result.line_type === "voip") buckets.voip++
  else if (result.line_type === "fixedVoip") buckets.fixedVoip++
  else if (result.line_type === "nonFixedVoip") buckets.nonFixedVoip++
  else buckets.other++

  results.push({ id: lead.id, phone: lead.phone, result })

  if (!DRY) {
    const { error: upErr } = await supabase
      .from("homeowner_requests")
      .update({ phone_metadata: result })
      .eq("id", lead.id)
    if (upErr) console.warn(`  write failed: ${upErr.message}`)
  }

  // Polite pacing — Twilio rate limit is 100 req/sec but we don't need to push
  await new Promise((r) => setTimeout(r, 100))
}

console.log("\n─── Summary ───")
console.log(`Total phones validated: ${leads.length}`)
console.log(`  ✅ Mobile:        ${buckets.mobile}  (${pct(buckets.mobile, leads.length)}%) — best for SMS + cold calls`)
console.log(`  📞 Landline:      ${buckets.landline}  (${pct(buckets.landline, leads.length)}%) — usually no answer for distressed`)
console.log(`  🌐 VOIP:          ${buckets.voip + buckets.fixedVoip + buckets.nonFixedVoip}  (${pct(buckets.voip + buckets.fixedVoip + buckets.nonFixedVoip, leads.length)}%) — Google Voice / business lines`)
console.log(`  ❌ Invalid:       ${buckets.invalid}  (${pct(buckets.invalid, leads.length)}%) — never connect`)
console.log(`  ❓ Other/Unknown: ${buckets.other}  (${pct(buckets.other, leads.length)}%)`)

const usefulPct = pct(buckets.mobile, leads.length)
console.log(`\nUsable mobile rate: ${usefulPct}%`)
if (usefulPct < 30) {
  console.log("⚠️  BatchData skip-trace quality is BAD for your use case.")
  console.log("   Strongly consider switching to Endato or Skip Genie.")
} else if (usefulPct < 60) {
  console.log("⚠️  BatchData skip-trace quality is MEDIOCRE.")
  console.log("   Consider Endato as secondary source for the lower-quality leads.")
} else {
  console.log("✅ BatchData skip-trace quality is acceptable.")
  console.log("   Chris's 'disconnected' problem may be answer-rate, not number quality.")
  console.log("   Consider call-time strategy + voicemail script optimization.")
}

function pct(n, d) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}
