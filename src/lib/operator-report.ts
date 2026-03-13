import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { listOperatorVaultCandidates } from "@/lib/operator-vault-candidates"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getWorkflowStorageStatus, type WorkflowStorageStatus } from "@/lib/workflow-store"

const execFileAsync = promisify(execFile)

export type OperatorLeadRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  falco_score_internal: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  uw_ready: number
  first_seen_at?: string | null
  last_seen_at?: string | null
  score_updated_at?: string | null
  current_sale_date?: string | null
  original_sale_date?: string | null
  sale_status?: string | null
  latest_packet_at?: string | null
  vaultPublishReady?: boolean
  topTierReady?: boolean
  packetCompletenessPct?: number | null
  executionBlockers?: string[]
  suggestedExecutionLane?: string | null
  suggestedLaneConfidence?: string | null
  contactPathQuality?: string | null
  controlParty?: string | null
  ownerAgency?: string | null
  interventionWindow?: string | null
  lenderControlIntensity?: string | null
  influenceability?: string | null
  executionPosture?: string | null
  workabilityBand?: string | null
  recommendedAction?: string | null
}

export type OperatorPacketRow = {
  lead_key: string
  run_id: string
  pdf_path: string
  bytes: number
  created_at: string
  address: string | null
  county: string | null
  falco_score_internal: number | null
  auction_readiness: string | null
  dts_days: number | null
}

export type AnalystQueueRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  sale_status?: string | null
  dts_days?: number | null
  analysis_bucket: string
  confidence: string
  urgency: string
  suggested_execution_lane: string
  suggested_lane_reasons: string[]
  control_party: string
  contact_path_quality: string
  owner_agency: string
  intervention_window: string
  lender_control_intensity: string
  influenceability: string
  execution_posture: string
  workability_band: string
  recommended_action: string
  summary: string
  execution_blockers: string[]
  missing_fields: string[]
  operator_validation_required: boolean
  top_tier_ready: boolean
  vault_publish_ready: boolean
}

export type OperatorAnalystReport = {
  agent: "falco_analyst"
  generated_at: string
  run_id?: string | null
  overview: {
    priority_review_count: number
    operator_review_candidate_count: number
    repair_and_retry_count: number
    watch_and_enrich_count: number
    monitor_count: number
    pre_foreclosure_watch_count: number
  }
  strategic_notes: string[]
  priority_review: AnalystQueueRow[]
  operator_review_candidates: AnalystQueueRow[]
  repair_and_retry: AnalystQueueRow[]
  watch_and_enrich: AnalystQueueRow[]
  monitor: AnalystQueueRow[]
  pre_foreclosure_watch: Array<{
    lead_key: string
    address: string | null
    county: string | null
    distress_type: string | null
    sale_status?: string | null
    dts_days?: number | null
  }>
}

export type OperatorReport = {
  generatedAt: string
  dbPath: string
  sourceMode: "full" | "snapshot" | "site_fallback"
  sourceNote: string
  workflowStorage: WorkflowStorageStatus
  overview: {
    totalLeads: number
    greenReady: number
    uwReady: number
    packeted: number
    contactReady: number
    vaultLive: number
    vaultQueue: number
    pendingApprovals: number
  }
  recentLeads: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
  topCandidates: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
  recentPackets: (OperatorPacketRow & { vaultLive: boolean; vaultSlug: string | null })[]
  vaultCandidates: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
  foreclosureIntake: {
    preForeclosureCount: number
    scheduledCount: number
    rescheduledCount: number
    expiredCount: number
    preForeclosure: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
    statusChanges: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
    recentEvents: Array<{
      event_key: string
      lead_key: string
      source: string | null
      source_url: string | null
      event_type: string
      sale_date: string | null
      derived_status: string | null
      event_at: string | null
      address: string | null
      county: string | null
      distress_type: string | null
      current_sale_date?: string | null
      original_sale_date?: string | null
      sale_status?: string | null
      vaultLive: boolean
      vaultSlug: string | null
    }>
  }
  preForeclosurePromotion: {
    readyCount: number
    blockedCount: number
    readyForReview: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
    blocked: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
    blockerCounts: Array<{ label: string; count: number }>
  }
  analyst?: OperatorAnalystReport | null
}

async function readSnapshotOperatorReport(): Promise<OperatorReport | null> {
  const snapshotPath = path.join(process.cwd(), "data", "operator", "report.json")

  try {
    const raw = await readFile(snapshotPath, "utf8")
    const parsed = JSON.parse(raw) as OperatorReport
    return parsed
  } catch {
    return null
  }
}

async function getLiveVaultAndApprovalState() {
  const [vaultResult, accessResult] = await Promise.all([
    supabaseAdmin
      ? supabaseAdmin.from("vault_listings").select("slug").eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      ? supabaseAdmin
          .from("partner_access_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0, error: null }),
  ])

  const liveListings = vaultResult.error ? [] : (vaultResult.data ?? [])
  const pendingApprovals =
    "count" in accessResult && typeof accessResult.count === "number" ? accessResult.count : 0

  return {
    liveListings,
    pendingApprovals,
  }
}

async function mergeSnapshotOperatorReport(snapshot: OperatorReport): Promise<OperatorReport> {
  const { liveListings, pendingApprovals } = await getLiveVaultAndApprovalState()
  const workflowStorage = await getWorkflowStorageStatus()
  const recentLeads = attachVaultState(snapshot.recentLeads, liveListings)
  const topCandidates = attachVaultState(snapshot.topCandidates, liveListings)
  const recentPackets = attachVaultState(snapshot.recentPackets, liveListings)
  const manifestVaultCandidates = getManifestVaultCandidates(liveListings)
  const snapshotVaultCandidates = attachVaultState(snapshot.vaultCandidates ?? [], liveListings).filter(
    (row) => !row.vaultLive
  )
  const vaultCandidates = manifestVaultCandidates.length ? manifestVaultCandidates : snapshotVaultCandidates
  const foreclosureIntake = buildForeclosureIntake(
    {
      preForeclosureCount: snapshot.foreclosureIntake?.preForeclosureCount ?? 0,
      scheduledCount: snapshot.foreclosureIntake?.scheduledCount ?? 0,
      rescheduledCount: snapshot.foreclosureIntake?.rescheduledCount ?? 0,
      expiredCount: snapshot.foreclosureIntake?.expiredCount ?? 0,
      preForeclosure: snapshot.foreclosureIntake?.preForeclosure ?? [],
      statusChanges: snapshot.foreclosureIntake?.statusChanges ?? [],
    },
    recentLeads,
    liveListings
  )
  const preForeclosurePromotion = buildPreForeclosurePromotion(
    snapshot.preForeclosurePromotion,
    liveListings
  )

  return {
    ...snapshot,
    sourceMode: "snapshot",
    sourceNote:
      "Hosted operator snapshot merged with live vault and approval state for production-safe review.",
    workflowStorage,
    overview: {
      ...snapshot.overview,
      vaultLive: liveListings.length,
      vaultQueue: vaultCandidates.length,
      pendingApprovals,
    },
    recentLeads,
    topCandidates,
    recentPackets,
    vaultCandidates,
    foreclosureIntake,
    preForeclosurePromotion,
    analyst: snapshot.analyst ?? null,
  }
}

function leadKeyPrefix(leadKey: string) {
  return (leadKey || "").slice(0, 8).toLowerCase()
}

function attachVaultState<T extends { lead_key: string }>(
  rows: T[],
  liveListings: { slug: string }[]
) {
  return rows.map((row) => {
    const prefix = leadKeyPrefix(row.lead_key)
    const matched = liveListings.find((listing) => listing.slug.toLowerCase().endsWith(prefix))
    return {
      ...row,
      vaultLive: Boolean(matched),
      vaultSlug: matched?.slug ?? null,
    }
  })
}

function getManifestVaultCandidates(liveListings: { slug: string }[]) {
  const rows = listOperatorVaultCandidates().map((candidate) => {
    const payload = candidate.listingPayload ?? {}

    return {
      lead_key: candidate.leadKey,
      address:
        typeof candidate.address === "string" && candidate.address.trim()
          ? candidate.address
          : typeof payload.title === "string"
          ? payload.title
          : candidate.leadKey,
      county:
        typeof candidate.county === "string" && candidate.county.trim()
          ? candidate.county
          : typeof payload.county === "string"
          ? payload.county
          : null,
      distress_type:
        typeof candidate.distressType === "string" && candidate.distressType.trim()
          ? candidate.distressType
          : typeof payload.distressType === "string"
          ? payload.distressType
          : null,
      sale_status:
        typeof candidate.saleStatus === "string" && candidate.saleStatus.trim()
          ? candidate.saleStatus
          : typeof payload.saleStatus === "string"
          ? payload.saleStatus
          : null,
      falco_score_internal:
        typeof payload.falcoScore === "number" ? payload.falcoScore : null,
      auction_readiness:
        typeof payload.auctionReadiness === "string" ? payload.auctionReadiness : null,
      equity_band: typeof payload.equityBand === "string" ? payload.equityBand : null,
      dts_days: typeof payload.dtsDays === "number" ? payload.dtsDays : null,
      uw_ready: 1,
      score_updated_at: typeof payload.createdAt === "string" ? payload.createdAt : null,
      vaultPublishReady: Boolean(payload.vaultPublishReady),
      topTierReady: Boolean(payload.topTierReady),
      packetCompletenessPct:
        typeof payload.packetCompletenessPct === "number" ? payload.packetCompletenessPct : null,
      executionBlockers: Array.isArray(payload.executionBlockers)
        ? payload.executionBlockers.filter((value): value is string => typeof value === "string")
        : [],
    }
  })

  return attachVaultState(rows, liveListings).filter((row) => !row.vaultLive)
}

type VaultListingLite = {
  slug: string
  title: string | null
  county: string | null
  falco_score: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  created_at: string
  packet_path: string | null
  is_active: boolean | null
}

function mapVaultRowToLead(row: VaultListingLite): OperatorLeadRow & {
  vaultLive: boolean
  vaultSlug: string | null
} {
  return {
    lead_key: row.slug,
    address: row.title,
    county: row.county,
    distress_type: "FORECLOSURE",
    falco_score_internal: row.falco_score,
    auction_readiness: row.auction_readiness,
    equity_band: row.equity_band,
    dts_days: row.dts_days,
    uw_ready: row.auction_readiness?.toUpperCase() === "GREEN" ? 1 : 0,
    score_updated_at: row.created_at,
    vaultLive: row.is_active !== false,
    vaultSlug: row.slug,
  }
}

function buildForeclosureIntake(
  snapshotSection:
    | {
        preForeclosureCount: number
        scheduledCount: number
        rescheduledCount: number
        expiredCount: number
        preForeclosure: (OperatorLeadRow & { vaultLive?: boolean; vaultSlug?: string | null })[]
        statusChanges: (OperatorLeadRow & { vaultLive?: boolean; vaultSlug?: string | null })[]
        recentEvents?: Array<{
          event_key: string
          lead_key: string
          source: string | null
          source_url: string | null
          event_type: string
          sale_date: string | null
          derived_status: string | null
          event_at: string | null
          address: string | null
          county: string | null
          distress_type: string | null
          current_sale_date?: string | null
          original_sale_date?: string | null
          sale_status?: string | null
          vaultLive?: boolean
          vaultSlug?: string | null
        }>
      }
    | undefined,
  recentLeads: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[],
  liveListings: { slug: string }[]
) {
  if (snapshotSection) {
    return {
      preForeclosureCount: snapshotSection.preForeclosureCount ?? 0,
      scheduledCount: snapshotSection.scheduledCount ?? 0,
      rescheduledCount: snapshotSection.rescheduledCount ?? 0,
      expiredCount: snapshotSection.expiredCount ?? 0,
      preForeclosure: attachVaultState(snapshotSection.preForeclosure ?? [], liveListings),
      statusChanges: attachVaultState(snapshotSection.statusChanges ?? [], liveListings),
      recentEvents: attachVaultState(snapshotSection.recentEvents ?? [], liveListings),
    }
  }

  const preForeclosure = recentLeads.filter((row) => row.sale_status === "pre_foreclosure")
  const statusChanges = recentLeads.filter((row) =>
    ["scheduled", "rescheduled", "expired"].includes(String(row.sale_status ?? ""))
  )

  return {
    preForeclosureCount: preForeclosure.length,
    scheduledCount: recentLeads.filter((row) => row.sale_status === "scheduled").length,
    rescheduledCount: recentLeads.filter((row) => row.sale_status === "rescheduled").length,
    expiredCount: recentLeads.filter((row) => row.sale_status === "expired").length,
    preForeclosure,
    statusChanges,
    recentEvents: [],
  }
}

function buildPreForeclosurePromotion(
  snapshotSection:
    | {
        readyCount: number
        blockedCount: number
        readyForReview: (OperatorLeadRow & { vaultLive?: boolean; vaultSlug?: string | null })[]
        blocked: (OperatorLeadRow & { vaultLive?: boolean; vaultSlug?: string | null })[]
        blockerCounts?: Array<{ label: string; count: number }>
      }
    | undefined,
  liveListings: { slug: string }[]
) {
  if (snapshotSection) {
    const readyForReview = attachVaultState(snapshotSection.readyForReview ?? [], liveListings).filter(
      (row) => !row.vaultLive
    )
    return {
      readyCount: readyForReview.length,
      blockedCount: snapshotSection.blockedCount ?? 0,
      readyForReview,
      blocked: attachVaultState(snapshotSection.blocked ?? [], liveListings),
      blockerCounts: snapshotSection.blockerCounts ?? [],
    }
  }

  return {
    readyCount: 0,
    blockedCount: 0,
    readyForReview: [],
    blocked: [],
    blockerCounts: [],
  }
}

async function getFallbackOperatorReport(): Promise<OperatorReport> {
  const [vaultResult, accessResult] = await Promise.all([
    supabaseAdmin
      ? supabaseAdmin
          .from("vault_listings")
          .select(
            "slug,title,county,falco_score,auction_readiness,equity_band,dts_days,created_at,packet_path,is_active"
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      ? supabaseAdmin
          .from("partner_access_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0, error: null }),
  ])

  const vaultRows = vaultResult.error ? [] : ((vaultResult.data ?? []) as VaultListingLite[])
  const pendingApprovals =
    "count" in accessResult && typeof accessResult.count === "number" ? accessResult.count : 0
  const workflowStorage = await getWorkflowStorageStatus()

  const recentLeads = vaultRows.slice(0, 12).map(mapVaultRowToLead)
  const topCandidates = [...vaultRows]
    .sort((a, b) => {
      const scoreDiff = (b.falco_score ?? 0) - (a.falco_score ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return (a.dts_days ?? 9999) - (b.dts_days ?? 9999)
    })
    .slice(0, 10)
    .map(mapVaultRowToLead)

  const recentPackets = vaultRows
    .filter((row) => Boolean(row.packet_path))
    .slice(0, 12)
    .map((row) => ({
      lead_key: row.slug,
      run_id: "vault_live",
      pdf_path: row.packet_path || "",
      bytes: 0,
      created_at: row.created_at,
      address: row.title,
      county: row.county,
      falco_score_internal: row.falco_score,
      auction_readiness: row.auction_readiness,
      dts_days: row.dts_days,
      vaultLive: row.is_active !== false,
      vaultSlug: row.slug,
    }))

  return {
    generatedAt: new Date().toISOString(),
    dbPath: "site_fallback",
    sourceMode: "site_fallback",
    sourceNote:
      "Running in site fallback mode. Live vault and approval data are shown, but upstream bots DB detail is only available in the shared workspace/local environment.",
    workflowStorage,
    overview: {
      totalLeads: vaultRows.length,
      greenReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      uwReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      packeted: vaultRows.filter((row) => Boolean(row.packet_path)).length,
      contactReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      vaultLive: vaultRows.filter((row) => row.is_active !== false).length,
      vaultQueue: 0,
      pendingApprovals,
    },
    recentLeads,
    topCandidates,
    recentPackets,
    vaultCandidates: [],
    foreclosureIntake: {
      preForeclosureCount: 0,
      scheduledCount: 0,
      rescheduledCount: 0,
      expiredCount: 0,
      preForeclosure: [],
      statusChanges: [],
      recentEvents: [],
    },
    preForeclosurePromotion: {
      readyCount: 0,
      blockedCount: 0,
      readyForReview: [],
      blocked: [],
      blockerCounts: [],
    },
    analyst: null,
  }
}

export async function getOperatorReport(): Promise<OperatorReport> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "operator_report.py")
    const defaultDbPath = path.join(
      process.cwd(),
      "..",
      "falco-distress-bots",
      "data",
      "falco.db"
    )

    const { stdout } = await execFileAsync(
      path.join(process.cwd(), "..", "falco-distress-bots", ".venv", "Scripts", "python.exe"),
      [scriptPath, defaultDbPath],
      { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
    )

    const parsed = JSON.parse(stdout) as {
      generatedAt: string
      dbPath: string
      overview: {
        totalLeads: number
        greenReady: number
        uwReady: number
        packeted: number
        contactReady: number
        vaultQueue?: number
      }
      recentLeads: OperatorLeadRow[]
      topCandidates: OperatorLeadRow[]
      recentPackets: OperatorPacketRow[]
      vaultCandidates?: OperatorLeadRow[]
    }

    const { liveListings, pendingApprovals } = await getLiveVaultAndApprovalState()
    const workflowStorage = await getWorkflowStorageStatus()
    const snapshot = await readSnapshotOperatorReport()
    const manifestVaultCandidates = getManifestVaultCandidates(liveListings)

    return {
      generatedAt: parsed.generatedAt,
      dbPath: parsed.dbPath,
      sourceMode: "full",
      sourceNote:
        "Full operator mode. Reading upstream bots database plus live vault and approval state.",
      workflowStorage,
      overview: {
        ...parsed.overview,
        vaultLive: liveListings.length,
        vaultQueue:
          manifestVaultCandidates.length > 0
            ? manifestVaultCandidates.length
            : (parsed.overview.vaultQueue ?? 0),
        pendingApprovals,
      },
      recentLeads: attachVaultState(parsed.recentLeads, liveListings),
      topCandidates: attachVaultState(parsed.topCandidates, liveListings),
      recentPackets: attachVaultState(parsed.recentPackets, liveListings),
      vaultCandidates: manifestVaultCandidates.length
        ? manifestVaultCandidates
        : attachVaultState(parsed.vaultCandidates ?? [], liveListings),
      foreclosureIntake: buildForeclosureIntake(
        (parsed as OperatorReport).foreclosureIntake ?? snapshot?.foreclosureIntake,
        attachVaultState(parsed.recentLeads, liveListings),
        liveListings
      ),
      preForeclosurePromotion: buildPreForeclosurePromotion(
        (parsed as OperatorReport).preForeclosurePromotion ?? snapshot?.preForeclosurePromotion,
        liveListings
      ),
      analyst: (parsed as OperatorReport).analyst ?? snapshot?.analyst ?? null,
    }
  } catch (error) {
    console.warn("getOperatorReport full mode unavailable, trying snapshot", error)
  }

  const snapshot = await readSnapshotOperatorReport()
  if (snapshot) {
    return mergeSnapshotOperatorReport(snapshot)
  }

  return getFallbackOperatorReport()
}
