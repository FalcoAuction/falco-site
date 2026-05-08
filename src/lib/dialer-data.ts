import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  listActiveVaultListings,
  findVaultListing,
  type VaultListing,
} from "@/lib/vault-listings"
import {
  loadDialerInventory,
  findDialerInventoryLead,
  isLeadActive,
  type DialerInventoryLead,
} from "@/lib/dialer-inventory"
import type {
  DialerStatus,
  DialerNextAction,
  DialerChannel,
  DialerOutcome,
  DialerWorkflow,
  DialerActivity,
} from "@/lib/dialer-types"

// Re-export for server-side callers that previously imported from here.
export type {
  DialerStatus,
  DialerNextAction,
  DialerChannel,
  DialerOutcome,
  DialerWorkflow,
  DialerActivity,
}
export {
  STATUS_LABELS,
  NEXT_ACTION_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
} from "@/lib/dialer-types"

export type DialerLead = VaultListing & {
  workflow: DialerWorkflow
  recentActivities: DialerActivity[]
  dataCompleteness?: "full" | "solid" | "thin"
  missingFields?: string[]
}

const DEFAULT_WORKFLOW = (slug: string): DialerWorkflow => ({
  listingSlug: slug,
  status: "new",
  nextAction: "call",
  nextActionAt: null,
  auctionCallAt: null,
  closedLostReason: null,
  summaryNotes: "",
  lastContactAt: null,
  attemptCount: 0,
  rpcCount: 0,
  updatedBy: "",
  updatedAt: new Date(0).toISOString(),
  createdAt: new Date(0).toISOString(),
})

type WorkflowRow = {
  listing_slug: string
  status: DialerStatus
  next_action: DialerNextAction
  next_action_at: string | null
  auction_call_at: string | null
  closed_lost_reason: string | null
  summary_notes: string
  last_contact_at: string | null
  attempt_count: number
  rpc_count: number
  updated_by: string
  updated_at: string
  created_at: string
}

type ActivityRow = {
  id: string
  listing_slug: string
  occurred_at: string
  channel: DialerChannel
  outcome: DialerOutcome
  notes: string
  next_action: DialerNextAction | null
  next_action_at: string | null
  created_by: string
  created_at: string
}

function rowToWorkflow(row: WorkflowRow): DialerWorkflow {
  return {
    listingSlug: row.listing_slug,
    status: row.status,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    auctionCallAt: row.auction_call_at,
    closedLostReason: row.closed_lost_reason,
    summaryNotes: row.summary_notes ?? "",
    lastContactAt: row.last_contact_at,
    attemptCount: row.attempt_count ?? 0,
    rpcCount: row.rpc_count ?? 0,
    updatedBy: row.updated_by ?? "",
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

function rowToActivity(row: ActivityRow): DialerActivity {
  return {
    id: row.id,
    listingSlug: row.listing_slug,
    occurredAt: row.occurred_at,
    channel: row.channel,
    outcome: row.outcome,
    notes: row.notes ?? "",
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  }
}

export async function listAllWorkflows(): Promise<Map<string, DialerWorkflow>> {
  const map = new Map<string, DialerWorkflow>()
  if (!supabaseAdmin) {
    console.error("listAllWorkflows:", supabaseAdminConfigError)
    return map
  }
  const { data, error } = await supabaseAdmin
    .from("dialer_lead_workflow")
    .select("*")
  if (error) {
    if (error.code === "42P01") return map // table missing — empty state
    console.error("listAllWorkflows error:", error.message)
    return map
  }
  for (const row of (data ?? []) as WorkflowRow[]) {
    map.set(row.listing_slug, rowToWorkflow(row))
  }
  return map
}

export async function getWorkflow(slug: string): Promise<DialerWorkflow> {
  if (!supabaseAdmin) return DEFAULT_WORKFLOW(slug)
  const { data, error } = await supabaseAdmin
    .from("dialer_lead_workflow")
    .select("*")
    .eq("listing_slug", slug)
    .maybeSingle()
  if (error && error.code !== "PGRST116" && error.code !== "42P01") {
    console.error("getWorkflow error:", error.message)
  }
  if (!data) return DEFAULT_WORKFLOW(slug)
  return rowToWorkflow(data as WorkflowRow)
}

export async function listActivities(
  slug: string,
  limit = 100
): Promise<DialerActivity[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from("dialer_activities")
    .select("*")
    .eq("listing_slug", slug)
    .order("occurred_at", { ascending: false })
    .limit(limit)
  if (error) {
    if (error.code === "42P01") return []
    console.error("listActivities error:", error.message)
    return []
  }
  return ((data ?? []) as ActivityRow[]).map(rowToActivity)
}

export async function listAllRecentActivities(limit = 200): Promise<DialerActivity[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from("dialer_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) {
    if (error.code === "42P01") return []
    console.error("listAllRecentActivities error:", error.message)
    return []
  }
  return ((data ?? []) as ActivityRow[]).map(rowToActivity)
}

export type WorkflowUpdate = {
  status?: DialerStatus
  nextAction?: DialerNextAction
  nextActionAt?: string | null
  auctionCallAt?: string | null
  closedLostReason?: string | null
  summaryNotes?: string
  updatedBy: string
  // counters managed by activity inserts, not directly settable from update endpoint
}

export async function upsertWorkflow(
  slug: string,
  patch: WorkflowUpdate
): Promise<DialerWorkflow | null> {
  if (!supabaseAdmin) return null
  const existing = await getWorkflow(slug)
  const merged = {
    listing_slug: slug,
    status: patch.status ?? existing.status,
    next_action: patch.nextAction ?? existing.nextAction,
    next_action_at:
      patch.nextActionAt !== undefined ? patch.nextActionAt : existing.nextActionAt ?? null,
    auction_call_at:
      patch.auctionCallAt !== undefined ? patch.auctionCallAt : existing.auctionCallAt ?? null,
    closed_lost_reason:
      patch.closedLostReason !== undefined
        ? patch.closedLostReason
        : existing.closedLostReason ?? null,
    summary_notes:
      patch.summaryNotes !== undefined ? patch.summaryNotes : existing.summaryNotes ?? "",
    last_contact_at: existing.lastContactAt ?? null,
    attempt_count: existing.attemptCount ?? 0,
    rpc_count: existing.rpcCount ?? 0,
    updated_by: patch.updatedBy || existing.updatedBy || "",
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabaseAdmin
    .from("dialer_lead_workflow")
    .upsert(merged, { onConflict: "listing_slug" })
    .select("*")
    .single()
  if (error) {
    console.error("upsertWorkflow error:", error.message)
    return null
  }
  return rowToWorkflow(data as WorkflowRow)
}

export type ActivityInput = {
  listingSlug: string
  channel: DialerChannel
  outcome: DialerOutcome
  notes?: string
  nextAction?: DialerNextAction | null
  nextActionAt?: string | null
  createdBy: string
  occurredAt?: string
}

/** Insert an activity AND update workflow rollups (last_contact_at, attempt_count, rpc_count). */
export async function recordActivity(input: ActivityInput): Promise<DialerActivity | null> {
  if (!supabaseAdmin) return null
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  const insert = {
    listing_slug: input.listingSlug,
    occurred_at: occurredAt,
    channel: input.channel,
    outcome: input.outcome,
    notes: input.notes ?? "",
    next_action: input.nextAction ?? null,
    next_action_at: input.nextActionAt ?? null,
    created_by: input.createdBy ?? "",
  }
  const { data, error } = await supabaseAdmin
    .from("dialer_activities")
    .insert(insert)
    .select("*")
    .single()
  if (error) {
    console.error("recordActivity error:", error.message)
    return null
  }
  const row = data as ActivityRow

  // Roll up onto workflow row.
  // Use the atomic dialer_increment_counters RPC for the counter math so
  // concurrent activities can't lose increments via read-modify-write.
  // Status transitions still need a read because the rule depends on the
  // current state — but counters are bumped atomically.
  const existing = await getWorkflow(input.listingSlug)
  const isAttempt = input.channel !== "note"
  const isRpc = input.outcome === "connected" || input.outcome === "booked"
  const newStatus: DialerStatus = (() => {
    if (input.outcome === "do_not_call" || input.outcome === "not_interested") {
      return "closed_lost"
    }
    if (input.outcome === "booked") return "auction_booked"
    if (existing.status === "new" && isAttempt) return "attempting_contact"
    if (existing.status === "attempting_contact" && isRpc) return "rpc_made"
    return existing.status
  })()
  const nextActionAt =
    input.nextActionAt !== undefined ? input.nextActionAt : existing.nextActionAt ?? null

  const { error: rpcErr } = await supabaseAdmin.rpc("dialer_increment_counters", {
    p_listing_slug: input.listingSlug,
    p_attempt_delta: isAttempt ? 1 : 0,
    p_rpc_delta: isRpc ? 1 : 0,
    p_last_outcome: input.outcome,
    p_last_outcome_at: occurredAt,
    p_status: newStatus,
    p_next_action_at: nextActionAt,
  })
  if (rpcErr) {
    // Fall back to upsert if the RPC isn't available yet (e.g. migration
    // hasn't been applied in a preview env). Logs the issue so we notice.
    console.warn("dialer_increment_counters RPC missing — falling back to upsert:", rpcErr.message)
    const newAttempt = existing.attemptCount + (isAttempt ? 1 : 0)
    const newRpc = existing.rpcCount + (isRpc ? 1 : 0)
    const merged = {
      listing_slug: input.listingSlug,
      status: newStatus,
      next_action: input.nextAction ?? existing.nextAction,
      next_action_at: nextActionAt,
      auction_call_at:
        input.outcome === "booked" && input.nextActionAt
          ? input.nextActionAt
          : existing.auctionCallAt ?? null,
      closed_lost_reason: existing.closedLostReason ?? null,
      summary_notes: existing.summaryNotes ?? "",
      last_contact_at: occurredAt,
      attempt_count: newAttempt,
      rpc_count: newRpc,
      updated_by: input.createdBy ?? existing.updatedBy ?? "",
      updated_at: new Date().toISOString(),
    }
    await supabaseAdmin
      .from("dialer_lead_workflow")
      .upsert(merged, { onConflict: "listing_slug" })
  } else {
    // RPC succeeded for counter+status; still need to update non-counter
    // fields the RPC doesn't manage.
    if (input.nextAction !== undefined || input.outcome === "booked") {
      await supabaseAdmin
        .from("dialer_lead_workflow")
        .update({
          next_action: input.nextAction ?? existing.nextAction,
          auction_call_at:
            input.outcome === "booked" && input.nextActionAt
              ? input.nextActionAt
              : existing.auctionCallAt ?? null,
          last_contact_at: occurredAt,
          updated_by: input.createdBy ?? existing.updatedBy ?? "",
        })
        .eq("listing_slug", input.listingSlug)
    } else {
      await supabaseAdmin
        .from("dialer_lead_workflow")
        .update({
          last_contact_at: occurredAt,
          updated_by: input.createdBy ?? existing.updatedBy ?? "",
        })
        .eq("listing_slug", input.listingSlug)
    }
  }

  // Fire-and-forget notification to the auction partner when a call is booked.
  // Non-blocking — errors log but never fail the activity write.
  if (input.outcome === "booked") {
    // Import lazily to avoid pulling nodemailer into every request that touches
    // dialer-data (only loaded when a booking actually fires).
    import("@/lib/dialer-notify")
      .then(({ notifyAuctionPartnerOnBooking }) =>
        notifyAuctionPartnerOnBooking({
          listingSlug: input.listingSlug,
          createdBy: input.createdBy ?? "",
          notes: input.notes,
          channel: input.channel,
          outcome: input.outcome,
          nextActionAt: input.nextActionAt ?? null,
          occurredAt,
        })
      )
      .catch((err) => console.error("notify hook failed:", err))
  }

  return rowToActivity(row)
}

/** Convert an inventory lead to the VaultListing-shaped object the UI expects. */
function inventoryToListing(inv: DialerInventoryLead): VaultListing {
  const auctionWindow =
    inv.dtsDays !== null && inv.dtsDays !== undefined
      ? `${Math.max(0, Math.round(inv.dtsDays))} Days`
      : inv.distressType === "PREFORECLOSURE" || inv.distressType === "LIS_PENDENS"
      ? "Pre-Foreclosure"
      : "Confidential"

  // Stash AVM + sale-status fields on the resulting object via a small extension.
  // VaultListing doesn't define them, but the UI casts down to DialerLeadView
  // which does — so they survive the assign.
  const extras: Record<string, unknown> = {
    avmLow: inv.avmLow ?? null,
    avmMid: inv.avmMid ?? null,
    avmHigh: inv.avmHigh ?? null,
    saleStatus: inv.saleStatus || undefined,
    // Enrichment fields derived from phone_metadata (Twilio Lookup,
    // ROD scrape, HMDA match, amortizer). Surfaced on queue + detail
    // pages so reps see source quality + line type at a glance.
    phoneLineType: inv.phoneLineType,
    phoneCarrier: inv.phoneCarrier,
    phoneValidated: inv.phoneValidated,
    phoneDnc: inv.phoneDnc,
    alternatePhoneCount: inv.alternatePhoneCount,
    alternatePhones: inv.alternatePhones,
    mortgageDefensible: inv.mortgageDefensible,
    mortgageLenderResolved: inv.mortgageLenderResolved,
    mortgageOriginationYear: inv.mortgageOriginationYear,
    mortgageOriginalPrincipal: inv.mortgageOriginalPrincipal,
    mortgageRatePct: inv.mortgageRatePct,
    mortgageConfidence: inv.mortgageConfidence,
    equityAmount: inv.equityAmount,
    distressSignalCount: inv.distressSignalCount,
    decisionAction: inv.decisionAction,
    pitchBucket: inv.pitchBucket,
    trusteeSaleStatus: inv.trusteeSaleStatus,
    trusteeSaleStatusNote: inv.trusteeSaleStatusNote,
    trusteeSaleStatusUpdatedAt: inv.trusteeSaleStatusUpdatedAt,
  }
  return {
    ...(extras as Partial<VaultListing>),
    slug: inv.key,
    title: inv.address || `${inv.county || "Lead"}`,
    address: inv.address || undefined,
    market: `${inv.county || "Unknown County"}, ${inv.state || "TN"}`,
    county: inv.county || "",
    status: "active",
    distressType: inv.distressType || "",
    auctionWindow,
    summary: "",
    publicTeaser: "",
    packetUrl: inv.packetUrl || "",
    packetLabel: inv.packetLabel || "",
    sourceLeadKey: inv.leadKey,
    createdAt: inv.firstSeenAt || new Date().toISOString(),
    falcoScore: inv.falcoScore ?? null,
    auctionReadiness: inv.auctionReadiness || undefined,
    equityBand: inv.equityBand || undefined,
    dtsDays: inv.dtsDays ?? null,
    currentSaleDate: inv.currentSaleDate || undefined,
    originalSaleDate: inv.originalSaleDate || undefined,
    contactReady: Boolean(inv.ownerPhonePrimary || inv.ownerPhoneSecondary),
    ownerName: inv.ownerName || undefined,
    ownerMail: inv.ownerMail || undefined,
    ownerPhonePrimary: inv.ownerPhonePrimary || undefined,
    ownerPhoneSecondary: inv.ownerPhoneSecondary || undefined,
    ownerPhoneDncStatus: inv.ownerPhoneDncStatus || undefined,
    saleControllerName: inv.saleControllerName || undefined,
    saleControllerPhonePrimary: inv.saleControllerPhonePrimary || undefined,
    trusteePhonePublic: inv.trusteePhonePublic || undefined,
    noticePhone: inv.noticePhone || undefined,
    lastSaleDate: inv.lastSaleDate || undefined,
    mortgageDate: inv.mortgageDate || undefined,
    mortgageLender: inv.mortgageLender || undefined,
    mortgageAmount: inv.mortgageAmount ?? null,
    yearBuilt: inv.yearBuilt ?? null,
    buildingAreaSqft: inv.buildingAreaSqft ?? null,
    beds: inv.beds ?? null,
    baths: inv.baths ?? null,
  }
}

/** Fetch all actionable leads with their workflow joined. Sorted by sale-date proximity. */
export async function listDialerLeads(): Promise<DialerLead[]> {
  // Try the dialer inventory snapshot first — this is the full set of actionable
  // leads from the bot's DB (including those without packets). Falls back to the
  // vault listings if the snapshot isn't available.
  const [snapshot, vaultListings, workflows] = await Promise.all([
    loadDialerInventory(),
    listActiveVaultListings(),
    listAllWorkflows(),
  ])

  let listings: VaultListing[]
  let completenessByKey: Map<string, { level: "full" | "solid" | "thin"; missing: string[] }>
  if (snapshot && snapshot.leads.length > 0) {
    // Filter to active leads only — exclude properties where the trustee
    // sale ran more than 7 days ago (already foreclosed; can't help).
    // Direct lead-detail navigation still resolves these via getDialerLead
    // so the caller can close them out in the workflow.
    const activeLeads = snapshot.leads.filter(isLeadActive)
    listings = activeLeads.map(inventoryToListing)
    completenessByKey = new Map(
      activeLeads.map((l) => [
        l.key,
        {
          level: (l.dataCompleteness ?? "thin") as "full" | "solid" | "thin",
          missing: l.missingFields ?? [],
        },
      ])
    )
  } else {
    listings = vaultListings
    completenessByKey = new Map()
  }

  const enriched: DialerLead[] = listings.map((listing) => {
    const workflow = workflows.get(listing.slug) ?? DEFAULT_WORKFLOW(listing.slug)
    const completeness = completenessByKey.get(listing.slug)
    return {
      ...listing,
      workflow,
      recentActivities: [],
      dataCompleteness: completeness?.level,
      missingFields: completeness?.missing,
    }
  })

  enriched.sort((a, b) => {
    const aSale = a.currentSaleDate || ""
    const bSale = b.currentSaleDate || ""
    if (aSale && bSale) return aSale.localeCompare(bSale)
    if (aSale) return -1
    if (bSale) return 1
    return (a.title || "").localeCompare(b.title || "")
  })
  return enriched
}

export async function getDialerLead(key: string): Promise<DialerLead | null> {
  // Try inventory first (covers full actionable set), then fall back to vault.
  const invLead = await findDialerInventoryLead(key)
  if (invLead) {
    const [workflow, activities] = await Promise.all([
      getWorkflow(invLead.key),
      listActivities(invLead.key, 200),
    ])
    return {
      ...inventoryToListing(invLead),
      workflow,
      recentActivities: activities,
      dataCompleteness: invLead.dataCompleteness,
      missingFields: invLead.missingFields,
    }
  }

  // Fallback: classic vault lookup
  const [listing, workflow, activities] = await Promise.all([
    findVaultListing(key),
    getWorkflow(key),
    listActivities(key, 200),
  ])
  if (!listing) return null
  return {
    ...listing,
    workflow,
    recentActivities: activities,
  }
}

