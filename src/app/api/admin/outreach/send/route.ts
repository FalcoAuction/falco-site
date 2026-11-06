// Send (or preview) one outreach campaign. Admin-gated.
// POST { campaign_slug, limit?, dry_run? }  dry_run defaults to true.
//
// A real send needs every gate in sendGate (src/lib/outreach.ts): active
// campaign, OUTREACH_SEND_ENABLED=1, FALCO_POSTAL_ADDRESS, and for owner
// audiences FALCO_LICENSED=1. Each contact gets a campaign at most once
// (UNIQUE campaign_id, contact_id); suppressed emails are logged as
// 'suppressed' and never sent; no more than daily_cap sends per day.

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildEmail, remainingToday, sendGate, type Campaign, type Contact } from "@/lib/outreach"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const fromAddress = () => process.env.FALCO_OUTREACH_FROM?.trim() || "FALCO <falco@falco.llc>"

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  const db = supabaseAdmin
  let body: { campaign_slug?: string; limit?: number; dry_run?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  const { data: campaign, error: cErr } = await db.from("outreach_campaigns").select("*")
    .eq("slug", String(body.campaign_slug ?? "")).maybeSingle<Campaign>()
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })

  const gate = sendGate(campaign, process.env)
  const dryRun = body.dry_run !== false
  if (!dryRun && !gate.send) return NextResponse.json({ error: "send blocked", reasons: gate.reasons }, { status: 409 })

  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const today = await db.from("outreach_sends").select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id).eq("status", "sent").gte("created_at", dayStart.toISOString())
  const requested = Math.max(1, Math.min(Number(body.limit) || campaign.daily_cap, 500))
  const budget = remainingToday(campaign, today.count ?? 0, requested)

  const [prior, suppressed, contacts] = await Promise.all([
    db.from("outreach_sends").select("contact_id").eq("campaign_id", campaign.id).limit(50000),
    db.from("outreach_suppressions").select("email").limit(50000),
    db.from("outreach_contacts").select("id,kind,org_name,person_name,title,email,county")
      .eq("kind", campaign.audience_kind).not("email", "is", null).order("created_at").limit(5000),
  ])
  const err = prior.error || suppressed.error || contacts.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  const done = new Set((prior.data ?? []).map((r: { contact_id: string }) => r.contact_id))
  const blocked = new Set((suppressed.data ?? []).map((r: { email: string }) => r.email))
  const queue = ((contacts.data ?? []) as Contact[]).filter((c) => !done.has(c.id))

  const resend = process.env.RESEND_API_KEY?.trim() ? new Resend(process.env.RESEND_API_KEY.trim()) : null
  if (!dryRun && !resend) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 })

  const results: { contact_id: string; email: string | null; status: string; error?: string; subject?: string; text?: string }[] = []
  let sent = 0
  for (const c of queue) {
    if (sent >= budget) break
    const email = c.email
    if (email && blocked.has(email)) {
      results.push({ contact_id: c.id, email, status: "suppressed" })
      if (!dryRun) await db.from("outreach_sends").insert({ campaign_id: campaign.id, contact_id: c.id, channel: "email", to_email: email, status: "suppressed" })
      continue
    }
    let msg
    try {
      msg = buildEmail(campaign, c, process.env)
    } catch (e) {
      // Not logged as a send: fix the contact or template and it goes next run.
      results.push({ contact_id: c.id, email, status: "skipped", error: e instanceof Error ? e.message : String(e) })
      continue
    }
    if (dryRun) {
      results.push({ contact_id: c.id, email, status: "preview", subject: msg.subject, ...(results.length < 3 ? { text: msg.text } : {}) })
      sent += 1
      continue
    }
    // Claim the row first: the unique key stops a parallel run double-sending.
    const claim = await db.from("outreach_sends")
      .insert({ campaign_id: campaign.id, contact_id: c.id, channel: "email", to_email: email, status: "queued" })
      .select("id").single<{ id: string }>()
    if (claim.error) {
      results.push({ contact_id: c.id, email, status: "skipped", error: claim.error.message })
      continue
    }
    const res = await resend!.emails.send({
      from: fromAddress(), to: [email!], subject: msg.subject, text: msg.text, html: msg.html, headers: msg.headers,
    })
    if (res.error) {
      await db.from("outreach_sends").update({ status: "failed", error: res.error.message }).eq("id", claim.data.id)
      results.push({ contact_id: c.id, email, status: "failed", error: res.error.message })
    } else {
      await db.from("outreach_sends").update({ status: "sent", provider_id: res.data?.id ?? null, sent_at: new Date().toISOString() })
        .eq("id", claim.data.id)
      results.push({ contact_id: c.id, email, status: "sent" })
    }
    sent += 1
  }
  return NextResponse.json({
    ok: true, dry_run: dryRun, gate, budget, eligible: queue.length,
    counts: results.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}),
    results,
  })
}
