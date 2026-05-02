import { supabaseAdmin } from "@/lib/supabase-admin"

const SYSTEM_STATE_COMPANY = "__falco_system_state__"
const INVENTORY_KEY = "dialer_inventory"
const INVENTORY_EMAIL = `state+${INVENTORY_KEY}@falco.local`

export type DialerInventoryLead = {
  key: string
  slug: string
  leadKey: string
  address: string
  county: string
  state: string
  distressType: string
  saleStatus: string
  currentSaleDate: string
  originalSaleDate: string
  auctionReadiness: string
  equityBand: string
  dtsDays: number | null
  falcoScore: number | null
  firstSeenAt: string
  ownerName: string
  ownerMail: string
  ownerPhonePrimary: string
  ownerPhoneSecondary: string
  ownerPhoneDncStatus: string
  saleControllerName: string
  saleControllerPhonePrimary: string
  trusteePhonePublic: string
  noticePhone: string
  mortgageLender: string
  mortgageDate: string
  mortgageAmount: number | null
  lastSaleDate: string
  avmLow: number | null
  avmMid: number | null
  avmHigh: number | null
  beds: number | null
  baths: number | null
  buildingAreaSqft: number | null
  yearBuilt: number | null
  vaultSlug: string | null
  packetUrl: string | null
  packetLabel: string | null
  dataCompleteness?: "full" | "solid" | "thin"
  missingFields?: string[]
}

export type DialerInventorySnapshot = {
  generatedAt: string
  leads: DialerInventoryLead[]
}

/** Raw snapshot loader — reads the JSON blob in partner_access_requests.
 *  Used as a structural-data backup. Phone/email/AVM in the snapshot may
 *  be stale; loadDialerInventory() merges fresh data from homeowner_requests
 *  on top before returning. */
async function loadRawSnapshot(): Promise<DialerInventorySnapshot | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("notes, created_at")
    .eq("company", SYSTEM_STATE_COMPANY)
    .eq("status", "state_snapshot")
    .eq("email", INVENTORY_EMAIL)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("loadRawSnapshot error:", error.message)
    }
    return null
  }
  if (!data?.notes) return null

  try {
    const envelope = JSON.parse(data.notes as string)
    const payload = envelope?.payload
    if (!payload || !Array.isArray(payload.leads)) return null
    return {
      generatedAt: String(envelope.updatedAt ?? payload.generatedAt ?? ""),
      leads: payload.leads as DialerInventoryLead[],
    }
  } catch (err) {
    console.error("loadRawSnapshot parse error:", err)
    return null
  }
}

/** A row from homeowner_requests with the fields we want to merge into
 *  the dialer inventory view. */
type HomeownerRequestRow = {
  pipeline_lead_key: string | null
  property_address: string | null
  county: string | null
  email: string | null
  phone: string | null
  full_name: string | null
  owner_name_records: string | null
  property_value: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  year_built: number | null
  trustee_sale_date: string | null
  distress_type: string | null
  mortgage_balance: number | null
  last_sale_date: string | null
  pipeline_score: number | null
  submitted_at: string | null
}

async function loadHomeownerRequestsBots(): Promise<HomeownerRequestRow[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "pipeline_lead_key, property_address, county, email, phone, full_name, owner_name_records, property_value, beds, baths, sqft, year_built, trustee_sale_date, distress_type, mortgage_balance, last_sale_date, pipeline_score, submitted_at"
    )
    .eq("source", "bot")
  if (error) {
    console.error("loadHomeownerRequestsBots error:", error.message)
    return []
  }
  return (data || []) as unknown as HomeownerRequestRow[]
}

function nonEmpty<T>(v: T | null | undefined | ""): T | null {
  return v === null || v === undefined || v === "" ? null : (v as T)
}

/** Build a DialerInventoryLead from a homeowner_requests row, optionally
 *  enriched with structural fields from a matching snapshot lead. */
function buildLeadFromHR(
  hr: HomeownerRequestRow,
  snap: DialerInventoryLead | null
): DialerInventoryLead {
  const key = (hr.pipeline_lead_key || snap?.key || "").trim()
  const ownerName =
    nonEmpty(hr.owner_name_records) ?? nonEmpty(hr.full_name) ?? snap?.ownerName ?? ""

  return {
    // Identifiers — prefer snapshot's keys (matches existing routing)
    key: snap?.key || key,
    slug: snap?.slug || key,
    leadKey: snap?.leadKey || key,
    // Address / locality
    address: hr.property_address || snap?.address || "",
    county: hr.county || snap?.county || "",
    state: snap?.state || "TN",
    // Distress
    distressType: hr.distress_type || snap?.distressType || "",
    saleStatus: snap?.saleStatus || "",
    currentSaleDate: hr.trustee_sale_date || snap?.currentSaleDate || "",
    originalSaleDate: snap?.originalSaleDate || "",
    auctionReadiness: snap?.auctionReadiness || "",
    equityBand: snap?.equityBand || "",
    dtsDays: snap?.dtsDays ?? null,
    falcoScore: hr.pipeline_score ?? snap?.falcoScore ?? null,
    firstSeenAt: snap?.firstSeenAt || hr.submitted_at || "",
    // Contact — HR is authoritative (BatchData skip-trace)
    ownerName,
    ownerMail: nonEmpty(hr.email) ?? snap?.ownerMail ?? "",
    ownerPhonePrimary: nonEmpty(hr.phone) ?? snap?.ownerPhonePrimary ?? "",
    ownerPhoneSecondary: snap?.ownerPhoneSecondary || "",
    ownerPhoneDncStatus: snap?.ownerPhoneDncStatus || "",
    // Sale controller (snapshot only)
    saleControllerName: snap?.saleControllerName || "",
    saleControllerPhonePrimary: snap?.saleControllerPhonePrimary || "",
    trusteePhonePublic: snap?.trusteePhonePublic || "",
    noticePhone: snap?.noticePhone || "",
    // Mortgage — HR has balance, snapshot has lender/date
    mortgageLender: snap?.mortgageLender || "",
    mortgageDate: snap?.mortgageDate || "",
    mortgageAmount: hr.mortgage_balance ?? snap?.mortgageAmount ?? null,
    // Property characteristics — HR is fresh from BatchData
    lastSaleDate: hr.last_sale_date || snap?.lastSaleDate || "",
    avmLow: snap?.avmLow ?? null,
    avmMid: hr.property_value ?? snap?.avmMid ?? null,
    avmHigh: snap?.avmHigh ?? null,
    beds: hr.beds ?? snap?.beds ?? null,
    baths: hr.baths ?? snap?.baths ?? null,
    buildingAreaSqft: hr.sqft ?? snap?.buildingAreaSqft ?? null,
    yearBuilt: hr.year_built ?? snap?.yearBuilt ?? null,
    // Vault / packet
    vaultSlug: snap?.vaultSlug ?? null,
    packetUrl: snap?.packetUrl ?? null,
    packetLabel: snap?.packetLabel ?? null,
    dataCompleteness: snap?.dataCompleteness,
    missingFields: snap?.missingFields,
  }
}

/** Public loader: returns the dialer inventory with FRESH data from
 *  homeowner_requests merged over the snapshot.
 *
 *  Source of truth: homeowner_requests (post-dedup, post-skip-trace,
 *  post-BatchData enrichment). Snapshot provides structural backfill
 *  for fields we don't store in HR (sale controller, beds/baths/etc.
 *  not always present, packet URLs).
 */
export async function loadDialerInventory(): Promise<DialerInventorySnapshot | null> {
  const [snapshot, hrRows] = await Promise.all([
    loadRawSnapshot(),
    loadHomeownerRequestsBots(),
  ])

  // If neither source returned anything, bail
  if (!snapshot && hrRows.length === 0) return null

  // Build a map of snapshot leads by key for fast lookup
  const snapByKey = new Map<string, DialerInventoryLead>()
  if (snapshot) {
    for (const lead of snapshot.leads) {
      const keys = [lead.key, lead.slug, lead.leadKey, lead.vaultSlug].filter(
        (k) => !!k
      )
      for (const k of keys) {
        if (k) snapByKey.set(String(k), lead)
      }
    }
  }

  // For every HR bot row, build the merged lead. HR is the source of truth
  // for which leads exist (post-dedup) and for fresh contact/AVM data.
  // No filtering here — direct lead-detail navigation must still resolve
  // foreclosed leads so Chris can close them out in the workflow. Queue
  // views filter via isLeadActive() below.
  const merged: DialerInventoryLead[] = hrRows
    .filter((r) => !!r.pipeline_lead_key)
    .map((r) => {
      const snap = snapByKey.get(r.pipeline_lead_key as string) ?? null
      return buildLeadFromHR(r, snap)
    })

  return {
    generatedAt: new Date().toISOString(),
    leads: merged,
  }
}

/** Returns true if a lead should appear in active queues (dialer index,
 *  /admin/today priority list, etc). Excludes properties where the
 *  trustee sale ran more than 7 days ago — the house has already
 *  foreclosed; we can't help anymore. 7-day grace covers postponed sales
 *  that still show the old date in scraped data. Pre-foreclosure leads
 *  (no sale date) and future-dated sales always pass through. */
export function isLeadActive(lead: DialerInventoryLead): boolean {
  if (!lead.currentSaleDate) return true
  const t = new Date(lead.currentSaleDate).getTime()
  if (Number.isNaN(t)) return true
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  return t > sevenDaysAgoMs
}

export async function findDialerInventoryLead(
  key: string
): Promise<DialerInventoryLead | null> {
  const snapshot = await loadDialerInventory()
  if (!snapshot) return null
  return (
    snapshot.leads.find(
      (l) => l.key === key || l.slug === key || l.leadKey === key || l.vaultSlug === key
    ) ?? null
  )
}

// distressTypeLabel lives in dialer-types.ts (client-safe). Re-export here so
// existing imports keep working.
export { distressTypeLabel } from "@/lib/dialer-types"
