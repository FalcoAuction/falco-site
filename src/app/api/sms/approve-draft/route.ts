// POST /api/sms/approve-draft
//
// Patrick's review actions on pending_approval drafts (campaign dry
// runs, brain escalations, low-confidence holds).
//
// Body:
//   { id: number, action: "approve" | "reject", body?: string }
//
// approve → send the draft (optionally edited) via Twilio, mark the
//   message manually_sent, log the activity, and advance the lead's
//   campaign sequence (step+1, humanized next touch) so an approved
//   opener flows straight into the normal drip.
// reject → mark failed with escalation_reason rejected_by_reviewer.
//   If the sequence was paused on this draft, it stays paused —
//   rejection is a human "not this lead / not this message" signal.
//
// Same hard rails as every send path: A2P gate, DNC check, quiet
// hours. Auth: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendTwilioSms, splitForHumanRhythm, humanNextSendAt, jitterMs } from "@/lib/sms-outreach"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function isQuietHourCT(): boolean {
  const utcHour = new Date().getUTCHours()
  const ctHour = (utcHour - 5 + 24) % 24
  return ctHour < 8 || ctHour >= 21
}

export async function POST(req: NextRequest) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 503 })
  }

  let body: { id?: number; action?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const id = body.id
  const action = (body.action || "").trim()
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id + action (approve|reject) required." }, { status: 400 })
  }

  const { data: draft } = await supabaseAdmin
    .from("sms_messages")
    .select("*")
    .eq("id", id)
    .eq("status", "pending_approval")
    .maybeSingle()
  if (!draft) {
    return NextResponse.json({ error: "Draft not found or already handled." }, { status: 404 })
  }

  if (action === "reject") {
    await supabaseAdmin
      .from("sms_messages")
      .update({
        status: "failed",
        escalation_reason: `rejected_by_${session.caller || "reviewer"}`,
      })
      .eq("id", id)
    return NextResponse.json({ ok: true, action: "rejected" })
  }

  // ── Approve → send ───────────────────────────────────────────────────
  const a2pOk = (process.env.TWILIO_A2P_REGISTERED || "").trim() === "1"
  if (!a2pOk) {
    return NextResponse.json(
      {
        error:
          "A2P 10DLC not registered — carriers will drop the message. Draft left pending; approve again once TWILIO_A2P_REGISTERED=1.",
      },
      { status: 451 }
    )
  }
  if (isQuietHourCT()) {
    return NextResponse.json(
      { error: "Quiet hours (9pm-8am CT). Draft left pending — approve during the day." },
      { status: 403 }
    )
  }

  // DNC re-check at the moment of send
  if (draft.listing_slug) {
    const { data: lead } = await supabaseAdmin
      .from("homeowner_requests")
      .select("phone_metadata")
      .eq("source", "bot")
      .eq("pipeline_lead_key", draft.listing_slug)
      .maybeSingle()
    const pm = (lead?.phone_metadata ?? {}) as Record<string, unknown>
    if (pm["dnc"] === true || pm["dnc"] === "true") {
      return NextResponse.json({ error: "Lead is DNC-flagged. Not sending." }, { status: 403 })
    }
  }

  const finalBody = (body.body || "").trim() || (draft.body as string)
  const host = req.headers.get("host") || "falco.llc"
  const parts = splitForHumanRhythm(finalBody)
  let firstSid = ""
  for (let i = 0; i < parts.length; i++) {
    const send = await sendTwilioSms(draft.to_phone as string, parts[i], host)
    if (!send.ok) {
      return NextResponse.json(
        { error: `Twilio: ${send.code ?? ""} ${send.error}`, opted_out: send.optedOut },
        { status: 502 }
      )
    }
    if (i === 0) firstSid = send.sid
    if (i < parts.length - 1) await new Promise((r) => setTimeout(r, jitterMs(5, 12)))
  }

  await supabaseAdmin
    .from("sms_messages")
    .update({
      status: "manually_sent",
      body: finalBody,
      twilio_sid: firstSid,
      twilio_status: "queued",
      sent_at: new Date().toISOString(),
      escalation_reason: null,
    })
    .eq("id", id)

  if (draft.listing_slug) {
    await supabaseAdmin.from("dialer_activities").insert({
      listing_slug: draft.listing_slug,
      channel: "text",
      outcome: "note_only",
      notes: `[OUT] [approved draft] ${finalBody}`.slice(0, 900),
      created_by: session.caller || "reviewer",
      occurred_at: new Date().toISOString(),
    })

    // Advance the campaign sequence: an approved draft counts as the
    // scheduled touch it was drafted for.
    const { data: seq } = await supabaseAdmin
      .from("sms_outreach_state")
      .select("*")
      .eq("listing_slug", draft.listing_slug)
      .maybeSingle()
    if (seq && ["active", "paused"].includes(seq.status as string)) {
      const newStep = (seq.step as number) + 1
      const done = newStep >= (seq.max_steps as number)
      await supabaseAdmin
        .from("sms_outreach_state")
        .update({
          step: newStep,
          status: done ? "exhausted" : "active",
          last_sent_at: new Date().toISOString(),
          next_send_at: done ? null : humanNextSendAt(2.5 + Math.random() * 1.5).toISOString(),
          angles_used: [
            ...(((seq.angles_used as string[]) || []) as string[]),
            (draft.angle as string) || "unknown",
          ],
          updated_at: new Date().toISOString(),
        })
        .eq("id", seq.id)
    }
  }

  return NextResponse.json({ ok: true, action: "sent", sid: firstSid, parts: parts.length })
}
