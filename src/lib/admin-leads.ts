import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================================================
// Unified lead types — what the /admin dashboard renders for each form
// ----------------------------------------------------------------------------
// We don't try to hide the per-table specifics; the admin needs the raw fields
// so they can act on them. But we do shape them into a consistent envelope.
// ============================================================================

export * from "./admin-lead-types"
import { LEAD_STATUSES, type LeadKind, type LeadStatus, type Lead, type LeadsBundle } from "./admin-lead-types"

function fmtCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return ""
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function fmtDateHuman(iso: string | null | undefined): string {
  if (!iso) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

function within24h(iso: string): boolean {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  return Date.now() - t < 24 * 60 * 60 * 1000
}

// ----------------------------------------------------------------------------
// Per-table → Lead mappers
// ----------------------------------------------------------------------------

/** Shared workflow columns added by the admin_lead_workflow migration. */
type WorkflowRow = {
  status: string | null
  admin_notes: string | null
  next_action_at: string | null
  last_contacted_at: string | null
}

function pickWorkflow(r: WorkflowRow): {
  status: LeadStatus
  notes: string
  nextActionAt: string | null
  lastContactedAt: string | null
} {
  const s = (r.status ?? "new") as LeadStatus
  return {
    status: LEAD_STATUSES.includes(s) ? s : "new",
    notes: r.admin_notes ?? "",
    nextActionAt: r.next_action_at,
    lastContactedAt: r.last_contacted_at,
  }
}

type HomeownerRow = WorkflowRow & {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  property_address: string | null
  county: string | null
  trustee_sale_date: string | null
  mortgage_balance: number | null
  best_callback: string | null
  situation_notes: string | null
  referrer: string | null
  submitted_at: string
  // Pipeline-sync fields (populated by falco-distress-bots when source='bot')
  source: string | null
  owner_name_records: string | null
  distress_type: string | null
  property_value: number | null
  property_value_source: string | null
  property_value_as_of: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  year_built: number | null
  last_sale_date: string | null
  last_sale_price: number | null
  lien_position: string | null
  pipeline_score: number | null
  pipeline_lead_key: string | null
  sale_date_last_seen_at: string | null
}

// Sale-date freshness. Bots stamp sale_date_last_seen_at every time a
// notice carrying this lead's sale is re-scraped; the sale-date-sync
// cron keeps it current. A past date or a stale sighting means the
// sale likely ran or was continued — verify before calling.
function saleDateFreshness(
  saleDate: string | null,
  lastSeenAt: string | null
): { short: string; long: string } | null {
  if (!saleDate) return null
  const now = Date.now()
  const sale = new Date(saleDate).getTime()
  if (sale < now - 24 * 60 * 60 * 1000) {
    const days = Math.floor((now - sale) / 86400000)
    return {
      short: "sale date passed",
      long: `Sale date passed ${days}d ago — ran, postponed, or cured. Verify with the trustee before calling.`,
    }
  }
  if (lastSeenAt) {
    const ageDays = Math.floor((now - new Date(lastSeenAt).getTime()) / 86400000)
    if (ageDays > 14) {
      return {
        short: "possibly postponed",
        long: `Notice not re-verified in ${ageDays}d — sale may have been postponed or cancelled. Check the trustee's current schedule.`,
      }
    }
  }
  return null
}

function mapHomeowner(r: HomeownerRow): Lead {
  const summaryBits: string[] = []
  if (r.property_address) summaryBits.push(r.property_address)
  if (r.property_value) summaryBits.push(`AVM ${fmtCurrency(r.property_value)}`)
  const saleFlag = saleDateFreshness(r.trustee_sale_date, r.sale_date_last_seen_at)
  if (r.trustee_sale_date)
    summaryBits.push(
      `sale ${fmtDateHuman(r.trustee_sale_date)}${saleFlag ? ` (${saleFlag.short})` : ""}`
    )
  if (r.mortgage_balance) summaryBits.push(`bal ${fmtCurrency(r.mortgage_balance)}`)

  const bedBath =
    r.beds || r.baths || r.sqft
      ? [
          r.beds ? `${r.beds}bd` : null,
          r.baths ? `${r.baths}ba` : null,
          r.sqft ? `${r.sqft.toLocaleString()} sqft` : null,
        ]
          .filter(Boolean)
          .join(" / ")
      : ""
  const lastSale =
    r.last_sale_price && r.last_sale_date
      ? `${fmtCurrency(r.last_sale_price)} (${fmtDateHuman(r.last_sale_date)})`
      : ""
  const avm = r.property_value
    ? `${fmtCurrency(r.property_value)}${
        r.property_value_source ? ` (${r.property_value_source})` : ""
      }`
    : ""
  const sourceLabel =
    r.source === "bot"
      ? "Bot pipeline"
      : r.source === "manual"
      ? "Manual entry"
      : "Form submission"

  // source = 'bot' rows become "pipeline" kind; everything else stays "homeowner"
  const kind: LeadKind = r.source === "bot" ? "pipeline" : "homeowner"
  return {
    id: String(r.id),
    kind,
    submittedAt: r.submitted_at,
    email: r.email ?? "",
    name: r.full_name || r.owner_name_records || "",
    summary: summaryBits.join(" · ") || "No property details",
    details: [
      { label: "Source", value: sourceLabel },
      { label: "Distress type", value: r.distress_type ?? "" },
      { label: "Pipeline score", value: r.pipeline_score ? String(r.pipeline_score) : "" },
      { label: "Phone", value: r.phone ?? "" },
      { label: "Property", value: r.property_address ?? "" },
      { label: "County", value: r.county ?? "" },
      { label: "AVM (after-repair value)", value: avm },
      { label: "Beds / Baths / Sqft", value: bedBath },
      { label: "Year built", value: r.year_built ? String(r.year_built) : "" },
      { label: "Last sale", value: lastSale },
      { label: "Lien position", value: r.lien_position ?? "" },
      { label: "Trustee sale", value: fmtDateHuman(r.trustee_sale_date) },
      { label: "Sale date status", value: saleFlag ? saleFlag.long : "" },
      { label: "Mortgage balance", value: r.mortgage_balance ? fmtCurrency(r.mortgage_balance) : "" },
      { label: "Owner (records)", value: r.owner_name_records ?? "" },
      { label: "Best callback", value: r.best_callback ?? "" },
      { label: "Situation", value: r.situation_notes ?? "" },
      { label: "Found via", value: r.referrer ?? "" },
    ].filter((d) => d.value && d.value.trim()),
    ...pickWorkflow(r),
  }
}

type BuyerRow = WorkflowRow & {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  company: string | null
  price_min: number | null
  price_max: number | null
  counties: string | null
  property_types: string | null
  strategies: string | null
  cash_ready: boolean | null
  funding_source: string | null
  close_speed_days: number | null
  notes: string | null
  referrer: string | null
  registered_at: string
}

function mapBuyer(r: BuyerRow): Lead {
  const range =
    r.price_min || r.price_max
      ? `${fmtCurrency(r.price_min) || "—"} – ${fmtCurrency(r.price_max) || "—"}`
      : ""
  const summaryBits: string[] = []
  if (r.cash_ready) summaryBits.push("CASH READY")
  if (range) summaryBits.push(range)
  if (r.counties) summaryBits.push(r.counties)
  if (r.strategies) summaryBits.push(r.strategies)
  return {
    id: String(r.id),
    kind: "buyer",
    submittedAt: r.registered_at,
    email: r.email,
    name: r.full_name ?? "",
    summary: summaryBits.join(" · ") || "No buy box details",
    details: [
      { label: "Phone", value: r.phone ?? "" },
      { label: "Company", value: r.company ?? "" },
      { label: "Price range", value: range },
      { label: "Counties", value: r.counties ?? "" },
      { label: "Property types", value: r.property_types ?? "" },
      { label: "Strategies", value: r.strategies ?? "" },
      { label: "Cash ready", value: r.cash_ready ? "Yes" : "" },
      { label: "Funding", value: r.funding_source ?? "" },
      { label: "Close speed", value: r.close_speed_days ? `${r.close_speed_days} days` : "" },
      { label: "Notes", value: r.notes ?? "" },
      { label: "Found via", value: r.referrer ?? "" },
    ].filter((d) => d.value && d.value.trim()),
    ...pickWorkflow(r),
  }
}

type PartnerRow = WorkflowRow & {
  id: string
  email: string
  full_name: string | null
  company: string | null
  phone: string | null
  county_coverage: string | null
  deals_per_year: number | null
  years_in_business: number | null
  fee_structure: string | null
  notes: string | null
  submitted_at: string
}

function mapPartner(r: PartnerRow): Lead {
  const summaryBits: string[] = []
  if (r.company) summaryBits.push(r.company)
  if (r.county_coverage) summaryBits.push(r.county_coverage)
  if (r.deals_per_year) summaryBits.push(`${r.deals_per_year}/yr`)
  return {
    id: String(r.id),
    kind: "partner",
    submittedAt: r.submitted_at,
    email: r.email,
    name: r.full_name ?? "",
    summary: summaryBits.join(" · ") || "No partner details",
    details: [
      { label: "Company", value: r.company ?? "" },
      { label: "Phone", value: r.phone ?? "" },
      { label: "County coverage", value: r.county_coverage ?? "" },
      { label: "Deals / year", value: r.deals_per_year ? String(r.deals_per_year) : "" },
      { label: "Years in business", value: r.years_in_business ? String(r.years_in_business) : "" },
      { label: "Fee structure", value: r.fee_structure ?? "" },
      { label: "Notes", value: r.notes ?? "" },
    ].filter((d) => d.value && d.value.trim()),
    ...pickWorkflow(r),
  }
}

type InquiryRow = WorkflowRow & {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  company: string | null
  topic: string | null
  message: string | null
  submitted_at: string
}

function mapInquiry(r: InquiryRow): Lead {
  return {
    id: String(r.id),
    kind: "inquiry",
    submittedAt: r.submitted_at,
    email: r.email,
    name: r.full_name ?? "",
    summary: [r.topic, r.company].filter(Boolean).join(" · ") || (r.message ?? "").slice(0, 80),
    details: [
      { label: "Phone", value: r.phone ?? "" },
      { label: "Company", value: r.company ?? "" },
      { label: "Topic", value: r.topic ?? "" },
      { label: "Message", value: r.message ?? "" },
    ].filter((d) => d.value && d.value.trim()),
    ...pickWorkflow(r),
  }
}

// ----------------------------------------------------------------------------
// Public API: fetch everything for the dashboard
// ----------------------------------------------------------------------------
export async function fetchAllLeads(limitPerTable = 200): Promise<LeadsBundle> {
  if (!supabaseAdmin) {
    return {
      homeowners: [],
      pipeline: [],
      buyers: [],
      partners: [],
      inquiries: [],
      totals: { homeowners: 0, pipeline: 0, buyers: 0, partners: 0, inquiries: 0, total: 0 },
      last24h: { homeowners: 0, pipeline: 0, buyers: 0, partners: 0, inquiries: 0, total: 0 },
      unavailable: true,
    }
  }

  // Pipeline (bot) leads can be much larger than form submissions —
  // pull more of them than the standard limit so the queue isn't truncated.
  const pipelineLimit = Math.max(limitPerTable, 500)

  const [hRes, bRes, pRes, iRes] = await Promise.all([
    supabaseAdmin
      .from("homeowner_requests")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(pipelineLimit),
    supabaseAdmin
      .from("buyer_registrations")
      .select("*")
      .order("registered_at", { ascending: false })
      .limit(limitPerTable),
    supabaseAdmin
      .from("partner_inquiries")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(limitPerTable),
    supabaseAdmin
      .from("general_inquiries")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(limitPerTable),
  ])

  // Split homeowner_requests into homeowners (form-submitted) and pipeline
  // (bot-discovered) based on the source column. mapHomeowner already sets
  // .kind based on source so we can split by that here.
  const allHomeownerRows = (hRes.data ?? []).map((r) => mapHomeowner(r as HomeownerRow))
  const homeowners = allHomeownerRows.filter((l) => l.kind === "homeowner")
  const pipeline = allHomeownerRows.filter((l) => l.kind === "pipeline")
  const buyers = (bRes.data ?? []).map((r) => mapBuyer(r as BuyerRow))
  const partners = (pRes.data ?? []).map((r) => mapPartner(r as PartnerRow))
  const inquiries = (iRes.data ?? []).map((r) => mapInquiry(r as InquiryRow))

  const totals = {
    homeowners: homeowners.length,
    pipeline: pipeline.length,
    buyers: buyers.length,
    partners: partners.length,
    inquiries: inquiries.length,
    total:
      homeowners.length +
      pipeline.length +
      buyers.length +
      partners.length +
      inquiries.length,
  }

  const cnt = (xs: Lead[]) => xs.filter((x) => within24h(x.submittedAt)).length
  const last24h = {
    homeowners: cnt(homeowners),
    pipeline: cnt(pipeline),
    buyers: cnt(buyers),
    partners: cnt(partners),
    inquiries: cnt(inquiries),
    total:
      cnt(homeowners) + cnt(pipeline) + cnt(buyers) + cnt(partners) + cnt(inquiries),
  }

  return { homeowners, pipeline, buyers, partners, inquiries, totals, last24h }
}

/** Just the last-24h slice — used by the daily digest cron. */
export async function fetchLast24hLeads(): Promise<{
  homeowners: Lead[]
  pipeline: Lead[]
  buyers: Lead[]
  partners: Lead[]
  inquiries: Lead[]
}> {
  const all = await fetchAllLeads(500)
  return {
    homeowners: all.homeowners.filter((x) => within24h(x.submittedAt)),
    pipeline: all.pipeline.filter((x) => within24h(x.submittedAt)),
    buyers: all.buyers.filter((x) => within24h(x.submittedAt)),
    partners: all.partners.filter((x) => within24h(x.submittedAt)),
    inquiries: all.inquiries.filter((x) => within24h(x.submittedAt)),
  }
}
