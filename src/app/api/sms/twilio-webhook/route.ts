// POST /api/sms/twilio-webhook
//
// Twilio inbound SMS webhook. Configure in Twilio console:
//   Phone Numbers → Manage → Active numbers → (your FALCO number) →
//   Messaging Configuration → "A message comes in" →
//     Webhook = https://falco.llc/api/sms/twilio-webhook  (POST, HTTP)
//
// Twilio POSTs form-urlencoded fields:
//   MessageSid, From (E.164), To, Body, NumMedia, MessagingServiceSid, ...
//
// What this endpoint does on each inbound:
//   1. Look up the lead by from-phone (homeowner's number)
//   2. Log to sms_messages + dialer_activities (direction='in')
//   3. If body matches STOP / UNSUBSCRIBE → flag DNC, send confirmation, done
//   4. Otherwise: call the AI brain to draft a reply (does NOT auto-send)
//   5. Queue the draft for Patrick's approval in the inbox UI
//
// Returns TwiML XML so Twilio doesn't bounce. Empty <Response/> = no
// auto-reply (we want Patrick to approve through the inbox).
//
// Auth: Twilio request signature validation (when TWILIO_AUTH_TOKEN set
// + TWILIO_VALIDATE_SIGNATURES=1). Skipped in dev for easier testing.

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const OPTOUT_RE = /^\s*(stop|unsubscribe|optout|opt out|quit|cancel|end|remove|do not (text|contact|message))\b/i

// Empty TwiML response — tells Twilio not to send an auto-reply. The
// real reply goes through Patrick's approval inbox.
const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

// STOP-confirmation TwiML — when an opt-out keyword fires, we reply
// inline so the homeowner sees the confirmation immediately AND we
// flag DNC in our DB.
const STOP_CONFIRMATION_TWIML = (msg: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  )}</Message></Response>`

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}

/**
 * Verify the Twilio request signature.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Returns true if valid OR if validation is disabled.
 */
function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken || !signature) return false
  // Twilio signature = HMAC-SHA1(authToken, url + concatenated key+value of sorted params)
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const k of sortedKeys) data += k + (params[k] ?? "")
  const expected = createHmac("sha1", authToken).update(data).digest("base64")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Parse form-urlencoded body from Twilio
  const formText = await req.text()
  const formParams = Object.fromEntries(new URLSearchParams(formText))

  const fromPhone = (formParams.From || "").trim()
  const toPhone = (formParams.To || "").trim()
  const messageBody = (formParams.Body || "").trim()
  const messageSid = (formParams.MessageSid || "").trim()

  if (!fromPhone || !messageBody) {
    // Twilio shouldn't send these but be defensive — return empty so
    // Twilio doesn't retry.
    return twimlResponse(EMPTY_TWIML)
  }

  // ───── Signature verification (production only) ─────────────────────
  const validateSigs = process.env.TWILIO_VALIDATE_SIGNATURES === "1"
  if (validateSigs) {
    const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim()
    const sig = req.headers.get("x-twilio-signature")
    // The URL Twilio signed is the full webhook URL (including https://)
    const url = `https://${req.headers.get("host") || "falco.llc"}${req.nextUrl.pathname}`
    const valid = verifyTwilioSignature(authToken, sig, url, formParams)
    if (!valid) {
      console.warn("Twilio webhook signature invalid", { url, fromPhone })
      // Return 403 — Twilio will mark the webhook as failing and you
      // can debug.
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  // ───── Look up the lead by from-phone ──────────────────────────────
  let leadSlug: string | null = null
  if (supabaseAdmin) {
    // Match by phone (try with and without leading +1)
    const fromDigits = fromPhone.replace(/\D/g, "")
    const fromShort =
      fromDigits.length === 11 && fromDigits.startsWith("1")
        ? fromDigits.slice(1)
        : fromDigits

    const { data: matchedLead } = await supabaseAdmin
      .from("homeowner_requests")
      .select("pipeline_lead_key, phone")
      .eq("source", "bot")
      .or(
        `phone.eq.${fromPhone},phone.eq.+1${fromShort},phone.eq.${fromShort}`
      )
      .limit(1)
      .maybeSingle()
    if (matchedLead) {
      leadSlug = (matchedLead as { pipeline_lead_key: string }).pipeline_lead_key
    }
  }

  // ───── Log inbound to sms_messages + dialer_activities ──────────────
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("sms_messages").insert({
        listing_slug: leadSlug,
        direction: "in",
        from_phone: fromPhone,
        to_phone: toPhone,
        body: messageBody,
        twilio_sid: messageSid,
        received_at: new Date().toISOString(),
      })
    } catch {
      // table not yet migrated — fall back to dialer_activities only
    }

    if (leadSlug) {
      try {
        await supabaseAdmin.from("dialer_activities").insert({
          listing_slug: leadSlug,
          channel: "text",
          outcome: "connected",
          notes: "[IN] " + messageBody,
          created_by: "twilio_webhook",
          occurred_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error("dialer_activities insert failed:", e)
      }
    }
  }

  // ───── Handle STOP / UNSUBSCRIBE ────────────────────────────────────
  if (OPTOUT_RE.test(messageBody)) {
    // Flag DNC on the lead
    if (supabaseAdmin && leadSlug) {
      try {
        const { data: row } = await supabaseAdmin
          .from("homeowner_requests")
          .select("phone_metadata")
          .eq("source", "bot")
          .eq("pipeline_lead_key", leadSlug)
          .maybeSingle()
        const pm = (row?.phone_metadata as Record<string, unknown>) || {}
        pm["dnc"] = true
        pm["dnc_at"] = new Date().toISOString()
        pm["dnc_reason"] = "STOP keyword via SMS"
        await supabaseAdmin
          .from("homeowner_requests")
          .update({ phone_metadata: pm })
          .eq("source", "bot")
          .eq("pipeline_lead_key", leadSlug)
      } catch (e) {
        console.error("DNC flag write failed:", e)
      }
    }
    // Send TCPA-compliant confirmation back
    return twimlResponse(
      STOP_CONFIRMATION_TWIML(
        "Got it. You won't get any more texts from FALCO. If anything changes, reply START."
      )
    )
  }

  // ───── Inbound logged, no auto-reply.
  // The AI compose panel in the dialer picks this up via the brain's
  // conversation_history reader, and Patrick approves the draft from
  // the per-lead view. (Phase 2 will auto-draft + push notification
  // to a unified inbox for tap-approve at scale.)
  return twimlResponse(EMPTY_TWIML)
}

// Twilio also sends GET to verify endpoint sometimes. Be polite.
export async function GET() {
  return new NextResponse("FALCO Twilio webhook OK", { status: 200 })
}
