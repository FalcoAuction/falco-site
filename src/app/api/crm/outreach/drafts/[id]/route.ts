// Edit one outreach draft from the CRM queue. Admin-gated.
// PATCH { subject?, body_text?, to_email?, status? }
//   to_email   saves the address on the attorney contact (creating it when
//              the notice named someone we had no contact for) and moves a
//              needs_email draft to draft
//   status     'approved' | 'skipped' | 'draft' (sending is a separate route)

import { estateDraftBlock } from "@/lib/estate-draft-review"
import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizeEmail } from "@/lib/outreach"

export const dynamic = "force-dynamic"

type Draft = Parameters<typeof estateDraftBlock>[0] & { id: string; signal: string; status: string; recipient_name: string; recipient_firm: string | null; recipient_key: string; contact_id: string | null; to_email: string | null }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  const db = supabaseAdmin
  const { id } = await params
  let body: { subject?: string; body_text?: string; to_email?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  const { data: draft } = await db.from("outreach_drafts").select("*").eq("id", id).maybeSingle<Draft>()
  if (!draft) return NextResponse.json({ error: "draft not found" }, { status: 404 })
  if (draft.status === "sent") return NextResponse.json({ error: "already sent" }, { status: 409 })

  if (body.status === "approved") {
    const reason = await estateDraftBlock(draft)
    if (reason) return NextResponse.json({ error: reason }, { status: 409 })
  }
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.subject === "string" && body.subject.trim()) upd.subject = body.subject.trim()
  if (typeof body.body_text === "string" && body.body_text.trim()) upd.body_text = body.body_text.replace(/\r\n/g, "\n").trim()

  if (body.to_email !== undefined) {
    const email = normalizeEmail(body.to_email)
    if (!email) return NextResponse.json({ error: "invalid email" }, { status: 400 })
    let contactId = draft.contact_id
    if (contactId) {
      const r = await db.from("outreach_contacts").update({ email, updated_at: new Date().toISOString() }).eq("id", contactId)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 409 })
    } else {
      const r = await db.from("outreach_contacts").upsert({
        kind: draft.signal === "trustee_case" ? "trustee" : "attorney", person_name: draft.recipient_name,
        org_name: draft.recipient_firm, email, source: draft.signal, source_ref: draft.recipient_key,
      }, { onConflict: "source,source_ref" }).select("id").single<{ id: string }>()
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 409 })
      contactId = r.data.id
    }
    upd.to_email = email
    upd.contact_id = contactId
    if (draft.status === "needs_email") upd.status = "draft"
    // Other drafts addressed to the same attorney pick up the email too.
    await db.from("outreach_drafts").update({ to_email: email, contact_id: contactId, status: "draft" })
      .eq("recipient_key", draft.recipient_key).eq("status", "needs_email").neq("id", id)
  }

  if (body.status) {
    if (!["approved", "skipped", "draft"].includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 })
    if (body.status === "approved" && !(upd.to_email || draft.to_email)) {
      return NextResponse.json({ error: "add an email before approving" }, { status: 400 })
    }
    upd.status = body.status
    upd.approved_at = body.status === "approved" ? new Date().toISOString() : null
  }

  const r = await db.from("outreach_drafts").update(upd).eq("id", id).select("*").single()
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, draft: r.data })
}
