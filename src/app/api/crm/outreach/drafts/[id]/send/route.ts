// Send one approved outreach draft. Admin-gated. POST { dry_run? } (default true).
//
// Same gates as campaign sends (src/lib/outreach.ts sendGate on the
// 'estate-attorney-signal' campaign: active, OUTREACH_SEND_ENABLED=1,
// FALCO_POSTAL_ADDRESS), plus: the address is not suppressed, the campaign's
// daily cap, and no more than one email to the same address in 7 days.

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildEmail, remainingToday, sendGate, type Campaign, type Contact } from "@/lib/outreach"

export const dynamic = "force-dynamic"

const CAMPAIGN = "estate-attorney-signal"
const PER_ADDRESS_DAYS = 7
const fromAddress = () => process.env.FALCO_OUTREACH_FROM?.trim() || "FALCO <falco@falco.llc>"

type Draft = { id: string; status: string; subject: string; body_text: string; to_email: string | null; contact_id: string | null; recipient_name: string; recipient_firm: string | null }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  const db = supabaseAdmin
  const { id } = await params
  let body: { dry_run?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body: dry run */
  }
  const dryRun = body.dry_run !== false

  const [{ data: draft }, { data: campaign }] = await Promise.all([
    db.from("outreach_drafts").select("*").eq("id", id).maybeSingle<Draft>(),
    db.from("outreach_campaigns").select("*").eq("slug", CAMPAIGN).maybeSingle<Campaign>(),
  ])
  if (!draft) return NextResponse.json({ error: "draft not found" }, { status: 404 })
  if (!campaign) return NextResponse.json({ error: "campaign missing; run the migration" }, { status: 500 })
  if (draft.status === "sent") return NextResponse.json({ error: "already sent" }, { status: 409 })
  if (!draft.to_email || !draft.contact_id) return NextResponse.json({ error: "no email on this draft" }, { status: 400 })

  const reasons: string[] = []
  if (draft.status !== "approved") reasons.push("Approve the draft first.")
  const gate = sendGate(campaign, process.env)
  reasons.push(...gate.reasons)
  const since = new Date(Date.now() - PER_ADDRESS_DAYS * 86400_000).toISOString()
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const [sup, recent, today] = await Promise.all([
    db.from("outreach_suppressions").select("reason").eq("email", draft.to_email).maybeSingle(),
    db.from("outreach_sends").select("id", { count: "exact", head: true }).eq("to_email", draft.to_email)
      .eq("status", "sent").gte("created_at", since),
    db.from("outreach_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id)
      .eq("status", "sent").gte("created_at", dayStart.toISOString()),
  ])
  if (sup.data) reasons.push(`Address is suppressed (${(sup.data as { reason: string }).reason}).`)
  if ((recent.count ?? 0) > 0) reasons.push(`Already emailed this address in the last ${PER_ADDRESS_DAYS} days.`)
  if (remainingToday(campaign, today.count ?? 0, 1) < 1) reasons.push("Daily cap for this campaign reached.")

  const contact: Contact = {
    id: draft.contact_id, kind: "attorney", org_name: draft.recipient_firm, person_name: draft.recipient_name,
    title: null, email: draft.to_email, county: null,
  }
  let msg
  try {
    msg = buildEmail({ ...campaign, subject: draft.subject, body_text: draft.body_text, status: "active" }, contact, process.env)
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : String(e))
  }
  if (dryRun || reasons.length) {
    return NextResponse.json({ ok: reasons.length === 0, dry_run: dryRun, reasons, preview: msg ? { subject: msg.subject, text: msg.text } : null },
      { status: !dryRun && reasons.length ? 409 : 200 })
  }

  const resend = process.env.RESEND_API_KEY?.trim() ? new Resend(process.env.RESEND_API_KEY.trim()) : null
  if (!resend) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 })
  const claim = await db.from("outreach_sends").insert({
    campaign_id: campaign.id, contact_id: draft.contact_id, draft_id: draft.id, channel: "email", to_email: draft.to_email, status: "queued",
  }).select("id").single<{ id: string }>()
  if (claim.error) return NextResponse.json({ error: claim.error.message }, { status: 409 })
  const res = await resend.emails.send({ from: fromAddress(), to: [draft.to_email], subject: msg!.subject, text: msg!.text, html: msg!.html, headers: msg!.headers })
  if (res.error) {
    await db.from("outreach_sends").update({ status: "failed", error: res.error.message }).eq("id", claim.data.id)
    return NextResponse.json({ error: res.error.message }, { status: 502 })
  }
  const now = new Date().toISOString()
  await db.from("outreach_sends").update({ status: "sent", provider_id: res.data?.id ?? null, sent_at: now }).eq("id", claim.data.id)
  await db.from("outreach_drafts").update({ status: "sent", send_id: claim.data.id, updated_at: now }).eq("id", draft.id)
  return NextResponse.json({ ok: true, sent: true })
}
