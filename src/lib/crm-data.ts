// Read layer for /crm. Thin queries over tables other parts of the system
// already maintain: lead_opportunities (ranked nightly by
// refresh_lead_quality), homeowner_requests_staging (every staged lead),
// dialer_lead_workflow + dialer_activities (call/text/note history, shared
// with the dialer), landlord_portfolios, outreach_*, lead_quality_daily.
// Staging is ~400 MB: only ever read it by primary key or a short id list.

import "server-only"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { DialerActivity, DialerStatus, DialerWorkflow } from "@/lib/dialer-types"
import { getWorkflow, listActivities } from "@/lib/dialer-data"

export type Opportunity = {
  rank: number; staging_id: string; bot_source: string; distress_type: string | null; county: string | null
  property_address: string | null; owner_name: string | null; property_value: number; expected_fee: number
  fit_label: string; score: number; sale_date: string | null; contact: string | null
}

export type LeadRow = Opportunity & { slug: string | null; status: DialerStatus | null; next_action_at: string | null; last_contact_at: string | null }

// Saved views, Close-style: each is a filter you work top to bottom.
export type ViewKey = "all" | "soon" | "foreclosure" | "estate" | "tax" | "court" | "bankruptcy" | "code" | "working"
export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "all", label: "All ranked" },
  { key: "soon", label: "Sale in 14 days" },
  { key: "foreclosure", label: "Foreclosure" },
  { key: "estate", label: "Estates" },
  { key: "tax", label: "Tax sale" },
  { key: "court", label: "Court sale" },
  { key: "bankruptcy", label: "Bankruptcy" },
  { key: "code", label: "Code violation" },
  { key: "working", label: "In progress" },
]

const OPP_COLS = "rank,staging_id,bot_source,distress_type,county,property_address,owner_name,property_value,expected_fee,fit_label,score,sale_date,contact"
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d }

export async function latestOpportunityDay(): Promise<string | null> {
  if (!supabaseAdmin) return null
  const r = await supabaseAdmin.from("lead_opportunities").select("captured_on").order("captured_on", { ascending: false }).limit(1)
  return (r.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
}

function applyView<Q extends { ilike: Function; eq: Function; gte: Function; lte: Function; or: Function }>(q: Q, view: ViewKey): Q {
  const today = isoDay(new Date())
  switch (view) {
    case "soon": return q.gte("sale_date", today).lte("sale_date", isoDay(addDays(14)))
    case "foreclosure": return q.ilike("fit_label", "Foreclosure%")
    case "estate": return q.ilike("fit_label", "Estate%")
    case "tax": return q.eq("fit_label", "Tax sale")
    case "court": return q.ilike("fit_label", "Court%")
    case "bankruptcy": return q.eq("fit_label", "Bankruptcy")
    case "code": return q.ilike("fit_label", "Code violation%")
    default: return q
  }
}

/** Slug (pipeline_lead_key) and workflow for a page of opportunities. */
async function attachWorkflow(opps: Opportunity[]): Promise<LeadRow[]> {
  if (!supabaseAdmin || opps.length === 0) return opps.map((o) => ({ ...o, slug: null, status: null, next_action_at: null, last_contact_at: null }))
  const keys = await supabaseAdmin.from("homeowner_requests_staging").select("id,pipeline_lead_key").in("id", opps.map((o) => o.staging_id))
  const slugOf = new Map(((keys.data ?? []) as { id: string; pipeline_lead_key: string | null }[]).map((r) => [r.id, r.pipeline_lead_key]))
  const slugs = [...new Set([...slugOf.values()].filter(Boolean))] as string[]
  const wf = slugs.length
    ? await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug,status,next_action_at,last_contact_at").in("listing_slug", slugs)
    : { data: [] }
  const wfOf = new Map(((wf.data ?? []) as { listing_slug: string; status: DialerStatus; next_action_at: string | null; last_contact_at: string | null }[]).map((w) => [w.listing_slug, w]))
  return opps.map((o) => {
    const slug = slugOf.get(o.staging_id) ?? null
    const w = slug ? wfOf.get(slug) : undefined
    return { ...o, slug, status: w?.status ?? null, next_action_at: w?.next_action_at ?? null, last_contact_at: w?.last_contact_at ?? null }
  })
}

export async function listLeads(view: ViewKey, opts: { county?: string; q?: string; limit?: number } = {}): Promise<{ day: string | null; rows: LeadRow[]; error?: string }> {
  if (!supabaseAdmin) return { day: null, rows: [], error: "Database not configured." }
  const day = await latestOpportunityDay()
  if (!day) return { day: null, rows: [] }
  if (view === "working") {
    // Leads someone has touched: open workflow rows, newest contact first.
    const wf = await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug")
      .not("status", "in", "(new,closed_lost,closed_won)").order("updated_at", { ascending: false }).limit(300)
    const slugs = ((wf.data ?? []) as { listing_slug: string }[]).map((r) => r.listing_slug)
    if (!slugs.length) return { day, rows: [] }
    // Read the staged rows directly: a lead being worked is not always in
    // the ranked top 1,000 (no value yet, or a dialer-only lead).
    const st = await supabaseAdmin.from("homeowner_requests_staging")
      .select("id,bot_source,distress_type,county,property_address,owner_name_records,full_name,property_value,trustee_sale_date,pipeline_lead_key")
      .in("pipeline_lead_key", slugs).limit(300)
    type St = { id: string; bot_source: string; distress_type: string | null; county: string | null; property_address: string | null
      owner_name_records: string | null; full_name: string | null; property_value: number | null; trustee_sale_date: string | null; pipeline_lead_key: string }
    const seen = new Set<string>()
    const opps: Opportunity[] = []
    for (const s of (st.data ?? []) as St[]) {
      if (seen.has(s.pipeline_lead_key)) continue
      seen.add(s.pipeline_lead_key)
      const value = Number(s.property_value ?? 0)
      opps.push({ rank: 0, staging_id: s.id, bot_source: s.bot_source, distress_type: s.distress_type, county: s.county,
        property_address: s.property_address, owner_name: s.owner_name_records ?? s.full_name, property_value: value,
        expected_fee: value * 0.1 * 0.2, fit_label: (s.distress_type ?? "Lead").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
        score: 0, sale_date: s.trustee_sale_date, contact: null })
    }
    const rows = await attachWorkflow(opps)
    rows.sort((a, b) => (b.last_contact_at ?? "").localeCompare(a.last_contact_at ?? ""))
    return { day, rows, error: st.error?.message }
  }
  let q = supabaseAdmin.from("lead_opportunities").select(OPP_COLS).eq("captured_on", day)
  q = applyView(q, view)
  if (opts.county) q = q.eq("county", opts.county)
  if (opts.q) q = q.or(`property_address.ilike.%${opts.q.replace(/[%,()]/g, " ")}%,owner_name.ilike.%${opts.q.replace(/[%,()]/g, " ")}%`)
  q = view === "soon" ? q.order("sale_date").order("rank") : q.order("rank")
  const r = await q.limit(opts.limit ?? 200)
  return { day, rows: await attachWorkflow((r.data ?? []) as Opportunity[]), error: r.error?.message }
}

export async function viewCounts(day: string | null): Promise<Partial<Record<ViewKey, number>>> {
  if (!supabaseAdmin || !day) return {}
  const r = await supabaseAdmin.from("lead_opportunities").select("fit_label,sale_date").eq("captured_on", day).limit(5000)
  const rows = (r.data ?? []) as { fit_label: string; sale_date: string | null }[]
  const today = isoDay(new Date()), soon = isoDay(addDays(14))
  const c: Partial<Record<ViewKey, number>> = { all: rows.length, soon: 0, foreclosure: 0, estate: 0, tax: 0, court: 0, bankruptcy: 0, code: 0 }
  for (const x of rows) {
    if (x.sale_date && x.sale_date >= today && x.sale_date <= soon) c.soon!++
    if (x.fit_label.startsWith("Foreclosure")) c.foreclosure!++
    else if (x.fit_label.startsWith("Estate")) c.estate!++
    else if (x.fit_label === "Tax sale") c.tax!++
    else if (x.fit_label.startsWith("Court")) c.court!++
    else if (x.fit_label === "Bankruptcy") c.bankruptcy!++
    else if (x.fit_label.startsWith("Code violation")) c.code!++
  }
  return c
}

export type StagedLead = {
  id: string; bot_source: string; staged_at: string; staging_status: string; pipeline_lead_key: string | null
  property_address: string | null; county: string | null; full_name: string | null; owner_name_records: string | null
  email: string | null; phone: string | null; property_value: number | null; property_value_source: string | null
  mortgage_balance: number | null; trustee_sale_date: string | null; distress_type: string | null; admin_notes: string | null
  source_url: string | null; year_built: number | null; alternate_phones: unknown; raw_payload: Record<string, unknown> | null
}

export async function getLead(id: string): Promise<{ lead: StagedLead; opp: Opportunity | null; workflow: DialerWorkflow | null; activities: DialerActivity[] } | null> {
  if (!supabaseAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const r = await supabaseAdmin.from("homeowner_requests_staging")
    .select("id,bot_source,staged_at,staging_status,pipeline_lead_key,property_address,county,full_name,owner_name_records,email,phone,property_value,property_value_source,mortgage_balance,trustee_sale_date,distress_type,admin_notes,source_url,year_built,alternate_phones,raw_payload")
    .eq("id", id).maybeSingle()
  const lead = r.data as StagedLead | null
  if (!lead) return null
  const day = await latestOpportunityDay()
  const [o, workflow, activities] = await Promise.all([
    day ? supabaseAdmin.from("lead_opportunities").select(OPP_COLS).eq("captured_on", day).eq("staging_id", id).maybeSingle() : Promise.resolve({ data: null }),
    lead.pipeline_lead_key ? getWorkflow(lead.pipeline_lead_key) : Promise.resolve(null),
    lead.pipeline_lead_key ? listActivities(lead.pipeline_lead_key, 100) : Promise.resolve([] as DialerActivity[]),
  ])
  return { lead, opp: (o.data as Opportunity | null) ?? null, workflow, activities }
}

export type TodayData = {
  due: { slug: string; status: DialerStatus; next_action: string; next_action_at: string; summary_notes: string; staging_id: string | null; address: string | null }[]
  sales: Opportunity[]
  recent: (DialerActivity & { staging_id: string | null; address: string | null })[]
  quality: { total: number; ready: number; day: string | null }
  outreach: { sentToday: number; suppressed: number; contacts: number }
  counts: { leads: number; landlords: number; working: number }
}

async function stagingFor(slugs: string[]): Promise<Map<string, { id: string; address: string | null }>> {
  const out = new Map<string, { id: string; address: string | null }>()
  if (!supabaseAdmin || !slugs.length) return out
  const r = await supabaseAdmin.from("homeowner_requests_staging").select("id,pipeline_lead_key,property_address").in("pipeline_lead_key", slugs).limit(500)
  for (const x of (r.data ?? []) as { id: string; pipeline_lead_key: string; property_address: string | null }[]) {
    if (!out.has(x.pipeline_lead_key)) out.set(x.pipeline_lead_key, { id: x.id, address: x.property_address })
  }
  return out
}

export async function getToday(): Promise<TodayData> {
  const empty: TodayData = { due: [], sales: [], recent: [], quality: { total: 0, ready: 0, day: null }, outreach: { sentToday: 0, suppressed: 0, contacts: 0 }, counts: { leads: 0, landlords: 0, working: 0 } }
  if (!supabaseAdmin) return empty
  const db = supabaseAdmin
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  const day = await latestOpportunityDay()
  const [due, sales, recent, qDay, sent, supp, contacts, oppCount, llCount, working] = await Promise.all([
    db.from("dialer_lead_workflow").select("listing_slug,status,next_action,next_action_at,summary_notes")
      .lte("next_action_at", endOfToday.toISOString()).not("status", "in", "(closed_lost,closed_won)")
      .order("next_action_at").limit(25),
    day ? db.from("lead_opportunities").select(OPP_COLS).eq("captured_on", day)
      .gte("sale_date", isoDay(new Date())).lte("sale_date", isoDay(addDays(14))).order("sale_date").limit(12) : Promise.resolve({ data: [] }),
    db.from("dialer_activities").select("id,listing_slug,occurred_at,channel,outcome,notes,next_action,next_action_at,created_by,created_at")
      .order("occurred_at", { ascending: false }).limit(10),
    db.from("lead_quality_daily").select("captured_on").order("captured_on", { ascending: false }).limit(1),
    db.from("outreach_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", isoDay(new Date())),
    db.from("outreach_suppressions").select("email", { count: "exact", head: true }),
    db.from("outreach_contacts").select("id", { count: "exact", head: true }),
    day ? db.from("lead_opportunities").select("rank", { count: "exact", head: true }).eq("captured_on", day) : Promise.resolve({ count: 0 }),
    db.from("landlord_portfolios").select("owner_name", { count: "exact", head: true }),
    db.from("dialer_lead_workflow").select("listing_slug", { count: "exact", head: true }).not("status", "in", "(new,closed_lost,closed_won)"),
  ])
  const qd = (qDay.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
  let quality = { total: 0, ready: 0, day: qd }
  if (qd) {
    const q = await db.from("lead_quality_daily").select("total,launch_ready").eq("captured_on", qd)
    for (const r of (q.data ?? []) as { total: number; launch_ready: number }[]) { quality.total += r.total; quality.ready += r.launch_ready }
  }
  const dueRows = (due.data ?? []) as { listing_slug: string; status: DialerStatus; next_action: string; next_action_at: string; summary_notes: string }[]
  const recentRows = ((recent.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, listingSlug: r.listing_slug as string, occurredAt: r.occurred_at as string, channel: r.channel as DialerActivity["channel"],
    outcome: r.outcome as DialerActivity["outcome"], notes: (r.notes as string) ?? "", nextAction: r.next_action as DialerActivity["nextAction"],
    nextActionAt: r.next_action_at as string | null, createdBy: (r.created_by as string) ?? "", createdAt: r.created_at as string,
  }))
  const where = await stagingFor([...new Set([...dueRows.map((d) => d.listing_slug), ...recentRows.map((r) => r.listingSlug)])])
  return {
    due: dueRows.map((d) => ({ slug: d.listing_slug, status: d.status, next_action: d.next_action, next_action_at: d.next_action_at, summary_notes: d.summary_notes ?? "",
      staging_id: where.get(d.listing_slug)?.id ?? null, address: where.get(d.listing_slug)?.address ?? null })),
    sales: (sales.data ?? []) as Opportunity[],
    recent: recentRows.map((r) => ({ ...r, staging_id: where.get(r.listingSlug)?.id ?? null, address: where.get(r.listingSlug)?.address ?? null })),
    quality,
    outreach: { sentToday: sent.count ?? 0, suppressed: supp.count ?? 0, contacts: contacts.count ?? 0 },
    counts: { leads: oppCount.count ?? 0, landlords: llCount.count ?? 0, working: working.count ?? 0 },
  }
}
