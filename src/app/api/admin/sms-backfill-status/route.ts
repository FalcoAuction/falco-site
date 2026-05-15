// POST /api/admin/sms-backfill-status?hours=24&dry=1
//
// One-shot: refresh sms_messages.twilio_status for outbound rows whose
// twilio_sid we have but whose carrier-level delivery state was never
// updated (because the Status Callback wasn't wired when we sent them).
//
// For each matching row:
//   GET https://api.twilio.com/.../Messages/{sid}.json
//   → twilio_status = current carrier status
//   → if failed/undelivered: escalation_reason = "carrier_<status>:<code>:<msg>"
//
// Same logic as /api/sms/twilio-status (the live callback), just
// pull-mode instead of push.
//
// Admin-gated. Safe to run repeatedly (idempotent — only writes when
// status changed).

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const TERMINAL_FAILURES = new Set(["failed", "undelivered"])

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }

  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  if (!sid || !token) {
    return NextResponse.json(
      { error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set." },
      { status: 503 }
    )
  }

  const hours = Math.min(
    parseInt(req.nextUrl.searchParams.get("hours") || "24", 10) || 24,
    168
  )
  const dry = req.nextUrl.searchParams.get("dry") === "1"
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("sms_messages")
    .select("id, twilio_sid, twilio_status, to_phone, created_at")
    .eq("direction", "out")
    .gte("created_at", cutoff)
    .not("twilio_sid", "is", null)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, results: [] })
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64")
  const summary: Record<string, number> = {
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
  const results: Array<{
    sid: string
    to: string
    from_status: string | null
    to_status: string
    updated: boolean
    error?: string
  }> = []

  for (const row of data) {
    const msgSid = row.twilio_sid as string
    let r: {
      status?: string
      error_code?: number | string | null
      error_message?: string | null
    } = {}
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${encodeURIComponent(
          msgSid
        )}.json`,
        { headers: { Authorization: `Basic ${auth}` } }
      )
      if (!res.ok) {
        summary.api_errors++
        results.push({
          sid: msgSid,
          to: row.to_phone,
          from_status: row.twilio_status,
          to_status: "",
          updated: false,
          error: `http_${res.status}`,
        })
        continue
      }
      r = await res.json()
    } catch (e) {
      summary.api_errors++
      results.push({
        sid: msgSid,
        to: row.to_phone,
        from_status: row.twilio_status,
        to_status: "",
        updated: false,
        error: `fetch: ${String(e).slice(0, 100)}`,
      })
      continue
    }

    const newStatus = (r.status || "").toString()
    if (newStatus in summary) summary[newStatus]++
    else summary.other++

    if (newStatus === row.twilio_status) {
      summary.unchanged++
      results.push({
        sid: msgSid,
        to: row.to_phone,
        from_status: row.twilio_status,
        to_status: newStatus,
        updated: false,
      })
      continue
    }

    const updates: Record<string, unknown> = { twilio_status: newStatus }
    if (TERMINAL_FAILURES.has(newStatus)) {
      updates["escalation_reason"] =
        `carrier_${newStatus}` +
        (r.error_code ? `:${r.error_code}` : "") +
        (r.error_message ? `:${String(r.error_message).slice(0, 100)}` : "")
    }

    if (dry) {
      results.push({
        sid: msgSid,
        to: row.to_phone,
        from_status: row.twilio_status,
        to_status: newStatus,
        updated: false,
      })
    } else {
      const { error: uErr } = await supabaseAdmin
        .from("sms_messages")
        .update(updates)
        .eq("id", row.id)
      if (uErr) {
        results.push({
          sid: msgSid,
          to: row.to_phone,
          from_status: row.twilio_status,
          to_status: newStatus,
          updated: false,
          error: uErr.message,
        })
        continue
      }
      summary.updated++
      results.push({
        sid: msgSid,
        to: row.to_phone,
        from_status: row.twilio_status,
        to_status: newStatus,
        updated: true,
      })
    }
    // small throttle (~12 req/s)
    await new Promise((r) => setTimeout(r, 80))
  }

  return NextResponse.json({
    checked: data.length,
    dry,
    hours,
    summary,
    results,
  })
}
