// Write outreach drafts from new lead events. Daily (vercel.json) and on
// demand from the CRM queue. Never sends: drafts wait in /crm/outreach/queue.
//
// Signal 1, probate_notice: estate leads in a focus county, staged in the last
// SIGNAL_WINDOW_DAYS, real property worth MIN_ESTATE_VALUE or more, with the
// estate's attorney named on the notice. One draft per estate per attorney;
// existing drafts are never overwritten (edits survive re-runs).

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  MIN_ESTATE_VALUE, SIGNAL_WINDOW_DAYS, contactIndex, estateDraft, estateFacts, nameKey,
  type AttorneyContact,
} from "@/lib/outreach-signals"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  if (getAdminSession(req)) return true
  const secret = (process.env.CRON_SECRET || "").trim()
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`
}

async function run() {
  const db = supabaseAdmin!
  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * 86400_000).toISOString()
  // Start from the day's ranked list (lead_opportunities: estates already
  // passed the quality checks, in focus counties), then read only those
  // staging rows by id. A filtered scan of staging hits the 8s timeout.
  const day = await db.from("lead_opportunities").select("captured_on").order("captured_on", { ascending: false }).limit(1)
  if (day.error) throw new Error(day.error.message)
  const capturedOn = (day.data?.[0] as { captured_on: string } | undefined)?.captured_on
  const opps = capturedOn
    ? await db.from("lead_opportunities").select("staging_id").eq("captured_on", capturedOn)
        .ilike("fit_label", "Estate%").gte("property_value", MIN_ESTATE_VALUE).limit(1000)
    : { data: [], error: null }
  if (opps.error) throw new Error(opps.error.message)
  const ids = ((opps.data ?? []) as { staging_id: string }[]).map((o) => o.staging_id)
  const [leads, contacts, suppressed] = await Promise.all([
    ids.length
      ? db.from("homeowner_requests_staging")
          .select("id,county,property_address,property_value,property_value_source,raw_payload,staged_at")
          .in("id", ids).gte("staged_at", since)
      : Promise.resolve({ data: [], error: null }),
    db.from("outreach_contacts").select("id,person_name,org_name,email").eq("kind", "attorney").limit(5000),
    db.from("outreach_suppressions").select("email").limit(50000),
  ])
  const err = leads.error || contacts.error || suppressed.error
  if (err) throw new Error(err.message)
  const index = contactIndex((contacts.data ?? []) as AttorneyContact[])
  const blocked = new Set(((suppressed.data ?? []) as { email: string }[]).map((r) => r.email))

  const rows: Record<string, unknown>[] = []
  for (const lead of leads.data ?? []) {
    const e = estateFacts(lead as Parameters<typeof estateFacts>[0])
    if (!e) continue
    for (const person of e.people) {
      const key = nameKey(person)
      if (!key) continue
      const contact = index.get(key)
      const email = contact?.email && !blocked.has(contact.email) ? contact.email : null
      const draft = estateDraft({ ...e.facts, attorney: person })
      rows.push({
        signal: "probate_notice", staging_id: (lead as { id: string }).id, recipient_key: key,
        recipient_name: person, recipient_firm: contact?.org_name ?? e.firm, recipient_address: e.officeAddress,
        contact_id: contact?.id ?? null, to_email: email, subject: draft.subject, body_text: draft.body,
        facts: { ...e.facts, attorney: person }, status: email ? "draft" : "needs_email",
      })
    }
  }
  let created = 0
  for (let i = 0; i < rows.length; i += 200) {
    const res = await db.from("outreach_drafts")
      .upsert(rows.slice(i, i + 200), { onConflict: "signal,staging_id,recipient_key", ignoreDuplicates: true })
      .select("id")
    if (res.error) throw new Error(res.error.message)
    created += res.data?.length ?? 0
  }
  return { leads: leads.data?.length ?? 0, candidates: rows.length, created,
    with_email: rows.filter((r) => r.to_email).length }
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 503 })
  try {
    return NextResponse.json({ ok: true, ...(await run()) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
