// POST /api/sms/twilio-webhook
//
// Twilio inbound SMS webhook with FULL AUTO-RESPOND.
//
// Flow on every inbound:
//   1. Log inbound to sms_messages + dialer_activities
//   2. STOP keyword → flag DNC, send TwiML confirmation, done
//   3. Quiet hours (9pm-8am CT) → queue draft for tomorrow, no auto-send
//   4. Call AI brain to draft reply (mode='reply')
//   5. Run escalation checks on inbound + draft:
//        - BK / lawyer / attorney / sue / scam / harassment keywords
//          → queue as pending_approval, no auto-send
//        - Brain returned suggested_action='escalate_to_patrick' → same
//        - Bot confidence < AUTO_SEND_THRESHOLD → same
//   6. Otherwise → auto-send via Twilio API, mark status='auto_sent'
//   7. Daily digest endpoint summarizes everything that happened
//
// Configure in Twilio console:
//   Phone Number → Messaging Configuration → "A message comes in" →
//     Webhook = https://falco.llc/api/sms/twilio-webhook  (POST, HTTP)
//
// Env knobs:
//   FALCO_SMS_AUTO_SEND_THRESHOLD  (default 0.7, 0.0-1.0)
//   FALCO_SMS_AUTO_SEND            ("0" to disable auto-send entirely)
//   TWILIO_VALIDATE_SIGNATURES     ("1" to enforce in prod)

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  FALCO_SALES_BRAIN_SYSTEM_PROMPT,
  buildLeadContext,
  buildComposeUserMessage,
  type ComposeResult,
  type ConversationMessage,
} from "@/lib/falco-sales-brain"
import type { DialerLeadView } from "@/lib/dialer-types"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const OPTOUT_RE =
  /^\s*(stop|unsubscribe|optout|opt out|quit|cancel|end|remove|do not (text|contact|message))\b/i

// Phrases in the inbound that REQUIRE Patrick's review. Each gets a
// specific escalation_reason for the daily digest.
const ESCALATION_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(bankruptcy|chapter\s*7|chapter\s*13|filing\s+bk)\b/i, reason: "bk_keyword" },
  { re: /\b(lawyer|attorney|legal\s+counsel|representation)\b/i, reason: "lawyer_keyword" },
  { re: /\b(sue|lawsuit|class\s*action|fraud|scam|harass)/i, reason: "legal_threat" },
  { re: /\b(suicide|kill\s+myself|end\s+it\s+all|i'?m\s+done)\b/i, reason: "wellbeing_concern" },
  { re: /\b(fuck|shit|asshole|bitch|cunt|dick)\b/i, reason: "profanity" },
  { re: /\b(news|reporter|press|journalist)\b/i, reason: "press_inquiry" },
]

const DEFAULT_AUTO_SEND_THRESHOLD = 0.7
const DEFAULT_MODEL = "gpt-5-mini"

// E.164 normalize helper for the notify-phone comparison
function digitsOnly(raw: string): string {
  const d = (raw || "").replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) return d.slice(1)
  return d
}

/**
 * Fire-and-forget notify SMS to Patrick's cell when a homeowner texts
 * the FALCO Twilio number. Includes the owner name, address snippet,
 * inbound body snippet, and what the bot did (auto-sent / queued).
 *
 * Skipped when:
 *   - FALCO_NOTIFY_PHONE env not set
 *   - The inbound came FROM Patrick's notify phone (avoid loop)
 *   - Twilio creds missing
 */
async function notifyPatrick(args: {
  ownerName: string | null
  addressSnippet: string
  inboundBody: string
  botAction: "auto_sent" | "queued" | "no_draft" | "opted_out_lead"
  escalationReason: string | null
}): Promise<void> {
  const notifyPhone = (process.env.FALCO_NOTIFY_PHONE || "").trim()
  if (!notifyPhone) return
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  if (!sid || !token || !fromNumber) return

  const owner = (args.ownerName || "unknown lead").trim()
  const addr = args.addressSnippet || ""
  const inboundSnip =
    args.inboundBody.length > 90
      ? args.inboundBody.slice(0, 87) + "..."
      : args.inboundBody
  const actionLine =
    args.botAction === "auto_sent"
      ? "Bot auto-replied."
      : args.botAction === "queued"
      ? `Bot draft queued (${args.escalationReason || "review"}). Approve at falco.llc/dialer/inbox`
      : args.botAction === "opted_out_lead"
      ? "Lead is on opt-out list. No bot reply."
      : "No bot draft. Open inbox to compose."

  const body =
    `FALCO inbound · ${owner}${addr ? ` · ${addr}` : ""}\n` +
    `"${inboundSnip}"\n` +
    actionLine

  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
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
    console.error("notifyPatrick failed:", e)
  }
}

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
const STOP_CONFIRMATION_TWIML = (msg: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg.replace(
    /[<>&]/g,
    (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;")
  )}</Message></Response>`

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}

function isQuietHourCT(): boolean {
  const utcHour = new Date().getUTCHours()
  const ctHour = (utcHour - 5 + 24) % 24
  return ctHour < 8 || ctHour >= 21
}

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

export async function POST(req: NextRequest) {
  const formText = await req.text()
  const formParams = Object.fromEntries(new URLSearchParams(formText))
  const fromPhone = (formParams.From || "").trim()
  const toPhone = (formParams.To || "").trim()
  const messageBody = (formParams.Body || "").trim()
  const messageSid = (formParams.MessageSid || "").trim()

  if (!fromPhone || !messageBody) {
    return twimlResponse(EMPTY_TWIML)
  }

  // Self-notify loop guard — if Patrick texts the FALCO number from his
  // own cell (his notify phone), log it but do NOT process or notify
  // himself. Prevents infinite loops where he replies "ok send it" to a
  // notify SMS and we'd then try to draft a reply to him.
  const notifyPhone = (process.env.FALCO_NOTIFY_PHONE || "").trim()
  if (notifyPhone && digitsOnly(fromPhone) === digitsOnly(notifyPhone)) {
    console.info("Inbound from notify-phone (self) — logging only:", fromPhone)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("sms_messages").insert({
          listing_slug: null,
          direction: "in",
          from_phone: fromPhone,
          to_phone: toPhone,
          body: messageBody,
          twilio_sid: messageSid,
          received_at: new Date().toISOString(),
          status: "received",
        })
      } catch {}
    }
    return twimlResponse(EMPTY_TWIML)
  }

  // Signature verification (prod only)
  if (process.env.TWILIO_VALIDATE_SIGNATURES === "1") {
    const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim()
    const sig = req.headers.get("x-twilio-signature")
    const url = `https://${req.headers.get("host") || "falco.llc"}${req.nextUrl.pathname}`
    if (!verifyTwilioSignature(authToken, sig, url, formParams)) {
      console.warn("Twilio webhook signature invalid", { url, fromPhone })
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  if (!supabaseAdmin) return twimlResponse(EMPTY_TWIML)

  // ───── Look up the lead by from-phone ──────────────────────────────
  const fromDigits = fromPhone.replace(/\D/g, "")
  const fromShort =
    fromDigits.length === 11 && fromDigits.startsWith("1")
      ? fromDigits.slice(1)
      : fromDigits

  type HR = {
    pipeline_lead_key: string
    phone: string | null
    full_name: string | null
    owner_name_records: string | null
    property_value: number | null
    property_address: string | null
    county: string | null
    distress_type: string | null
    trustee_sale_date: string | null
    phone_metadata: Record<string, unknown> | null
  }
  const { data: matched } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "pipeline_lead_key, phone, full_name, owner_name_records, property_value, property_address, county, distress_type, trustee_sale_date, phone_metadata"
    )
    .eq("source", "bot")
    .or(`phone.eq.${fromPhone},phone.eq.+1${fromShort},phone.eq.${fromShort}`)
    .limit(1)
    .maybeSingle()
  const lead = matched as HR | null
  const leadSlug = lead?.pipeline_lead_key || null

  // ───── Log inbound ───────────────────────────────────────────────
  try {
    await supabaseAdmin.from("sms_messages").insert({
      listing_slug: leadSlug,
      direction: "in",
      from_phone: fromPhone,
      to_phone: toPhone,
      body: messageBody,
      twilio_sid: messageSid,
      received_at: new Date().toISOString(),
      status: "received",
    })
  } catch (e) {
    console.error("sms_messages inbound insert failed:", e)
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
      console.error("dialer_activities inbound insert failed:", e)
    }
  }

  // ───── STOP keyword → flag DNC + confirm ────────────────────────────
  if (OPTOUT_RE.test(messageBody)) {
    if (leadSlug) {
      try {
        const pm = (lead?.phone_metadata as Record<string, unknown>) || {}
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
    return twimlResponse(
      STOP_CONFIRMATION_TWIML(
        "Got it. You won't get any more texts from FALCO. If anything changes, reply START."
      )
    )
  }

  // If we couldn't match the lead, log + bail (no auto-respond without
  // context). Still notify Patrick — unknown senders are often leads
  // with newer phones we haven't matched yet, or referrals.
  if (!lead || !leadSlug) {
    console.warn("Twilio inbound from unknown number:", fromPhone)
    await notifyPatrick({
      ownerName: `unknown ${fromPhone}`,
      addressSnippet: "",
      inboundBody: messageBody,
      botAction: "no_draft",
      escalationReason: "unknown_sender",
    })
    return twimlResponse(EMPTY_TWIML)
  }

  const ownerLabel = lead.owner_name_records || lead.full_name || "lead"
  const addrSnip = (lead.property_address || "").split(",")[0]?.trim() || ""

  // Honor manual sale_status flag — if a lead is reinstated / cancelled
  // / ran (sale already happened), do NOT auto-respond. Patrick has
  // either explicitly resolved this lead or it's no longer actionable.
  // The inbound is still logged (so it's not lost), but the brain skips
  // the draft.
  const pmCheck = (lead.phone_metadata ?? {}) as Record<string, unknown>
  const ssCheck = pmCheck["sale_status"] as { status?: string } | undefined
  const resolvedStatuses = new Set(["cancelled", "reinstated", "ran"])
  if (ssCheck?.status && resolvedStatuses.has(ssCheck.status)) {
    console.info(
      `Sale status '${ssCheck.status}' set on ${leadSlug} — skipping auto-respond`
    )
    await notifyPatrick({
      ownerName: ownerLabel,
      addressSnippet: addrSnip,
      inboundBody: messageBody,
      botAction: "opted_out_lead",
      escalationReason: `sale_status=${ssCheck.status}`,
    })
    return twimlResponse(EMPTY_TWIML)
  }

  // ───── Auto-respond is OFF? → log, no draft ─────────────────────────
  if (process.env.FALCO_SMS_AUTO_SEND === "0") {
    return twimlResponse(EMPTY_TWIML)
  }

  // ───── Call AI brain to draft reply ─────────────────────────────────
  const apiKey = (process.env.OPENAI_API_KEY || "").trim()
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set; cannot auto-draft")
    return twimlResponse(EMPTY_TWIML)
  }

  // Build lead context
  const leadView = {
    slug: leadSlug,
    title: lead.property_address || "(unknown)",
    address: lead.property_address || undefined,
    county: lead.county || undefined,
    distressType: lead.distress_type || undefined,
    ownerName: lead.owner_name_records || lead.full_name || undefined,
    ownerPhonePrimary: lead.phone || undefined,
    currentSaleDate: lead.trustee_sale_date || undefined,
    avmMid: lead.property_value || undefined,
  } as unknown as DialerLeadView

  // Conversation history from dialer_activities
  const history: ConversationMessage[] = []
  try {
    const { data: acts } = await supabaseAdmin
      .from("dialer_activities")
      .select("notes, occurred_at, channel")
      .eq("listing_slug", leadSlug)
      .eq("channel", "text")
      .order("occurred_at", { ascending: true })
      .limit(30)
    for (const a of acts ?? []) {
      const aTyped = a as { notes: string; occurred_at: string }
      const notes = aTyped.notes || ""
      const direction = notes.startsWith("[IN]") ? "in" : "out"
      const body = notes
        .replace(/^\[(IN|OUT)\]\s*/, "")
        .replace(/^\[AI angle:[^\]]+\]\s*/, "")
        .trim()
      if (body) {
        history.push({
          direction,
          body,
          occurred_at: aTyped.occurred_at,
          angle: null,
        })
      }
    }
  } catch {}

  // Compose request
  const userMessage = buildComposeUserMessage({
    mode: "reply",
    lead_context: buildLeadContext(leadView),
    inbound_message: messageBody,
    conversation_history: history,
  })

  let composeResult: ComposeResult | null = null
  try {
    const openAiResp = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.FALCO_AI_COMPOSE_MODEL || DEFAULT_MODEL,
          messages: [
            { role: "system", content: FALCO_SALES_BRAIN_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          // NOTE: gpt-5-mini doesn't support custom temperature, only
          // the default (1). Variant variety comes from the brain's
          // angle-selection logic, not sampling temperature.
        }),
      }
    )
    if (openAiResp.ok) {
      const j = (await openAiResp.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const raw = j.choices?.[0]?.message?.content || ""
      if (raw) {
        composeResult = JSON.parse(raw) as ComposeResult
      } else {
        console.error("OpenAI returned empty content")
      }
    } else {
      const errText = await openAiResp.text().catch(() => "")
      console.error(
        `OpenAI ${openAiResp.status}: ${errText.slice(0, 500)}`
      )
    }
  } catch (e) {
    console.error("OpenAI call / parse failed:", e)
  }

  if (!composeResult || !composeResult.draft) {
    // No draft available — log empty pending for Patrick to handle
    await notifyPatrick({
      ownerName: ownerLabel,
      addressSnippet: addrSnip,
      inboundBody: messageBody,
      botAction: "no_draft",
      escalationReason: "openai_failed_or_empty",
    })
    return twimlResponse(EMPTY_TWIML)
  }

  // ───── Decide auto-send vs escalate ────────────────────────────────
  const threshold = parseFloat(
    process.env.FALCO_SMS_AUTO_SEND_THRESHOLD || `${DEFAULT_AUTO_SEND_THRESHOLD}`
  )
  let escalationReason: string | null = null

  // 1. Quiet hours
  if (isQuietHourCT()) {
    escalationReason = "quiet_hours"
  }

  // 2. Brain explicitly escalated
  if (!escalationReason && composeResult.suggested_action === "escalate_to_patrick") {
    escalationReason = "brain_escalate"
  }

  // 3. Brain wants to honor opt-out (shouldn't happen post-STOP check, but defensive)
  if (!escalationReason && composeResult.suggested_action === "honor_optout") {
    escalationReason = "brain_optout"
  }

  // 4. Confidence below threshold
  if (!escalationReason && composeResult.confidence < threshold) {
    escalationReason = "low_confidence"
  }

  // 5. Inbound matched escalation keyword
  if (!escalationReason) {
    for (const pat of ESCALATION_PATTERNS) {
      if (pat.re.test(messageBody)) {
        escalationReason = pat.reason
        break
      }
    }
  }

  // 6. First-ever reply on this thread — always require human review the
  // first time the homeowner engages, so Patrick can validate the brain
  // before it goes full auto on the rest of the thread.
  if (!escalationReason) {
    const ourPriorOutbound = history.filter((m) => m.direction === "out").length
    const theirPriorInbound = history.filter((m) => m.direction === "in").length
    // If this is the FIRST inbound from them ever, escalate.
    if (theirPriorInbound === 0 && ourPriorOutbound > 0) {
      escalationReason = "first_human_review"
    }
  }

  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  const canSend = sid && token && fromNumber

  if (escalationReason || !canSend) {
    // Queue draft for Patrick's approval
    try {
      await supabaseAdmin.from("sms_messages").insert({
        listing_slug: leadSlug,
        direction: "out",
        from_phone: fromNumber || "(not configured)",
        to_phone: fromPhone,
        body: composeResult.draft,
        status: "pending_approval",
        bot_confidence: composeResult.confidence,
        bot_rationale: composeResult.rationale,
        escalation_reason: escalationReason || "twilio_not_configured",
        angle: composeResult.angle_used || null,
      })
    } catch (e) {
      console.error("pending_approval insert failed:", e)
    }
    await notifyPatrick({
      ownerName: ownerLabel,
      addressSnippet: addrSnip,
      inboundBody: messageBody,
      botAction: "queued",
      escalationReason: escalationReason || "twilio_not_configured",
    })
    return twimlResponse(EMPTY_TWIML)
  }

  // ───── Auto-send via Twilio ─────────────────────────────────────────
  const statusCallback = `https://${req.headers.get("host") || "falco.llc"}/api/sms/twilio-status`
  try {
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
          To: fromPhone,
          Body: composeResult.draft,
          StatusCallback: statusCallback,
        }).toString(),
      }
    )
    const twJson = (await tw.json().catch(() => ({}))) as {
      sid?: string
      status?: string
      error_message?: string
    }
    if (!tw.ok) {
      console.error("Twilio auto-send failed:", twJson.error_message)
      // Persist as failed
      await supabaseAdmin.from("sms_messages").insert({
        listing_slug: leadSlug,
        direction: "out",
        from_phone: fromNumber,
        to_phone: fromPhone,
        body: composeResult.draft,
        status: "failed",
        bot_confidence: composeResult.confidence,
        bot_rationale: composeResult.rationale,
        escalation_reason: "twilio_send_error: " + (twJson.error_message || tw.status),
        angle: composeResult.angle_used || null,
      })
      return twimlResponse(EMPTY_TWIML)
    }

    // Success — log as auto_sent
    await supabaseAdmin.from("sms_messages").insert({
      listing_slug: leadSlug,
      direction: "out",
      from_phone: fromNumber,
      to_phone: fromPhone,
      body: composeResult.draft,
      twilio_sid: twJson.sid,
      twilio_status: twJson.status,
      status: "auto_sent",
      bot_confidence: composeResult.confidence,
      bot_rationale: composeResult.rationale,
      angle: composeResult.angle_used || null,
      sent_at: new Date().toISOString(),
    })
    // Also log to dialer_activities for the brain's history reader
    await supabaseAdmin.from("dialer_activities").insert({
      listing_slug: leadSlug,
      channel: "text",
      outcome: "note_only",
      notes:
        `[OUT][AUTO][AI angle: ${composeResult.angle_used ?? "n/a"}][conf ${
          composeResult.confidence.toFixed(2)
        }] ` + composeResult.draft,
      created_by: "twilio_auto_respond",
      occurred_at: new Date().toISOString(),
    })
    await notifyPatrick({
      ownerName: ownerLabel,
      addressSnippet: addrSnip,
      inboundBody: messageBody,
      botAction: "auto_sent",
      escalationReason: null,
    })
  } catch (e) {
    console.error("Auto-send error:", e)
  }

  return twimlResponse(EMPTY_TWIML)
}

export async function GET() {
  return new NextResponse("FALCO Twilio webhook OK", { status: 200 })
}
