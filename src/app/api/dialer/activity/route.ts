import { NextRequest, NextResponse } from "next/server"
import { getDialerSession } from "@/lib/dialer-session"
import {
  recordActivity,
  type DialerChannel,
  type DialerOutcome,
  type DialerNextAction,
} from "@/lib/dialer-data"

const CHANNELS: DialerChannel[] = ["call", "text", "voicemail", "email", "note"]
const OUTCOMES: DialerOutcome[] = [
  "connected",
  "voicemail_left",
  "no_answer",
  "wrong_number",
  "hung_up",
  "booked",
  "callback_requested",
  "not_interested",
  "do_not_call",
  "note_only",
]
const NEXT_ACTIONS: DialerNextAction[] = [
  "call",
  "text",
  "wait_callback",
  "hand_to_parkes",
  "drop",
  "none",
]

export async function POST(req: NextRequest) {
  const session = getDialerSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: {
    listingSlug?: string
    channel?: string
    outcome?: string
    notes?: string
    nextAction?: string | null
    nextActionAt?: string | null
    createdBy?: string
    occurredAt?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const slug = (body.listingSlug ?? "").trim()
  if (!slug) return NextResponse.json({ error: "listingSlug required." }, { status: 400 })
  if (!CHANNELS.includes(body.channel as DialerChannel)) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 400 })
  }
  if (!OUTCOMES.includes(body.outcome as DialerOutcome)) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 })
  }
  const nextAction = body.nextAction ? (body.nextAction as DialerNextAction) : null
  if (nextAction && !NEXT_ACTIONS.includes(nextAction)) {
    return NextResponse.json({ error: "Invalid nextAction." }, { status: 400 })
  }

  const created = await recordActivity({
    listingSlug: slug,
    channel: body.channel as DialerChannel,
    outcome: body.outcome as DialerOutcome,
    notes: (body.notes ?? "").toString(),
    nextAction,
    nextActionAt: body.nextActionAt ?? null,
    createdBy: body.createdBy?.trim() || session.caller,
    occurredAt: body.occurredAt,
  })

  if (!created) {
    return NextResponse.json({ error: "Failed to record activity." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, activity: created })
}
