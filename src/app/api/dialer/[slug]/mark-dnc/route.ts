// POST /api/dialer/[slug]/mark-dnc
//
// Flag a lead's phone as DNC (do not contact). After this:
//   - Lead drops out of /dialer/inbox queue (DNC pre-filter)
//   - /api/sms/twilio-send refuses to send (DNC pre-check)
//   - Twilio webhook auto-respond skips them (DNC pre-check)
//   - Lead's lead-detail page still works for manual review/undo
//
// Body (all optional):
//   { reason: "patrick: asked to stop verbally" }
//
// To undo: edit the lead's phone_metadata directly in admin / dialer
// detail page, or set phone_metadata.dnc = false via SQL.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

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

  let body: { reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const reason = (body.reason || "marked DNC via dialer inbox").trim()

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 })
  }

  // Read existing phone_metadata
  const { data: row, error: readErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("phone_metadata, owner_name_records, full_name")
    .eq("source", "bot")
    .eq("pipeline_lead_key", slug)
    .maybeSingle()
  if (readErr || !row) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const pm = (row.phone_metadata as Record<string, unknown> | null) ?? {}
  pm["dnc"] = true
  pm["dnc_at"] = new Date().toISOString()
  pm["dnc_reason"] = reason
  pm["dnc_by"] = session.caller || "patrick"

  const { error: updateErr } = await supabaseAdmin
    .from("homeowner_requests")
    .update({ phone_metadata: pm })
    .eq("source", "bot")
    .eq("pipeline_lead_key", slug)
  if (updateErr) {
    return NextResponse.json(
      { error: "Update failed: " + updateErr.message },
      { status: 500 }
    )
  }

  // Log the DNC event so the 24h-rolling filter drops the lead from
  // the queue AND we have audit trail.
  try {
    await supabaseAdmin.from("dialer_activities").insert({
      listing_slug: slug,
      channel: "note",
      outcome: "do_not_call",
      notes: `[DNC] ${reason}`,
      created_by: session.caller || "patrick",
      occurred_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error("DNC activity log failed:", e)
  }

  return NextResponse.json({
    ok: true,
    slug,
    owner: row.owner_name_records || row.full_name,
  })
}
