import { NextRequest, NextResponse } from "next/server"
import { getDialerSession } from "@/lib/dialer-session"
import {
  upsertWorkflow,
  type DialerStatus,
  type DialerNextAction,
} from "@/lib/dialer-data"

const STATUSES: DialerStatus[] = [
  "new",
  "attempting_contact",
  "rpc_made",
  "parkes_booked",
  "listing_signed",
  "auction_live",
  "closed_won",
  "closed_lost",
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
    status?: string
    nextAction?: string
    nextActionAt?: string | null
    parkesCallAt?: string | null
    closedLostReason?: string | null
    summaryNotes?: string
    updatedBy?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const slug = (body.listingSlug ?? "").trim()
  if (!slug) return NextResponse.json({ error: "listingSlug required." }, { status: 400 })

  if (body.status && !STATUSES.includes(body.status as DialerStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 })
  }
  if (body.nextAction && !NEXT_ACTIONS.includes(body.nextAction as DialerNextAction)) {
    return NextResponse.json({ error: "Invalid nextAction." }, { status: 400 })
  }

  const updated = await upsertWorkflow(slug, {
    status: body.status as DialerStatus | undefined,
    nextAction: body.nextAction as DialerNextAction | undefined,
    nextActionAt: body.nextActionAt ?? undefined,
    parkesCallAt: body.parkesCallAt ?? undefined,
    closedLostReason: body.closedLostReason ?? undefined,
    summaryNotes: body.summaryNotes,
    updatedBy: body.updatedBy?.trim() || session.caller,
  })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update workflow." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, workflow: updated })
}
