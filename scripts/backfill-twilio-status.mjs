#!/usr/bin/env node
/**
 * Backfill twilio_status on sms_messages rows we already sent.
 *
 * Why: we just wired up the Twilio Status Callback endpoint, but the
 * 68 messages Patrick sent earlier today only have the API-accept
 * status saved (queued / accepted). Twilio knows the real outcome
 * (delivered / undelivered / failed) — we just have to ask for each
 * MessageSid.
 *
 * What it does:
 *   - SELECT direction='out' rows from sms_messages where created_at
 *     is in the last N hours AND twilio_sid IS NOT NULL.
 *   - For each, GET https://api.twilio.com/.../Messages/{sid}.json
 *   - UPDATE twilio_status to the carrier-level current status,
 *     and if undelivered/failed, write escalation_reason with the
 *     carrier error code.
 *
 * Cost: free. Twilio Message GETs are not billed.
 *
 * Usage:
 *   node scripts/backfill-twilio-status.mjs [--hours=24] [--dry]
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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\\n$/g, "").trim()
    out[line.slice(0, eq).trim()] = val
  }
  return out
}
const VENV = parseEnvFile(
  path.resolve(process.cwd(), ".env.vercel.production")
)
const env = (n) => process.env[n] || VENV[n] || ""

const SID = env("TWILIO_ACCOUNT_SID")
const TOKEN = env("TWILIO_AUTH_TOKEN")
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")

if (!SID || !TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing creds. Need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY in env or .env.vercel.production."
  )
  process.exit(1)
}

const argHours = (() => {
  const m = process.argv.find((a) => a.startsWith("--hours="))
  return m ? parseInt(m.split("=")[1], 10) : 24
})()
const DRY = process.argv.includes("--dry")

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

async function fetchTwilio(sid) {
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString("base64")
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages/${encodeURIComponent(
    sid
  )}.json`
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    return {
      ok: false,
      http: res.status,
      error: txt.slice(0, 200),
    }
  }
  const json = await res.json()
  return {
    ok: true,
    status: json.status,
    error_code: json.error_code,
    error_message: json.error_message,
    to: json.to,
    date_sent: json.date_sent,
  }
}

const TERMINAL_FAILURES = new Set(["failed", "undelivered"])

async function main() {
  const cutoff = new Date(Date.now() - argHours * 60 * 60 * 1000).toISOString()
  console.log(
    `Backfilling sms_messages.twilio_status since ${cutoff}${DRY ? " [DRY]" : ""}`
  )

  const { data, error } = await supabase
    .from("sms_messages")
    .select("id, twilio_sid, twilio_status, to_phone, created_at")
    .eq("direction", "out")
    .gte("created_at", cutoff)
    .not("twilio_sid", "is", null)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Supabase query failed:", error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.log("Nothing to backfill.")
    return
  }
  console.log(`Found ${data.length} rows to refresh.`)

  const summary = {
    delivered: 0,
    sent: 0,
    queued: 0,
    sending: 0,
    accepted: 0,
    undelivered: 0,
    failed: 0,
    unchanged: 0,
    updated: 0,
    api_errors: 0,
    other: 0,
  }

  for (const row of data) {
    const sid = row.twilio_sid
    if (!sid) continue
    const r = await fetchTwilio(sid)
    if (!r.ok) {
      summary.api_errors++
      console.log(`  ✗ ${sid} → HTTP ${r.http} ${r.error}`)
      continue
    }
    const newStatus = r.status || ""
    // tally
    if (newStatus in summary) summary[newStatus]++
    else summary.other++

    if (newStatus === row.twilio_status) {
      summary.unchanged++
      continue
    }

    const updates = { twilio_status: newStatus }
    if (TERMINAL_FAILURES.has(newStatus)) {
      updates.escalation_reason =
        `carrier_${newStatus}` +
        (r.error_code ? `:${r.error_code}` : "") +
        (r.error_message ? `:${String(r.error_message).slice(0, 100)}` : "")
    }

    if (DRY) {
      console.log(
        `  ~ ${sid} ${row.to_phone} ${row.twilio_status} → ${newStatus}${
          updates.escalation_reason ? " · " + updates.escalation_reason : ""
        }`
      )
    } else {
      const { error: uErr } = await supabase
        .from("sms_messages")
        .update(updates)
        .eq("id", row.id)
      if (uErr) {
        console.log(`  ✗ update id=${row.id}: ${uErr.message}`)
        continue
      }
      summary.updated++
      console.log(
        `  ✓ ${sid} ${row.to_phone} ${row.twilio_status} → ${newStatus}${
          updates.escalation_reason ? " · " + updates.escalation_reason : ""
        }`
      )
    }
    // tiny throttle to be nice to Twilio
    await new Promise((r) => setTimeout(r, 80))
  }

  console.log("\nSummary:")
  for (const k of Object.keys(summary)) {
    if (summary[k]) console.log(`  ${k.padEnd(12)} ${summary[k]}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
