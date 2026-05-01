// Server-side data fetchers for /admin/today.
// One page, one purpose: tell Patrick what to do RIGHT NOW.

import { supabaseAdmin } from "@/lib/supabase-admin"

export type TodayLead = {
  slug: string
  address: string
  ownerName: string | null
  email: string | null
  phone: string | null
  county: string | null
  arv: number | null
  saleDate: string | null
  daysToSale: number | null
  distressType: string | null
  status: string | null
  lastContactAt: string | null
  attemptCount: number
  /** Reason this lead surfaced today — for the "why" column. */
  reason: string
}

export type TodayMetrics = {
  textsToday: number
  emailsToday: number
  repliesLast24h: number
  bookedToday: number
  totalLeads: number
  leadsWithAvm: number
  leadsWithPhone: number
  leadsWithEmail: number
  underwaterCount: number
}

export type TodayHealth = {
  enrichmentCronLastRun: string | null
  enrichmentCronStatus: "ok" | "stale" | "unknown"
  leadsMissingPhone: number
  leadsMissingAvm: number
  leadsMissingEmail: number
  staleAttemptingContact: number  // > 7 days in attempting_contact w/ no rpc
}

export type TodoItem = {
  id: string
  content: string
  priority: number
  createdAt: string
  completedAt: string | null
  context: string | null
}

// ─── Priority outreach: who to text TODAY ───────────────────────────────
// Ranked by:
//   1. Sale date 14-60 days out (in the marketed-auction sweet spot)
//   2. Has phone (can text)
//   3. Has AVM (math sheet generates)
//   4. Hasn't been contacted in last 14 days
//   5. Higher property value first (bigger deals)
export async function getPriorityOutreach(limit = 10): Promise<TodayLead[]> {
  if (!supabaseAdmin) return []

  // Pull eligible bot leads with workflow joined for last-contact context.
  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select(`
      pipeline_lead_key,
      property_address,
      full_name,
      owner_name_records,
      email,
      phone,
      county,
      property_value,
      mortgage_balance,
      trustee_sale_date,
      distress_type
    `)
    .eq("source", "bot")
    .not("phone", "is", null)
    .not("phone", "eq", "")
    .not("property_value", "is", null)
    .order("property_value", { ascending: false })
    .limit(60) // pull more, filter + rank in JS

  if (error || !data) return []

  type Row = {
    pipeline_lead_key: string
    property_address: string | null
    full_name: string | null
    owner_name_records: string | null
    email: string | null
    phone: string | null
    county: string | null
    property_value: number | null
    mortgage_balance: number | null
    trustee_sale_date: string | null
    distress_type: string | null
  }

  // Pull workflow rows for these slugs in one query
  const slugs = (data as Row[]).map((r) => r.pipeline_lead_key)
  type WfRow = {
    listing_slug: string
    status: string | null
    last_contact_at: string | null
    attempt_count: number | null
  }
  const { data: wf } = await supabaseAdmin
    .from("dialer_lead_workflow")
    .select("listing_slug, status, last_contact_at, attempt_count")
    .in("listing_slug", slugs)
  const wfMap = new Map<string, WfRow>(
    ((wf as WfRow[]) || []).map((w) => [w.listing_slug, w])
  )

  const now = Date.now()
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000

  const enriched: TodayLead[] = (data as Row[]).map((r) => {
    const w = wfMap.get(r.pipeline_lead_key)
    const dts = r.trustee_sale_date
      ? Math.ceil(
          (new Date(r.trustee_sale_date).getTime() - now) / (24 * 60 * 60 * 1000)
        )
      : null
    return {
      slug: r.pipeline_lead_key,
      address: r.property_address || "(no address)",
      ownerName: r.full_name || r.owner_name_records,
      email: r.email,
      phone: r.phone,
      county: r.county,
      arv: r.property_value,
      saleDate: r.trustee_sale_date,
      daysToSale: dts,
      distressType: r.distress_type,
      status: w?.status || "new",
      lastContactAt: w?.last_contact_at || null,
      attemptCount: w?.attempt_count ?? 0,
      reason: "",
    }
  })

  // Filter: skip closed_lost, skip recently-contacted, skip already-booked
  const eligible = enriched.filter((l) => {
    if (l.status === "closed_lost" || l.status === "auction_booked") return false
    if (l.status === "closed_won") return false
    if (l.lastContactAt && new Date(l.lastContactAt).getTime() > fourteenDaysAgo) {
      return false
    }
    return true
  })

  // Score: higher = more urgent
  function score(l: TodayLead): { score: number; reason: string } {
    let s = 0
    let r = ""
    // Sale date sweet spot: 14-60 days = high priority
    if (l.daysToSale !== null) {
      if (l.daysToSale >= 14 && l.daysToSale <= 60) {
        s += 100
        r = `${l.daysToSale}d to sale (sweet spot)`
      } else if (l.daysToSale > 60) {
        s += 50
        r = `${l.daysToSale}d to sale`
      } else if (l.daysToSale > 0 && l.daysToSale < 14) {
        s += 30 // urgent but tight for marketed auction
        r = `${l.daysToSale}d to sale (TIGHT)`
      } else {
        s += 5
        r = "sale passed"
      }
    } else {
      s += 40
      r = "pre-foreclosure"
    }
    // Property value tilt
    if (l.arv) {
      if (l.arv >= 750000) s += 30
      else if (l.arv >= 550000) s += 20
      else if (l.arv >= 250000) s += 10
    }
    // Has email = bonus (multi-channel possible)
    if (l.email) s += 5
    // Never contacted = bonus (fresh lead)
    if (l.attemptCount === 0) s += 15
    return { score: s, reason: r }
  }

  return eligible
    .map((l) => {
      const { score: sc, reason } = score(l)
      return { ...l, _score: sc, reason }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest as TodayLead) // strip score
}

// ─── This week urgent: leads with sale dates in next 14 days ────────────
export async function getUrgentSaleDates(): Promise<TodayLead[]> {
  if (!supabaseAdmin) return []
  const now = new Date()
  const fourteenFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select(`
      pipeline_lead_key,
      property_address,
      full_name,
      owner_name_records,
      email,
      phone,
      county,
      property_value,
      trustee_sale_date,
      distress_type
    `)
    .eq("source", "bot")
    .not("trustee_sale_date", "is", null)
    .gte("trustee_sale_date", now.toISOString().slice(0, 10))
    .lte("trustee_sale_date", fourteenFromNow.toISOString().slice(0, 10))
    .order("trustee_sale_date", { ascending: true })
    .limit(20)

  if (error || !data) return []
  type Row = {
    pipeline_lead_key: string
    property_address: string | null
    full_name: string | null
    owner_name_records: string | null
    email: string | null
    phone: string | null
    county: string | null
    property_value: number | null
    trustee_sale_date: string | null
    distress_type: string | null
  }
  return (data as Row[]).map((r) => {
    const dts = r.trustee_sale_date
      ? Math.ceil(
          (new Date(r.trustee_sale_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
      : null
    return {
      slug: r.pipeline_lead_key,
      address: r.property_address || "(no address)",
      ownerName: r.full_name || r.owner_name_records,
      email: r.email,
      phone: r.phone,
      county: r.county,
      arv: r.property_value,
      saleDate: r.trustee_sale_date,
      daysToSale: dts,
      distressType: r.distress_type,
      status: null,
      lastContactAt: null,
      attemptCount: 0,
      reason: dts !== null && dts <= 7 ? "URGENT" : "this week",
    }
  })
}

// ─── Recent inbound activity that needs a response ──────────────────────
export async function getRecentReplies(): Promise<TodayLead[]> {
  if (!supabaseAdmin) return []
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("dialer_activities")
    .select("listing_slug, channel, outcome, occurred_at, notes")
    .gte("occurred_at", since)
    .in("outcome", ["connected", "callback_requested", "warm_followup"])
    .order("occurred_at", { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return []

  type ActRow = {
    listing_slug: string
    channel: string
    outcome: string
    occurred_at: string
    notes: string | null
  }
  const acts = data as ActRow[]
  const slugs = [...new Set(acts.map((a) => a.listing_slug))]

  // Pull lead context
  const { data: leads } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "pipeline_lead_key, property_address, full_name, owner_name_records, email, phone, county, property_value, trustee_sale_date, distress_type"
    )
    .eq("source", "bot")
    .in("pipeline_lead_key", slugs)
  type LRow = {
    pipeline_lead_key: string
    property_address: string | null
    full_name: string | null
    owner_name_records: string | null
    email: string | null
    phone: string | null
    county: string | null
    property_value: number | null
    trustee_sale_date: string | null
    distress_type: string | null
  }
  const leadMap = new Map<string, LRow>(
    ((leads as LRow[]) || []).map((l) => [l.pipeline_lead_key, l])
  )

  return acts
    .map((a) => {
      const r = leadMap.get(a.listing_slug)
      if (!r) return null
      const dts = r.trustee_sale_date
        ? Math.ceil(
            (new Date(r.trustee_sale_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          )
        : null
      const hoursAgo = Math.round(
        (Date.now() - new Date(a.occurred_at).getTime()) / (60 * 60 * 1000)
      )
      return {
        slug: r.pipeline_lead_key,
        address: r.property_address || "(no address)",
        ownerName: r.full_name || r.owner_name_records,
        email: r.email,
        phone: r.phone,
        county: r.county,
        arv: r.property_value,
        saleDate: r.trustee_sale_date,
        daysToSale: dts,
        distressType: r.distress_type,
        status: null,
        lastContactAt: a.occurred_at,
        attemptCount: 0,
        reason: `${a.channel}/${a.outcome} · ${hoursAgo}h ago`,
      } as TodayLead
    })
    .filter((x): x is TodayLead => x !== null)
}

// ─── Today's metrics ─────────────────────────────────────────────────────
export async function getMetrics(): Promise<TodayMetrics> {
  const empty: TodayMetrics = {
    textsToday: 0,
    emailsToday: 0,
    repliesLast24h: 0,
    bookedToday: 0,
    totalLeads: 0,
    leadsWithAvm: 0,
    leadsWithPhone: 0,
    leadsWithEmail: 0,
    underwaterCount: 0,
  }
  if (!supabaseAdmin) return empty

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Activity counts today
  const { data: acts } = await supabaseAdmin
    .from("dialer_activities")
    .select("channel, outcome")
    .gte("occurred_at", todayStart.toISOString())
  type A = { channel: string; outcome: string }
  const a = (acts as A[]) || []
  const textsToday = a.filter((x) => x.channel === "text").length
  const emailsToday = a.filter((x) => x.channel === "email").length
  const bookedToday = a.filter((x) => x.outcome === "booked").length

  // Replies last 24h
  const { count: repliesLast24h } = await supabaseAdmin
    .from("dialer_activities")
    .select("*", { count: "exact", head: true })
    .gte("occurred_at", last24h)
    .in("outcome", ["connected", "callback_requested", "warm_followup"])

  // Pipeline counts
  const { count: totalLeads } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
  const { count: leadsWithAvm } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .not("property_value", "is", null)
  const { count: leadsWithPhone } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .not("phone", "is", null)
    .not("phone", "eq", "")
  const { count: leadsWithEmail } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .not("email", "is", null)
    .not("email", "eq", "")

  // Underwater count: rough query — payoff > 90% of value (using mortgage_balance * 0.93 as payoff approx)
  const { data: uw } = await supabaseAdmin
    .from("homeowner_requests")
    .select("property_value, mortgage_balance")
    .eq("source", "bot")
    .not("property_value", "is", null)
    .not("mortgage_balance", "is", null)
  type UW = { property_value: number | null; mortgage_balance: number | null }
  const underwaterCount = ((uw as UW[]) || []).filter(
    (r) =>
      r.property_value &&
      r.mortgage_balance &&
      r.mortgage_balance * 0.93 > r.property_value * 0.9
  ).length

  return {
    textsToday,
    emailsToday,
    repliesLast24h: repliesLast24h ?? 0,
    bookedToday,
    totalLeads: totalLeads ?? 0,
    leadsWithAvm: leadsWithAvm ?? 0,
    leadsWithPhone: leadsWithPhone ?? 0,
    leadsWithEmail: leadsWithEmail ?? 0,
    underwaterCount,
  }
}

// ─── Health check ────────────────────────────────────────────────────────
export async function getHealth(): Promise<TodayHealth> {
  const empty: TodayHealth = {
    enrichmentCronLastRun: null,
    enrichmentCronStatus: "unknown",
    leadsMissingPhone: 0,
    leadsMissingAvm: 0,
    leadsMissingEmail: 0,
    staleAttemptingContact: 0,
  }
  if (!supabaseAdmin) return empty

  // Most recent phone_refreshed_at = proxy for last enrichment cron run
  const { data: lastRefresh } = await supabaseAdmin
    .from("homeowner_requests")
    .select("phone_refreshed_at")
    .eq("source", "bot")
    .not("phone_refreshed_at", "is", null)
    .order("phone_refreshed_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastRun =
    (lastRefresh as { phone_refreshed_at: string } | null)?.phone_refreshed_at ?? null
  let cronStatus: "ok" | "stale" | "unknown" = "unknown"
  if (lastRun) {
    const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / (60 * 60 * 1000)
    cronStatus = hoursAgo < 30 ? "ok" : "stale"
  }

  // Missing-data counts among bot leads
  const { count: missingPhone } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .or("phone.is.null,phone.eq.")
  const { count: missingAvm } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .is("property_value", null)
  const { count: missingEmail } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*", { count: "exact", head: true })
    .eq("source", "bot")
    .or("email.is.null,email.eq.")

  // Stale "attempting_contact" — workflow rows in that status > 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: staleAttempting } = await supabaseAdmin
    .from("dialer_lead_workflow")
    .select("*", { count: "exact", head: true })
    .eq("status", "attempting_contact")
    .lt("updated_at", sevenDaysAgo)

  return {
    enrichmentCronLastRun: lastRun,
    enrichmentCronStatus: cronStatus,
    leadsMissingPhone: missingPhone ?? 0,
    leadsMissingAvm: missingAvm ?? 0,
    leadsMissingEmail: missingEmail ?? 0,
    staleAttemptingContact: staleAttempting ?? 0,
  }
}

// ─── Manual TODOs ────────────────────────────────────────────────────────
export async function getActiveTodos(): Promise<TodoItem[]> {
  if (!supabaseAdmin) return []
  // Show all incomplete + completed-in-last-24h
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from("daily_todos")
    .select("*")
    .or(`completed_at.is.null,completed_at.gte.${dayAgo}`)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
  if (error || !data) return []
  type Row = {
    id: string
    content: string
    priority: number
    created_at: string
    completed_at: string | null
    context: string | null
  }
  return (data as Row[]).map((r) => ({
    id: r.id,
    content: r.content,
    priority: r.priority,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    context: r.context,
  }))
}
