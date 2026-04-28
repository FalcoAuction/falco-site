// POST /api/dialer/qualify
// Mark a lead as a Qualified Lead delivered to Parks under the Data
// Services Agreement. This is the billable event:
//   - Locks the tier + fee from the lead's ARV at delivery time
//   - Persists a delivery record for invoicing + audit trail
//   - Fires the QL Delivered notification email to Parks (Dale)
//
// Caller authentication: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import {
  markQualifiedLeadDelivered,
  hasActiveQualifiedLead,
} from "@/lib/qualified-leads"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: {
    listingSlug?: string
    arv?: number
    appointmentAt?: string | null
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const slug = (body.listingSlug ?? "").trim()
  if (!slug) {
    return NextResponse.json({ error: "listingSlug required." }, { status: 400 })
  }

  const arv = Number(body.arv)
  if (!Number.isFinite(arv) || arv <= 0) {
    return NextResponse.json(
      { error: "Valid ARV required to classify tier and lock fee." },
      { status: 400 }
    )
  }

  // Prevent duplicate billable deliveries for the same listing
  if (await hasActiveQualifiedLead(slug)) {
    return NextResponse.json(
      {
        error:
          "This lead has already been delivered as a Qualified Lead. To deliver again, the prior delivery must be rejected or closed.",
      },
      { status: 409 }
    )
  }

  const result = await markQualifiedLeadDelivered({
    listingSlug: slug,
    arv,
    deliveredBy: session.caller,
    appointmentAt: body.appointmentAt ?? null,
    notes: body.notes,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Fire the email notification — non-blocking, errors logged but don't fail the request
  import("@/lib/dialer-notify")
    .then(({ notifyQualifiedLeadDelivered }) =>
      notifyQualifiedLeadDelivered({
        listingSlug: slug,
        deliveredBy: session.caller,
        tier: result.tier.tier,
        feeUSD: result.tier.feeUSD,
        arvAtDelivery: result.record.avmAtDelivery,
        appointmentAt: result.record.appointmentAt,
        notes: result.record.notes,
      })
    )
    .catch((err) =>
      console.error("notifyQualifiedLeadDelivered hook failed:", err)
    )

  return NextResponse.json({
    ok: true,
    qualifiedLead: result.record,
    tier: result.tier,
  })
}
