// POST /api/crm/activity: log a call, text, note or status change from the
// CRM record page. Same tables and rollups as the dialer
// (dialer_activities + dialer_lead_workflow via recordActivity), so both
// views always agree. Admin session only.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { recordActivity, upsertWorkflow, type DialerChannel, type DialerOutcome, type DialerNextAction } from "@/lib/dialer-data"
import type { DialerStatus } from "@/lib/dialer-types"

const CHANNELS: DialerChannel[] = ["call", "text", "voicemail", "email", "note", "door_knock", "flyer_left"]
const OUTCOMES: DialerOutcome[] = ["connected", "voicemail_left", "no_answer", "wrong_number", "hung_up", "booked", "callback_requested", "not_interested", "do_not_call", "note_only"]
const NEXT: DialerNextAction[] = ["call", "text", "wait_callback", "hand_to_auction", "drop", "none"]
const STATUSES: DialerStatus[] = ["new", "attempting_contact", "rpc_made", "auction_booked", "listing_signed", "auction_live", "closed_won", "closed_lost"]

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }

  const slug = String(body.slug ?? "").trim()
  if (!slug || slug.length > 200) return NextResponse.json({ error: "slug required." }, { status: 400 })
  const status = body.status ? String(body.status) as DialerStatus : null
  if (status && !STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 })
  const nextAction = body.nextAction ? String(body.nextAction) as DialerNextAction : null
  if (nextAction && !NEXT.includes(nextAction)) return NextResponse.json({ error: "Invalid next action." }, { status: 400 })
  const nextActionAt = body.nextActionAt ? new Date(String(body.nextActionAt)) : null
  if (nextActionAt && Number.isNaN(nextActionAt.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 })
  const notes = String(body.notes ?? "").slice(0, 4000)

  if (body.channel) {
    const channel = String(body.channel) as DialerChannel
    const outcome = String(body.outcome ?? "note_only") as DialerOutcome
    if (!CHANNELS.includes(channel) || !OUTCOMES.includes(outcome)) return NextResponse.json({ error: "Invalid channel or outcome." }, { status: 400 })
    const created = await recordActivity({
      listingSlug: slug, channel, outcome, notes, nextAction,
      nextActionAt: nextActionAt ? nextActionAt.toISOString() : null, createdBy: "patrick",
    })
    if (!created) return NextResponse.json({ error: "Could not save the activity." }, { status: 500 })
  }
  if (status || (!body.channel && (nextAction || nextActionAt))) {
    const wf = await upsertWorkflow(slug, {
      ...(status ? { status } : {}),
      ...(nextAction ? { nextAction } : {}),
      ...(nextActionAt ? { nextActionAt: nextActionAt.toISOString() } : {}),
      updatedBy: "patrick",
    })
    if (!wf) return NextResponse.json({ error: "Could not update the status." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
