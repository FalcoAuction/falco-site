'use client'

import Link from "next/link"
import { useMemo, useState } from "react"

type ReportRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  falco_score_internal?: number | null
  auction_readiness?: string | null
  equity_band?: string | null
  dts_days?: number | null
  uw_ready?: number
  latest_packet_at?: string | null
  created_at?: string | null
  current_sale_date?: string | null
  original_sale_date?: string | null
  sale_status?: string | null
  run_id?: string
  bytes?: number
  vaultLive: boolean
  vaultSlug: string | null
  preForeclosureReviewReady?: boolean
  vaultPublishReady?: boolean
  topTierReady?: boolean
  packetCompletenessPct?: number | null
  executionBlockers?: string[]
  suggestedExecutionLane?: VaultExecutionLane | string | null
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

type OperatorReport = {
  generatedAt: string
  dbPath: string
  sourceMode: "full" | "snapshot" | "site_fallback"
  sourceNote: string
  workflowStorage: {
    mode: "dedicated" | "compatibility" | "unavailable"
    readyCount: number
    totalCount: number
    tables: Array<{
      name:
        | "operator_intake_reviews"
        | "operator_task_history"
        | "vault_pursuit_requests"
        | "vault_validation_records"
        | "vault_partner_feedback"
      ready: boolean
    }>
  }
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
  recentLeads: ReportRow[]
  topCandidates: ReportRow[]
  recentPackets: ReportRow[]
  vaultCandidates: ReportRow[]
  foreclosureIntake: {
    preForeclosureCount: number
    scheduledCount: number
    rescheduledCount: number
    expiredCount: number
    preForeclosure: ReportRow[]
    statusChanges: ReportRow[]
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
    readyForReview: ReportRow[]
    blocked: ReportRow[]
    blockerCounts: Array<{ label: string; count: number }>
  }
  analyst?: {
    agent: "falco_analyst"
    generated_at: string
    overview: {
      priority_review_count: number
      operator_review_candidate_count: number
      repair_and_retry_count: number
      watch_and_enrich_count: number
      monitor_count: number
      pre_foreclosure_watch_count: number
    }
    strategic_notes: string[]
    priority_review: AnalystRow[]
    operator_review_candidates: AnalystRow[]
    repair_and_retry: AnalystRow[]
    watch_and_enrich: AnalystRow[]
    monitor: AnalystRow[]
    pre_foreclosure_watch: Array<{
      lead_key: string
      address: string | null
      county: string | null
      distress_type: string | null
      sale_status?: string | null
      dts_days?: number | null
    }>
  } | null
}

type AnalystRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  sale_status?: string | null
  dts_days?: number | null
  analysis_bucket: string
  confidence: string
  urgency: string
  suggested_execution_lane: VaultExecutionLane | string
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

type AccessRequestRecord = {
  requestId: string
  fullName: string
  email: string
  company: string
  role: string
  marketFocus: string
  accessType: string
  executionCapacity: string
  notes: string
  submittedAt: string
  ipAddress: string
  userAgent: string
  status: "pending" | "approved" | "rejected"
}

type VaultPursuitRecord = {
  requestId: string
  listingSlug: string
  email: string
  fullName: string
  message: string
  status: "pursuit_requested" | "pursuit_reserved" | "pursuit_declined" | "pursuit_released"
  submittedAt: string
  actedBy: string
}

type VaultValidationOutcome =
  | "validated_execution_path"
  | "needs_more_info"
  | "no_real_control_path"
  | "low_leverage"
  | "dead_lead"

type VaultOperatorFeedbackSignal =
  | "worth_pursuing"
  | "too_late"
  | "too_lender_controlled"
  | "owner_has_room"
  | "no_contact_path"
  | "needs_more_info"
  | "bad_noisy_lead"
  | "good_upstream_candidate"
  | "not_auction_lane"

type VaultExecutionLane =
  | "borrower_side"
  | "lender_trustee"
  | "auction_only"
  | "mixed"
  | "unclear"

type VaultRoutingListing = {
  listingSlug: string
  requests: VaultPursuitRecord[]
}

type LiveVaultListing = {
  slug: string
  title: string
  county: string
  distressType: string
  falcoScore?: number | null
  auctionReadiness?: string
  dtsDays?: number | null
  contactPathQuality?: string
  controlParty?: string
  ownerAgency?: string
  interventionWindow?: string
  lenderControlIntensity?: string
  influenceability?: string
  executionPosture?: string
  workabilityBand?: string
  suggestedExecutionLane?: VaultExecutionLane
  suggestedLaneConfidence?: string
  suggestedLaneReasons?: string[]
  suggestionSource?: "rules" | "operator_feedback"
  suggestedLaneFeedbackCount?: number
  topTierReady?: boolean
  vaultPublishReady?: boolean
  routingState?: "open" | "in_discussion" | "reserved" | "closed"
  validationOutcome?: VaultValidationOutcome
  executionLane?: VaultExecutionLane
  validationNote?: string
  validatedAt?: string
  validatedBy?: string
}

type OperatorIntakeDecision = "promote" | "hold" | "needs_more_info"

type OperatorIntakeRecord = {
  leadKey: string
  decision: OperatorIntakeDecision
  note: string
  actedBy: string
  decidedAt: string
}

type OperatorWorkspace = {
  report: OperatorReport
  accessRequests: AccessRequestRecord[]
  routingQueue: VaultRoutingListing[]
  liveListings: LiveVaultListing[]
  taskHistory: TaskHistoryItem[]
  intakeDecisions: OperatorIntakeRecord[]
  validationRecords: Array<{
    requestId: string
    listingSlug: string
    outcome: VaultValidationOutcome
    executionLane: VaultExecutionLane
    note: string
    feedbackSignals: VaultOperatorFeedbackSignal[]
    contactAttempted: boolean
    submittedAt: string
    actedBy: string
    context?: {
      county: string
      distressType: string
      contactPathQuality: string
      controlParty: string
      ownerAgency?: string
      interventionWindow?: string
      lenderControlIntensity?: string
      influenceability?: string
      executionPosture: string
      workabilityBand: string
      saleStatus?: string
      sourceLeadKey?: string
    }
  }>
}

type TaskItem = {
  id: string
  title: string
  detail: string
  section: "intake" | "approvals" | "routing" | "vault"
  priority: "high" | "medium" | "low"
}

type TaskHistoryItem = {
  id: string
  title: string
  detail: string
  section: TaskItem["section"]
  completedAt: string
  completedBy?: string
}

function badgeClasses(value?: string | null) {
  if ((value || "").toUpperCase() === "GREEN") {
    return "border-white/18 bg-white text-black"
  }
  if ((value || "").toUpperCase() === "YELLOW") {
    return "border-white/14 bg-white/10 text-white/82"
  }
  return "border-white/10 bg-white/[0.05] text-white/65"
}

function priorityClasses(priority: TaskItem["priority"]) {
  if (priority === "high") return "border-white/18 bg-white text-black"
  if (priority === "medium") return "border-white/12 bg-white/10 text-white/82"
  return "border-white/10 bg-white/[0.05] text-white/62"
}

function statusCopy(status: VaultPursuitRecord["status"]) {
  if (status === "pursuit_reserved") return "Reserved"
  if (status === "pursuit_declined") return "Declined"
  if (status === "pursuit_released") return "Released"
  return "Requested"
}

function formatSectionLabel(section: TaskItem["section"]) {
  if (section === "intake") return "Intake"
  if (section === "approvals") return "Approvals"
  if (section === "routing") return "Routing"
  return "Vault"
}

function formatWorkspaceMode(mode: OperatorReport["sourceMode"]) {
  if (mode === "full") return "Full upstream + vault"
  if (mode === "snapshot") return "Hosted snapshot"
  return "Site fallback"
}

function formatWorkflowStorageMode(mode: OperatorReport["workflowStorage"]["mode"]) {
  if (mode === "dedicated") return "Dedicated tables live"
  if (mode === "compatibility") return "Compatibility mode"
  return "Workflow storage unavailable"
}

function workflowTableLabel(
  value: OperatorReport["workflowStorage"]["tables"][number]["name"]
) {
  if (value === "operator_intake_reviews") return "Intake reviews"
  if (value === "operator_task_history") return "Task history"
  if (value === "vault_pursuit_requests") return "Pursuit requests"
  if (value === "vault_partner_feedback") return "Partner feedback"
  return "Validation records"
}

function validationOutcomeCopy(value?: VaultValidationOutcome | null) {
  if (value === "validated_execution_path") return "Validated Path"
  if (value === "needs_more_info") return "Needs More Info"
  if (value === "no_real_control_path") return "No Control Path"
  if (value === "low_leverage") return "Low Leverage"
  if (value === "dead_lead") return "Dead Lead"
  return "Validation Required"
}

function executionLaneCopy(value?: VaultExecutionLane | string | null) {
  if (value === "borrower_side") return "Borrower Side"
  if (value === "lender_trustee") return "Lender / Trustee"
  if (value === "auction_only") return "Auction Only"
  if (value === "mixed") return "Mixed"
  return "Unclear"
}

function feedbackSignalCopy(value: VaultOperatorFeedbackSignal) {
  if (value === "worth_pursuing") return "Worth Pursuing"
  if (value === "too_late") return "Too Late"
  if (value === "too_lender_controlled") return "Too Lender-Controlled"
  if (value === "owner_has_room") return "Owner Has Room"
  if (value === "no_contact_path") return "No Contact Path"
  if (value === "needs_more_info") return "Needs More Info"
  if (value === "bad_noisy_lead") return "Bad / Noisy Lead"
  if (value === "good_upstream_candidate") return "Good Upstream Candidate"
  return "Not Auction Lane"
}

function laneConfidenceCopy(value?: string | null) {
  if (!value) return "Low"
  const normalized = value.toUpperCase()
  if (normalized === "HIGH") return "High"
  if (normalized === "MEDIUM") return "Medium"
  return "Low"
}

function analystBucketCopy(value?: string) {
  if (value === "priority_review") return "Priority Review"
  if (value === "operator_review_candidate") return "Operator Review"
  if (value === "repair_and_retry") return "Repair And Retry"
  if (value === "watch_and_enrich") return "Watch And Enrich"
  return "Monitor"
}

function urgencyCopy(value?: string) {
  if (value === "now") return "Now"
  if (value === "this_week") return "This Week"
  if (value === "watch") return "Watch"
  return "Monitor"
}

function executionStageCopy(listing: LiveVaultListing) {
  if (listing.validationOutcome === "validated_execution_path") return "Validated Execution Path"
  if (listing.validationOutcome === "needs_more_info") return "Needs More Info"
  if (listing.validationOutcome === "no_real_control_path") return "No Real Control Path"
  if (listing.validationOutcome === "low_leverage") return "Low Leverage"
  if (listing.validationOutcome === "dead_lead") return "Dead Lead"
  if (listing.topTierReady || listing.vaultPublishReady) return "Operator Review Candidate"
  return "Screened Opportunity"
}

function saleStatusCopy(value?: string | null) {
  if (value === "pre_foreclosure") return "Pre-Foreclosure"
  if (value === "scheduled") return "Scheduled"
  if (value === "rescheduled") return "Rescheduled"
  if (value === "expired") return "Expired"
  if (value === "monitor") return "Monitor"
  return "Unknown"
}

function intakeDecisionCopy(value?: OperatorIntakeDecision) {
  if (value === "promote") return "Promote"
  if (value === "hold") return "Hold"
  if (value === "needs_more_info") return "Needs More Info"
  return "Undecided"
}

function lifecycleSourceCopy(value?: string | null) {
  if (!value) return "Source"
  if (value === "LIS_PENDENS") return "Lis Pendens"
  if (value === "SUBSTITUTION_OF_TRUSTEE") return "Substitution Of Trustee"
  if (value === "TNForeclosureNotices") return "TN Foreclosure Notices"
  if (value === "ForeclosureTennessee") return "Foreclosure Tennessee"
  if (value === "PublicNotices") return "Public Notices"
  return value
}

function executionRealityCopy(value?: string | null) {
  if (!value) return "Unknown"
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function prefcDecisionCopy(row: ReportRow) {
  if (row.vaultLive) return "Live"
  if (row.preForeclosureReviewReady) return "Ready For Review"
  if (row.recommendedAction) return executionRealityCopy(row.recommendedAction)
  return "Blocked"
}

export default function OperatorPage() {
  const [secret, setSecret] = useState("")
  const [approvedBy, setApprovedBy] = useState("Patrick Armour")
  const [actedBy, setActedBy] = useState("Patrick Armour")
  const [workspace, setWorkspace] = useState<OperatorWorkspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const [processingId, setProcessingId] = useState("")
  const [validationNotes, setValidationNotes] = useState<Record<string, string>>({})
  const [validationLanes, setValidationLanes] = useState<Record<string, VaultExecutionLane>>({})
  const [validationSignals, setValidationSignals] = useState<
    Record<string, VaultOperatorFeedbackSignal[]>
  >({})
  const [validationContactAttempted, setValidationContactAttempted] = useState<
    Record<string, boolean>
  >({})
  const [intakeNotes, setIntakeNotes] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<TaskHistoryItem[]>([])

  const tasks = useMemo(() => {
    if (!workspace) return []

    const items: TaskItem[] = []
    const intakeDecisionMap = new Map(
      (workspace.intakeDecisions ?? []).map((row) => [row.leadKey, row] as const)
    )

    for (const row of [
      ...(workspace.report.foreclosureIntake?.preForeclosure ?? []),
      ...(workspace.report.foreclosureIntake?.statusChanges ?? []),
    ]) {
      if (intakeDecisionMap.has(row.lead_key)) continue
      items.push({
        id: `intake:${row.lead_key}`,
        title: `Review intake lead: ${row.address || row.lead_key}`,
        detail: `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${row.distress_type || "Unknown type"}`,
        section: "intake",
        priority: row.sale_status === "pre_foreclosure" ? "high" : "medium",
      })
    }

    for (const request of workspace.accessRequests.filter((row) => row.status === "pending")) {
      items.push({
        id: `approval:${request.requestId}`,
        title: `Review access request: ${request.fullName || request.email}`,
        detail: `${request.company || "No company"} • ${request.accessType || "No access type"}`,
        section: "approvals",
        priority: "high",
      })
    }

    for (const listing of workspace.routingQueue) {
      const openRequests = listing.requests.filter((row) => row.status === "pursuit_requested")
      if (!openRequests.length) continue
      items.push({
        id: `routing:${listing.listingSlug}`,
        title: `Route pursuit requests for ${listing.listingSlug}`,
        detail: `${openRequests.length} pending pursuit request${openRequests.length === 1 ? "" : "s"}`,
        section: "routing",
        priority: "high",
      })
    }

    for (const row of workspace.report.vaultCandidates) {
      items.push({
        id: `vault:${row.lead_key}`,
        title: `Review screened candidate: ${row.address || row.lead_key}`,
        detail: `${row.county || "Unknown county"} • ${row.auction_readiness || "Unknown"} • ${row.packetCompletenessPct ?? "?"}% complete`,
        section: "vault",
        priority: row.topTierReady ? "high" : "medium",
      })
    }

    for (const listing of workspace.liveListings) {
      if (!(listing.topTierReady || listing.vaultPublishReady)) continue
      if (listing.validationOutcome === "validated_execution_path") continue

      items.push({
        id: `validation:${listing.slug}`,
        title: `Validate execution path: ${listing.title || listing.slug}`,
        detail: `${listing.county || "Unknown county"} • ${executionStageCopy(listing)} • ${executionLaneCopy(listing.executionLane)}`,
        section: "vault",
        priority: listing.topTierReady ? "high" : "medium",
      })
    }

    return items
  }, [workspace])

  const activeTasks = useMemo(
    () => {
      const doneIds = new Set(history.map((item) => item.id))
      return tasks.filter((task) => !doneIds.has(task.id))
    },
    [history, tasks]
  )

  const cards = useMemo(() => {
    if (!workspace) return []
    return [
      ["Pre-Foreclosure", workspace.report.foreclosureIntake.preForeclosureCount],
      ["Ready For Review", workspace.report.preForeclosurePromotion?.readyCount ?? 0],
      ["Blocked", workspace.report.preForeclosurePromotion?.blockedCount ?? 0],
      [
        "Open Tasks",
        activeTasks.length,
      ],
      [
        "Pending Approvals",
        workspace.accessRequests.filter((row) => row.status === "pending").length,
      ],
      [
        "Validation Queue",
        workspace.liveListings.filter(
          (listing) =>
            (listing.topTierReady || listing.vaultPublishReady) &&
            listing.validationOutcome !== "validated_execution_path"
        ).length,
      ],
    ]
  }, [activeTasks.length, workspace])

  const liveListingBySlug = useMemo(
    () => new Map((workspace?.liveListings ?? []).map((listing) => [listing.slug, listing] as const)),
    [workspace]
  )

  const sectionLinks = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "intake", label: "Intake" },
      { id: "actions", label: "Actions" },
    ],
    []
  )

  const intakeDecisionMap = useMemo(
    () => new Map((workspace?.intakeDecisions ?? []).map((row) => [row.leadKey, row] as const)),
    [workspace]
  )

  const validationRecordMap = useMemo(
    () => new Map((workspace?.validationRecords ?? []).map((row) => [row.listingSlug, row] as const)),
    [workspace]
  )

  const validationSummary = useMemo(() => {
    const rows = workspace?.validationRecords ?? []
    const outcomeCounts = new Map<string, number>()
    const laneCounts = new Map<string, number>()
    const signalCounts = new Map<string, number>()

    for (const row of rows) {
      outcomeCounts.set(row.outcome, (outcomeCounts.get(row.outcome) ?? 0) + 1)
      laneCounts.set(row.executionLane, (laneCounts.get(row.executionLane) ?? 0) + 1)
      for (const signal of row.feedbackSignals ?? []) {
        signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1)
      }
    }

    return {
      total: rows.length,
      outcomes: [...outcomeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      lanes: [...laneCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      signals: [...signalCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      recent: rows.slice(0, 8),
    }
  }, [workspace])

  async function loadWorkspace(currentSecret?: string) {
    const secretToUse = (currentSecret ?? secret).trim()
    if (!secretToUse) {
      setError("Approval secret is required.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/operator/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret: secretToUse }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to load operator workspace.")
        return
      }

      setWorkspace(data.workspace)
      setHistory(data.workspace.taskHistory ?? [])
      const nextNotes: Record<string, string> = {}
      const nextLanes: Record<string, VaultExecutionLane> = {}
      const nextSignals: Record<string, VaultOperatorFeedbackSignal[]> = {}
      const nextContactAttempted: Record<string, boolean> = {}
      const nextIntakeNotes: Record<string, string> = {}
      for (const listing of data.workspace.liveListings ?? []) {
        nextNotes[listing.slug] = listing.validationNote ?? ""
        nextLanes[listing.slug] =
          listing.executionLane ?? listing.suggestedExecutionLane ?? "unclear"
      }
      for (const record of data.workspace.validationRecords ?? []) {
        nextNotes[record.listingSlug] = record.note ?? nextNotes[record.listingSlug] ?? ""
        nextLanes[record.listingSlug] =
          record.executionLane ?? nextLanes[record.listingSlug] ?? "unclear"
        nextSignals[record.listingSlug] = record.feedbackSignals ?? []
        nextContactAttempted[record.listingSlug] = record.contactAttempted === true
      }
      for (const intake of data.workspace.intakeDecisions ?? []) {
        nextIntakeNotes[intake.leadKey] = intake.note ?? ""
      }
      setValidationNotes(nextNotes)
      setValidationLanes(nextLanes)
      setValidationSignals(nextSignals)
      setValidationContactAttempted(nextContactAttempted)
      setIntakeNotes(nextIntakeNotes)
    } catch {
      setError("Unable to load operator workspace.")
    } finally {
      setLoading(false)
    }
  }

  async function handleApprovalAction(requestId: string, action: "approve" | "reject") {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(requestId)
    setError("")
    setResult("")

    try {
      const res = await fetch("/api/access/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          approvedBy,
          secret,
          action,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to process request.")
        return
      }

      setResult(action === "approve" ? `Approved ${data.email}` : `Rejected ${data.email}`)
      await loadWorkspace(secret)
    } catch {
      setError("Unable to process request.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleRoutingAction(
    requestId: string,
    action: "reserve" | "decline" | "release"
  ) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(requestId)
    setError("")
    setResult("")

    try {
      const res = await fetch("/api/vault/pursuit/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          actedBy,
          requestId,
          action,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to update routing state.")
        return
      }

      setResult("Routing updated.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to update routing state.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleValidationAction(
    listingSlug: string,
    action: "clear" | VaultValidationOutcome,
    contextOverride?: {
      county?: string | null
      distressType?: string | null
      contactPathQuality?: string | null
      controlParty?: string | null
      ownerAgency?: string | null
      interventionWindow?: string | null
      lenderControlIntensity?: string | null
      influenceability?: string | null
      executionPosture?: string | null
      workabilityBand?: string | null
      saleStatus?: string | null
      sourceLeadKey?: string | null
    }
  ) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(`validation:${listingSlug}:${action}`)
    setError("")
    setResult("")

    try {
      const listing = liveListingBySlug.get(listingSlug)
      const effectiveContext =
        action === "clear"
          ? undefined
          : contextOverride
            ? {
                county: contextOverride.county ?? "",
                distressType: contextOverride.distressType ?? "",
                contactPathQuality: contextOverride.contactPathQuality ?? "",
                controlParty: contextOverride.controlParty ?? "",
                ownerAgency: contextOverride.ownerAgency ?? "",
                interventionWindow: contextOverride.interventionWindow ?? "",
                lenderControlIntensity: contextOverride.lenderControlIntensity ?? "",
                influenceability: contextOverride.influenceability ?? "",
                executionPosture: contextOverride.executionPosture ?? "",
                workabilityBand: contextOverride.workabilityBand ?? "",
                saleStatus: contextOverride.saleStatus ?? "",
                sourceLeadKey: contextOverride.sourceLeadKey ?? "",
              }
            : !listing
              ? undefined
              : {
                  county: listing.county ?? "",
                  distressType: listing.distressType ?? "",
                  contactPathQuality: listing.contactPathQuality ?? "",
                  controlParty: listing.controlParty ?? "",
                  ownerAgency: listing.ownerAgency ?? "",
                  interventionWindow: listing.interventionWindow ?? "",
                  lenderControlIntensity: listing.lenderControlIntensity ?? "",
                  influenceability: listing.influenceability ?? "",
                  executionPosture: listing.executionPosture ?? "",
                  workabilityBand: listing.workabilityBand ?? "",
                  saleStatus: "",
                  sourceLeadKey: "",
                }
      const res = await fetch("/api/operator/validation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          actedBy,
          action: action === "clear" ? "clear" : "record",
          listingSlug,
          outcome: action === "clear" ? undefined : action,
          executionLane: validationLanes[listingSlug] ?? "unclear",
          note: validationNotes[listingSlug] ?? "",
          feedbackSignals: validationSignals[listingSlug] ?? [],
          contactAttempted: validationContactAttempted[listingSlug] === true,
          context: effectiveContext,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to record operator validation.")
        return
      }

      setResult(action === "clear" ? "Validation cleared." : "Validation recorded.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to record operator validation.")
    } finally {
      setProcessingId("")
    }
  }

  async function completeTask(task: TaskItem) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(`task:${task.id}:complete`)
    setError("")

    try {
      const res = await fetch("/api/operator/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          action: "complete",
          taskId: task.id,
          title: task.title,
          detail: task.detail,
          section: task.section,
          completedBy: actedBy,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to update task state.")
        return
      }

      setResult(`Task completed: ${task.title}`)
      await loadWorkspace(secret)
    } catch {
      setError("Unable to update task state.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleIntakeDecision(
    leadKey: string,
    decision: "clear" | OperatorIntakeDecision,
    title: string,
    detail: string
  ) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(`intake:${leadKey}:${decision}`)
    setError("")
    setResult("")

    try {
      const res = await fetch("/api/operator/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          action: decision === "clear" ? "clear" : "record",
          leadKey,
          decision: decision === "clear" ? undefined : decision,
          note: intakeNotes[leadKey] ?? "",
          actedBy,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to record intake review.")
        return
      }

      if (decision !== "clear") {
        await fetch("/api/operator/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret,
            action: "complete",
            taskId: `intake:${leadKey}`,
            title,
            detail,
            section: "intake",
            completedBy: actedBy,
          }),
        })
      } else {
        await fetch("/api/operator/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret,
            action: "restore",
            taskId: `intake:${leadKey}`,
          }),
        })
      }

      setResult(
        decision === "clear"
          ? "Intake review cleared."
          : decision === "promote" && data?.published?.slug
          ? `Promoted to vault: ${data.published.slug}`
          : `Intake marked: ${intakeDecisionCopy(decision)}`
      )
      await loadWorkspace(secret)
    } catch {
      setError("Unable to record intake review.")
    } finally {
      setProcessingId("")
    }
  }

  async function restoreTask(taskId: string) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(`task:${taskId}:restore`)
    setError("")

    try {
      const res = await fetch("/api/operator/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          action: "restore",
          taskId,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to restore task.")
        return
      }

      setResult("Task restored.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to restore task.")
    } finally {
      setProcessingId("")
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
            Operator Workspace
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
                Run approvals, validation, routing, and review from one desk.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
                This is the single internal workspace for FALCO operator tasks:
                access approvals, staged opportunity review, operator validation, and routing.
              </p>
              {workspace ? (
                <div className="mt-6 text-sm text-white/45">
                  Generated: {workspace.report.generatedAt}
                  <br />
                  Mode: {formatWorkspaceMode(workspace.report.sourceMode)}
                  <br />
                  Source DB: {workspace.report.dbPath}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/40 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                Operator Access
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Approval Secret
                  </label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Admin secret"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-white/70">Approved By</label>
                    <input
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/70">Acted By</label>
                    <input
                      value={actedBy}
                      onChange={(e) => setActedBy(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {result ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                  {result}
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  onClick={() => loadWorkspace(secret)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Load Workspace"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {workspace ? (
          <>
            <section
              id="overview"
              className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.4)] md:p-8"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Overview</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Daily Operator Desk
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                    Start with pre-foreclosure review. Everything else is available below when you need it.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sectionLinks.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      {section.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                </div>
              ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm leading-7 text-white/60">
                {workspace.report.sourceNote}
              </div>

              <details className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white/78">
                  System Status
                </summary>
                <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Workflow Storage
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatWorkflowStorageMode(workspace.report.workflowStorage.mode)}
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      {workspace.report.workflowStorage.readyCount} of{" "}
                      {workspace.report.workflowStorage.totalCount} workflow tables ready
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {workspace.report.workflowStorage.tables.map((table) => (
                      <div
                        key={table.name}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                      >
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                          {workflowTableLabel(table.name)}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {table.ready ? "Ready" : "Fallback"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </section>

            <details
              id="analyst"
              className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.4)] md:p-8"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Signals</div>
                    <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                      Analyst And Learning
                    </div>
                    <div className="mt-2 text-sm text-white/58">
                      Open only when you want model detail, validation history, or watchlists.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    Optional
                  </div>
                </div>
              </summary>
              <div className="mt-6">
            <section
              className="rounded-[28px] border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Analyst</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    FALCO Analyst Desk
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                    A structured recommendation layer over the current pipeline: what is ready now,
                    what needs repair, and what should stay on early watch instead of moving too fast.
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                  {workspace.report.analyst?.overview.priority_review_count ?? 0} priority now
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Priority</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.priority_review_count ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Review</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.operator_review_candidate_count ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Repair</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.repair_and_retry_count ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Watch</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.watch_and_enrich_count ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Monitor</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.monitor_count ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Pre-Foreclosure</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {workspace.report.analyst?.overview.pre_foreclosure_watch_count ?? 0}
                  </div>
                </div>
              </div>

              {workspace.report.analyst?.strategic_notes?.length ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-7 text-white/68">
                  {workspace.report.analyst.strategic_notes.map((note) => (
                    <div key={note}>{note}</div>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">Priority Review</div>
                      <div className="mt-2 text-lg font-semibold text-white">Move these to real human review now</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {(workspace.report.analyst?.priority_review ?? []).length ? (
                      workspace.report.analyst!.priority_review.map((row) => (
                        <article key={`analyst-priority-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                              <div className="mt-1 text-sm text-white/55">
                                {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                              <span className="rounded-full border border-white/18 bg-white px-3 py-1 text-black">
                                {analystBucketCopy(row.analysis_bucket)}
                              </span>
                              <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-white/82">
                                {urgencyCopy(row.urgency)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 text-sm leading-7 text-white/70">{row.summary}</div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Suggested Lane</div>
                              <div className="mt-2 text-sm text-white/82">{executionLaneCopy(row.suggested_execution_lane as VaultExecutionLane)}</div>
                              <div className="mt-1 text-xs text-white/45">{laneConfidenceCopy(row.confidence)} confidence</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Recommended Action</div>
                              <div className="mt-2 text-sm text-white/82">{row.recommended_action}</div>
                            </div>
                          </div>
                          {row.suggested_lane_reasons?.length ? (
                            <div className="mt-3 text-sm text-white/60">
                              Why: {row.suggested_lane_reasons.join(" • ")}
                            </div>
                          ) : null}
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Owner Agency</div>
                              <div className="mt-2 text-sm text-white/82">{row.owner_agency}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Intervention Window</div>
                              <div className="mt-2 text-sm text-white/82">{row.intervention_window}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Lender Control</div>
                              <div className="mt-2 text-sm text-white/82">{row.lender_control_intensity}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Influenceability</div>
                              <div className="mt-2 text-sm text-white/82">{row.influenceability}</div>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No analyst-priority files right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">Repair And Retry</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    Near misses with real signal but incomplete execution truth
                  </div>
                  <div className="mt-4 grid gap-4">
                    {(workspace.report.analyst?.repair_and_retry ?? []).length ? (
                      workspace.report.analyst!.repair_and_retry.map((row) => (
                        <article key={`analyst-repair-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                              <div className="mt-1 text-sm text-white/55">
                                {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/82">
                              {urgencyCopy(row.urgency)}
                            </span>
                          </div>
                          <div className="mt-4 text-sm leading-7 text-white/70">{row.summary}</div>
                          {row.execution_blockers?.length ? (
                            <div className="mt-3 text-sm text-white/60">
                              Blockers: {row.execution_blockers.join(" • ")}
                            </div>
                          ) : null}
                          {row.missing_fields?.length ? (
                            <div className="mt-2 text-sm text-white/50">
                              Missing: {row.missing_fields.join(" • ")}
                            </div>
                          ) : null}
                          <div className="mt-3 text-sm text-white/82">{row.recommended_action}</div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No repair-and-retry files right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">Pre-Foreclosure Watch</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Early files worth lifecycle tracking before they become sale-scheduled
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(workspace.report.analyst?.pre_foreclosure_watch ?? []).length ? (
                    workspace.report.analyst!.pre_foreclosure_watch.map((row) => (
                      <article key={`analyst-watch-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                        <div className="mt-1 text-sm text-white/55">
                          {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                        </div>
                        <div className="mt-3 text-sm text-white/65">
                          Stage: {saleStatusCopy(row.sale_status)}{row.dts_days != null ? ` • ${row.dts_days} days` : ""}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                      No pre-foreclosure watch files right now.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              id="feedback"
              className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Feedback Loop</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Operator Validation Signal
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                    This is the learning layer: real operator outcomes, the lanes they validated,
                    and the reasons screened candidates failed or moved forward.
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                  {validationSummary.total} recorded validations
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">Outcome Summary</div>
                  <div className="mt-4 grid gap-3">
                    {validationSummary.outcomes.length ? (
                      validationSummary.outcomes.map((row) => (
                        <div key={`validation-outcome-${row.label}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-sm text-white/78">{validationOutcomeCopy(row.label as VaultValidationOutcome)}</div>
                          <div className="text-sm font-semibold text-white">{row.count}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No operator validation history yet.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 text-xs uppercase tracking-[0.22em] text-white/40">Lane Summary</div>
                  <div className="mt-3 grid gap-3">
                    {validationSummary.lanes.length ? (
                      validationSummary.lanes.map((row) => (
                        <div key={`validation-lane-${row.label}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-sm text-white/78">{executionLaneCopy(row.label as VaultExecutionLane)}</div>
                          <div className="text-sm font-semibold text-white">{row.count}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        Lane history will appear after a few recorded validations.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 text-xs uppercase tracking-[0.22em] text-white/40">Signal Summary</div>
                  <div className="mt-3 grid gap-3">
                    {validationSummary.signals.length ? (
                      validationSummary.signals.map((row) => (
                        <div key={`validation-signal-${row.label}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-sm text-white/78">
                            {feedbackSignalCopy(row.label as VaultOperatorFeedbackSignal)}
                          </div>
                          <div className="text-sm font-semibold text-white">{row.count}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        Signal history will appear after operators start tagging files.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">Recent Validation</div>
                      <div className="mt-2 text-lg font-semibold text-white">Latest operator outcomes</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {validationSummary.recent.length ? (
                      validationSummary.recent.map((row) => (
                        <article key={`validation-recent-${row.requestId}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {row.context?.sourceLeadKey || row.listingSlug}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                                {validationOutcomeCopy(row.outcome)} • {executionLaneCopy(row.executionLane)}
                              </div>
                            </div>
                            <div className="text-xs text-white/45">{row.actedBy}</div>
                          </div>
                          {row.context ? (
                            <div className="mt-3 text-sm leading-6 text-white/62">
                              {row.context.county || "Unknown county"} • {row.context.distressType || "Unknown type"} • {row.context.contactPathQuality || "Unknown contact path"} • {row.context.controlParty || "Unknown control"} • {row.context.ownerAgency || "Unknown owner agency"}
                            </div>
                          ) : null}
                          {row.feedbackSignals?.length || row.contactAttempted ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(row.feedbackSignals ?? []).map((signal) => (
                                <span
                                  key={`${row.requestId}-${signal}`}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                                >
                                  {feedbackSignalCopy(signal)}
                                </span>
                              ))}
                              {row.contactAttempted ? (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                                  Contact Attempted
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {row.note ? (
                            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                              {row.note}
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No recent validation history yet.
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>
              </div>
            </details>

            <section
              id="intake"
              className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Intake</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Foreclosure Pipeline
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                    Early signals and sale-status movement from the upstream foreclosure lifecycle.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/72">
                    {workspace.report.foreclosureIntake.preForeclosureCount} Pre-Foreclosure
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/72">
                    {workspace.report.foreclosureIntake.scheduledCount} Scheduled
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/72">
                    {workspace.report.foreclosureIntake.rescheduledCount} Rescheduled
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/72">
                    {workspace.report.foreclosureIntake.expiredCount} Expired
                  </span>
                </div>
              </div>

              <details className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">Raw Feed</div>
                      <div className="mt-2 text-lg font-semibold text-white">Watchlist And Sale Changes</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                      Optional
                    </div>
                  </div>
                </summary>
                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-lg font-semibold text-white">Pre-Foreclosure Watch</div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                      {workspace.report.foreclosureIntake.preForeclosure.length} visible
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {workspace.report.foreclosureIntake.preForeclosure.length ? workspace.report.foreclosureIntake.preForeclosure.map((row) => (
                      <div key={`pf-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        {(() => {
                          const intake = intakeDecisionMap.get(row.lead_key)
                          const taskTitle = `Review intake lead: ${row.address || row.lead_key}`
                          const taskDetail = `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${row.distress_type || "Unknown type"}`
                          return (
                            <>
                        <div className="text-sm font-semibold text-white">{row.address || row.lead_key}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                          {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Intake Review: <span className="text-white/75">{intakeDecisionCopy(intake?.decision)}</span>
                          {intake ? ` • ${intake.actedBy}` : ""}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Status</div>
                            <div className="mt-2 text-sm text-white/78">{saleStatusCopy(row.sale_status)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Current Sale</div>
                            <div className="mt-2 text-sm text-white/78">{row.current_sale_date || "Not scheduled"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Days</div>
                            <div className="mt-2 text-sm text-white/78">{row.dts_days ?? "—"}</div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                          <textarea
                            value={intakeNotes[row.lead_key] ?? ""}
                            onChange={(event) =>
                              setIntakeNotes((current) => ({
                                ...current,
                                [row.lead_key]: event.target.value,
                              }))
                            }
                            className="min-h-[78px] rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            placeholder="Optional intake note: why this should be promoted, held, or needs more information."
                          />
                          <div className="flex flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "promote", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:promote`}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:promote` ? "Saving..." : "Promote"}
                            </button>
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "hold", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:hold`}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:hold` ? "Saving..." : "Hold"}
                            </button>
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "needs_more_info", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:needs_more_info`}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:needs_more_info` ? "Saving..." : "Needs Info"}
                            </button>
                            {intake ? (
                              <button
                                onClick={() => handleIntakeDecision(row.lead_key, "clear", taskTitle, taskDetail)}
                                disabled={processingId === `intake:${row.lead_key}:clear`}
                                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === `intake:${row.lead_key}:clear` ? "Saving..." : "Clear"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                            </>
                          )
                        })()}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No pre-foreclosure rows are visible in the current operator snapshot.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-lg font-semibold text-white">Sale Status Changes</div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                      {workspace.report.foreclosureIntake.statusChanges.length} recent
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {workspace.report.foreclosureIntake.statusChanges.length ? workspace.report.foreclosureIntake.statusChanges.map((row) => (
                      <div key={`status-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        {(() => {
                          const intake = intakeDecisionMap.get(row.lead_key)
                          const taskTitle = `Review intake lead: ${row.address || row.lead_key}`
                          const taskDetail = `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${row.distress_type || "Unknown type"}`
                          return (
                            <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{row.address || row.lead_key}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                              {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${row.sale_status === "expired" ? "border-white/10 bg-white/[0.05] text-white/58" : "border-white/12 bg-white/10 text-white/82"}`}>
                            {saleStatusCopy(row.sale_status)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Intake Review: <span className="text-white/75">{intakeDecisionCopy(intake?.decision)}</span>
                          {intake ? ` • ${intake.actedBy}` : ""}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Original Sale</div>
                            <div className="mt-2 text-sm text-white/78">{row.original_sale_date || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Current Sale</div>
                            <div className="mt-2 text-sm text-white/78">{row.current_sale_date || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Days</div>
                            <div className="mt-2 text-sm text-white/78">{row.dts_days ?? "—"}</div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                          <textarea
                            value={intakeNotes[row.lead_key] ?? ""}
                            onChange={(event) =>
                              setIntakeNotes((current) => ({
                                ...current,
                                [row.lead_key]: event.target.value,
                              }))
                            }
                            className="min-h-[78px] rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            placeholder="Optional intake note: promotion rationale, stale timing, or missing information."
                          />
                          <div className="flex flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "promote", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:promote`}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:promote` ? "Saving..." : "Promote"}
                            </button>
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "hold", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:hold`}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:hold` ? "Saving..." : "Hold"}
                            </button>
                            <button
                              onClick={() => handleIntakeDecision(row.lead_key, "needs_more_info", taskTitle, taskDetail)}
                              disabled={processingId === `intake:${row.lead_key}:needs_more_info`}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `intake:${row.lead_key}:needs_more_info` ? "Saving..." : "Needs Info"}
                            </button>
                            {intake ? (
                              <button
                                onClick={() => handleIntakeDecision(row.lead_key, "clear", taskTitle, taskDetail)}
                                disabled={processingId === `intake:${row.lead_key}:clear`}
                                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === `intake:${row.lead_key}:clear` ? "Saving..." : "Clear"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                            </>
                          )
                        })()}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No recent sale-status movement is visible in the current operator snapshot.
                      </div>
                    )}
                  </div>
                </article>
              </div>
              </details>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">Pre-Foreclosure Promotion</div>
                      <div className="mt-2 text-lg font-semibold text-white">Ready for review vs blocked</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                      {workspace.report.preForeclosurePromotion.readyCount} ready
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {workspace.report.preForeclosurePromotion.readyForReview.length ? (
                      workspace.report.preForeclosurePromotion.readyForReview.map((row) => (
                        <div key={`prefc-ready-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{row.address || row.lead_key}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                                {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                              </div>
                            </div>
                            <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                              {executionLaneCopy((row.suggestedExecutionLane as VaultExecutionLane) || "unclear")} • {laneConfidenceCopy(row.suggestedLaneConfidence)}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Status</div>
                              <div className="mt-2 text-sm text-white/78">{saleStatusCopy(row.sale_status)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Owner Agency</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.ownerAgency)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Intervention Window</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.interventionWindow)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Lender Control</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.lenderControlIntensity)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Influenceability</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.influenceability)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Complete</div>
                              <div className="mt-2 text-sm text-white/78">{row.packetCompletenessPct ?? "—"}%</div>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Execution Posture</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.executionPosture)}</div>
                              <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-white/38">Control Party</div>
                              <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.controlParty)}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Why It Cleared Review</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[
                                  row.contactPathQuality && `Contact ${executionRealityCopy(row.contactPathQuality)}`,
                                  row.workabilityBand && `Workability ${executionRealityCopy(row.workabilityBand)}`,
                                  row.vaultPublishReady ? "Vault eligible" : null,
                                ]
                                  .filter(Boolean)
                                  .map((item) => (
                                    <span
                                      key={`${row.lead_key}-${item}`}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                    >
                                      {item}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No pre-foreclosure files are currently staged for review.
                      </div>
                    )}
                  </div>

                  {workspace.report.preForeclosurePromotion.blockerCounts.length ? (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Top blockers</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {workspace.report.preForeclosurePromotion.blockerCounts.map((row) => (
                          <span key={`prefc-blocker-${row.label}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                            {row.label} • {row.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Blocked files</div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                        {workspace.report.preForeclosurePromotion.blockedCount} blocked
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {workspace.report.preForeclosurePromotion.blocked.length ? (
                        workspace.report.preForeclosurePromotion.blocked.map((row) => (
                          <div key={`prefc-blocked-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{row.address || row.lead_key}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                                  {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                                </div>
                              </div>
                              <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                                {prefcDecisionCopy(row)}
                              </div>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Owner Agency</div>
                                <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.ownerAgency)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Intervention Window</div>
                                <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.interventionWindow)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Lender Control</div>
                                <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.lenderControlIntensity)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Contact Path</div>
                                <div className="mt-2 text-sm text-white/78">{executionRealityCopy(row.contactPathQuality)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Suggested Lane</div>
                                <div className="mt-2 text-sm text-white/78">
                                  {executionLaneCopy((row.suggestedExecutionLane as VaultExecutionLane) || "unclear")} • {laneConfidenceCopy(row.suggestedLaneConfidence)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Why It Is Blocked</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(row.executionBlockers?.length ? row.executionBlockers : ["Needs more info"]).map((blocker) => (
                                  <span
                                    key={`${row.lead_key}-${blocker}`}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                  >
                                    {blocker}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                          No blocked pre-foreclosure files are currently in the review queue.
                        </div>
                      )}
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">Lifecycle History</div>
                      <div className="mt-2 text-lg font-semibold text-white">Recent foreclosure events</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                      {workspace.report.foreclosureIntake.recentEvents.length} recent
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {workspace.report.foreclosureIntake.recentEvents.length ? (
                      workspace.report.foreclosureIntake.recentEvents.map((row) => (
                        <div key={row.event_key} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{row.address || row.lead_key}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                                {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                              {lifecycleSourceCopy(row.source)}
                            </span>
                          </div>
                          <div className="mt-3 text-sm text-white/68">
                            {row.event_type.replace(/_/g, " ")} • {saleStatusCopy(row.derived_status || row.sale_status)}
                          </div>
                          <div className="mt-2 text-sm text-white/52">
                            {row.sale_date ? `Event sale date: ${row.sale_date}` : "No sale date on event"}{row.event_at ? ` • Seen ${row.event_at}` : ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                        No lifecycle events are available yet in this workspace.
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>

            <details
              id="actions"
              className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.4)] md:p-8"
              open
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Actions</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Tasks, Approvals, Routing, And Validation
                    </div>
                    <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                      Open this only when you need to work approvals, route requests, or update live validation.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {activeTasks.length} open
                  </div>
                </div>
              </summary>
              <div className="mt-6 grid gap-8">
            <div id="tasks" className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Today</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Task List
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {activeTasks.length} open
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {activeTasks.length ? activeTasks.map((task) => (
                    <article key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">{task.title}</div>
                          <div className="mt-2 text-sm text-white/60">{task.detail}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                          <span className={`rounded-full border px-3 py-1 ${priorityClasses(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-white/60">
                            {formatSectionLabel(task.section)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={`#${task.section}`}
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                        >
                          Jump to Section
                        </a>
                        <button
                          onClick={() => completeTask(task)}
                          disabled={processingId === `task:${task.id}:complete`}
                          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === `task:${task.id}:complete` ? "Saving..." : "Mark Complete"}
                        </button>
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                      No open operator tasks right now.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">History</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Completed Tasks
                </div>

                <div className="mt-6 grid gap-4">
                  {history.length ? history.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="text-sm uppercase tracking-[0.18em] text-white/40">
                        {formatSectionLabel(item.section)}
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">{item.title}</div>
                      <div className="mt-2 text-sm text-white/60">{item.detail}</div>
                      <div className="mt-3 text-xs text-white/40">
                        Completed: {item.completedAt}
                        {item.completedBy ? ` • ${item.completedBy}` : ""}
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => restoreTask(item.id)}
                          disabled={processingId === `task:${item.id}:restore`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === `task:${item.id}:restore` ? "Restoring..." : "Restore"}
                        </button>
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                      No completed tasks saved yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-8">
              <section
                id="approvals"
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Approvals</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Access Requests
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {workspace.accessRequests.filter((row) => row.status === "pending").length} pending
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {workspace.accessRequests.length ? workspace.accessRequests.map((request) => (
                    <article key={request.requestId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold text-white">
                            {request.fullName || request.email}
                          </div>
                          <div className="mt-2 text-sm text-white/55">
                            {request.email} • {request.company || "No company"}
                          </div>
                        </div>
                        <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${request.status === "approved" ? "border-white/18 bg-white text-black" : request.status === "rejected" ? "border-white/10 bg-white/[0.05] text-white/60" : "border-white/12 bg-white/10 text-white/82"}`}>
                          {request.status}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Role</div>
                          <div className="mt-2 text-sm text-white/82">{request.role || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Market Focus</div>
                          <div className="mt-2 text-sm text-white/82">{request.marketFocus || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Access Type</div>
                          <div className="mt-2 text-sm text-white/82">{request.accessType || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Submitted</div>
                          <div className="mt-2 text-sm text-white/82">{request.submittedAt || "—"}</div>
                        </div>
                      </div>

                      {(request.executionCapacity || request.notes) ? (
                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                              Execution Capacity
                            </div>
                            <div className="mt-3 text-sm leading-7 text-white/76">
                              {request.executionCapacity || "—"}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                              Notes
                            </div>
                            <div className="mt-3 text-sm leading-7 text-white/76">
                              {request.notes || "—"}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {request.status === "pending" ? (
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={() => handleApprovalAction(request.requestId, "approve")}
                            disabled={processingId === request.requestId}
                            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingId === request.requestId ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleApprovalAction(request.requestId, "reject")}
                            disabled={processingId === request.requestId}
                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingId === request.requestId ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                      No access requests in the queue.
                    </div>
                  )}
                </div>
              </section>

              <section
                id="routing"
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Routing</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Pursuit Requests
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {workspace.routingQueue.length} listings
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {workspace.routingQueue.length ? workspace.routingQueue.map((listing) => (
                    <article key={listing.listingSlug} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="text-lg font-semibold text-white">{listing.listingSlug}</div>
                      <div className="mt-4 grid gap-4">
                        {listing.requests.map((request) => (
                          <div key={request.requestId} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="text-base font-semibold text-white">
                                  {request.fullName || request.email}
                                </div>
                                <div className="mt-1 text-sm text-white/55">{request.email}</div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                                {statusCopy(request.status)}
                              </div>
                            </div>

                            <div className="mt-4 text-sm leading-7 text-white/68">
                              {request.message || "No pursuit note provided."}
                            </div>

                            <div className="mt-4 text-xs text-white/40">Submitted: {request.submittedAt}</div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              {request.status === "pursuit_requested" ? (
                                <>
                                  <button
                                    onClick={() => handleRoutingAction(request.requestId, "reserve")}
                                    disabled={processingId === request.requestId}
                                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {processingId === request.requestId ? "Processing..." : "Reserve"}
                                  </button>
                                  <button
                                    onClick={() => handleRoutingAction(request.requestId, "decline")}
                                    disabled={processingId === request.requestId}
                                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {processingId === request.requestId ? "Processing..." : "Decline"}
                                  </button>
                                </>
                              ) : null}

                              {request.status === "pursuit_reserved" ? (
                                <button
                                  onClick={() => handleRoutingAction(request.requestId, "release")}
                                  disabled={processingId === request.requestId}
                                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === request.requestId ? "Processing..." : "Release"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                      No active pursuit routing requests.
                    </div>
                  )}
                </div>
              </section>

              <section
                id="vault"
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Vault</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Review Queue And Validation Shelf
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {workspace.report.vaultCandidates.length} queued
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {workspace.report.vaultCandidates.length ? workspace.report.vaultCandidates.map((row) => (
                    <article key={row.lead_key} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold text-white">{row.address || row.lead_key}</div>
                          <div className="mt-2 text-sm text-white/55">
                            {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                          <span className={`rounded-full border px-3 py-1 ${badgeClasses(row.auction_readiness)}`}>
                            {row.auction_readiness || "Unknown"}
                          </span>
                          <span className="rounded-full border border-white/18 bg-white px-3 py-1 text-black">
                            {row.packetCompletenessPct ?? "?"}% complete
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Equity</div>
                          <div className="mt-2 text-sm text-white/82">{row.equity_band || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Days to Sale</div>
                          <div className="mt-2 text-sm text-white/82">{row.dts_days ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Top Tier</div>
                          <div className="mt-2 text-sm text-white/82">{row.topTierReady ? "YES" : "NO"}</div>
                        </div>
                      </div>

                      {row.executionBlockers?.length ? (
                        <div className="mt-4 text-sm text-white/62">
                          Blockers: {row.executionBlockers.join(" • ")}
                        </div>
                      ) : null}

                      {row.vaultSlug ? (
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            href={`/vault/${row.vaultSlug}`}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                          >
                            Open Listing
                          </Link>
                          <Link
                            href={`/api/vault/packet?slug=${row.vaultSlug}`}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                          >
                            Open Packet
                          </Link>
                        </div>
                      ) : null}
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                      No vault candidates are waiting right now.
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Live Review Shelf</div>
                  <div className="mt-4 grid gap-4">
                    {workspace.liveListings.filter((listing) => listing.topTierReady || listing.vaultPublishReady).length ? (
                      workspace.liveListings
                        .filter((listing) => listing.topTierReady || listing.vaultPublishReady)
                        .map((listing) => {
                          const processingKeyPrefix = `validation:${listing.slug}:`
                          return (
                            <article key={`live-${listing.slug}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className="text-base font-semibold text-white">{listing.title || listing.slug}</div>
                                  <div className="mt-1 text-sm text-white/55">
                                    {listing.county || "Unknown county"} • {listing.dtsDays ?? "—"} days • {listing.distressType || "Unknown type"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                                  <span className={`rounded-full border px-3 py-1 ${badgeClasses(listing.auctionReadiness)}`}>
                                    {listing.auctionReadiness || "Unknown"}
                                  </span>
                                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-white/82">
                                    {executionStageCopy(listing)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-5 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Contact Path</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.contactPathQuality || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Owner Agency</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.ownerAgency || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Intervention Window</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.interventionWindow || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Likely Control</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.controlParty || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Lender Control</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.lenderControlIntensity || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Execution Posture</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.executionPosture || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Influenceability</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.influenceability || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Workability</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.workabilityBand || "—"}</div>
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/68">
                                <div>Validation status: <span className="text-white/82">{validationOutcomeCopy(listing.validationOutcome)}</span></div>
                                <div className="mt-2">
                                  {listing.suggestionSource === "operator_feedback"
                                    ? "Operator-informed lane"
                                    : "Agent suggested lane"}
                                  :{" "}
                                  <span className="text-white/82">
                                    {executionLaneCopy(listing.suggestedExecutionLane)}
                                  </span>
                                  {listing.suggestedLaneConfidence ? (
                                    <span className="text-white/45">
                                      {" "}• {laneConfidenceCopy(listing.suggestedLaneConfidence)} confidence
                                    </span>
                                  ) : null}
                                </div>
                                {listing.suggestionSource === "operator_feedback" ? (
                                  <div className="mt-2 text-white/48">
                                    Based on {listing.suggestedLaneFeedbackCount ?? 0} similar validated file
                                    {(listing.suggestedLaneFeedbackCount ?? 0) === 1 ? "" : "s"}
                                  </div>
                                ) : null}
                                {listing.suggestedLaneReasons?.length ? (
                                  <div className="mt-2">
                                    Why:{" "}
                                    <span className="text-white/82">
                                      {listing.suggestedLaneReasons.join(" • ")}
                                    </span>
                                  </div>
                                ) : null}
                                <div className="mt-2">
                                  Operator lane:{" "}
                                  <span className="text-white/82">{executionLaneCopy(listing.executionLane)}</span>
                                </div>
                                {validationRecordMap.get(listing.slug)?.feedbackSignals?.length ||
                                validationContactAttempted[listing.slug] ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(validationSignals[listing.slug] ?? []).map((signal) => (
                                      <span
                                        key={`${listing.slug}-${signal}`}
                                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                                      >
                                        {feedbackSignalCopy(signal)}
                                      </span>
                                    ))}
                                    {validationContactAttempted[listing.slug] ? (
                                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                                        Contact Attempted
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                {listing.validationNote ? (
                                  <div className="mt-2">Note: <span className="text-white/82">{listing.validationNote}</span></div>
                                ) : null}
                              </div>

                              <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
                                <select
                                  value={validationLanes[listing.slug] ?? "unclear"}
                                  onChange={(event) =>
                                    setValidationLanes((current) => ({
                                      ...current,
                                      [listing.slug]: event.target.value as VaultExecutionLane,
                                    }))
                                  }
                                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                                >
                                  <option value="unclear">Lane: Unclear</option>
                                  <option value="borrower_side">Borrower Side</option>
                                  <option value="lender_trustee">Lender / Trustee</option>
                                  <option value="auction_only">Auction Only</option>
                                  <option value="mixed">Mixed</option>
                                </select>

                                <textarea
                                  value={validationNotes[listing.slug] ?? ""}
                                  onChange={(event) =>
                                    setValidationNotes((current) => ({
                                      ...current,
                                      [listing.slug]: event.target.value,
                                    }))
                                  }
                                  className="min-h-[84px] rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                                  placeholder="Optional operator note: control path, leverage, execution caveat."
                                />
                              </div>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "validated_execution_path")}
                                  disabled={processingId === `${processingKeyPrefix}validated_execution_path`}
                                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}validated_execution_path` ? "Processing..." : "Validated Path"}
                                </button>
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "needs_more_info")}
                                  disabled={processingId === `${processingKeyPrefix}needs_more_info`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}needs_more_info` ? "Processing..." : "Needs Info"}
                                </button>
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "no_real_control_path")}
                                  disabled={processingId === `${processingKeyPrefix}no_real_control_path`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}no_real_control_path` ? "Processing..." : "No Control Path"}
                                </button>
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "low_leverage")}
                                  disabled={processingId === `${processingKeyPrefix}low_leverage`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}low_leverage` ? "Processing..." : "Too Late"}
                                </button>
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "dead_lead")}
                                  disabled={processingId === `${processingKeyPrefix}dead_lead`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}dead_lead` ? "Processing..." : "Bad Lead"}
                                </button>
                                {listing.validationOutcome ? (
                                  <button
                                    onClick={() => handleValidationAction(listing.slug, "clear")}
                                    disabled={processingId === `${processingKeyPrefix}clear`}
                                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {processingId === `${processingKeyPrefix}clear` ? "Processing..." : "Clear"}
                                  </button>
                                ) : null}
                                <Link
                                  href={`/vault/${listing.slug}`}
                                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/10"
                                >
                                  Open Listing
                                </Link>
                              </div>
                            </article>
                          )
                        })
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
                        No live review candidates are waiting right now.
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>
              </div>
            </details>
          </>
        ) : null}
      </section>
    </main>
  )
}
