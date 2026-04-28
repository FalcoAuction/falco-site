// Server-side helpers for the FALCO × Parks Qualified Lead delivery workflow.
//
// A "Qualified Lead" is a billable delivery event under the Data Services
// Agreement: a vetted lead handed to Parks with verified contact, distress
// documentation, math sheet shared, and confirmed appointment.
//
// Each delivery locks a tier (T0–T3) and per-QL fee at the moment of delivery.

import { supabaseAdmin } from "@/lib/supabase-admin"
import { classifyTier, type QualifiedLeadTier, type TierInfo } from "@/lib/tier-classification"

export type QualifiedLeadStatus =
  | "delivered"
  | "accepted"
  | "rejected"
  | "replaced"
  | "closed_won"
  | "closed_lost"

export type QualifiedLead = {
  id: string
  listingSlug: string
  tier: QualifiedLeadTier
  feeUSD: number
  avmAtDelivery: number | null
  deliveredAt: string
  deliveredBy: string
  appointmentAt: string | null
  status: QualifiedLeadStatus
  rejectedAt: string | null
  rejectedReason: string | null
  invoiceNumber: string | null
  invoiceSentAt: string | null
  invoicePaidAt: string | null
  invoiceVoidedAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

type QualifiedLeadRow = {
  id: string
  listing_slug: string
  tier: QualifiedLeadTier
  fee_usd: number
  avm_at_delivery: number | null
  delivered_at: string
  delivered_by: string
  appointment_at: string | null
  status: QualifiedLeadStatus
  rejected_at: string | null
  rejected_reason: string | null
  invoice_number: string | null
  invoice_sent_at: string | null
  invoice_paid_at: string | null
  invoice_voided_at: string | null
  notes: string
  created_at: string
  updated_at: string
}

function mapRow(row: QualifiedLeadRow): QualifiedLead {
  return {
    id: row.id,
    listingSlug: row.listing_slug,
    tier: row.tier,
    feeUSD: row.fee_usd,
    avmAtDelivery: row.avm_at_delivery,
    deliveredAt: row.delivered_at,
    deliveredBy: row.delivered_by,
    appointmentAt: row.appointment_at,
    status: row.status,
    rejectedAt: row.rejected_at,
    rejectedReason: row.rejected_reason,
    invoiceNumber: row.invoice_number,
    invoiceSentAt: row.invoice_sent_at,
    invoicePaidAt: row.invoice_paid_at,
    invoiceVoidedAt: row.invoice_voided_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type MarkQualifiedLeadInput = {
  listingSlug: string
  /** ARV at delivery — used to lock tier + fee. Required. */
  arv: number
  /** Caller marking the lead as delivered. */
  deliveredBy: string
  /** Confirmed appointment with Parks — ISO timestamp, optional. */
  appointmentAt?: string | null
  /** Free-form context for Dale and the audit trail. */
  notes?: string
}

export type MarkQualifiedLeadResult =
  | { ok: true; record: QualifiedLead; tier: TierInfo }
  | { ok: false; error: string }

/**
 * Record a Qualified Lead delivery to Parks.
 *
 * - Locks tier + fee from ARV at delivery time
 * - Persists delivery record for invoicing + audit trail
 * - Returns the full record so callers can fire notification + invoice generation
 */
export async function markQualifiedLeadDelivered(
  input: MarkQualifiedLeadInput
): Promise<MarkQualifiedLeadResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase not configured" }
  }

  const slug = input.listingSlug.trim()
  if (!slug) return { ok: false, error: "listingSlug required" }

  const tier = classifyTier(input.arv)
  if (!tier) {
    return {
      ok: false,
      error: "ARV missing or invalid — cannot classify tier. Enrich the lead first.",
    }
  }

  const { data, error } = await supabaseAdmin
    .from("dialer_qualified_leads")
    .insert({
      listing_slug: slug,
      tier: tier.tier,
      fee_usd: tier.feeUSD,
      avm_at_delivery: Math.round(input.arv),
      delivered_by: (input.deliveredBy || "").trim(),
      appointment_at: input.appointmentAt ?? null,
      notes: (input.notes || "").trim(),
    })
    .select("*")
    .single()

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Failed to insert qualified lead record",
    }
  }

  return { ok: true, record: mapRow(data as QualifiedLeadRow), tier }
}

/**
 * Fetch all qualified-lead delivery records for a single listing slug,
 * ordered by most recent delivery first.
 */
export async function getQualifiedLeadsForSlug(slug: string): Promise<QualifiedLead[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from("dialer_qualified_leads")
    .select("*")
    .eq("listing_slug", slug)
    .order("delivered_at", { ascending: false })

  if (error || !data) {
    if (error) console.error("getQualifiedLeadsForSlug error:", error.message)
    return []
  }
  return (data as QualifiedLeadRow[]).map(mapRow)
}

/**
 * Has this listing already been delivered as a Qualified Lead?
 * Used to prevent duplicate delivery events for the same appointment.
 */
export async function hasActiveQualifiedLead(slug: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { data, error } = await supabaseAdmin
    .from("dialer_qualified_leads")
    .select("id, status")
    .eq("listing_slug", slug)
    .in("status", ["delivered", "accepted", "closed_won"])
    .limit(1)

  if (error) {
    console.error("hasActiveQualifiedLead error:", error.message)
    return false
  }
  return Array.isArray(data) && data.length > 0
}
