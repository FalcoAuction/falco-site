// Read layer for /crm. Thin queries over tables other parts of the system
// already maintain: lead_opportunities (ranked nightly by
// refresh_lead_quality), homeowner_requests_staging (every staged lead),
// dialer_lead_workflow + dialer_activities (call/text/note history, shared
// with the dialer), landlord_portfolios, outreach_*, lead_quality_daily.
// Staging is ~400 MB: only ever read it by primary key or a short id list.

import "server-only"
import { cityCodeWorkflowHolds, researchOnlySources } from "@/lib/chattanooga-research"
import { metroDispositions, metroHeld } from "@/lib/nashville-codes"
import { LAND_FIELDS, loadLandRows } from "@/lib/crm-land"
import { aircraftAsset } from "@/lib/aircraft-evidence"
import { warnAsset } from "@/lib/warn-evidence"
import { landEvidence, type LandEvidence } from "@/lib/land-evidence"
import { cache } from "react"
import { trusteeNoticeHold } from "@/lib/trustee-notice"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { DialerActivity, DialerStatus, DialerWorkflow } from "@/lib/dialer-types"
import { getWorkflow, listActivities } from "@/lib/dialer-data"

export type Opportunity = {
  rank: number; staging_id: string; bot_source: string; distress_type: string | null; county: string | null
  property_address: string | null; owner_name: string | null; property_value: number; expected_fee: number
  fit_label: string; score: number; sale_date: string | null; contact: string | null
}

export type LeadRow = Opportunity & { slug: string | null; status: DialerStatus | null; next_action_at: string | null; last_contact_at: string | null
  /** A phone on file. Without one the lead waits for paid skip tracing. */
  has_phone: boolean }

// Saved views, Close-style: each is a filter you work top to bottom.
const researchSourceFilter = "(" + researchOnlySources.join(",") + ")"

function researchOnlySource(source?: string | null) {
  return researchOnlySources.includes(source ?? "")
}

export type ViewKey = "all" | "soon" | "foreclosure" | "estate" | "tax" | "court" | "bankruptcy" | "code" | "florida" | "working"
// Florida counties the FL bots stage (lowercased as lead_opportunities
// stores them). Florida leads get their own view and stay out of the
// Tennessee views, so the Middle TN dial lists are unchanged.
export const FL_COUNTIES = ["miami-dade", "broward", "palm beach", "hillsborough", "orange", "pinellas", "duval", "lee", "collier", "sarasota"]
const FL_IN = `(${FL_COUNTIES.map((c) => `"${c}"`).join(",")})`
export type BucketKey = "commercial" | "land" | "assets"
export const BUCKETS: { key: BucketKey; label: string }[] = [
  { key: "commercial", label: "CRE" },
  { key: "land", label: "Land" },
  { key: "assets", label: "High-value assets" },
]
export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "all", label: "All ranked" },
  { key: "soon", label: "Sale in 14 days" },
  { key: "foreclosure", label: "Foreclosure" },
  { key: "estate", label: "Estates" },
  { key: "tax", label: "Tax sale" },
  { key: "court", label: "Court sale" },
  { key: "bankruptcy", label: "Bankruptcy" },
  { key: "code", label: "Code violation" },
  { key: "florida", label: "Florida" },
  { key: "working", label: "In progress" },
]

// Auctions are modeled at 90% of assessed value until partner results are
// modeled per asset (110 deed-matched auction sales, median 92.5%, homes
// 89.7%). FALCO fee = value x 0.90 x 10% buyer's premium x 20% share.
export const AUCTION_REALIZATION = 0.9
const OPP_COLS = "rank,staging_id,bot_source,distress_type,county,property_address,owner_name,property_value,expected_fee,fit_label,score,sale_date,contact"
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d }

export async function latestOpportunityDay(): Promise<string | null> {
  if (!supabaseAdmin) return null
  const r = await supabaseAdmin.from("lead_opportunities").select("captured_on").order("captured_on", { ascending: false }).limit(1)
  return (r.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
}

function applyView<Q extends { ilike: Function; eq: Function; gte: Function; lte: Function; or: Function; in: Function; not: Function }>(q: Q, view: ViewKey): Q {
  const today = isoDay(new Date())
  if (view === "florida") return q.in("county", FL_COUNTIES)
  q = q.not("county", "in", FL_IN)
  switch (view) {
    case "soon": return q.gte("sale_date", today).lte("sale_date", isoDay(addDays(14)))
    case "foreclosure": return q.ilike("fit_label", "Foreclosure%")
    case "estate": return q.ilike("fit_label", "Estate%")
    case "tax": return q.eq("fit_label", "Tax sale")
    case "court": return q.ilike("fit_label", "Court%")
    // "Bankruptcy" (new filings) plus the event labels: dismissed, dismissal
    // requested, lender stay relief, trustee abandoned.
    case "bankruptcy": return q.ilike("fit_label", "Bankruptcy%")
    case "code": return q.ilike("fit_label", "Code violation%")
    default: return q
  }
}

// Rankings and staging dates can predate the promoted lead's review flag.
const noticeHolds = cache(async () => {
  const slugs = new Map<string, string>()
  const stagingIds = new Set<string>()
  const heraldSlugs = new Set<string>()
  if (!supabaseAdmin) return { slugs, stagingIds, heraldSlugs }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests")
      .select("pipeline_lead_key,review:phone_metadata->trustee_notice_review,flag:phone_metadata->sale_status")
      .eq("source", "bot").or("phone_metadata->trustee_notice_review.not.is.null,phone_metadata->sale_status.not.is.null")
      .order("id").range(offset, offset + 499)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const hold = trusteeNoticeHold({ trustee_notice_review: row.review, sale_status: row.flag })
      if (hold && row.pipeline_lead_key) slugs.set(row.pipeline_lead_key, hold)
    }
    if ((data?.length ?? 0) < 500) break
  }
  const keys = [...slugs.keys()]
  for (let i = 0; i < keys.length; i += 80) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests_staging")
      .select("id").in("pipeline_lead_key", keys.slice(i, i + 80))
    if (error) throw new Error(error.message)
    for (const row of data ?? []) stagingIds.add(row.id)
  }
  for (let offset = 0; ; offset += 250) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests_staging")
      .select("id,pipeline_lead_key,herald_elapsed_sale_date").eq("bot_source", "hamilton_county_herald")
      .not("herald_elapsed_sale_date", "is", null).order("id").range(offset, offset + 249)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (!row.herald_elapsed_sale_date) continue
      stagingIds.add(row.id)
      if (row.pipeline_lead_key) heraldSlugs.add(row.pipeline_lead_key)
    }
    if ((data?.length ?? 0) < 250) break
  }
  return { slugs, stagingIds, heraldSlugs }
})

const warnRows = cache(async () => {
  const rows = new Map<string, PersonalPropertyTag>()
  for (let offset = 0; ; offset += 250) {
    const { data, error } = await supabaseAdmin!.from("homeowner_requests_staging")
      .select("id,bot_source,full_name,owner_name_records,staging_status,warn:raw_payload->warn,warn_review:raw_payload->warn_review,personal_property:raw_payload->personal_property,personal_property_evidence:raw_payload->personal_property_evidence,aircraft:raw_payload->aircraft")
      .eq("bot_source", "warn_notices").order("id").range(offset, offset + 249)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) rows.set(row.id, warnAsset(row, row)!)
    if ((data?.length ?? 0) < 250) return rows
  }
})

/** Slug (pipeline_lead_key) and workflow for a page of opportunities. */
async function attachWorkflow(opps: Opportunity[], existingWorkflow = false): Promise<LeadRow[]> {
  if (!supabaseAdmin || opps.length === 0) return opps.map((o) => ({ ...o, slug: null, status: null, next_action_at: null, last_contact_at: null, has_phone: false }))
  const holds = await noticeHolds()
  const warn = await warnRows()
  opps = opps.filter(o => !holds.stagingIds.has(o.staging_id) && (existingWorkflow || !warn.has(o.staging_id)))
  if (!opps.length) return []
  const keyRows: { id: string; pipeline_lead_key: string | null; phone: string | null }[] = []
  const research = new Set<string>()
  for (let start = 0; start < opps.length; start += 80) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests_staging")
      .select(existingWorkflow ? "id,pipeline_lead_key,phone" : `id,pipeline_lead_key,phone,${LAND_FIELDS}`).in("id", opps.slice(start, start + 80).map(row => row.staging_id))
    if (error) throw new Error(error.message)
    for (const record of data ?? []) {
      const row = record as unknown as StagedBucket & { phone: string | null }
      keyRows.push(row)
      if (!existingWorkflow && landEvidence(row, row)?.corroborated === false) research.add(row.id)
    }
  }
  const metro = await metroDispositions(existingWorkflow ? opps.map(o => ({ id: o.staging_id, bot_source: o.bot_source })) : [])
  opps = opps.filter(o => !research.has(o.staging_id) && !metroHeld(metro, o.staging_id))
  const slugOf = new Map(keyRows.map((r) => [r.id, r.pipeline_lead_key]))
  const phoned = new Set(keyRows.filter((r) => (r.phone ?? "").trim()).map((r) => r.id))
  const slugs = [...new Set([...slugOf.values()].filter(Boolean))] as string[]
  const wf = slugs.length
    ? await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug,status,next_action_at,last_contact_at").in("listing_slug", slugs)
    : { data: [] }
  const wfOf = new Map(((wf.data ?? []) as { listing_slug: string; status: DialerStatus; next_action_at: string | null; last_contact_at: string | null }[]).map((w) => [w.listing_slug, w]))
  return opps.map((o) => {
    const slug = slugOf.get(o.staging_id) ?? null
    const w = slug ? wfOf.get(slug) : undefined
    return { ...o, slug, status: w?.status ?? null, next_action_at: w?.next_action_at ?? null, last_contact_at: w?.last_contact_at ?? null,
      has_phone: phoned.has(o.staging_id) }
  })
}

// Filter each ordered workflow page before applying the visible-list limit.
const workingSlugs = cache(async () => {
  const slugs: string[] = []
  if (!supabaseAdmin) return slugs
  for (let offset = 0; ; offset += 80) {
    const { data, error } = await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug")
      .not("status", "in", "(new,closed_lost,closed_won)").order("updated_at", { ascending: false })
      .order("listing_slug").range(offset, offset + 79)
    if (error) throw new Error(error.message)
    const keys = data.map(row => String(row.listing_slug))
    const holds = await cityCodeWorkflowHolds(keys)
    const { heraldSlugs } = await noticeHolds()
    slugs.push(...keys.filter(key => !holds.has(key) && !heraldSlugs.has(key)))
    if (keys.length < 80) return slugs
  }
})

type DueWorkflow = { listing_slug: string; status: DialerStatus; next_action: string; next_action_at: string; summary_notes: string }

async function dueWorkflows(endOfToday: string) {
  const due: DueWorkflow[] = []
  if (!supabaseAdmin) return due
  for (let offset = 0; due.length < 25; offset += 25) {
    const { data, error } = await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug,status,next_action,next_action_at,summary_notes")
      .lte("next_action_at", endOfToday).not("status", "in", "(closed_lost,closed_won)")
      .order("next_action_at").order("listing_slug").range(offset, offset + 24)
    if (error) throw new Error(error.message)
    const holds = await cityCodeWorkflowHolds(data.map(row => row.listing_slug))
    const { heraldSlugs } = await noticeHolds()
    due.push(...data.filter(row => !holds.has(row.listing_slug) && !heraldSlugs.has(row.listing_slug)) as DueWorkflow[])
    if (data.length < 25) break
  }
  return due.slice(0, 25)
}

export async function listLeads(view: ViewKey, opts: { county?: string; q?: string; limit?: number } = {}): Promise<{ day: string | null; rows: LeadRow[]; error?: string }> {
  if (!supabaseAdmin) return { day: null, rows: [], error: "Database not configured." }
  const day = await latestOpportunityDay()
  if (!day) return { day: null, rows: [] }
  if (view === "working") {
    // Leads someone has touched: open workflow rows, newest contact first.
    const slugs = (await workingSlugs()).slice(0, 300)
    if (!slugs.length) return { day, rows: [] }
    // Read the staged rows directly: a lead being worked is not always in
    // the ranked top 1,000 (no value yet, or a dialer-only lead).
    type St = { mackie_notice_hold: string | null; id: string; bot_source: string; distress_type: string | null; county: string | null; property_address: string | null
      owner_name_records: string | null; full_name: string | null; property_value: number | null; trustee_sale_date: string | null; pipeline_lead_key: string }
    const staged: St[] = []
    for (let i = 0; i < slugs.length; i += 80) {
      const st = await supabaseAdmin.from("homeowner_requests_staging")
        .select("id,bot_source,distress_type,county,property_address,owner_name_records,full_name,property_value,trustee_sale_date,pipeline_lead_key,mackie_notice_hold")
        .in("pipeline_lead_key", slugs.slice(i, i + 80))
      if (st.error) return { day, rows: [], error: st.error.message }
      staged.push(...(st.data as St[]))
    }
    const seen = new Set<string>()
    const opps: Opportunity[] = []
    for (const s of staged) {
      if (s.mackie_notice_hold || seen.has(s.pipeline_lead_key)) continue
      seen.add(s.pipeline_lead_key)
      const value = Number(s.property_value ?? 0)
      opps.push({ rank: 0, staging_id: s.id, bot_source: s.bot_source, distress_type: s.distress_type, county: s.county,
        property_address: s.property_address, owner_name: s.owner_name_records ?? s.full_name, property_value: value,
        expected_fee: value * AUCTION_REALIZATION * 0.1 * 0.2, fit_label: (s.distress_type ?? "Lead").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
        score: 0, sale_date: s.trustee_sale_date, contact: null })
    }
    const rows = await attachWorkflow(opps, true)
    rows.sort((a, b) => (b.last_contact_at ?? "").localeCompare(a.last_contact_at ?? ""))
    return { day, rows }
  }
  let q = supabaseAdmin.from("crm_visible_opportunities").select(OPP_COLS).not("bot_source", "in", researchSourceFilter).eq("captured_on", day)
  q = applyView(q, view)
  if (opts.county) q = q.eq("county", opts.county)
  if (opts.q) q = q.or(`property_address.ilike.%${opts.q.replace(/[%,()]/g, " ")}%,owner_name.ilike.%${opts.q.replace(/[%,()]/g, " ")}%`)
  q = view === "soon" ? q.order("sale_date").order("rank") : q.order("rank")
  const limit = opts.limit ?? 200
  q = q.order("staging_id")
  const rows: LeadRow[] = []
  for (let offset = 0; rows.length < limit; offset += limit) {
    const { data, error } = await q.range(offset, offset + limit - 1)
    if (error) return { day, rows: [], error: error.message }
    rows.push(...await attachWorkflow((data ?? []) as Opportunity[]))
    if ((data?.length ?? 0) < limit) break
  }
  return { day, rows: rows.slice(0, limit) }
}

export async function viewCounts(day: string | null): Promise<Partial<Record<ViewKey, number>>> {
  if (!supabaseAdmin || !day) return {}
  const r = await supabaseAdmin.from("crm_visible_opportunities").select("staging_id,fit_label,sale_date,county").not("bot_source", "in", researchSourceFilter).eq("captured_on", day).limit(5000)
  const holds = await noticeHolds()
  const all = (r.data ?? []).filter(x => !holds.stagingIds.has(x.staging_id)) as { fit_label: string; sale_date: string | null; county: string | null }[]
  const fl = new Set(FL_COUNTIES)
  const rows = all.filter((x) => !fl.has(x.county ?? ""))
  const today = isoDay(new Date()), soon = isoDay(addDays(14))
  const c: Partial<Record<ViewKey, number>> = { all: rows.length, soon: 0, foreclosure: 0, estate: 0, tax: 0, court: 0, bankruptcy: 0, code: 0,
    florida: all.length - rows.length }
  for (const x of rows) {
    if (x.sale_date && x.sale_date >= today && x.sale_date <= soon) c.soon!++
    if (x.fit_label.startsWith("Foreclosure")) c.foreclosure!++
    else if (x.fit_label.startsWith("Estate")) c.estate!++
    else if (x.fit_label === "Tax sale") c.tax!++
    else if (x.fit_label.startsWith("Court")) c.court!++
    else if (x.fit_label.startsWith("Bankruptcy")) c.bankruptcy!++
    else if (x.fit_label.startsWith("Code violation")) c.code!++
  }
  return c
}

export type StagedLead = {
  id: string; bot_source: string; staged_at: string; staging_status: string; pipeline_lead_key: string | null
  property_address: string | null; county: string | null; full_name: string | null; owner_name_records: string | null
  email: string | null; phone: string | null; property_value: number | null; property_value_source: string | null
  mortgage_balance: number | null; trustee_sale_date: string | null; distress_type: string | null; admin_notes: string | null
  herald_elapsed_sale_date?: string | null
  shelby_value_review?: unknown
  mt_review?: unknown
  knoxville_review?: unknown
  city_review: { status?: string; official_statuses?: string[]; checked_on?: string } | null; source_url: string | null; year_built: number | null; alternate_phones: unknown; raw_payload: Record<string, unknown> | null
}

/** The promoted homeowner_requests row for a pipeline key, which is what
 *  the math sheet (/crm/math-sheet/[id]) is keyed by. */
export async function mathSheetIdFor(slug: string | null): Promise<string | null> {
  if (!supabaseAdmin || !slug) return null
  const r = await supabaseAdmin.from("homeowner_requests").select("id").eq("pipeline_lead_key", slug).limit(1)
  return (r.data?.[0] as { id: string } | undefined)?.id ?? null
}

export async function getLead(id: string): Promise<{ metroDisposition: string | null; noticeHold: string | null; lead: StagedLead; opp: Opportunity | null; workflow: DialerWorkflow | null; activities: DialerActivity[] } | null> {
  if (!supabaseAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const r = await supabaseAdmin.from("homeowner_requests_staging")
    .select("id,bot_source,staged_at,staging_status,pipeline_lead_key,property_address,county,full_name,owner_name_records,email,phone,property_value,property_value_source,mortgage_balance,trustee_sale_date,distress_type,admin_notes,source_url,year_built,alternate_phones,raw_payload,mackie_notice_hold,herald_elapsed_sale_date,shelby_value_review:phone_metadata->shelby_trustee_value_review,mt_review:phone_metadata->mt_juliet_issue_review,knoxville_review:phone_metadata->knoxville_hearing_review,city_review:phone_metadata->chattanooga_case_review")
    .eq("id", id).maybeSingle()
  const lead = r.data as StagedLead | null
  if (!lead) return null
  const day = await latestOpportunityDay()
  const [o, workflow, activities] = await Promise.all([
    day ? supabaseAdmin.from("crm_visible_opportunities").select(OPP_COLS).not("bot_source", "in", researchSourceFilter).eq("captured_on", day).eq("staging_id", id).maybeSingle() : Promise.resolve({ data: null }),
    lead.pipeline_lead_key ? getWorkflow(lead.pipeline_lead_key) : Promise.resolve(null),
    lead.pipeline_lead_key ? listActivities(lead.pipeline_lead_key, 100) : Promise.resolve([] as DialerActivity[]),
  ])
  const metroDisposition = (await metroDispositions([lead])).get(lead.id) ?? null
  return { metroDisposition, noticeHold: (await noticeHolds()).slugs.get(lead.pipeline_lead_key ?? "") ?? r.data?.mackie_notice_hold ?? null, lead, opp: lead.herald_elapsed_sale_date || lead.bot_source === "warn_notices" || (metroDisposition && metroDisposition !== "open") ? null : (o.data as Opportunity | null) ?? null, workflow, activities }
}

export type TodayData = {
  due: { slug: string; status: DialerStatus; next_action: string; next_action_at: string; summary_notes: string; staging_id: string | null; address: string | null }[]
  sales: Opportunity[]
  recent: (DialerActivity & { staging_id: string | null; address: string | null })[]
  quality: { total: number; ready: number; day: string | null }
  outreach: { sentToday: number; suppressed: number; contacts: number }
  counts: { leads: number; landlords: number; working: number }
}

async function stagingFor(slugs: string[]): Promise<Map<string, { id: string; bot_source: string; address: string | null; hold: string | null }>> {
  const out = new Map<string, { id: string; bot_source: string; address: string | null; hold: string | null }>()
  if (!supabaseAdmin || !slugs.length) return out
  const r = await supabaseAdmin.from("homeowner_requests_staging").select("id,pipeline_lead_key,property_address,bot_source,mackie_notice_hold").in("pipeline_lead_key", slugs).limit(500)
  if (r.error) throw new Error(r.error.message)
  for (const x of (r.data ?? []) as { id: string; bot_source: string; pipeline_lead_key: string; property_address: string | null; mackie_notice_hold: string | null }[]) {
    if (!out.has(x.pipeline_lead_key)) out.set(x.pipeline_lead_key, { id: x.id, bot_source: x.bot_source, address: x.property_address, hold: x.mackie_notice_hold })
  }
  return out
}

export async function getToday(reviewSales = true): Promise<TodayData> {
  const empty: TodayData = { due: [], sales: [], recent: [], quality: { total: 0, ready: 0, day: null }, outreach: { sentToday: 0, suppressed: 0, contacts: 0 }, counts: { leads: 0, landlords: 0, working: 0 } }
  if (!supabaseAdmin) return empty
  const db = supabaseAdmin
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  const day = await latestOpportunityDay()
  const [dueRows, sales, recent, qDay, sent, supp, contacts, oppCount, llCount, working] = await Promise.all([
    dueWorkflows(endOfToday.toISOString()),
    day ? db.from("crm_visible_opportunities").select(OPP_COLS).not("bot_source", "in", researchSourceFilter).eq("captured_on", day)
      .gte("sale_date", isoDay(new Date())).lte("sale_date", isoDay(addDays(14))).order("sale_date").limit(12) : Promise.resolve({ data: [] }),
    db.from("dialer_activities").select("id,listing_slug,occurred_at,channel,outcome,notes,next_action,next_action_at,created_by,created_at")
      .order("occurred_at", { ascending: false }).limit(10),
    db.from("lead_quality_daily").select("captured_on").order("captured_on", { ascending: false }).limit(1),
    db.from("outreach_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", isoDay(new Date())),
    db.from("outreach_suppressions").select("email", { count: "exact", head: true }),
    db.from("outreach_contacts").select("id", { count: "exact", head: true }),
    day ? db.from("crm_visible_opportunities").select("rank", { count: "exact", head: true }).not("bot_source", "in", researchSourceFilter).eq("captured_on", day) : Promise.resolve({ count: 0 }),
    db.from("landlord_portfolios").select("owner_name", { count: "exact", head: true }),
    workingSlugs(),
  ])
  const qd = (qDay.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
  let quality = { total: 0, ready: 0, day: qd }
  if (qd) {
    const q = await db.from("lead_quality_daily").select("total,launch_ready").eq("captured_on", qd)
    for (const r of (q.data ?? []) as { total: number; launch_ready: number }[]) { quality.total += r.total; quality.ready += r.launch_ready }
  }
  const recentRows = ((recent.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, listingSlug: r.listing_slug as string, occurredAt: r.occurred_at as string, channel: r.channel as DialerActivity["channel"],
    outcome: r.outcome as DialerActivity["outcome"], notes: (r.notes as string) ?? "", nextAction: r.next_action as DialerActivity["nextAction"],
    nextActionAt: r.next_action_at as string | null, createdBy: (r.created_by as string) ?? "", createdAt: r.created_at as string,
  }))
  const holds = await noticeHolds()
  const where = await stagingFor([...new Set([...dueRows.map((d) => d.listing_slug), ...recentRows.map((r) => r.listingSlug)])])
  const metro = await metroDispositions([...where.values()])
  return {
    due: dueRows.filter(d => !holds.slugs.has(d.listing_slug) && !where.get(d.listing_slug)?.hold && !metroHeld(metro, where.get(d.listing_slug)?.id ?? "")).map((d) => ({ slug: d.listing_slug, status: d.status, next_action: d.next_action, next_action_at: d.next_action_at, summary_notes: d.summary_notes ?? "",
      staging_id: where.get(d.listing_slug)?.id ?? null, address: where.get(d.listing_slug)?.address ?? null })),
    sales: reviewSales ? await attachWorkflow((sales.data ?? []) as Opportunity[]) : [],
    recent: recentRows.filter(r => !researchOnlySource(where.get(r.listingSlug)?.bot_source)).map((r) => ({ ...r, staging_id: where.get(r.listingSlug)?.id ?? null, address: where.get(r.listingSlug)?.address ?? null })),
    quality,
    outreach: { sentToday: sent.count ?? 0, suppressed: supp.count ?? 0, contacts: contacts.count ?? 0 },
    counts: { leads: oppCount.count ?? 0, landlords: llCount.count ?? 0, working: working.length },
  }
}

// ---- Commercial, land and high-value asset buckets ----------------------
// Tagged on staging rows by other bots: raw_payload.property_lane (the
// property_lane bot: lane from assessor land use, grade A/B/C when it
// clears the contact and distress gates) and raw_payload.aircraft (the
// faa_aircraft bot: owner matches a TN-registered aircraft worth ~$100K+).
// Both reads go through partial indexes
// (20261106_staging_property_lane_index.sql, 20261113_staging_aircraft_index.sql)
// and select only the tag, never the full payload.

export type LaneTag = {
  lane: string; subtype: string | null; basis: string | null; acres: number | null; value: number | null
  owner_type: string | null; grade: "A" | "B" | "C" | null; exclude_reason: string | null; stacked_distress?: string[]
  contact_tier: string | null; out_of_state_owner: boolean; mailing?: string | null; mailing_state?: string | null
  phones?: string[]; email?: string | null; land_flip?: { score: number; signals: string[] }
}
export type AircraftTag = {
  n_number: string; aircraft: string; value_band_label: string; registrant: string; registrant_address: string
  registration_status: string | null; match_type?: string; confidence?: string
}
// raw_payload.personal_property (the personal_property_lane bot): only leads
// worth a high-value estate, liquidation, seizure or owner-asset auction.
export type PersonalPropertyTag = {
  lane: "warn_research" | "estate" | "business_liquidation" | "seizure" | "owner_asset" | "vessel_arrest" | "vessel_lien"; grade: "A" | "B" | null
  categories: string[]; est_value_min: number | null; signals: string[]; caveats: string[]
  contacts?: {
    // Addresses are line arrays from TN court notices, plain strings from FL clerk files.
    attorney?: { names?: string[]; address?: string[] | string | null }
    representatives?: { name: string; address?: string[] | string | null }[]
    probate_docket?: string; bankruptcy_docket?: string; case_number?: string; plaintiff?: string
    owner?: string
    marina?: { name: string; address?: string | null }
    trustee?: { name: string; phone?: string | null; email?: string | null }
    counsel?: { name: string; firm?: string | null; phone?: string | null; email?: string | null }[]
  }
  // pp-v2 routing: who controls the sale and whether FALCO can route it.
  region?: "TN" | "FL"; controller?: string; routable?: boolean; not_routable_reason?: string | null
  route_to?: string | null; value_basis?: string | null; deadline?: string | null; primary_contact?: string
  prospect?: boolean; registry_assets?: { n_number?: string; aircraft?: string; registrant?: string }[]
  authority_review?: { controller?: { name?: string; role?: string; authority?: string }; court?: { status?: string }; liens?: { status?: string } }
  qualification?: string; holds?: string[]; next_action?: string; dedupe_key?: string
  duplicate_of?: string
}
export const addressText = (a: string[] | string | null | undefined): string =>
  Array.isArray(a) ? a.join(", ") : (a ?? "")
// raw_payload.operator_contents: what the operator learned on a call. Written
// only by /api/crm/contents, never by a bot.
export type OperatorContents = {
  vehicles: string; boats_rvs: string; firearms_count: number | null; firearms_collection: boolean
  coins_jewelry_art: string; tractors_equipment: string; other: string; est_value: number | null
  updated_at: string; updated_by: string
}
export const PP_LANE_LABEL: Record<PersonalPropertyTag["lane"], string> = {
  warn_research: "WARN employment notice", estate: "Estate contents", business_liquidation: "Business liquidation", seizure: "Tax seizure", owner_asset: "Owner asset",
  vessel_arrest: "Vessel arrest", vessel_lien: "Marina lien",
}
export type BucketRow = {
  staging_id: string; property_address: string | null; county: string | null; owner_name: string | null
  distress_type: string | null; bot_source: string; sale_date: string | null; property_value: number | null
  landEvidence: LandEvidence | null; lane: LaneTag | null; aircraft: AircraftTag[] | null; pp: PersonalPropertyTag | null
  slug: string | null; status: DialerStatus | null; last_contact_at: string | null
}
export const LAND_REVIEW_PAGE_SIZE = 50
export type GradeFilter = "qualified" | "A" | "B" | "C" | "all"

export type StagedBucket = {
  id: string; property_address: string | null; county: string | null; owner_name_records: string | null; full_name: string | null
  distress_type: string | null; bot_source: string; trustee_sale_date: string | null; property_value: number | null
  landEvidence?: LandEvidence | null; parcelKey?: string; pipeline_lead_key: string | null; lane?: LaneTag | null; aircraft?: AircraftTag[] | null; pp?: PersonalPropertyTag | null
}
export const BUCKET_COLS = "id,property_address,county,owner_name_records,full_name,distress_type,bot_source,trustee_sale_date,property_value,pipeline_lead_key"

async function bucketWorkflow(rows: StagedBucket[]): Promise<BucketRow[]> {
  const slugs = [...new Set(rows.map((r) => r.pipeline_lead_key).filter(Boolean))] as string[]
  const wfOf = new Map<string, { status: DialerStatus; last_contact_at: string | null }>()
  for (let i = 0; supabaseAdmin && i < slugs.length; i += 300) {
    const wf = await supabaseAdmin.from("dialer_lead_workflow").select("listing_slug,status,last_contact_at").in("listing_slug", slugs.slice(i, i + 300))
    for (const w of (wf.data ?? []) as { listing_slug: string; status: DialerStatus; last_contact_at: string | null }[]) wfOf.set(w.listing_slug, w)
  }
  return rows.map((r) => {
    const w = r.pipeline_lead_key ? wfOf.get(r.pipeline_lead_key) : undefined
    return {
      landEvidence: r.landEvidence ?? null, staging_id: r.id, property_address: r.property_address, county: r.county, owner_name: r.owner_name_records ?? r.full_name,
      distress_type: r.distress_type, bot_source: r.bot_source, sale_date: r.trustee_sale_date,
      property_value: r.property_value ?? r.lane?.value ?? null, lane: r.lane ?? null, aircraft: r.aircraft ?? null, pp: r.pp ?? null,
      slug: r.pipeline_lead_key, status: w?.status ?? null, last_contact_at: w?.last_contact_at ?? null,
    }
  })
}

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 }

// Keep candidate discovery index-only. Filtering nested JSON here makes Postgres
// scan all of staging. Read routing controls only after locating the tagged IDs.
const aircraftProjection = "aircraft:raw_payload->aircraft,pp:raw_payload->personal_property,evidence:raw_payload->personal_property_evidence"
const assetCandidates = cache(async () => {
  type Candidate = { id: string; bot_source: string; routable: string | null; prospect: string | null; key: string | null; categories?: string[]; pp_lane?: string }
  const db = supabaseAdmin!
  async function taggedIds(tag: "aircraft" | "personal_property") {
    const ids: string[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("homeowner_requests_staging").select("id")
        .not(`raw_payload->${tag}`, "is", null).order("id").range(offset, offset + 499)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) ids.push(row.id)
      if ((data?.length ?? 0) < 500) return ids
    }
  }
  const [aircraft, personal] = await Promise.all([taggedIds("aircraft"), taggedIds("personal_property")])
  const aircraftIds = new Set(aircraft)
  const warn = await warnRows()
  const ids = [...new Set([...aircraft, ...personal, ...warn.keys()])]
  const rows: Candidate[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db.from("homeowner_requests_staging")
      .select("id,routable:raw_payload->personal_property->>routable,prospect:raw_payload->personal_property->>prospect,key:raw_payload->personal_property->>dedupe_key,categories:raw_payload->personal_property->categories,pp_lane:raw_payload->personal_property->>lane,bot_source")
      .in("id", ids.slice(i, i + 100))
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as unknown as Candidate[]
    const affected = batch.filter(r => !warn.has(r.id) && (aircraftIds.has(r.id) || r.categories?.includes("aircraft") || r.pp_lane === "owner_asset"))
    if (affected.length) {
      const lookup = await db.from("homeowner_requests_staging")
        .select(`id,full_name,owner_name_records,distress_type,${aircraftProjection}`).in("id", affected.map(r => r.id))
      if (lookup.error) throw new Error(lookup.error.message)
      for (const row of affected) {
        const detail = lookup.data?.find(r => r.id === row.id)
        const pp = detail && aircraftAsset(detail, detail.aircraft, detail.pp, detail.evidence).pp
        if (!pp || pp.routable === false) {
          row.routable = "false"
          row.prospect = String(pp?.prospect === true)
          row.key = pp?.dedupe_key ?? null
        }
      }
    }
    for (const row of batch) {
      if (researchOnlySource(row.bot_source)) continue
      const w = warn.get(row.id)
      rows.push(w ? { ...row, routable: String(w.routable), prospect: String(w.prospect), key: w.dedupe_key ?? null } : row)
    }
  }
  return rows
})

export async function listBucket(bucket: BucketKey, opts: { landOpportunities?: boolean; page?: number; research?: boolean; prospects?: boolean; grade?: GradeFilter; county?: string; q?: string } = {}):
  Promise<{ rows: BucketRow[]; grades: Record<GradeFilter, number>; error?: string }> {
  const grades: Record<GradeFilter, number> = { qualified: 0, A: 0, B: 0, C: 0, all: 0 }
  if (!supabaseAdmin) return { rows: [], grades, error: "Database not configured." }
  const all: StagedBucket[] = []
  if (bucket === "assets") {
    // Two steps on purpose: the partial index answers "which ids" as an
    // index-only scan, but asking for the tag in the same query makes the
    // planner (no stats on the expression) seq-scan all of staging (~6 s).
    const candidates = await assetCandidates()
    const idList = candidates.filter(row => (row.routable === "false") === !!opts.research
      && (!opts.prospects || row.prospect === "true")).map(row => row.id)
    for (let i = 0; i < idList.length; i += 100) {
      const r = await supabaseAdmin.from("homeowner_requests_staging")
        .select(`${BUCKET_COLS},${aircraftProjection}`).in("id", idList.slice(i, i + 100))
      if (r.error) return { rows: [], grades, error: r.error.message }
      for (const row of (r.data ?? []) as unknown as (StagedBucket & { evidence?: unknown })[]) {
        const display = aircraftAsset(row, row.aircraft, row.pp, row.evidence)
        row.pp = display.pp
        if (!opts.research || !display.registryResearch) row.aircraft = display.confirmed
        all.push(row)
      }
    }
  } else if (bucket === "land") {
    all.push(...await loadLandRows(BUCKET_COLS))
  } else {
    // 500 rows a request: a full 1,000-row page with the lane tag ran up to
    // 3.9 s against the 8 s API limit, and a timeout emptied the list while
    // the tab counter still showed its number.
    for (let page = 0; page < 10; page++) {
      const r = await supabaseAdmin.from("homeowner_requests_staging").select(`${BUCKET_COLS},lane:raw_payload->property_lane`)
        .not("raw_payload->property_lane", "is", null).eq("raw_payload->property_lane->>lane", bucket).not("bot_source", "in", researchSourceFilter)
        .order("id").range(page * 500, page * 500 + 499)
      if (r.error) return { rows: [], grades, error: r.error.message }
      const batch = (r.data ?? []) as unknown as StagedBucket[]
      all.push(...batch)
      if (batch.length < 500) break
    }
  }
  // The same property can be staged by several bots; keep one row per address.
  const holds = await noticeHolds()
  const metro = await metroDispositions(all)
  const byAddr = new Map<string, StagedBucket>()
  const warn = await warnRows()
  for (const r of all) {
    if (researchOnlySource(r.bot_source)) continue
    const w = warn.get(r.id)
    if (w) {
      if (bucket !== "assets") continue
      r.pp = w
      r.owner_name_records = r.full_name
      r.property_value = null
      r.aircraft = null
      r.trustee_sale_date = null
    }
    if (bucket === "land") {
      if (opts.research ? !r.landEvidence || r.landEvidence.corroborated : r.landEvidence && !r.landEvidence.corroborated) continue
      if (opts.landOpportunities && !r.landEvidence?.corroborated) continue
    }
    if (metroHeld(metro, r.id) || holds.stagingIds.has(r.id) || (bucket === "assets" && (r.pp?.routable === false) !== !!opts.research)) continue
    const k = bucket === "assets" ? r.pp?.dedupe_key || r.id : r.parcelKey || propertyKey(r)
    const prev = byAddr.get(k)
    if (!prev || (GRADE_ORDER[r.lane?.grade ?? r.pp?.grade ?? ""] ?? 9) < (GRADE_ORDER[prev.lane?.grade ?? prev.pp?.grade ?? ""] ?? 9)) byAddr.set(k, r)
  }
  let rows = [...byAddr.values()]
  if (opts.county) rows = rows.filter((r) => (r.county ?? "").toLowerCase().replace(/\s+county$/, "") === opts.county)
  if (opts.q) {
    const q = opts.q.toLowerCase()
    rows = rows.filter((r) => `${r.property_address} ${r.owner_name_records} ${r.full_name} ${r.landEvidence?.parcel ?? ""}`.toLowerCase().includes(q))
  }
  for (const r of rows) {
    grades.all++
    const g = r.lane?.grade
    if (g) { grades.qualified++; grades[g]++ }
  }
  const ownershipView = bucket === "land" && (opts.research || opts.landOpportunities)
  const grade = ownershipView ? "all" : opts.grade ?? (bucket === "assets" ? "all" : "qualified")
  if (bucket !== "assets" && grade !== "all") rows = rows.filter((r) => (grade === "qualified" ? !!r.lane?.grade : r.lane?.grade === grade))
  rows.sort((a, b) => (GRADE_ORDER[a.lane?.grade ?? a.pp?.grade ?? ""] ?? 9) - (GRADE_ORDER[b.lane?.grade ?? b.pp?.grade ?? ""] ?? 9)
    || (b.lane?.land_flip?.score ?? 0) - (a.lane?.land_flip?.score ?? 0)
    || Number(b.property_value ?? b.lane?.value ?? 0) - Number(a.property_value ?? a.lane?.value ?? 0))
  // Every row in the view (a few hundred); the tab count must match.
  const start = ((opts.page ?? 1) - 1) * LAND_REVIEW_PAGE_SIZE
  return { rows: await bucketWorkflow(ownershipView ? rows.slice(start, start + LAND_REVIEW_PAGE_SIZE) : rows.slice(0, 2000)), grades }
}

/** Same per-property key listBucket dedupes on, so a tab's count always
 *  equals the rows its list shows (several bots can stage one property). */
const propertyKey = (r: { id: string; property_address: string | null }) =>
  (r.property_address ?? r.id).toUpperCase().replace(/[^A-Z0-9]/g, "")

export async function bucketCounts(): Promise<Record<"commercial" | "assets", number>> {
  const out = { commercial: 0, assets: 0 }
  if (!supabaseAdmin) return out
  const db = supabaseAdmin
  type R = { id: string; bot_source: string; property_address: string | null }
  const holds = await noticeHolds()
  const unique = (rows: R[]) => new Set(rows.filter(r => !holds.stagingIds.has(r.id)).map(propertyKey)).size
  // Graded lane rows only, matching the list's default "Qualified" filter.
  const lane = async (name: string) => {
    const rows: R[] = []
    for (let page = 0; page < 5; page++) {
      const r = await db.from("homeowner_requests_staging").select("id,property_address,bot_source")
        .not("raw_payload->property_lane", "is", null).eq("raw_payload->property_lane->>lane", name).not("bot_source", "in", researchSourceFilter)
        .not("raw_payload->property_lane->>grade", "is", null).order("id").range(page * 1000, page * 1000 + 999)
      // A failed read is not a count of zero: show "?" on the tab instead.
      if (r.error) return Number.NaN
      const batch = (r.data ?? []) as R[]
      rows.push(...batch)
      if (batch.length < 1000) break
    }
    const metro = await metroDispositions(rows)
    return unique(rows.filter(row => row.bot_source !== "warn_notices" && !researchOnlySource(row.bot_source) && !metroHeld(metro, row.id)))
  }
  // Ids first through the partial indexes (see listBucket), then addresses.
  const assets = async () => {
    const keys = new Set<string>()
    const candidates = await assetCandidates()
    const metro = await metroDispositions(candidates)
    for (const row of candidates) {
      if (!metroHeld(metro, row.id) && row.routable !== "false" && !holds.stagingIds.has(row.id)) keys.add(row.key || row.id)
    }
    return keys.size
  }
  const [c, a] = await Promise.all([lane("commercial"), assets()])
  return { commercial: c, assets: a }
}
