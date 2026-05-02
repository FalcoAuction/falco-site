// Staging review + promotion endpoints.
//
//   GET    /api/admin/staging?bot_source=&status=&limit=
//   POST   /api/admin/staging  body={ id?, bot_source?, action: "promote"|"reject", reason? }
//
// "promote" → calls Postgres promote_staged_lead() (or _batch when bot_source given)
// "reject"  → marks staging row(s) staging_status='rejected'
//
// Admin-gated.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  const botSource = req.nextUrl.searchParams.get("bot_source")
  const status = req.nextUrl.searchParams.get("status") || "pending"
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 500)

  let q = supabaseAdmin
    .from("homeowner_requests_staging")
    .select("*")
    .order("staged_at", { ascending: false })
    .limit(limit)
  if (status !== "all") q = q.eq("staging_status", status)
  if (botSource) q = q.eq("bot_source", botSource)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate counts by bot_source + status for the dashboard
  const { data: agg } = await supabaseAdmin
    .from("homeowner_requests_staging")
    .select("bot_source, staging_status")
  type AggRow = { bot_source: string; staging_status: string }
  const counts: Record<string, { pending: number; verified: number; rejected: number }> = {}
  for (const r of (agg as AggRow[]) || []) {
    if (!counts[r.bot_source]) counts[r.bot_source] = { pending: 0, verified: 0, rejected: 0 }
    const s = r.staging_status as "pending" | "verified" | "rejected"
    if (s in counts[r.bot_source]) counts[r.bot_source][s]++
  }

  // Recent bot health
  const { data: health } = await supabaseAdmin
    .from("bot_run_health")
    .select("bot_source, status, fetched_count, staged_count, started_at")
    .order("started_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ rows: data, counts, health })
}

export async function POST(req: NextRequest) {
  const session = getAdminSession(req)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  let body: { id?: string; bot_source?: string; action?: "promote" | "reject"; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  if (!body.action) return NextResponse.json({ error: "action required" }, { status: 400 })

  const reviewer = "admin"

  if (body.action === "promote") {
    if (body.id) {
      const { data, error } = await supabaseAdmin.rpc("promote_staged_lead", {
        p_staging_id: body.id,
        p_reviewer: reviewer,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, result: data })
    }
    if (body.bot_source) {
      const { data, error } = await supabaseAdmin.rpc("promote_staged_batch", {
        p_bot_source: body.bot_source,
        p_reviewer: reviewer,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, result: data })
    }
    return NextResponse.json(
      { error: "promote requires id (single) or bot_source (batch)" },
      { status: 400 }
    )
  }

  if (body.action === "reject") {
    if (!body.id) return NextResponse.json({ error: "id required for reject" }, { status: 400 })
    const { error } = await supabaseAdmin
      .from("homeowner_requests_staging")
      .update({
        staging_status: "rejected",
        reviewed_by: reviewer,
        reviewed_at: new Date().toISOString(),
        rejection_reason: body.reason ?? "no reason",
      })
      .eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
