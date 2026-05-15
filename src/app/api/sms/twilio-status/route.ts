// POST /api/sms/twilio-status
//
// Twilio Status Callback receiver. Twilio POSTs to this URL every
// time a message we sent transitions state:
//   queued → sending → sent → delivered (success)
//                    → failed | undelivered (carrier rejected)
//
// We update sms_messages.twilio_status by MessageSid so the daily
// digest + audit log show the ACTUAL carrier-level delivery, not
// just "we POSTed to Twilio's API."
//
// Configure on the outbound API call by passing StatusCallback=
// https://falco.llc/api/sms/twilio-status in the POST body of every
// Twilio Messages.json call. Already wired in twilio-send + the
// auto-respond branch of twilio-webhook.
//
// Auth: optional signature verification when TWILIO_VALIDATE_SIGNATURES=1.

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken || !signature) return false
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

// Statuses we care about persisting. Twilio sends transitions even
// for "in flight" (accepted, queued, sending) — we save the latest
// regardless so the digest reflects current state.
const TERMINAL_FAILURES = new Set(["failed", "undelivered"])

export async function POST(req: NextRequest) {
  const formText = await req.text()
  const formParams = Object.fromEntries(new URLSearchParams(formText))
  const messageSid = (formParams.MessageSid || "").trim()
  const status = (formParams.MessageStatus || "").trim()
  const errorCode = (formParams.ErrorCode || "").trim()
  const errorMessage = (formParams.ErrorMessage || "").trim()
  const to = (formParams.To || "").trim()

  if (!messageSid) {
    return NextResponse.json({ ok: false, error: "no sid" }, { status: 400 })
  }

  // Signature check
  if (process.env.TWILIO_VALIDATE_SIGNATURES === "1") {
    const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim()
    const sig = req.headers.get("x-twilio-signature")
    const url = `https://${req.headers.get("host") || "falco.llc"}${req.nextUrl.pathname}`
    if (!verifyTwilioSignature(authToken, sig, url, formParams)) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "no supabase" }, { status: 503 })
  }

  // Update by Twilio SID. Multiple status callbacks per message are
  // expected (queued → sent → delivered); the latest wins.
  const updates: Record<string, unknown> = {
    twilio_status: status,
  }
  if (TERMINAL_FAILURES.has(status)) {
    // Surface the carrier error so the digest can show it. Append to
    // escalation_reason which is otherwise null for sent messages.
    updates["escalation_reason"] =
      `carrier_${status}` +
      (errorCode ? `:${errorCode}` : "") +
      (errorMessage ? `:${errorMessage.slice(0, 100)}` : "")
  }

  try {
    const { error } = await supabaseAdmin
      .from("sms_messages")
      .update(updates)
      .eq("twilio_sid", messageSid)
    if (error) {
      console.error("twilio-status update failed:", error.message)
    }
  } catch (e) {
    console.error("twilio-status exception:", e)
  }

  // For terminal failures, also notify Patrick (rare enough to warrant
  // attention — undelivered = carrier filtered, failed = bad number)
  if (TERMINAL_FAILURES.has(status)) {
    await notifyCarrierFailure(messageSid, status, to, errorCode, errorMessage)
  }

  // Twilio doesn't care about response body; just 200.
  return new NextResponse("", { status: 200 })
}

async function notifyCarrierFailure(
  sid: string,
  status: string,
  to: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  const notifyPhone = (process.env.FALCO_NOTIFY_PHONE || "").trim()
  if (!notifyPhone) return
  const twSid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const twToken = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  if (!twSid || !twToken || !fromNumber) return
  // Don't notify self about self-sent failures (rare but possible)
  if (to.replace(/\D/g, "").endsWith(notifyPhone.replace(/\D/g, ""))) return

  const body =
    `FALCO ${status} · ${to}\n` +
    `${errorCode ? `Code ${errorCode}: ` : ""}${errorMessage.slice(0, 120)}\n` +
    `SID ${sid.slice(0, 10)}…`
  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twSid}:${twToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: notifyPhone,
          Body: body,
        }).toString(),
      }
    )
  } catch (e) {
    console.error("notifyCarrierFailure send:", e)
  }
}

// Twilio sometimes probes endpoints with GET.
export async function GET() {
  return new NextResponse("FALCO Twilio status callback OK", { status: 200 })
}
