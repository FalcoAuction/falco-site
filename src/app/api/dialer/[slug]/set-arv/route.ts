// POST /api/dialer/[slug]/set-arv
//
// Manual ARV override. Caller (or operator) sets a verified value for
// a lead — e.g. from Zillow Zestimate, Redfin Estimate, comp pull, or
// homeowner verbal. Writes:
//   - property_value (the column the dialer reads)
//   - property_value_source (so audits don't classify it as phantom)
//   - phone_metadata.property_value_override (audit block — amount,
//     source, who set it, when, optional note)
//   - admin_notes appended with timestamp + override line
//
// The override key in phone_metadata is recognized by
// computePropertyValueConsensus as the highest-confidence source
// (1.0), so the math sheet immediately uses this value the next
// time it renders.
//
// Body: { value: number, source: string, note?: string }
// Auth: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const ALLOWED_SOURCES = [
  "zillow",
  "redfin",
  "realtor_com",
  "mls_comp",
  "homeowner_verbal",
  "drive_by",
  "manual_other",
] as const
type SourceLabel = (typeof ALLOWED_SOURCES)[number]

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

  let body: { value?: unknown; source?: unknown; note?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const value = Number(body.value)
  if (!Number.isFinite(value) || value <= 0 || value > 50_000_000) {
    return NextResponse.json(
      { error: "value must be a positive number under $50M." },
      { status: 400 }
    )
  }

  const sourceRaw = String(body.source || "").toLowerCase().trim()
  if (!ALLOWED_SOURCES.includes(sourceRaw as SourceLabel)) {
    return NextResponse.json(
      {
        error: `source must be one of: ${ALLOWED_SOURCES.join(", ")}`,
      },
      { status: 400 }
    )
  }
  const source = sourceRaw as SourceLabel

  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null

  // Look up the lead by pipeline_lead_key
  const { data: lead, error: lookupErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("id, phone_metadata")
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

  const pm =
    (lead.phone_metadata && typeof lead.phone_metadata === "object"
      ? (lead.phone_metadata as Record<string, unknown>)
      : {}) ?? {}

  const overrideBlock = {
    amount: value,
    source,
    note: note || undefined,
    set_at: new Date().toISOString(),
    set_by: session.caller || "dialer",
  }

  const sourceLabel = `Manual override: ${source}`
  const auditLine = `[${new Date().toISOString()}] ARV manual override: $${value.toLocaleString()} (source: ${source}${note ? ` — ${note}` : ""}) by ${session.caller || "dialer"}.`

  // Read existing admin_notes so we can append the audit line in the
  // same write (avoids race vs. concurrent updates).
  const { data: notesRow } = await supabaseAdmin
    .from("homeowner_requests")
    .select("admin_notes")
    .eq("id", lead.id)
    .maybeSingle()
  const existingNotes = (notesRow?.admin_notes as string | null) ?? ""
  const nextNotes = existingNotes
    ? `${existingNotes}\n${auditLine}`
    : auditLine

  const { error: updateErr } = await supabaseAdmin
    .from("homeowner_requests")
    .update({
      property_value: value,
      property_value_source: sourceLabel,
      phone_metadata: {
        ...pm,
        property_value_override: overrideBlock,
      },
      admin_notes: nextNotes,
    })
    .eq("id", lead.id)

  if (updateErr) {
    return NextResponse.json(
      { error: `update failed: ${updateErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    propertyValue: value,
    propertyValueSource: sourceLabel,
  })
}
