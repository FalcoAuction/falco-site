// POST /api/dialer/[slug]/ai-compose
//
// AI-drafted SMS — replaces the static opener-text templates with a
// real sales-brain that varies per lead, learns what's working, and
// drafts replies to inbound messages.
//
// Body shape:
//   { mode: "opener" }                              → cold first touch
//   { mode: "followup" }                            → next touch, different angle
//   { mode: "reply", inbound_message: "..." }       → drafting response to homeowner's text
//
// Returns:
//   {
//     draft: "the SMS body, ready to paste",
//     angle_used: string | null,
//     confidence: 0-1,
//     suggested_action: "send" | "edit_then_send" | "wait" | "escalate_to_patrick" | "honor_optout",
//     rationale: "...",
//     next_step_if_they_reply: "...",
//     smsHref: "sms:+1...?&body=..." | null,        ← so the UI can pop iMessage like the old flow
//     phone: "+1..."                                ← for display
//   }
//
// Auth: dialer or operator session.
//
// Compliance: if DNC flag set on the lead's phone, returns
// suggested_action="honor_optout" + empty draft. Caller must not send.
// Honors STOP/UNSUBSCRIBE keywords in inbound messages by detecting
// them in `inbound_message` (the brain is told to handle these, but
// we double-check here as a backstop).

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  FALCO_SALES_BRAIN_SYSTEM_PROMPT,
  buildLeadContext,
  buildComposeUserMessage,
  type ComposeRequest,
  type ComposeResult,
  type ConversationMessage,
  type OutreachAngle,
} from "@/lib/falco-sales-brain"
import type { DialerLeadView } from "@/lib/dialer-types"

export const dynamic = "force-dynamic"
export const maxDuration = 30 // OpenAI can take a few seconds

// Hard backstop for STOP/UNSUBSCRIBE — must short-circuit the brain
// and never send another message regardless of what the AI returns.
const OPTOUT_RE = /^\s*(stop|unsubscribe|optout|opt out|quit|cancel|end|remove|do not (text|contact|message))\b/i

// Auto-allowed outreach angles for variety. The brain picks one; we
// validate against this set so we don't accept a hallucinated tag.
const VALID_ANGLES: ReadonlyArray<OutreachAngle> = [
  "specific_filing",
  "equity_math",
  "disqualifier",
  "time_aware",
  "local_tn",
  "no_cost",
  "third_path",
  "neighbor_softener",
]

const DEFAULT_MODEL = "gpt-5-mini"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }
  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 })
  }

  let body: {
    mode?: "opener" | "reply" | "followup"
    inbound_message?: string
    hint_angle?: OutreachAngle
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const mode = body.mode || "opener"
  if (mode !== "opener" && mode !== "reply" && mode !== "followup") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 })
  }

  // Inbound STOP backstop — even if the bot doesn't catch it, this
  // does. Caller should also persist a DNC flag to Supabase.
  if (mode === "reply" && body.inbound_message && OPTOUT_RE.test(body.inbound_message)) {
    return NextResponse.json({
      draft: "",
      angle_used: null,
      confidence: 1.0,
      suggested_action: "honor_optout",
      rationale:
        "Inbound contains a STOP / UNSUBSCRIBE keyword. Do not send. Flag DNC on the lead's phone.",
      next_step_if_they_reply: "Mark phone as DNC. No further outbound on this number.",
      smsHref: null,
      phone: null,
    } satisfies ComposeResult & { smsHref: string | null; phone: string | null })
  }

  const apiKey = (process.env.OPENAI_API_KEY || "").trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set on the server." },
      { status: 500 }
    )
  }

  // ───── Load lead + conversation context ─────────────────────────────
  const inventory = await findDialerInventoryLead(slug)
  type HR = {
    full_name: string | null
    owner_name_records: string | null
    property_value: number | null
    last_sale_date: string | null
    phone: string | null
    phone_metadata: Record<string, unknown> | null
    distress_type: string | null
    trustee_sale_date: string | null
    property_address: string | null
    county: string | null
  }
  let hr: HR | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select(
        "full_name, owner_name_records, property_value, last_sale_date, phone, phone_metadata, distress_type, trustee_sale_date, property_address, county"
      )
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) hr = data as unknown as HR
  }

  if (!hr && !inventory) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 })
  }

  const phoneRaw = (hr?.phone || inventory?.ownerPhonePrimary || "").trim()
  const phoneDigits = phoneRaw.replace(/\D/g, "")
  const smsTo =
    phoneDigits.length === 10
      ? `+1${phoneDigits}`
      : phoneDigits.length === 11 && phoneDigits.startsWith("1")
      ? `+${phoneDigits}`
      : ""

  // DNC pre-check. phone_metadata.twilio_lookup.line_type may be
  // 'landline' which means SMS won't deliver — still let the bot draft
  // (caller can call instead), just flag low confidence.
  const pm = (hr?.phone_metadata ?? {}) as Record<string, unknown>
  const dncStatus = (pm["dnc"] ?? pm["dnc_status"] ?? "") as string | boolean
  const isDnc = dncStatus === true || dncStatus === "dnc" || dncStatus === "true"
  if (isDnc) {
    return NextResponse.json({
      draft: "",
      angle_used: null,
      confidence: 1.0,
      suggested_action: "honor_optout",
      rationale: "Lead phone is flagged DNC. Do not send.",
      next_step_if_they_reply:
        "Phone is DNC — no outbound. If they initiate contact, you can reply (implied consent), but never originate.",
      smsHref: null,
      phone: smsTo || null,
    })
  }

  // ───── Build the lead-view for the brain ─────────────────────────────
  // We don't need the full DialerLeadView shape; the brain reads from
  // a thin subset via buildLeadContext.
  const leadView = {
    slug,
    title: hr?.property_address || inventory?.address || "(unknown)",
    address: hr?.property_address || inventory?.address || undefined,
    county: hr?.county || inventory?.county || undefined,
    market: undefined,
    distressType: hr?.distress_type || inventory?.distressType || undefined,
    ownerName: hr?.owner_name_records || hr?.full_name || inventory?.ownerName || undefined,
    ownerMail: inventory?.ownerMail,
    ownerPhonePrimary: phoneRaw || undefined,
    ownerPhoneDncStatus:
      typeof dncStatus === "string" ? dncStatus : isDnc ? "dnc" : undefined,
    currentSaleDate: hr?.trustee_sale_date || inventory?.currentSaleDate || undefined,
    avmMid: hr?.property_value ?? inventory?.avmMid ?? undefined,
    equityBand: inventory?.equityBand,
    mortgageLender: inventory?.mortgageLender,
    trusteeSaleStatus: undefined as
      | "cancelled"
      | "postponed"
      | "ran"
      | "reinstated"
      | undefined,
  } satisfies Partial<DialerLeadView> & { slug: string; title: string }

  // Honor manual sale-status override
  const ss = pm["sale_status"] as { status?: string } | undefined
  if (ss && ss.status) {
    const s = String(ss.status).toLowerCase()
    if (s === "cancelled" || s === "postponed" || s === "ran" || s === "reinstated") {
      leadView.trusteeSaleStatus = s as typeof leadView.trusteeSaleStatus
    }
  }

  // Conversation history from dialer_activities (channel='text')
  const conversationHistory: ConversationMessage[] = []
  const priorAngles: OutreachAngle[] = []
  if (supabaseAdmin) {
    const { data: acts } = await supabaseAdmin
      .from("dialer_activities")
      .select("channel, outcome, notes, occurred_at, ai_angle, direction")
      .eq("listing_slug", slug)
      .eq("channel", "text")
      .order("occurred_at", { ascending: true })
    if (acts) {
      for (const a of acts) {
        const aTyped = a as {
          channel: string
          outcome: string | null
          notes: string | null
          occurred_at: string
          ai_angle?: string | null
          direction?: string | null
        }
        // direction column may not exist yet; default to "out" for
        // back-compat (Patrick's manual sends).
        const direction = (aTyped.direction === "in" ? "in" : "out") as "in" | "out"
        const body = (aTyped.notes || "").trim()
        if (!body) continue
        const angle =
          aTyped.ai_angle && VALID_ANGLES.includes(aTyped.ai_angle as OutreachAngle)
            ? (aTyped.ai_angle as OutreachAngle)
            : undefined
        conversationHistory.push({
          direction,
          body,
          occurred_at: aTyped.occurred_at,
          angle: angle || null,
        })
        if (direction === "out" && angle && !priorAngles.includes(angle)) {
          priorAngles.push(angle)
        }
      }
    }
  }

  // ───── Build the compose request ─────────────────────────────────────
  const leadContext = buildLeadContext(leadView as unknown as DialerLeadView)
  let composeReq: ComposeRequest
  if (mode === "opener") {
    composeReq = { mode: "opener", lead_context: leadContext, hint_angle: body.hint_angle }
  } else if (mode === "reply") {
    if (!body.inbound_message || !body.inbound_message.trim()) {
      return NextResponse.json(
        { error: "mode=reply requires inbound_message." },
        { status: 400 }
      )
    }
    composeReq = {
      mode: "reply",
      lead_context: leadContext,
      inbound_message: body.inbound_message.trim(),
      conversation_history: conversationHistory,
    }
  } else {
    composeReq = {
      mode: "followup",
      lead_context: leadContext,
      prior_angles: priorAngles,
      conversation_history: conversationHistory,
    }
  }

  // ───── Call OpenAI ───────────────────────────────────────────────────
  const userMessage = buildComposeUserMessage(composeReq)

  let openAiResp: Response
  try {
    openAiResp = await fetch("https://api.openai.com/v1/chat/completions", {
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
        // Slight randomness so variant angles actually vary across leads,
        // but not so much that voice gets weird.
        temperature: 0.7,
      }),
    })
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI fetch failed: ${(e as Error).message}` },
      { status: 502 }
    )
  }
  if (!openAiResp.ok) {
    const txt = await openAiResp.text().catch(() => "")
    return NextResponse.json(
      { error: `OpenAI ${openAiResp.status}: ${txt.slice(0, 300)}` },
      { status: 502 }
    )
  }

  const openAiJson = (await openAiResp.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = openAiJson?.choices?.[0]?.message?.content || ""
  if (!raw) {
    return NextResponse.json({ error: "OpenAI returned no content." }, { status: 502 })
  }

  let parsed: ComposeResult
  try {
    parsed = JSON.parse(raw) as ComposeResult
  } catch {
    return NextResponse.json(
      { error: "OpenAI returned non-JSON content.", raw_excerpt: raw.slice(0, 400) },
      { status: 502 }
    )
  }

  // Validate angle
  if (parsed.angle_used && !VALID_ANGLES.includes(parsed.angle_used)) {
    parsed.angle_used = null
  }

  // Build the iMessage / SMS URL for the existing send flow
  let smsHref: string | null = null
  if (smsTo && parsed.draft) {
    smsHref = `sms:${smsTo}${
      // iOS uses "&body=" with a leading "&" preceded by "?", but the
      // existing opener-text uses "?&body=" pattern and that works on
      // both iOS Messages and Android. Keep consistent.
      "?&body=" + encodeURIComponent(parsed.draft)
    }`
  }

  return NextResponse.json({
    ...parsed,
    smsHref,
    phone: smsTo || null,
  })
}
