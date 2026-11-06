import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { LEAD_STATUSES, type LeadKind } from "@/lib/admin-leads"

export const dynamic = "force-dynamic"

const TABLE_FOR_KIND: Record<LeadKind, string> = {
  // Both homeowner (form-submitted) and pipeline (bot-pulled) live in the
  // same homeowner_requests table — separated only by `source` column.
  homeowner: "homeowner_requests",
  pipeline: "homeowner_requests",
  buyer: "buyer_registrations",
  partner: "partner_inquiries",
  inquiry: "general_inquiries",
}

type PatchBody = {
  status?: string
  notes?: string
  /** ISO datetime string or null. Empty string clears the value. */
  next_action_at?: string | null
  /** ISO datetime string or null. */
  last_contacted_at?: string | null
}

function isLeadKind(s: string): s is LeadKind {
  return (
    s === "homeowner" ||
    s === "pipeline" ||
    s === "buyer" ||
    s === "partner" ||
    s === "inquiry"
  )
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ kind: string; id: string }> }
) {
  // Auth gate — admin session required
  if (!getAdminSession(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "database not configured" }, { status: 500 })
  }

  const { kind, id } = await ctx.params
  if (!isLeadKind(kind)) {
    return NextResponse.json({ ok: false, error: "invalid lead kind" }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }

  // Build the update payload — only set fields that were explicitly provided.
  const update: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status as (typeof LEAD_STATUSES)[number])) {
      return NextResponse.json(
        { ok: false, error: `invalid status; must be one of ${LEAD_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }
    update.status = body.status
    // Auto-stamp last_contacted_at when transitioning to "contacted" if not
    // already set in this request.
    if (
      body.status === "contacted" &&
      body.last_contacted_at === undefined
    ) {
      update.last_contacted_at = new Date().toISOString()
    }
  }

  if (body.notes !== undefined) {
    // Clamp to a sane size to prevent abuse.
    update.admin_notes = String(body.notes).slice(0, 4000)
  }

  if (body.next_action_at !== undefined) {
    update.next_action_at =
      body.next_action_at && body.next_action_at.trim() ? body.next_action_at : null
  }

  if (body.last_contacted_at !== undefined) {
    update.last_contacted_at =
      body.last_contacted_at && body.last_contacted_at.trim()
        ? body.last_contacted_at
        : null
  }

  const table = TABLE_FOR_KIND[kind]
  const { error } = await supabaseAdmin
    .from(table)
    .update(update)
    .eq("id", id)

  if (error) {
    console.error("admin lead update failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
