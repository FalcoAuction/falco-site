#!/usr/bin/env node
/**
 * Deepen Twilio validation on already-enriched leads.
 *
 *   - For EVERY phone: add caller_name (CNAM) lookup ($0.01/check)
 *     → tells us the registered name on the line, so we can verify
 *     it matches the homeowner.
 *   - For the TOP phone per lead: add line_status check ($0.04/check)
 *     → actually checks current connection status (vs just line type).
 *
 * Re-uses skiptrace_data already in homeowner_requests; doesn't re-call
 * BatchData. ~$10-15 total to upgrade all 101 leads.
 *
 * Usage:
 *   TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... node scripts/twilio-deepen-validation.mjs [--limit=N]
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

const SID = env("TWILIO_ACCOUNT_SID")
const TOKEN = env("TWILIO_AUTH_TOKEN")
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")

if (!SID || !TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing creds")
  process.exit(1)
}

const argLimit = (() => {
  const m = process.argv.find((a) => a.startsWith("--limit="))
  return m ? parseInt(m.split("=")[1], 10) : null
})()

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const cache = new Map()
async function lookup(rawNumber, fields) {
  const digits = String(rawNumber).replace(/\D/g, "")
  if (digits.length < 10) return { valid: false, reason: "too_short" }
  const e164 = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+${digits}`
  const cacheKey = `${e164}|${fields}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString("base64")
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=${fields}`
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
    if (!res.ok) {
      const result = { valid: false, reason: `http_${res.status}` }
      cache.set(cacheKey, result)
      return result
    }
    const json = await res.json()
    cache.set(cacheKey, json)
    return json
  } catch (err) {
    return { valid: false, reason: "exception", error: String(err) }
  }
}

function nameMatchScore(cnamName, ownerName) {
  if (!cnamName || !ownerName) return null
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
  const ct = norm(cnamName)
  const ot = norm(ownerName)
  if (!ct.length || !ot.length) return 0
  // Token overlap on non-trivial words (3+ chars)
  const ctSet = new Set(ct.filter((t) => t.length >= 3))
  const otSet = new Set(ot.filter((t) => t.length >= 3))
  let hits = 0
  for (const t of ctSet) if (otSet.has(t)) hits++
  return hits / Math.max(1, Math.min(ctSet.size, otSet.size))
}

let q = supabase
  .from("homeowner_requests")
  .select("id, pipeline_lead_key, property_address, full_name, owner_name_records, skiptrace_data")
  .eq("source", "bot")
  .not("skiptrace_data", "is", null)
  .order("property_value", { ascending: false, nullsFirst: false })
if (argLimit) q = q.limit(argLimit)

const { data: leads, error } = await q
if (error) {
  console.error("fetch failed:", error.message)
  process.exit(1)
}

console.log(`Deepening Twilio validation on ${leads.length} leads...\n`)
let cost = 0
let nameMatchedCount = 0
let connectedCount = 0
let disconnectedCount = 0

for (const [i, lead] of leads.entries()) {
  const ownerName = lead.full_name || lead.owner_name_records || ""
  const data = lead.skiptrace_data
  if (!data || !Array.isArray(data.persons)) continue

  const allPhones = []
  for (const person of data.persons) {
    if (Array.isArray(person.phones)) {
      for (const ph of person.phones) allPhones.push({ ph, person })
    }
  }

  // 1) caller_name on every phone
  for (const { ph } of allPhones) {
    const result = await lookup(ph.number, "caller_name")
    cost += 0.01
    const cnam = result?.caller_name || {}
    if (!ph.twilio) ph.twilio = {}
    ph.twilio.caller_name = cnam.caller_name || null
    ph.twilio.caller_type = cnam.caller_type || null
    ph.twilio.name_match_score = nameMatchScore(cnam.caller_name, ownerName)
    if (ph.twilio.name_match_score && ph.twilio.name_match_score >= 0.5) nameMatchedCount++
    await new Promise((r) => setTimeout(r, 70))
  }

  // 2) line_status on TOP phone only — pick the best mobile, fallback to best non-DNC
  const top = (() => {
    const mobile = allPhones
      .map((x) => x.ph)
      .filter((p) => p.twilio?.line_type === "mobile" && !p.dnc && p.twilio?.valid !== false)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    if (mobile[0]) return mobile[0]
    const fallback = allPhones
      .map((x) => x.ph)
      .filter((p) => !p.dnc && p.twilio?.valid !== false)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    return fallback[0] || null
  })()

  if (top) {
    const result = await lookup(top.number, "line_status")
    cost += 0.04
    const ls = result?.line_status || {}
    if (!top.twilio) top.twilio = {}
    top.twilio.line_status = ls.status || null  // "active" | "inactive" | etc
    top.twilio.line_status_checked_at = new Date().toISOString()
    if (ls.status === "active") connectedCount++
    else if (ls.status) disconnectedCount++
  }

  // Write back
  const { error: upErr } = await supabase
    .from("homeowner_requests")
    .update({ skiptrace_data: data })
    .eq("id", lead.id)
  if (upErr) {
    console.warn(`  [${i + 1}] write failed: ${upErr.message}`)
    continue
  }
  console.log(
    `[${i + 1}/${leads.length}] ${lead.property_address?.slice(0, 50)} ` +
    `· ${allPhones.length} phones validated` +
    (top ? ` · top ${top.number} → line_status: ${top.twilio?.line_status || "unknown"}` : "")
  )
}

console.log(`\n─── Done ───`)
console.log(`  Leads processed: ${leads.length}`)
console.log(`  Name-matched phones: ${nameMatchedCount}`)
console.log(`  Top phones marked connected: ${connectedCount}`)
console.log(`  Top phones marked inactive/disconnected: ${disconnectedCount}`)
console.log(`  Estimated cost: $${cost.toFixed(2)}`)
