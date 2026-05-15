// GET /api/cron/sms-digest
//
// Daily email digest of SMS auto-respond activity. Fires via Vercel
// cron at 7pm CT (00:00 UTC next day, but TZ math approximated to UTC
// ~ midnight which lands ~7pm CDT). Patrick: "email digest at end of
// day."
//
// Summarizes the last 24h of SMS activity:
//   - All auto-replies the bot sent (with confidence + thread snippet)
//   - All pending_approval drafts waiting on Patrick
//   - All STOP / DNC events
//   - All escalations + their reasons
//
// Auth: Vercel cron sends an `Authorization: Bearer <CRON_SECRET>`
// header — we verify against env. Manual fires by Patrick work too
// (no auth check if same-origin admin session).

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const DIGEST_RECIPIENT =
  process.env.FALCO_DIGEST_EMAIL || "yuriarmour@gmail.com"

type SmsRow = {
  id: number
  listing_slug: string | null
  direction: "in" | "out"
  from_phone: string
  to_phone: string
  body: string
  status: string
  bot_confidence: number | null
  bot_rationale: string | null
  escalation_reason: string | null
  angle: string | null
  twilio_sid: string | null
  twilio_status: string | null
  received_at: string | null
  sent_at: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  // Cron auth
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

  const resendKey = (process.env.RESEND_API_KEY || "").trim()
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 503 }
    )
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Pull the last 24h of SMS activity
  const { data: rows, error } = await supabaseAdmin
    .from("sms_messages")
    .select(
      "id, listing_slug, direction, from_phone, to_phone, body, status, bot_confidence, bot_rationale, escalation_reason, angle, twilio_sid, twilio_status, received_at, sent_at, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const all = (rows ?? []) as SmsRow[]

  // Bucket by category
  const autoSent = all.filter((r) => r.status === "auto_sent")
  const pendingApproval = all.filter((r) => r.status === "pending_approval")
  const inbound = all.filter((r) => r.direction === "in")
  const dncEvents = all.filter(
    (r) =>
      r.direction === "in" &&
      /^\s*(stop|unsubscribe|optout|quit|cancel|end|remove)\b/i.test(r.body)
  )
  const failed = all.filter((r) => r.status === "failed")

  // Group by lead for context
  const slugs = Array.from(new Set(all.map((r) => r.listing_slug).filter(Boolean)))
  const ownerByLead = new Map<string, string>()
  if (slugs.length > 0) {
    const { data: leadRows } = await supabaseAdmin
      .from("homeowner_requests")
      .select("pipeline_lead_key, owner_name_records, full_name, property_address")
      .eq("source", "bot")
      .in("pipeline_lead_key", slugs as string[])
    for (const r of leadRows ?? []) {
      const rTyped = r as {
        pipeline_lead_key: string
        owner_name_records: string | null
        full_name: string | null
        property_address: string | null
      }
      const name =
        rTyped.owner_name_records ||
        rTyped.full_name ||
        rTyped.property_address ||
        "(unknown)"
      ownerByLead.set(rTyped.pipeline_lead_key, name)
    }
  }

  // ───── Compose HTML email ──────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function escape(s: string): string {
    return s.replace(/[<>&]/g, (c) =>
      c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
    )
  }

  function ownerName(slug: string | null): string {
    if (!slug) return "(unknown lead)"
    return ownerByLead.get(slug) || "(unmapped)"
  }

  function snippet(s: string, max = 160): string {
    if (s.length <= max) return s
    return s.slice(0, max) + "…"
  }

  const inboundList = inbound
    .map(
      (r) =>
        `<li><strong>${escape(ownerName(r.listing_slug))}</strong> (${escape(r.from_phone)}): "${escape(snippet(r.body))}"</li>`
    )
    .join("")

  const autoSentList = autoSent
    .map(
      (r) => `
    <li style="margin-bottom: 12px;">
      <strong>${escape(ownerName(r.listing_slug))}</strong>
      <span style="color: #666; font-size: 12px;">(conf ${(r.bot_confidence ?? 0).toFixed(2)}, angle ${escape(r.angle ?? "n/a")})</span>
      <div style="margin: 4px 0 0 0; padding: 6px 10px; background: #f0fdf4; border-left: 3px solid #15803d; font-size: 13px; line-height: 1.5;">${escape(r.body)}</div>
      ${r.bot_rationale ? `<div style="margin-top: 4px; font-size: 11px; color: #888;">${escape(r.bot_rationale)}</div>` : ""}
    </li>`
    )
    .join("")

  const pendingList = pendingApproval
    .map(
      (r) => `
    <li style="margin-bottom: 12px;">
      <strong>${escape(ownerName(r.listing_slug))}</strong>
      <span style="color: #b45309; font-size: 12px;">escalated: ${escape(r.escalation_reason || "low_confidence")}</span>
      <div style="margin: 4px 0 0 0; padding: 6px 10px; background: #fef3c7; border-left: 3px solid #b45309; font-size: 13px; line-height: 1.5;">${escape(r.body)}</div>
      <div style="margin-top: 4px; font-size: 11px; color: #888;">conf ${(r.bot_confidence ?? 0).toFixed(2)} · ${escape(r.bot_rationale ?? "")}</div>
    </li>`
    )
    .join("")

  const dncList = dncEvents
    .map(
      (r) =>
        `<li><strong>${escape(ownerName(r.listing_slug))}</strong> (${escape(r.from_phone)}): "${escape(r.body)}"</li>`
    )
    .join("")

  const failedList = failed
    .map(
      (r) =>
        `<li><strong>${escape(ownerName(r.listing_slug))}</strong>: ${escape(r.escalation_reason || "send error")}</li>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <div style="border-bottom: 2px solid #15803d; padding-bottom: 8px; margin-bottom: 16px;">
    <h1 style="margin: 0; font-size: 22px;">FALCO SMS digest · ${dateStr}</h1>
    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Last 24 hours of inbound + bot activity</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px;">
    <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Inbound</div>
      <div style="font-size: 24px; font-weight: 600; margin-top: 2px;">${inbound.length}</div>
    </div>
    <div style="background: #f0fdf4; padding: 10px; border-radius: 6px;">
      <div style="font-size: 11px; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em;">Auto-replied</div>
      <div style="font-size: 24px; font-weight: 600; margin-top: 2px; color: #15803d;">${autoSent.length}</div>
    </div>
    <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
      <div style="font-size: 11px; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em;">Awaiting you</div>
      <div style="font-size: 24px; font-weight: 600; margin-top: 2px; color: #b45309;">${pendingApproval.length}</div>
    </div>
    <div style="background: #fef2f2; padding: 10px; border-radius: 6px;">
      <div style="font-size: 11px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em;">DNC / failed</div>
      <div style="font-size: 24px; font-weight: 600; margin-top: 2px; color: #991b1b;">${dncEvents.length + failed.length}</div>
    </div>
  </div>

  ${
    pendingApproval.length > 0
      ? `<section style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #b45309;">⚠️ Awaiting your approval (${pendingApproval.length})</h2>
    <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
      The bot drafted but didn't auto-send. Open the dialer Inbox to approve or rewrite each.
    </div>
    <ul style="list-style: none; padding: 0;">${pendingList}</ul>
  </section>`
      : ""
  }

  ${
    autoSent.length > 0
      ? `<section style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #15803d;">✓ Auto-replied (${autoSent.length})</h2>
    <ul style="list-style: none; padding: 0;">${autoSentList}</ul>
  </section>`
      : ""
  }

  ${
    dncEvents.length > 0
      ? `<section style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #991b1b;">🚫 STOP / DNC (${dncEvents.length})</h2>
    <ul>${dncList}</ul>
  </section>`
      : ""
  }

  ${
    failed.length > 0
      ? `<section style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #991b1b;">✗ Send failures (${failed.length})</h2>
    <ul>${failedList}</ul>
  </section>`
      : ""
  }

  ${
    inbound.length > 0
      ? `<section style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #475569;">📥 All inbound (${inbound.length})</h2>
    <ul>${inboundList}</ul>
  </section>`
      : ""
  }

  ${
    all.length === 0
      ? `<p style="color: #64748b;">No SMS activity in the last 24 hours.</p>`
      : ""
  }

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
    <a href="https://falco.llc/dialer/inbox" style="color: #15803d;">→ Open AI Inbox</a>
    &nbsp; · &nbsp;
    Auto-respond config: threshold ${process.env.FALCO_SMS_AUTO_SEND_THRESHOLD || "0.7"}, ${process.env.FALCO_SMS_AUTO_SEND === "0" ? "DISABLED" : "enabled"}
  </div>
</body></html>`

  // ───── Send via Resend ─────────────────────────────────────────────
  const resend = new Resend(resendKey)
  try {
    const { error: sendErr } = await resend.emails.send({
      from: "FALCO <falco@falco.llc>",
      to: [DIGEST_RECIPIENT],
      subject: `FALCO SMS · ${inbound.length} in · ${autoSent.length} auto · ${pendingApproval.length} pending`,
      html,
    })
    if (sendErr) {
      return NextResponse.json(
        { error: "Resend send failed", detail: sendErr },
        { status: 502 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Resend exception: " + (e as Error).message },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    sent_to: DIGEST_RECIPIENT,
    counts: {
      inbound: inbound.length,
      auto_sent: autoSent.length,
      pending_approval: pendingApproval.length,
      dnc: dncEvents.length,
      failed: failed.length,
    },
  })
}
