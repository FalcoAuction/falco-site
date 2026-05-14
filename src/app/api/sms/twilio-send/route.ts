// POST /api/sms/twilio-send
//
// Sends an SMS via Twilio from FALCO's outreach number to a homeowner,
// then logs the send to dialer_activities for the AI brain's
// conversation history.
//
// Body:
//   {
//     slug: "pipeline_lead_key",       // required, lead key
//     to_phone: "+16155551212",        // required, E.164
//     body: "the SMS body to send",    // required
//     angle: "specific_filing" | ... | null,  // optional, AI compose angle
//   }
//
// Returns:
//   { sid: "SM...", status: "queued" | "sent" | ..., logged: true }
//
// Compliance:
//   - Pre-check: phone_metadata.dnc flag → 403 + skip.
//   - Pre-check: 9pm-8am CT quiet hours → 403 (unless ?override=1 set
//     by a real human who knows what they're doing).
//   - All sends logged to dialer_activities (channel=text,
//     direction=out via notes prefix until migration ships).
//   - All sends logged to sms_messages (new table — graceful skip if
//     migration not yet applied).
//
// Auth: dialer or operator session.
//
// Env required:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER  (the +1XXX number Patrick bought for FALCO outreach)
//
// If TWILIO_FROM_NUMBER not set, returns 503 with a clear setup error —
// caller UI should show "configure TWILIO_FROM_NUMBER in env to enable".

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// 9pm-8am CT quiet hours. TN is on Central time. Crude UTC offset
// (CT is UTC-6 in CDT / UTC-5 in CST; Patrick's window is May 2026 so
// CDT = UTC-5). We do quiet-hours check in approximate local CT time.
function isQuietHourCT(): boolean {
  const now = new Date()
  // UTC hour
  const utcHour = now.getUTCHours()
  // CDT = UTC - 5; CT hour
  const ctHour = (utcHour - 5 + 24) % 24
  // Quiet: before 8am or at/after 9pm
  return ctHour < 8 || ctHour >= 21
}

export async function POST(req: NextRequest) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: {
    slug?: string
    to_phone?: string
    body?: string
    angle?: string | null
    override_quiet_hours?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const slug = (body.slug || "").trim()
  const toPhoneRaw = (body.to_phone || "").trim()
  const messageBody = (body.body || "").trim()
  if (!slug || !toPhoneRaw || !messageBody) {
    return NextResponse.json(
      { error: "slug, to_phone, body required." },
      { status: 400 }
    )
  }

  // E.164 normalize
  const digits = toPhoneRaw.replace(/\D/g, "")
  const toPhone =
    digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
      ? `+${digits}`
      : toPhoneRaw.startsWith("+")
      ? toPhoneRaw
      : ""
  if (!toPhone) {
    return NextResponse.json(
      { error: `Invalid to_phone: ${toPhoneRaw}` },
      { status: 400 }
    )
  }

  // Env check
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  if (!sid || !token) {
    return NextResponse.json(
      { error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set." },
      { status: 503 }
    )
  }
  if (!fromNumber) {
    return NextResponse.json(
      {
        error:
          "TWILIO_FROM_NUMBER not set. Buy a number in the Twilio console (Phone Numbers → Buy a Number → US, SMS-enabled, prefer 615 area code) and set TWILIO_FROM_NUMBER=+1... in env.",
      },
      { status: 503 }
    )
  }

  // Quiet-hours check
  if (isQuietHourCT() && !body.override_quiet_hours) {
    return NextResponse.json(
      {
        error:
          "Quiet hours (9pm-8am CT). Pass override_quiet_hours=true if this is a legit emergency (sale tomorrow morning, BK referral).",
      },
      { status: 403 }
    )
  }

  // DNC pre-check from the lead's phone_metadata
  if (supabaseAdmin) {
    const { data: leadRow } = await supabaseAdmin
      .from("homeowner_requests")
      .select("phone_metadata")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    const pm = (leadRow?.phone_metadata ?? {}) as Record<string, unknown>
    const dncFlag = (pm["dnc"] ?? pm["dnc_status"] ?? "") as string | boolean
    const isDnc = dncFlag === true || dncFlag === "dnc" || dncFlag === "true"
    if (isDnc) {
      return NextResponse.json(
        { error: "Lead phone is flagged DNC. Cannot send." },
        { status: 403 }
      )
    }
  }

  // ───── Send via Twilio REST API ────────────────────────────────────
  // Direct fetch (no twilio npm SDK dependency).
  const tw = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toPhone,
        Body: messageBody,
      }).toString(),
    }
  )

  const twJson = (await tw.json().catch(() => ({}))) as {
    sid?: string
    status?: string
    error_code?: number
    error_message?: string
    message?: string
  }
  if (!tw.ok) {
    return NextResponse.json(
      {
        error: `Twilio ${tw.status}: ${twJson.error_message || twJson.message || "send failed"}`,
        code: twJson.error_code,
      },
      { status: 502 }
    )
  }

  // ───── Log the send ─────────────────────────────────────────────────
  // dialer_activities (existing table — channel='text', notes carries
  // the body, ai_angle tag prefixed for back-compat with the brain's
  // conversation_history reader).
  let logged = false
  if (supabaseAdmin) {
    try {
      const angleTag = body.angle ? `[AI angle: ${body.angle}] ` : ""
      const directionTag = "[OUT] "
      await supabaseAdmin.from("dialer_activities").insert({
        listing_slug: slug,
        channel: "text",
        outcome: "note_only",
        notes: directionTag + angleTag + messageBody,
        created_by: session.caller || "ai_bot",
        occurred_at: new Date().toISOString(),
      })
      logged = true
    } catch (e) {
      console.error("dialer_activities insert failed:", e)
    }

    // sms_messages table (new — graceful skip if not yet migrated)
    try {
      await supabaseAdmin.from("sms_messages").insert({
        listing_slug: slug,
        direction: "out",
        from_phone: fromNumber,
        to_phone: toPhone,
        body: messageBody,
        twilio_sid: twJson.sid,
        twilio_status: twJson.status,
        angle: body.angle || null,
        sent_at: new Date().toISOString(),
      })
    } catch {
      // table not yet migrated — fine, dialer_activities has the record
    }
  }

  return NextResponse.json({
    sid: twJson.sid,
    status: twJson.status,
    from: fromNumber,
    to: toPhone,
    logged,
  })
}
