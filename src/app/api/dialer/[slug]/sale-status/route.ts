// POST /api/dialer/[slug]/sale-status
//
// Manual sale-status flag set by the caller after talking to a lead.
// Stored in phone_metadata.sale_status so we don't need a schema
// migration. Used by the dialer queue to deprioritize cancelled leads
// and by the math sheet hero to switch from "your trustee sale is X
// days out" framing to neutral copy.
//
// Body: { status, note?, newSaleDate? }
// status: "cancelled" | "postponed" | "ran" | "reinstated" | "scheduled"
//   - cancelled: lender voluntarily withdrew the sale notice
//   - postponed: lender pushed to a new date (newSaleDate required)
//   - ran: trustee sale happened (property foreclosed)
//   - reinstated: borrower brought arrears current, no sale
//   - scheduled: clear any prior status flag, restore to default
//
// Auth: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type SaleStatus = "cancelled" | "postponed" | "ran" | "reinstated" | "scheduled"
const VALID_STATUSES: SaleStatus[] = [
  "cancelled",
  "postponed",
  "ran",
  "reinstated",
  "scheduled",
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 }
    )
  }

  const { slug } = await params
  let body: { status?: string; note?: string; newSaleDate?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const status = (body.status || "").toLowerCase() as SaleStatus
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }
  if (status === "postponed" && !body.newSaleDate) {
    return NextResponse.json(
      { error: "newSaleDate required when status=postponed" },
      { status: 400 }
    )
  }

  // Look up the lead by pipeline_lead_key (which is the dialer slug)
  const { data: lead, error: lookupErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("id, phone_metadata, trustee_sale_date")
    .eq("source", "bot")
    .eq("pipeline_lead_key", slug)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json(
      { error: `lookup failed: ${lookupErr.message}` },
      { status: 500 }
    )
  }
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 })
  }

  // Merge into existing phone_metadata
  const pm =
    (lead.phone_metadata && typeof lead.phone_metadata === "object"
      ? (lead.phone_metadata as Record<string, unknown>)
      : {}) ?? {}

  const existing =
    pm.sale_status && typeof pm.sale_status === "object"
      ? (pm.sale_status as Record<string, unknown>)
      : {}

  // For "scheduled" we clear the status block (back to default)
  const next =
    status === "scheduled"
      ? null
      : {
          ...existing,
          status,
          updated_at: new Date().toISOString(),
          source: "manual",
          updated_by: session.caller || "dialer",
          ...(body.note ? { note: body.note } : {}),
          ...(body.newSaleDate ? { new_sale_date: body.newSaleDate } : {}),
        }

  const update: Record<string, unknown> = {
    phone_metadata: { ...pm, sale_status: next },
  }

  // For "postponed", also update the trustee_sale_date column so the
  // dialer queue / countdown / math sheet hero all pick up the new date
  // automatically. Original date preserved in phone_metadata.sale_status.
  if (status === "postponed" && body.newSaleDate) {
    update.trustee_sale_date = body.newSaleDate
    if (lead.trustee_sale_date) {
      const updatedSaleStatus = next as Record<string, unknown>
      updatedSaleStatus.previous_sale_date = lead.trustee_sale_date
    }
  }

  // For "ran" or "cancelled" or "reinstated" we leave trustee_sale_date
  // alone — the dialer's existing past-date filtering handles foreclosed
  // leads, and we want the original date preserved as an audit trail.

  const { error: updateErr } = await supabaseAdmin
    .from("homeowner_requests")
    .update(update)
    .eq("id", lead.id)

  if (updateErr) {
    return NextResponse.json(
      { error: `update failed: ${updateErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    status,
    updatedAt: new Date().toISOString(),
  })
}
