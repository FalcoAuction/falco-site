// GET /api/admin/sms-diagnose
//
// One-shot health check for the inbound SMS pipeline. Tells us:
//   1. Is TWILIO_FROM_NUMBER env set?
//   2. What is the IncomingPhoneNumber.sms_url on Twilio's side?
//      (i.e. when an SMS arrives, where does Twilio POST?)
//   3. What is the status_callback URL?
//   4. List the last N messages Twilio has on file for this number
//      (both directions) — lets us see if inbound is arriving at
//      Twilio but failing to land in our sms_messages table.
//   5. Compare Twilio's inbound list to our sms_messages.direction='in'
//      rows; flag any gaps.
//
// Why: zero inbound has ever landed in sms_messages despite 68
// outbound sends. Either (a) the sms_url is unset/wrong, (b) the
// webhook is throwing before insert, or (c) genuinely no replies.
// This route answers which.
//
// Admin-gated.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  const notifyPhone = (process.env.FALCO_NOTIFY_PHONE || "").trim()
  const validateSigs = process.env.TWILIO_VALIDATE_SIGNATURES === "1"

  const out: Record<string, unknown> = {
    env: {
      twilio_account_sid_set: !!sid,
      twilio_auth_token_set: !!token,
      twilio_from_number: fromNumber || null,
      falco_notify_phone: notifyPhone || null,
      twilio_validate_signatures: validateSigs,
    },
    expected_webhook: `https://${req.headers.get("host") || "falco.llc"}/api/sms/twilio-webhook`,
    expected_status_callback: `https://${req.headers.get("host") || "falco.llc"}/api/sms/twilio-status`,
  }

  if (!sid || !token || !fromNumber) {
    out["error"] = "Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER in env"
    return NextResponse.json(out, { status: 503 })
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64")

  // 1) Look up the IncomingPhoneNumber config for our FROM number
  try {
    const lookupUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=` +
      encodeURIComponent(fromNumber)
    const res = await fetch(lookupUrl, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (!res.ok) {
      out["number_lookup_error"] = `http_${res.status}: ${await res.text().catch(() => "")}`
    } else {
      const j = (await res.json()) as {
        incoming_phone_numbers?: Array<{
          phone_number?: string
          sms_url?: string
          sms_method?: string
          sms_fallback_url?: string
          status_callback?: string
          status_callback_method?: string
          capabilities?: { sms?: boolean; mms?: boolean; voice?: boolean }
          friendly_name?: string
          sid?: string
        }>
      }
      const numbers = j.incoming_phone_numbers || []
      if (numbers.length === 0) {
        out["number_config"] = null
        out["number_config_note"] =
          `No IncomingPhoneNumber found for ${fromNumber} — this number isn't owned by this Twilio account.`
      } else {
        const n = numbers[0]
        const expectedSmsUrl = out["expected_webhook"]
        out["number_config"] = {
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          sms_url: n.sms_url,
          sms_method: n.sms_method,
          sms_fallback_url: n.sms_fallback_url,
          status_callback: n.status_callback,
          status_callback_method: n.status_callback_method,
          capabilities: n.capabilities,
          sid: n.sid,
        }
        out["webhook_matches_expected"] = n.sms_url === expectedSmsUrl
        if (n.sms_url !== expectedSmsUrl) {
          out["webhook_mismatch_explainer"] =
            `Twilio is configured to POST inbound SMS to "${n.sms_url || "(none)"}" but our handler lives at "${expectedSmsUrl}". Update the number's "A MESSAGE COMES IN" webhook in Twilio Console (or via the API). This is the most likely cause of zero recorded inbound.`
        }
      }
    }
  } catch (e) {
    out["number_lookup_exception"] = String(e).slice(0, 200)
  }

  // 2) List recent messages Twilio has on file (both directions)
  try {
    // Twilio: "To=<our number>" filters to inbound TO us
    const inboundUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?To=` +
      encodeURIComponent(fromNumber) +
      `&PageSize=20`
    const res = await fetch(inboundUrl, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (!res.ok) {
      out["twilio_inbound_lookup_error"] = `http_${res.status}`
    } else {
      const j = (await res.json()) as {
        messages?: Array<{
          sid: string
          from: string
          to: string
          body: string
          status: string
          date_sent: string | null
          direction: string
        }>
      }
      const inboundFromTwilio = (j.messages || []).map((m) => ({
        sid: m.sid,
        from: m.from,
        body: (m.body || "").slice(0, 160),
        status: m.status,
        date_sent: m.date_sent,
        direction: m.direction,
      }))
      out["twilio_inbound_count_recent"] = inboundFromTwilio.length
      out["twilio_inbound_samples"] = inboundFromTwilio.slice(0, 10)

      // Compare with our sms_messages.direction='in' rows
      if (supabaseAdmin && inboundFromTwilio.length > 0) {
        const sids = inboundFromTwilio.map((m) => m.sid)
        const { data: ours } = await supabaseAdmin
          .from("sms_messages")
          .select("twilio_sid")
          .in("twilio_sid", sids)
        const oursSet = new Set((ours || []).map((r) => r.twilio_sid))
        const missing = inboundFromTwilio.filter((m) => !oursSet.has(m.sid))
        out["inbound_missing_from_our_db"] = missing.map((m) => ({
          sid: m.sid,
          from: m.from,
          body: m.body,
          date_sent: m.date_sent,
        }))
        out["inbound_missing_count"] = missing.length
      }
    }
  } catch (e) {
    out["twilio_inbound_lookup_exception"] = String(e).slice(0, 200)
  }

  // 3) Last outbound for context
  try {
    const outboundUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?From=` +
      encodeURIComponent(fromNumber) +
      `&PageSize=5`
    const res = await fetch(outboundUrl, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (res.ok) {
      const j = (await res.json()) as {
        messages?: Array<{
          sid: string
          to: string
          body: string
          status: string
          date_sent: string | null
          error_code?: number | null
          error_message?: string | null
        }>
      }
      out["twilio_outbound_samples"] = (j.messages || []).slice(0, 5).map((m) => ({
        sid: m.sid,
        to: m.to,
        status: m.status,
        date_sent: m.date_sent,
        error_code: m.error_code,
        body: (m.body || "").slice(0, 80),
      }))
    }
  } catch {
    // optional
  }

  // 4) Diagnosis summary
  const diagnosis: string[] = []
  if (out["webhook_matches_expected"] === false) {
    diagnosis.push("MISCONFIGURED: number's sms_url does not point to our webhook. See webhook_mismatch_explainer.")
  }
  if (out["webhook_matches_expected"] === true && Number(out["twilio_inbound_count_recent"] || 0) === 0) {
    diagnosis.push("Webhook is wired correctly but Twilio has no record of inbound SMS in the last batch. Either replies aren't coming or carrier filtering at the From side. Check Twilio Console → Monitor → Logs → Messaging for a longer history.")
  }
  if (Number(out["inbound_missing_count"] || 0) > 0) {
    diagnosis.push(`Twilio received ${out["inbound_missing_count"]} inbound message(s) that we never recorded. Webhook is being called but failing before DB insert. Check Vercel logs for /api/sms/twilio-webhook errors.`)
  }
  out["diagnosis"] = diagnosis.length > 0 ? diagnosis : ["No issues detected from this view."]

  return NextResponse.json(out)
}
