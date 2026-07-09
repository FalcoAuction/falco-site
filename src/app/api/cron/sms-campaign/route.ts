// GET /api/cron/sms-campaign
//
// The autonomous SMS outreach engine. Every ~20 minutes during the
// send window it:
//   1. Enrolls fresh callable leads into sms_outreach_state (opener +
//      up to two follow-ups per lead, humanized schedule).
//   2. Sends the handful of messages that are due — composed one at a
//      time by the FALCO sales brain so no two leads ever get the
//      same text, split into two bubbles when a human would, with
//      15-40s gaps between leads so the carrier sees a person, not a
//      cannon.
//   3. Retires sequences on reply (webhook flips status), STOP,
//      carrier blacklist (21610), or exhaustion.
//
// Safety rails, all hard:
//   - FALCO_SMS_CAMPAIGN env: unset/off = engine does nothing.
//     "dry" = compose + queue as pending_approval, send nothing
//     (lets Patrick read what the machine WOULD say).
//     "live" = real sends.
//   - TWILIO_A2P_REGISTERED=1 required for live (carrier compliance).
//   - Campaign window: Mon-Fri 9:40a-6:50p CT, Sat 11:10a-3:50p,
//     Sunday closed. Tighter than the legal window on purpose.
//   - Daily trust ramp: 15/day rising +12/day to 75 (FALCO_SMS_DAILY_CAP
//     overrides the ceiling). Counts ALL outbound, not just campaign.
//   - Enrollment excludes: DNC, manual sale-status closed, business
//     entities, anyone who has EVER texted us back (conversations
//     belong to the reply layer, never the drip).
//
// Auth: CRON_SECRET bearer.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  FALCO_SALES_BRAIN_SYSTEM_PROMPT,
  buildComposeUserMessage,
  type ComposeRequest,
  type ComposeResult,
  type ConversationMessage,
  type OutreachAngle,
} from "@/lib/falco-sales-brain"
import {
  isWithinCampaignWindow,
  dailyCapRemaining,
  humanNextSendAt,
  jitterMs,
  splitForHumanRhythm,
  sendTwilioSms,
  humanizeDraft,
  openerVariantForSlug,
} from "@/lib/sms-outreach"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const FORECLOSURE_DISTRESS = [
  "PRE_FORECLOSURE",
  "PREFORECLOSURE",
  "TRUSTEE_NOTICE",
  "LIS_PENDENS",
  "SOT",
  "SUBSTITUTION_OF_TRUSTEE",
  "NOD",
  "NOTICE_OF_DEFAULT",
  "FORECLOSURE",
]

const BUSINESS_RE =
  /\b(LLC|L\.L\.C|INC|CORP|TRUST|HOLDINGS|PROPERTIES|COMPANY|GROUP|PARTNERS|REALTY|INVESTMENT|LP|LLP|FOUNDATION|CHURCH|ESTATES|VENTURES|CONSTRUCTION)\b/i

const MAX_SENDS_PER_TICK = 6
const ENROLL_BUFFER = 40 // keep this many active sequences queued

type LeadRow = {
  pipeline_lead_key: string
  full_name: string | null
  owner_name_records: string | null
  property_address: string | null
  county: string | null
  distress_type: string | null
  property_value: number | null
  mortgage_balance: number | null
  trustee_sale_date: string | null
  sale_date_last_seen_at: string | null
  phone: string | null
  phone_metadata: Record<string, unknown> | null
}

function e164(raw: string): string | null {
  const d = raw.replace(/\D/g, "")
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith("1")) return `+${d}`
  return null
}

function firstName(owner: string): string {
  const primary = owner.split(/[;&]| and /i)[0].trim()
  if (primary.includes(",")) {
    return (primary.split(",")[1] || "").trim().split(" ")[0] || primary
  }
  return primary.split(" ")[0] || primary
}

/** Compact lead context for the brain — built from the raw row so the
 *  campaign engine doesn't need the heavyweight dialer inventory. */
function leadContextFromRow(r: LeadRow, step: number, maxSteps: number): string {
  const equity =
    r.property_value && r.property_value > 0
      ? r.property_value - (r.mortgage_balance || 0)
      : null
  const days = r.trustee_sale_date
    ? Math.ceil((new Date(r.trustee_sale_date).getTime() - Date.now()) / 86400000)
    : null
  const pm = r.phone_metadata || {}
  const trace = (pm["batchdata_skip_trace"] as Record<string, unknown>) || {}
  const nameVerified = trace["primary_match_mode"] === "owner_name_verified"
  const ct = new Date(Date.now() - 5 * 3600000)
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][ct.getUTCDay()]
  const hr12 = ((ct.getUTCHours() + 11) % 12) + 1
  const ampm = ct.getUTCHours() >= 12 ? "pm" : "am"
  const lines = [
    `Current time in Tennessee: ${weekday} ${hr12}:${String(ct.getUTCMinutes()).padStart(2, "0")}${ampm} CT`,
    `Owner: ${r.full_name || r.owner_name_records || "(name unknown)"}`,
    `First name to use: ${firstName(r.full_name || r.owner_name_records || "")}`,
    `Property: ${r.property_address || "(address unknown)"}`,
    `County: ${r.county || "?"}`,
    `Distress: ${r.distress_type || "?"}`,
    r.trustee_sale_date
      ? `Trustee sale date: ${r.trustee_sale_date}${days !== null ? ` (${days} days out)` : ""}`
      : "Trustee sale date: not set",
    r.property_value ? `Est. value: $${Math.round(r.property_value).toLocaleString()}` : "",
    r.mortgage_balance
      ? `Est. owed: $${Math.round(r.mortgage_balance).toLocaleString()}`
      : "",
    equity !== null ? `Est. equity: $${Math.round(equity).toLocaleString()}` : "",
    nameVerified
      ? "Phone match: number verified to the owner's name."
      : "Phone match: number tied to the address, owner name NOT confirmed. Do not assume who answers; identify the property, not the person.",
    `Campaign touch: message ${step + 1} of ${maxSteps}.` +
      (step + 1 >= maxSteps
        ? " This is the LAST scheduled touch. Leave the door open warmly, zero pressure, make clear you won't keep texting."
        : ""),
  ]
  return lines.filter(Boolean).join("\n")
}

async function composeDraft(
  req: ComposeRequest
): Promise<ComposeResult | { error: string }> {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim()
  if (!apiKey) return { error: "OPENAI_API_KEY not set" }
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.FALCO_AI_COMPOSE_MODEL || "gpt-5-mini",
        messages: [
          { role: "system", content: FALCO_SALES_BRAIN_SYSTEM_PROMPT },
          { role: "user", content: buildComposeUserMessage(req) },
        ],
        response_format: { type: "json_object" },
      }),
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "")
      return { error: `openai_${resp.status}: ${txt.slice(0, 200)}` }
    }
    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content || ""
    return JSON.parse(raw) as ComposeResult
  } catch (e) {
    return { error: String(e).slice(0, 200) }
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim()
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 })
  }

  const mode = (process.env.FALCO_SMS_CAMPAIGN || "").trim().toLowerCase()
  if (mode !== "live" && mode !== "dry") {
    return NextResponse.json({
      ok: true,
      mode: "off",
      note: "Set FALCO_SMS_CAMPAIGN=dry to preview drafts, =live to send.",
    })
  }
  const a2pOk = (process.env.TWILIO_A2P_REGISTERED || "").trim() === "1"
  if (mode === "live" && !a2pOk) {
    return NextResponse.json({
      ok: true,
      mode,
      blocked: "TWILIO_A2P_REGISTERED != 1 — carriers drop unregistered traffic. Not sending.",
    })
  }
  if (mode === "live" && !isWithinCampaignWindow()) {
    return NextResponse.json({ ok: true, mode, note: "outside campaign window" })
  }

  const { cap, sentToday, remaining } = await dailyCapRemaining()
  if (mode === "live" && remaining <= 0) {
    return NextResponse.json({ ok: true, mode, cap, sentToday, note: "daily cap reached" })
  }

  const host = req.headers.get("host") || "falco.llc"
  const summary = {
    mode,
    cap,
    sentToday,
    enrolled: 0,
    sent: 0,
    drafted_dry: 0,
    parts_sent: 0,
    opted_out: 0,
    exhausted: 0,
    skipped: 0,
    errors: [] as string[],
  }

  // ── 1. Enrollment ───────────────────────────────────────────────────
  try {
    const { count: activeCount } = await supabaseAdmin
      .from("sms_outreach_state")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
    if ((activeCount ?? 0) < ENROLL_BUFFER) {
      const today = new Date()
      const from = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10)
      const to = new Date(today.getTime() + 45 * 86400000).toISOString().slice(0, 10)
      const { data: candidates } = await supabaseAdmin
        .from("homeowner_requests")
        .select(
          "pipeline_lead_key, full_name, owner_name_records, property_address, county, distress_type, property_value, mortgage_balance, trustee_sale_date, sale_date_last_seen_at, phone, phone_metadata"
        )
        .eq("source", "bot")
        .in("distress_type", FORECLOSURE_DISTRESS)
        .gte("trustee_sale_date", from)
        .lte("trustee_sale_date", to)
        .gt("property_value", 0)
        .not("phone", "is", null)
        .not("pipeline_lead_key", "is", null)
        .order("trustee_sale_date", { ascending: true })
        .limit(300)

      const rows = ((candidates || []) as LeadRow[]).filter((r) => {
        const equity = (r.property_value || 0) - (r.mortgage_balance || 0)
        if (equity <= 25000) return false
        const owner = `${r.full_name || ""} ${r.owner_name_records || ""}`
        if (BUSINESS_RE.test(owner) || owner.toUpperCase().includes("ESTATE OF")) return false
        const pm = r.phone_metadata || {}
        if (pm["dnc"] === true || pm["dnc"] === "true") return false
        const ss = (pm["sale_status"] as Record<string, unknown>) || {}
        if (["cancelled", "reinstated", "ran"].includes(String(ss["status"] || ""))) return false
        return !!e164(r.phone || "")
      })

      if (rows.length > 0) {
        const slugs = rows.map((r) => r.pipeline_lead_key)
        // Already enrolled (any status) — never re-enroll
        const { data: existing } = await supabaseAdmin
          .from("sms_outreach_state")
          .select("listing_slug")
          .in("listing_slug", slugs)
        const enrolledSet = new Set((existing || []).map((r) => r.listing_slug))
        // Anyone who has ever texted us back is a conversation, not a drip
        const { data: inbound } = await supabaseAdmin
          .from("sms_messages")
          .select("listing_slug")
          .eq("direction", "in")
          .in("listing_slug", slugs)
        const repliedSet = new Set((inbound || []).map((r) => r.listing_slug))

        const toEnroll = rows
          .filter(
            (r) =>
              !enrolledSet.has(r.pipeline_lead_key) &&
              !repliedSet.has(r.pipeline_lead_key)
          )
          .slice(0, ENROLL_BUFFER - (activeCount ?? 0))

        for (const r of toEnroll) {
          // Openers spread over the next 0-2 days at human times
          const { error } = await supabaseAdmin.from("sms_outreach_state").insert({
            listing_slug: r.pipeline_lead_key,
            to_phone: e164(r.phone || "")!,
            status: "active",
            step: 0,
            max_steps: 3,
            next_send_at: humanNextSendAt(Math.random() * 1.6).toISOString(),
          })
          if (!error) summary.enrolled++
        }
      }
    }
  } catch (e) {
    summary.errors.push(`enroll: ${String(e).slice(0, 150)}`)
  }

  // ── 2. Send what's due ──────────────────────────────────────────────
  const batchCap =
    mode === "dry" ? 3 : Math.min(MAX_SENDS_PER_TICK, remaining)
  const { data: due } = await supabaseAdmin
    .from("sms_outreach_state")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .order("next_send_at", { ascending: true })
    .limit(batchCap)

  for (const seq of due || []) {
    try {
      // Fresh lead state — re-check the rails right before send
      const { data: lead } = await supabaseAdmin
        .from("homeowner_requests")
        .select(
          "pipeline_lead_key, full_name, owner_name_records, property_address, county, distress_type, property_value, mortgage_balance, trustee_sale_date, sale_date_last_seen_at, phone, phone_metadata"
        )
        .eq("source", "bot")
        .eq("pipeline_lead_key", seq.listing_slug)
        .maybeSingle()
      if (!lead) {
        summary.skipped++
        continue
      }
      const l = lead as LeadRow
      const pm = l.phone_metadata || {}
      const ss = (pm["sale_status"] as Record<string, unknown>) || {}
      const saleGone =
        l.trustee_sale_date && new Date(l.trustee_sale_date).getTime() < Date.now()
      if (
        pm["dnc"] === true ||
        ["cancelled", "reinstated", "ran"].includes(String(ss["status"] || "")) ||
        saleGone
      ) {
        await supabaseAdmin
          .from("sms_outreach_state")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", seq.id)
        summary.skipped++
        continue
      }
      // Inbound since enrollment? Conversation layer owns it.
      const { count: inboundCount } = await supabaseAdmin
        .from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("listing_slug", seq.listing_slug)
        .eq("direction", "in")
      if ((inboundCount ?? 0) > 0) {
        await supabaseAdmin
          .from("sms_outreach_state")
          .update({ status: "replied", updated_at: new Date().toISOString() })
          .eq("id", seq.id)
        summary.skipped++
        continue
      }

      // Compose — opener for step 0, followup after. Step 0 runs the
      // opener-variant A/B test: stable arm per lead, attribution via
      // the angle tag (opener_<variant>) on the message row.
      const context = leadContextFromRow(l, seq.step as number, seq.max_steps as number)
      const openerVariant = openerVariantForSlug(seq.listing_slug as string)
      let composeReq: ComposeRequest
      if ((seq.step as number) === 0) {
        composeReq = {
          mode: "opener",
          lead_context: context,
          opener_variant: openerVariant,
        }
      } else {
        const { data: history } = await supabaseAdmin
          .from("sms_messages")
          .select("direction, body, created_at, angle")
          .eq("listing_slug", seq.listing_slug)
          .order("created_at", { ascending: true })
          .limit(10)
        const conversationHistory: ConversationMessage[] = (history || []).map((m) => ({
          direction: m.direction as "in" | "out",
          body: m.body as string,
          occurred_at: m.created_at as string,
          angle: (m.angle as OutreachAngle) || null,
        }))
        composeReq = {
          mode: "followup",
          lead_context: context,
          prior_angles: ((seq.angles_used as string[]) || []) as OutreachAngle[],
          conversation_history: conversationHistory,
          campaign_message_number: (seq.step as number) + 1,
          campaign_is_final: (seq.step as number) + 1 >= (seq.max_steps as number),
        }
      }
      const result = await composeDraft(composeReq)
      if ("error" in result) {
        summary.errors.push(`compose ${seq.listing_slug}: ${result.error}`)
        continue
      }
      // Code-level hygiene: strip AI-tell dashes everywhere; force
      // openers down to a single bubble regardless of what the model
      // returned. Attribution: step-0 messages carry the test arm.
      result.draft = humanizeDraft(result.draft, {
        singleBubble: (seq.step as number) === 0,
      })
      const angleTag =
        (seq.step as number) === 0
          ? `opener_${openerVariant}`
          : result.angle_used || "unknown"
      if (
        result.suggested_action === "escalate_to_patrick" ||
        result.suggested_action === "honor_optout" ||
        result.confidence < 0.6
      ) {
        // Brain says a human should look — park the draft, pause the drip
        await supabaseAdmin.from("sms_messages").insert({
          listing_slug: seq.listing_slug,
          direction: "out",
          from_phone: (process.env.TWILIO_FROM_NUMBER || "").trim() || "(campaign)",
          to_phone: seq.to_phone,
          body: result.draft,
          status: "pending_approval",
          bot_confidence: result.confidence,
          bot_rationale: `[campaign step ${(seq.step as number) + 1}] ${result.rationale || ""}`.slice(0, 500),
          escalation_reason: `campaign_${result.suggested_action}`,
          angle: angleTag,
        })
        await supabaseAdmin
          .from("sms_outreach_state")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", seq.id)
        summary.skipped++
        continue
      }

      if (mode === "dry") {
        await supabaseAdmin.from("sms_messages").insert({
          listing_slug: seq.listing_slug,
          direction: "out",
          from_phone: "(dry-run)",
          to_phone: seq.to_phone,
          body: result.draft,
          status: "pending_approval",
          bot_confidence: result.confidence,
          bot_rationale: `[campaign DRY step ${(seq.step as number) + 1}] ${result.rationale || ""}`.slice(0, 500),
          escalation_reason: "campaign_dry_run",
          angle: angleTag,
        })
        summary.drafted_dry++
        continue // state untouched — dry runs never consume steps
      }

      // ── LIVE send, split into human bubbles ─────────────────────────
      const parts = splitForHumanRhythm(result.draft)
      let allOk = true
      for (let i = 0; i < parts.length; i++) {
        const send = await sendTwilioSms(seq.to_phone, parts[i], host)
        if (!send.ok) {
          allOk = false
          if (send.optedOut) {
            await supabaseAdmin
              .from("sms_outreach_state")
              .update({ status: "opted_out", updated_at: new Date().toISOString() })
              .eq("id", seq.id)
            const pmu = { ...(pm as Record<string, unknown>) }
            pmu["dnc"] = true
            pmu["dnc_reason"] = "carrier STOP list (21610)"
            await supabaseAdmin
              .from("homeowner_requests")
              .update({ phone_metadata: pmu })
              .eq("source", "bot")
              .eq("pipeline_lead_key", seq.listing_slug)
            summary.opted_out++
          } else {
            summary.errors.push(`send ${seq.listing_slug}: ${send.code} ${send.error}`)
          }
          break
        }
        summary.parts_sent++
        await supabaseAdmin.from("sms_messages").insert({
          listing_slug: seq.listing_slug,
          direction: "out",
          from_phone: (process.env.TWILIO_FROM_NUMBER || "").trim(),
          to_phone: seq.to_phone,
          body: parts[i],
          twilio_sid: send.sid,
          twilio_status: send.status,
          status: "auto_sent",
          bot_confidence: result.confidence,
          bot_rationale: `[campaign step ${(seq.step as number) + 1}${parts.length > 1 ? ` part ${i + 1}/${parts.length}` : ""}] ${result.rationale || ""}`.slice(0, 500),
          angle: angleTag,
          sent_at: new Date().toISOString(),
        })
        if (i < parts.length - 1) {
          await new Promise((r) => setTimeout(r, jitterMs(6, 18)))
        }
      }
      if (!allOk) continue

      summary.sent++
      await supabaseAdmin.from("dialer_activities").insert({
        listing_slug: seq.listing_slug,
        channel: "text",
        outcome: "note_only",
        notes: `[OUT] [campaign step ${(seq.step as number) + 1}] [AI angle: ${result.angle_used || "?"}] ${result.draft}`.slice(0, 900),
        created_by: "sms_campaign",
        occurred_at: new Date().toISOString(),
      })
      const newStep = (seq.step as number) + 1
      const done = newStep >= (seq.max_steps as number)
      const angles = [
        ...(((seq.angles_used as string[]) || []) as string[]),
        angleTag,
      ]
      await supabaseAdmin
        .from("sms_outreach_state")
        .update({
          step: newStep,
          status: done ? "exhausted" : "active",
          last_sent_at: new Date().toISOString(),
          next_send_at: done ? null : humanNextSendAt(2.5 + Math.random() * 1.5).toISOString(),
          angles_used: angles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seq.id)
      if (done) summary.exhausted++

      // Human gap before the next lead
      await new Promise((r) => setTimeout(r, jitterMs(14, 38)))
    } catch (e) {
      summary.errors.push(`${seq.listing_slug}: ${String(e).slice(0, 150)}`)
    }
  }

  return NextResponse.json({ ok: true, ...summary })
}
