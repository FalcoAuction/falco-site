'use client'

import { useMemo, useState } from "react"

type VaultValidationOutcome =
  | "validated_execution_path"
  | "needs_more_info"
  | "no_real_control_path"
  | "low_leverage"
  | "dead_lead"

type VaultExecutionLane =
  | "borrower_side"
  | "lender_trustee"
  | "auction_only"
  | "mixed"
  | "unclear"

type OperatorIntakeDecision = "promote" | "hold" | "needs_more_info"
type OperatorEnrichmentStatus = "requested" | "processing" | "completed" | "failed"
type ActiveTab = "priority" | "pre_foreclosure" | "vault" | "updates" | "admin"

type TaskItem = {
  id: string
  title: string
  detail: string
  section: "intake" | "approvals" | "routing" | "vault"
  priority: "high" | "medium" | "low"
}

type FeedItem = {
  id: string
  at: string
  title: string
  detail: string
  tone: "neutral" | "good" | "warn"
}

function badgeClasses(value?: string | null) {
  if ((value || "").toUpperCase() === "GREEN") return "border-white/18 bg-white text-black"
  if ((value || "").toUpperCase() === "YELLOW") return "border-white/12 bg-white/10 text-white/82"
  return "border-white/10 bg-white/[0.05] text-white/65"
}

function priorityClasses(priority: TaskItem["priority"]) {
  if (priority === "high") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
  if (priority === "medium") return "border-amber-300/20 bg-amber-300/10 text-amber-100"
  return "border-white/10 bg-white/[0.05] text-white/65"
}

function executionLaneCopy(value?: VaultExecutionLane | string | null) {
  if (value === "borrower_side") return "Borrower Side"
  if (value === "lender_trustee") return "Lender / Trustee"
  if (value === "auction_only") return "Auction Only"
  if (value === "mixed") return "Mixed"
  return "Unclear"
}

function validationOutcomeCopy(value?: VaultValidationOutcome | null) {
  if (value === "validated_execution_path") return "Validated"
  if (value === "needs_more_info") return "Needs Info"
  if (value === "no_real_control_path") return "No Control Path"
  if (value === "low_leverage") return "Low Leverage"
  if (value === "dead_lead") return "Dead Lead"
  return "Open"
}

function saleStatusCopy(value?: string | null) {
  if (value === "pre_foreclosure") return "Pre-Foreclosure"
  if (value === "scheduled") return "Scheduled"
  if (value === "rescheduled") return "Rescheduled"
  if (value === "expired") return "Expired"
  return "Unknown"
}

function intakeDecisionCopy(value?: OperatorIntakeDecision) {
  if (value === "promote") return "Promote"
  if (value === "hold") return "Hold"
  if (value === "needs_more_info") return "Needs Info"
  return "Undecided"
}

function enrichmentStatusCopy(value?: OperatorEnrichmentStatus) {
  if (value === "requested") return "Queued"
  if (value === "processing") return "Running"
  if (value === "completed") return "Completed"
  if (value === "failed") return "Failed"
  return "Not Requested"
}

function statusCopy(value?: string) {
  if (value === "pursuit_reserved") return "Reserved"
  if (value === "pursuit_declined") return "Declined"
  if (value === "pursuit_released") return "Released"
  return "Requested"
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

function formatSectionLabel(section: TaskItem["section"]) {
  if (section === "intake") return "Intake"
  if (section === "approvals") return "Approvals"
  if (section === "routing") return "Routing"
  return "Vault"
}

function formatWorkspaceMode(mode?: string) {
  if (mode === "full") return "Full upstream"
  if (mode === "snapshot") return "Hosted snapshot"
  return "Site fallback"
}

function formatWorkflowStorageMode(mode?: string) {
  if (mode === "dedicated") return "Dedicated tables live"
  if (mode === "compatibility") return "Compatibility mode"
  return "Unavailable"
}

function workflowTableLabel(value: string) {
  if (value === "operator_intake_reviews") return "Intake reviews"
  if (value === "operator_task_history") return "Task history"
  if (value === "vault_pursuit_requests") return "Pursuit requests"
  if (value === "vault_partner_feedback") return "Partner feedback"
  return "Validation records"
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function bestContactLine(row: any) {
  return row.ownerPhonePrimary || row.ownerPhoneSecondary || row.trusteePhonePublic || row.noticePhone || "Unavailable"
}

function hasMeaningfulEnrichment(row: any) {
  return Boolean(
    row?.ownerName ||
      row?.ownerMail ||
      row?.mortgageLender ||
      typeof row?.mortgageAmount === "number" ||
      row?.propertyIdentifier ||
      bestContactLine(row) !== "Unavailable" ||
      (typeof row?.equity_band === "string" && row.equity_band.toUpperCase() !== "UNKNOWN")
  )
}

function preForeclosureLifecycleLabel(state: string) {
  if (state === "live") return "Live In Vault"
  if (state === "refreshing") return "Refreshing"
  if (state === "packeted") return "Packeted"
  if (state === "enriched") return "Enriched"
  return "Tracked Only"
}

function preForeclosureLifecycleClasses(state: string) {
  if (state === "live") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
  if (state === "refreshing") return "border-sky-400/25 bg-sky-400/10 text-sky-100"
  if (state === "packeted") return "border-white/18 bg-white text-black"
  if (state === "enriched") return "border-white/12 bg-white/10 text-white/82"
  return "border-white/10 bg-white/[0.05] text-white/65"
}

function toneClasses(tone: FeedItem["tone"]) {
  if (tone === "good") return "border-emerald-400/20 bg-emerald-400/10"
  if (tone === "warn") return "border-amber-300/20 bg-amber-300/10"
  return "border-white/10 bg-white/[0.035]"
}

function StatCard(props: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{props.value}</div>
      {props.sublabel ? <div className="mt-1 text-sm text-white/50">{props.sublabel}</div> : null}
    </div>
  )
}

function EmptyState(props: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/55">
      {props.title}
    </div>
  )
}

function TabButton(props: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        props.active
          ? "border-white/18 bg-white text-black"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
      }`}
    >
      {props.label}
      {typeof props.count === "number" ? ` (${props.count})` : ""}
    </button>
  )
}

export default function OperatorPage() {
  const [secret, setSecret] = useState("")
  const [approvedBy, setApprovedBy] = useState("Patrick Armour")
  const [actedBy, setActedBy] = useState("Patrick Armour")
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const [processingId, setProcessingId] = useState("")
  const [activeTab, setActiveTab] = useState<ActiveTab>("priority")
  const [selectedVaultSlug, setSelectedVaultSlug] = useState("")
  const [validationNotes, setValidationNotes] = useState<Record<string, string>>({})
  const [validationLanes, setValidationLanes] = useState<Record<string, VaultExecutionLane>>({})
  const [validationSignals, setValidationSignals] = useState<Record<string, string[]>>({})
  const [validationContactAttempted, setValidationContactAttempted] = useState<Record<string, boolean>>({})
  const [intakeNotes, setIntakeNotes] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<any[]>([])

  const intakeDecisionMap = useMemo(
    () => new Map((workspace?.intakeDecisions ?? []).map((row: any) => [row.leadKey, row] as const)),
    [workspace]
  )

  const enrichmentRequestMap = useMemo(
    () => new Map((workspace?.enrichmentRequests ?? []).map((row: any) => [row.leadKey, row] as const)),
    [workspace]
  )

  const liveListingBySlug = useMemo(
    () => new Map((workspace?.liveListings ?? []).map((row: any) => [row.slug, row] as const)),
    [workspace]
  )

  const liveVaultListings = useMemo(() => workspace?.liveListings ?? [], [workspace])

  const liveListingByLeadKey = useMemo(() => {
    return new Map(
      liveVaultListings
        .map((row: any) => [String(row.sourceLeadKey ?? "").trim(), row] as const)
        .filter((entry: readonly [string, any]) => entry[0])
    )
  }, [liveVaultListings])

  const recentPacketByLeadKey = useMemo(() => {
    return new Map((workspace?.report?.recentPackets ?? []).map((row: any) => [row.lead_key, row] as const))
  }, [workspace])

  const selectedVaultListing = useMemo(() => {
    if (!selectedVaultSlug) return liveVaultListings[0] ?? null
    return liveListingBySlug.get(selectedVaultSlug) ?? liveVaultListings[0] ?? null
  }, [liveListingBySlug, liveVaultListings, selectedVaultSlug])

  const readyPreForeclosures = useMemo(() => {
    if (!workspace) return []
    if (workspace.report.preForeclosurePromotion?.readyForReview?.length) {
      return (workspace.report.preForeclosurePromotion.readyForReview ?? []).filter(
        (row: any) => !liveListingByLeadKey.has(row.lead_key)
      )
    }
    return (workspace.report.vaultCandidates ?? []).filter(
      (row: any) => row.sale_status === "pre_foreclosure" && !row.vaultLive
    )
  }, [liveListingByLeadKey, workspace])

  const blockedPreForeclosures = useMemo(
    () =>
      (workspace?.report.preForeclosurePromotion?.blocked ?? []).filter(
        (row: any) => !liveListingByLeadKey.has(row.lead_key)
      ),
    [liveListingByLeadKey, workspace]
  )

  const livePreForeclosureListings = useMemo(
    () =>
      liveVaultListings.filter((listing: any) =>
        String(listing.distressType ?? "").toLowerCase().includes("pre-foreclosure")
      ),
    [liveVaultListings]
  )

  const trackedPreForeclosureRows = useMemo(() => {
    const rows = new Map<string, any>()
    for (const row of workspace?.report?.foreclosureIntake?.preForeclosure ?? []) {
      rows.set(row.lead_key, row)
    }
    for (const row of readyPreForeclosures) {
      rows.set(row.lead_key, { ...rows.get(row.lead_key), ...row })
    }
    for (const row of blockedPreForeclosures) {
      rows.set(row.lead_key, { ...rows.get(row.lead_key), ...row })
    }
    for (const listing of livePreForeclosureListings) {
      const leadKey = String(listing.sourceLeadKey ?? "").trim()
      if (!leadKey) continue
      rows.set(leadKey, {
        ...rows.get(leadKey),
        lead_key: leadKey,
        address: listing.title,
        county: listing.county,
        distress_type: listing.distressType,
        sale_status: listing.saleStatus,
        ownerName: listing.ownerName,
        ownerMail: listing.ownerMail,
        mortgageLender: listing.mortgageLender,
        mortgageAmount: listing.mortgageAmount,
        propertyIdentifier: listing.propertyIdentifier,
        ownerPhonePrimary: listing.ownerPhonePrimary,
        ownerPhoneSecondary: listing.ownerPhoneSecondary,
        noticePhone: listing.noticePhone,
        trusteePhonePublic: listing.trusteePhonePublic,
        equity_band: listing.equityBand,
        vaultSlug: listing.slug,
      })
    }
    return [...rows.values()]
  }, [blockedPreForeclosures, livePreForeclosureListings, readyPreForeclosures, workspace])

  const autoRunningPreForeclosures = useMemo(
    () =>
      readyPreForeclosures.filter((row: any) => {
        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
        const status = enrichment?.status
        return status === "requested" || status === "processing"
      }),
    [enrichmentRequestMap, readyPreForeclosures]
  )

  const stagedPreForeclosures = useMemo(
    () =>
      readyPreForeclosures.filter((row: any) => {
        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
        const status = enrichment?.status
        return status !== "requested" && status !== "processing"
      }),
    [enrichmentRequestMap, readyPreForeclosures]
  )

  const failedPreForeclosures = useMemo(
    () =>
      [...readyPreForeclosures, ...blockedPreForeclosures].filter((row: any) => {
        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
        const status = enrichment?.status
        return status === "failed"
      }),
    [blockedPreForeclosures, enrichmentRequestMap, readyPreForeclosures]
  )

  const livePreForeclosureCount = useMemo(
    () => livePreForeclosureListings.length,
    [livePreForeclosureListings]
  )

  const preForeclosureStatusSummary = useMemo(() => {
    let live = 0
    let refreshing = 0
    let packeted = 0
    let enriched = 0
    let tracked = 0

    for (const row of trackedPreForeclosureRows) {
      if (liveListingByLeadKey.has(row.lead_key)) {
        live += 1
        continue
      }

      const enrichment = enrichmentRequestMap.get(row.lead_key) as any
      if (enrichment?.status === "requested" || enrichment?.status === "processing") {
        refreshing += 1
        continue
      }

      if (recentPacketByLeadKey.has(row.lead_key)) {
        packeted += 1
        continue
      }

      if (hasMeaningfulEnrichment(row)) {
        enriched += 1
        continue
      }

      tracked += 1
    }

    return { live, refreshing, packeted, enriched, tracked }
  }, [enrichmentRequestMap, liveListingByLeadKey, recentPacketByLeadKey, trackedPreForeclosureRows])

  const snapshotDrift = useMemo(() => {
    const snapshotVaultLive = Number(workspace?.report?.overview?.vaultLive ?? 0)
    const snapshotVaultQueue = Number(workspace?.report?.overview?.vaultQueue ?? 0)
    return workspace?.report?.sourceMode === "snapshot" &&
      (snapshotVaultLive !== liveVaultListings.length || snapshotVaultQueue !== readyPreForeclosures.length)
  }, [liveVaultListings.length, readyPreForeclosures.length, workspace])

  function preForeclosureState(row: any) {
    if (liveListingByLeadKey.has(row.lead_key)) return "live"
    const enrichment = enrichmentRequestMap.get(row.lead_key) as any
    if (enrichment?.status === "requested" || enrichment?.status === "processing") return "refreshing"
    if (recentPacketByLeadKey.has(row.lead_key)) return "packeted"
    if (hasMeaningfulEnrichment(row)) return "enriched"
    return "tracked"
  }

  const openRoutingQueue = useMemo(
    () =>
      (workspace?.routingQueue ?? []).filter((row: any) =>
        (row.requests ?? []).some((request: any) => request.status === "pursuit_requested")
      ),
    [workspace]
  )

  const validationQueue = useMemo(
    () =>
      liveVaultListings.filter(
        (listing: any) =>
          (listing.topTierReady || listing.vaultPublishReady) &&
          listing.validationOutcome !== "validated_execution_path"
      ),
    [liveVaultListings]
  )

  function openVaultDesk(slug?: string | null) {
    if (slug) {
      setSelectedVaultSlug(slug)
    }
    setActiveTab("vault")
  }

  const tasks = useMemo(() => {
    if (!workspace) return [] as TaskItem[]

    const items: TaskItem[] = []
    const decisionMap = new Map((workspace.intakeDecisions ?? []).map((row: any) => [row.leadKey, row] as const))
    const intakeRows = [
      ...(blockedPreForeclosures ?? []),
      ...(workspace.report.preForeclosurePromotion?.readyForReview ?? []).filter((row: any) => {
        if (liveListingByLeadKey.has(row.lead_key)) return false
        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
        const status = enrichment?.status
        return status === "failed"
      }),
    ]

    for (const row of intakeRows) {
      if (decisionMap.has(row.lead_key)) continue
      items.push({
        id: `intake:${row.lead_key}`,
        title: row.address || row.lead_key,
        detail: `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${executionLaneCopy(row.suggestedExecutionLane)}`,
        section: "intake",
        priority: row.preForeclosureReviewReady ? "high" : "medium",
      })
    }

    for (const request of (workspace.accessRequests ?? []).filter((row: any) => row.status === "pending")) {
      items.push({
        id: `approval:${request.requestId}`,
        title: request.fullName || request.email,
        detail: `${request.company || "No company"} • ${request.accessType || "No access type"}`,
        section: "approvals",
        priority: "medium",
      })
    }

    for (const listing of openRoutingQueue) {
      const pending = (listing.requests ?? []).filter((row: any) => row.status === "pursuit_requested")
      items.push({
        id: `routing:${listing.listingSlug}`,
        title: listing.listingSlug,
        detail: `${pending.length} pending routing request${pending.length === 1 ? "" : "s"}`,
        section: "routing",
        priority: "high",
      })
    }

    for (const listing of validationQueue) {
      items.push({
        id: `validation:${listing.slug}`,
        title: listing.title || listing.slug,
        detail: `${listing.county || "Unknown county"} • ${validationOutcomeCopy(listing.validationOutcome)} • ${executionLaneCopy(listing.executionLane || listing.suggestedExecutionLane)}`,
        section: "vault",
        priority: listing.topTierReady ? "high" : "medium",
      })
    }

    return items.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
  }, [blockedPreForeclosures, enrichmentRequestMap, liveListingByLeadKey, openRoutingQueue, readyPreForeclosures, validationQueue, workspace])

  const activeTasks = useMemo(() => {
    const doneIds = new Set(history.map((item: any) => item.id))
    return tasks.filter((task) => !doneIds.has(task.id))
  }, [history, tasks])

  const updateFeed = useMemo(() => {
    if (!workspace) return [] as FeedItem[]
    const items: FeedItem[] = []

    for (const row of workspace.enrichmentRequests ?? []) {
      items.push({
        id: `enrichment:${row.leadKey}`,
        at: row.updatedAt || row.requestedAt,
        title: `${enrichmentStatusCopy(row.status)} enrichment`,
        detail: row.resultMessage || row.leadKey,
        tone: row.status === "completed" ? "good" : row.status === "failed" ? "warn" : "neutral",
      })
    }

    for (const row of workspace.validationRecords ?? []) {
      items.push({
        id: `validation:${row.requestId}`,
        at: row.submittedAt,
        title: `${validationOutcomeCopy(row.outcome)} • ${executionLaneCopy(row.executionLane)}`,
        detail: row.context?.sourceLeadKey || row.listingSlug,
        tone: row.outcome === "validated_execution_path" ? "good" : "neutral",
      })
    }

    for (const row of workspace.report.foreclosureIntake?.recentEvents ?? []) {
      items.push({
        id: `event:${row.event_key}`,
        at: row.event_at || "",
        title: `${saleStatusCopy(row.derived_status)} • ${executionRealityCopy(row.source)}`,
        detail: row.address || row.lead_key,
        tone: row.derived_status === "pre_foreclosure" ? "good" : "neutral",
      })
    }

    for (const row of history ?? []) {
      items.push({
        id: `task:${row.id}`,
        at: row.completedAt,
        title: `Task completed • ${formatSectionLabel(row.section)}`,
        detail: row.title,
        tone: "neutral",
      })
    }

    return items
      .filter((row) => row.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12)
  }, [history, workspace])

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretToUse }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to load operator workspace.")
        return
      }

      setWorkspace(data.workspace)
      setHistory(data.workspace.taskHistory ?? [])
      setSelectedVaultSlug((current) => {
        if (
          current &&
          (data.workspace.liveListings ?? []).some((listing: any) => listing.slug === current)
        ) {
          return current
        }

        return data.workspace.liveListings?.[0]?.slug ?? ""
      })

      const nextNotes: Record<string, string> = {}
      const nextLanes: Record<string, VaultExecutionLane> = {}
      const nextSignals: Record<string, string[]> = {}
      const nextContactAttempted: Record<string, boolean> = {}
      const nextIntakeNotes: Record<string, string> = {}

      for (const listing of data.workspace.liveListings ?? []) {
        nextNotes[listing.slug] = listing.validationNote ?? ""
        nextLanes[listing.slug] = listing.executionLane ?? listing.suggestedExecutionLane ?? "unclear"
      }

      for (const record of data.workspace.validationRecords ?? []) {
        nextNotes[record.listingSlug] = record.note ?? nextNotes[record.listingSlug] ?? ""
        nextLanes[record.listingSlug] = record.executionLane ?? nextLanes[record.listingSlug] ?? "unclear"
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
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(requestId)
    setError("")
    setResult("")
    try {
      const res = await fetch("/api/access/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, approvedBy, secret, action }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to process request.")
      setResult(action === "approve" ? `Approved ${data.email}` : `Rejected ${data.email}`)
      await loadWorkspace(secret)
    } catch {
      setError("Unable to process request.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleRoutingAction(requestId: string, action: "reserve" | "decline" | "release") {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(requestId)
    setError("")
    setResult("")
    try {
      const res = await fetch("/api/vault/pursuit/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, actedBy, requestId, action }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to update routing state.")
      setResult("Routing updated.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to update routing state.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleValidationAction(listingSlug: string, action: "clear" | VaultValidationOutcome) {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(`validation:${listingSlug}:${action}`)
    setError("")
    setResult("")

    try {
      const listing = liveListingBySlug.get(listingSlug) as any
      const context =
        action === "clear" || !listing
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
        headers: { "Content-Type": "application/json" },
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
          context,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to record operator validation.")
      setResult(action === "clear" ? "Validation cleared." : "Validation recorded.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to record operator validation.")
    } finally {
      setProcessingId("")
    }
  }

  async function completeTask(task: TaskItem) {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(`task:${task.id}:complete`)
    setError("")
    try {
      const res = await fetch("/api/operator/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to update task state.")
      setResult(`Task completed: ${task.title}`)
      await loadWorkspace(secret)
    } catch {
      setError("Unable to update task state.")
    } finally {
      setProcessingId("")
    }
  }

  async function restoreTask(taskId: string) {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(`task:${taskId}:restore`)
    setError("")
    try {
      const res = await fetch("/api/operator/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, action: "restore", taskId }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to restore task.")
      setResult("Task restored.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to restore task.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleIntakeDecision(leadKey: string, decision: "clear" | OperatorIntakeDecision, title: string, detail: string) {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(`intake:${leadKey}:${decision}`)
    setError("")
    setResult("")
    try {
      const res = await fetch("/api/operator/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to record intake review.")
      const publishedSlug =
        decision === "promote" && typeof data?.published?.slug === "string"
          ? data.published.slug
          : ""
      if (decision !== "clear") {
        await fetch("/api/operator/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret, action: "restore", taskId: `intake:${leadKey}` }),
        })
      }
      setResult(
        decision === "clear"
          ? "Intake review cleared."
          : decision === "promote" && publishedSlug
            ? `Promoted to vault: ${publishedSlug}`
            : `Intake marked: ${intakeDecisionCopy(decision)}`
      )
      await loadWorkspace(secret)
      if (publishedSlug) {
        openVaultDesk(publishedSlug)
      }
    } catch {
      setError("Unable to record intake review.")
    } finally {
      setProcessingId("")
    }
  }

  async function handleEnrichmentRequest(leadKey: string) {
    if (!secret.trim()) return setError("Approval secret is required.")
    setProcessingId(`intake:${leadKey}:refresh_enrichment`)
    setError("")
    setResult("")
    try {
      const res = await fetch("/api/operator/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          action: "refresh_enrichment",
          leadKey,
          note: intakeNotes[leadKey] ?? "",
          actedBy,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) return setError(data?.error || "Unable to queue enrichment refresh.")
      setResult("Enrichment refresh queued for the next bots cycle.")
      await loadWorkspace(secret)
    } catch {
      setError("Unable to queue enrichment refresh.")
    } finally {
      setProcessingId("")
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 md:px-10">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Operator Desk</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Shorter, faster daily control surface.
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/62 md:text-base">
                Start with the priority list, use the pre-foreclosure tab to review and push,
                then check the updates feed for what changed.
              </p>
              {workspace ? (
                <div className="mt-4 text-sm text-white/45">
                  {formatWorkspaceMode(workspace.report?.sourceMode)} • {workspace.report?.generatedAt}
                </div>
              ) : null}
            </div>

            <div className="grid w-full gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 xl:max-w-md">
              <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                placeholder="Approval secret"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={approvedBy}
                  onChange={(event) => setApprovedBy(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Approved by"
                />
                <input
                  value={actedBy}
                  onChange={(event) => setActedBy(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Acted by"
                />
              </div>
              <button
                onClick={() => loadWorkspace(secret)}
                disabled={loading}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load Workspace"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/78">
              {result}
            </div>
          ) : null}
        </div>

        {workspace ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Priority Tasks" value={activeTasks.length} sublabel={`${readyPreForeclosures.length} ready to push`} />
              <StatCard label="Pre-Foreclosure Tracked" value={trackedPreForeclosureRows.length} sublabel={`${livePreForeclosureCount} live in vault`} />
              <StatCard label="Vault Live" value={liveVaultListings.length} sublabel={`${validationQueue.length} validation items`} />
              <StatCard
                label="Admin Queue"
                value={(workspace.accessRequests ?? []).filter((row: any) => row.status === "pending").length + openRoutingQueue.length}
                sublabel={`${workspace.report?.workflowStorage?.readyCount ?? 0}/${workspace.report?.workflowStorage?.totalCount ?? 0} tables ready`}
              />
            </div>

            <div className="sticky top-4 z-30 mt-6 rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl">
              <div className="flex flex-wrap gap-2">
                <TabButton active={activeTab === "priority"} onClick={() => setActiveTab("priority")} label="Priority" count={activeTasks.length} />
                <TabButton active={activeTab === "pre_foreclosure"} onClick={() => setActiveTab("pre_foreclosure")} label="Pre-Foreclosure" count={readyPreForeclosures.length} />
                <TabButton active={activeTab === "vault"} onClick={() => openVaultDesk(selectedVaultListing?.slug)} label="Vault" count={liveVaultListings.length} />
                <TabButton active={activeTab === "updates"} onClick={() => setActiveTab("updates")} label="Updates" count={updateFeed.length} />
                <TabButton
                  active={activeTab === "admin"}
                  onClick={() => setActiveTab("admin")}
                  label="Admin"
                  count={(workspace.accessRequests ?? []).filter((row: any) => row.status === "pending").length}
                />
              </div>
            </div>

            {activeTab === "priority" ? (
              <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Priority Task List</div>
                      <div className="mt-2 text-2xl font-semibold text-white">What needs attention now</div>
                    </div>
                    <button
                      onClick={() => setActiveTab("pre_foreclosure")}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      Go to review
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {activeTasks.length ? (
                      activeTasks.slice(0, 8).map((task) => (
                        <div key={task.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{task.title}</div>
                              <div className="mt-1 text-sm text-white/58">{task.detail}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${priorityClasses(task.priority)}`}>{task.priority}</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/65">{formatSectionLabel(task.section)}</span>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              onClick={() => completeTask(task)}
                              disabled={processingId === `task:${task.id}:complete`}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === `task:${task.id}:complete` ? "Saving..." : "Done"}
                            </button>
                            <button
                              onClick={() => setActiveTab(task.section === "intake" ? "pre_foreclosure" : "admin")}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10"
                            >
                              {task.section === "intake" ? "Open review tab" : "Open admin"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No open priority tasks right now." />
                    )}
                  </div>
                </article>

                <div className="grid gap-6">
                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Today&apos;s Focus</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Simple daily run order</div>
                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/72">
                      <div className="font-semibold text-white">1. Let autopilot clear the easy wins</div>
                        <div className="mt-1">{autoRunningPreForeclosures.length} files are running or queued. {stagedPreForeclosures.length} are already system-cleared for vault path.</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/72">
                        <div className="font-semibold text-white">2. Review only the exceptions</div>
                        <div className="mt-1">{blockedPreForeclosures.length} pre-foreclosures still need a human call. {failedPreForeclosures.length} have failed automation and need attention first.</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/72">
                        <div className="font-semibold text-white">3. Handle partner-facing work</div>
                        <div className="mt-1">{livePreForeclosureCount} pre-foreclosures are live in vault. {(workspace.accessRequests ?? []).filter((row: any) => row.status === "pending").length} approvals and {openRoutingQueue.length} routing groups are waiting.</div>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-white/45">Validation Queue</div>
                        <div className="mt-2 text-xl font-semibold text-white">Live listings needing operator calls</div>
                      </div>
                      <button
                        onClick={() => setActiveTab("admin")}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        Open admin
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {validationQueue.length ? (
                        validationQueue.slice(0, 4).map((listing: any) => (
                          <div key={listing.slug} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{listing.title || listing.slug}</div>
                                <div className="mt-1 text-sm text-white/58">{listing.county || "Unknown county"} • {listing.distressType || "Unknown type"}</div>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${badgeClasses(listing.auctionReadiness)}`}>{listing.auctionReadiness || "Unknown"}</span>
                            </div>
                            <div className="mt-3 text-sm text-white/65">{executionLaneCopy(listing.suggestedExecutionLane)} • {executionRealityCopy(listing.executionPosture)} • {executionRealityCopy(listing.ownerAgency)}</div>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                onClick={() => openVaultDesk(listing.slug)}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10"
                              >
                                View In Desk
                              </button>
                              <button
                                onClick={() => setActiveTab("admin")}
                                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                              >
                                Validate
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No live validation items are waiting right now." />
                      )}
                    </div>
                  </article>
                </div>
              </section>
            ) : null}

            {activeTab === "pre_foreclosure" ? (
              <section className="mt-6 grid gap-6">
                {snapshotDrift ? (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50/90">
                    The operator snapshot is behind the live vault right now. This tab is reconciling against live vault data first, so some older queued counts were stale.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Live In Vault" value={preForeclosureStatusSummary.live} sublabel="Already partner-facing" />
                  <StatCard label="Ready To Push" value={stagedPreForeclosures.length} sublabel="Packeted and not live yet" />
                  <StatCard label="Refreshing" value={preForeclosureStatusSummary.refreshing} sublabel="Queued or processing now" />
                  <StatCard label="Needs Human" value={blockedPreForeclosures.length} sublabel="Still blocked or incomplete" />
                </div>

                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Current Lead State</div>
                      <div className="mt-2 text-2xl font-semibold text-white">What the lead labels mean</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">
                      {trackedPreForeclosureRows.length} tracked
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Tracked Only</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{preForeclosureStatusSummary.tracked}</div>
                      <div className="mt-1 text-sm text-white/58">Signal exists but still thin.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Enriched</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{preForeclosureStatusSummary.enriched}</div>
                      <div className="mt-1 text-sm text-white/58">Useful data landed, but not packeted in the current desk set.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Packeted</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{preForeclosureStatusSummary.packeted}</div>
                      <div className="mt-1 text-sm text-white/58">Packet exists and can still be pushed.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Refreshing</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{preForeclosureStatusSummary.refreshing}</div>
                      <div className="mt-1 text-sm text-white/58">Targeted data refresh is queued or running.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Live In Vault</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{preForeclosureStatusSummary.live}</div>
                      <div className="mt-1 text-sm text-white/58">Already published and viewable now.</div>
                    </div>
                  </div>
                </article>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Ready To Push</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Packeted, enriched, and not live yet</div>
                      <div className="mt-2 text-sm text-white/58">These are the non-live pre-foreclosure files that already have enough data and a fresh packet. Use this section for real push decisions.</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{stagedPreForeclosures.length} staged</span>
                  </div>

                  {autoRunningPreForeclosures.length ? (
                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">Automation Running</div>
                      <div className="mt-2 text-sm text-emerald-50/85">
                        {autoRunningPreForeclosures.length} pre-foreclosure file{autoRunningPreForeclosures.length === 1 ? "" : "s"} are still being enriched or finalized.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-4">
                    {stagedPreForeclosures.length ? (
                      stagedPreForeclosures.map((row: any) => {
                        const intake = intakeDecisionMap.get(row.lead_key) as any
                        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
                        const taskTitle = row.address || row.lead_key
                        const taskDetail = `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${row.distress_type || "Unknown type"}`
                        return (
                          <div key={row.lead_key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                                <div className="mt-1 text-sm text-white/58">{row.county || "Unknown county"} • {saleStatusCopy(row.sale_status)}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${preForeclosureLifecycleClasses(preForeclosureState(row))}`}>{preForeclosureLifecycleLabel(preForeclosureState(row))}</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">{executionLaneCopy(row.suggestedExecutionLane)} • {executionRealityCopy(row.ownerAgency)}</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">{enrichmentStatusCopy(enrichment?.status)}</span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Owner / Mail</div>
                                <div className="mt-2 text-sm text-white/78">{row.ownerName || "Unavailable"}</div>
                                <div className="mt-1 text-sm text-white/55">{row.ownerMail || "Unavailable"}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Debt Picture</div>
                                <div className="mt-2 text-sm text-white/78">{row.mortgageLender || "Unavailable"}</div>
                                <div className="mt-1 text-sm text-white/55">{formatMoney(row.mortgageAmount)}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Best Contact</div>
                                <div className="mt-2 text-sm text-white/78">{bestContactLine(row)}</div>
                                <div className="mt-1 text-sm text-white/55">{row.propertyIdentifier || "No APN"}</div>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-white/65">
                              <div>Control: <span className="text-white/82">{executionRealityCopy(row.controlParty)}</span></div>
                              <div>Window: <span className="text-white/82">{executionRealityCopy(row.interventionWindow)}</span></div>
                              <div>Influence: <span className="text-white/82">{executionRealityCopy(row.influenceability)}</span></div>
                              <div>Equity: <span className="text-white/82">{executionRealityCopy(row.equity_band)}</span></div>
                            </div>

                            {enrichment?.resultMessage ? (
                              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/68">{enrichment.resultMessage}</div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-3">
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
                              <button
                                onClick={() => handleEnrichmentRequest(row.lead_key)}
                                disabled={processingId === `intake:${row.lead_key}:refresh_enrichment` || enrichment?.status === "requested" || enrichment?.status === "processing"}
                                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === `intake:${row.lead_key}:refresh_enrichment` ? "Queueing..." : enrichment?.status === "processing" ? "Running" : enrichment?.status === "requested" ? "Queued" : "Refresh Data"}
                              </button>
                              {row.vaultSlug ? (
                                <button
                                  onClick={() => openVaultDesk(row.vaultSlug)}
                                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/10"
                                >
                                  View In Desk
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <EmptyState title="No pre-foreclosure files are currently auto-staged for vault path." />
                    )}
                  </div>
                </article>

                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Needs Human Review</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Blocked, incomplete, or unclear</div>
                      <div className="mt-2 text-sm text-white/58">This is the exception queue. These are tracked files that are not yet live and still need more data or a human call.</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{blockedPreForeclosures.length} blocked</span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {blockedPreForeclosures.length ? (
                      blockedPreForeclosures.slice(0, 8).map((row: any) => {
                        const intake = intakeDecisionMap.get(row.lead_key) as any
                        const enrichment = enrichmentRequestMap.get(row.lead_key) as any
                        const taskTitle = row.address || row.lead_key
                        const taskDetail = `${row.county || "Unknown county"} • ${saleStatusCopy(row.sale_status)} • ${row.distress_type || "Unknown type"}`
                        return (
                          <div key={`blocked-${row.lead_key}`} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                                <div className="mt-1 text-sm text-white/58">{row.county || "Unknown county"} • {executionRealityCopy(row.recommendedAction)}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${preForeclosureLifecycleClasses(preForeclosureState(row))}`}>{preForeclosureLifecycleLabel(preForeclosureState(row))}</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">{enrichmentStatusCopy(enrichment?.status)}</span>
                              </div>
                            </div>

                            {row.executionBlockers?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {row.executionBlockers.map((item: string) => (
                                  <span key={`${row.lead_key}-${item}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-white/65">
                              <div>Lender: <span className="text-white/82">{row.mortgageLender || "Unavailable"}</span></div>
                              <div>Loan: <span className="text-white/82">{formatMoney(row.mortgageAmount)}</span></div>
                              <div>Contact: <span className="text-white/82">{bestContactLine(row)}</span></div>
                              <div>Agency: <span className="text-white/82">{executionRealityCopy(row.ownerAgency)}</span></div>
                            </div>

                            <textarea
                              value={intakeNotes[row.lead_key] ?? ""}
                              onChange={(event) => setIntakeNotes((current) => ({ ...current, [row.lead_key]: event.target.value }))}
                              className="mt-4 min-h-[72px] w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                              placeholder="Why hold, enrich, or request more info."
                            />

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                onClick={() => handleEnrichmentRequest(row.lead_key)}
                                disabled={processingId === `intake:${row.lead_key}:refresh_enrichment` || enrichment?.status === "requested" || enrichment?.status === "processing"}
                                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === `intake:${row.lead_key}:refresh_enrichment` ? "Queueing..." : enrichment?.status === "processing" ? "Running" : enrichment?.status === "requested" ? "Queued" : "Refresh Data"}
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
                              {row.vaultSlug ? (
                                <button
                                  onClick={() => openVaultDesk(row.vaultSlug)}
                                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/10"
                                >
                                  View In Desk
                                </button>
                              ) : null}
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
                        )
                      })
                    ) : (
                      <EmptyState title="No blocked pre-foreclosure files are visible right now." />
                    )}
                  </div>
                </article>
                </div>

                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Live Pre-Foreclosure</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Already pushed to vault</div>
                      <div className="mt-2 text-sm text-white/58">These are live now. They should not still feel like queued or staged leads.</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{livePreForeclosureListings.length} live</span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {livePreForeclosureListings.length ? (
                      livePreForeclosureListings.map((listing: any) => (
                        <div key={listing.slug} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{listing.title || listing.slug}</div>
                              <div className="mt-1 text-sm text-white/58">{listing.county || "Unknown county"} • {listing.distressType || "Unknown type"}</div>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${preForeclosureLifecycleClasses("live")}`}>Live In Vault</span>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm text-white/65">
                            <div>Owner: <span className="text-white/82">{listing.ownerName || "Unavailable"}</span></div>
                            <div>Lender: <span className="text-white/82">{listing.mortgageLender || "Unavailable"}</span></div>
                            <div>Loan: <span className="text-white/82">{formatMoney(listing.mortgageAmount)}</span></div>
                            <div>Contact: <span className="text-white/82">{bestContactLine(listing)}</span></div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              onClick={() => openVaultDesk(listing.slug)}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                            >
                              View In Desk
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No live pre-foreclosure listings right now." />
                    )}
                  </div>
                </article>
              </section>
            ) : null}

            {activeTab === "vault" ? (
              <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Vault Desk</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Live listings and packets</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">
                      {liveVaultListings.length} live
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-white/58">
                    Stay in the operator desk to review live vault listings and open packets without leaving this workspace.
                  </div>

                  <div className="mt-5 grid gap-3">
                    {liveVaultListings.length ? (
                      liveVaultListings.map((listing: any) => {
                        const selected = selectedVaultListing?.slug === listing.slug
                        return (
                          <button
                            key={listing.slug}
                            onClick={() => setSelectedVaultSlug(listing.slug)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-white/20 bg-white/[0.08]"
                                : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{listing.title || listing.slug}</div>
                                <div className="mt-1 text-sm text-white/58">
                                  {listing.county || "Unknown county"} • {listing.distressType || "Unknown type"}
                                </div>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${badgeClasses(listing.auctionReadiness)}`}>
                                {listing.auctionReadiness || "Unknown"}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm text-white/62">
                              <div>
                                Sale: <span className="text-white/82">{listing.currentSaleDate || listing.auctionWindow || "Unavailable"}</span>
                              </div>
                              <div>
                                Lane: <span className="text-white/82">{executionLaneCopy(listing.executionLane || listing.suggestedExecutionLane)}</span>
                              </div>
                              <div>
                                Packet: <span className="text-white/82">{listing.packetLabel || "Vault packet"}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <EmptyState title="No live vault listings are available right now." />
                    )}
                  </div>
                </article>

                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  {selectedVaultListing ? (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Selected Listing</div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {selectedVaultListing.title || selectedVaultListing.slug}
                          </div>
                          <div className="mt-2 text-sm text-white/58">
                            {selectedVaultListing.county || "Unknown county"} • {selectedVaultListing.distressType || "Unknown type"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${badgeClasses(selectedVaultListing.auctionReadiness)}`}>
                            {selectedVaultListing.auctionReadiness || "Unknown"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">
                            {validationOutcomeCopy(selectedVaultListing.validationOutcome)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm text-white/65">
                        <div>Sale: <span className="text-white/82">{selectedVaultListing.currentSaleDate || selectedVaultListing.auctionWindow || "Unavailable"}</span></div>
                        <div>Lender: <span className="text-white/82">{selectedVaultListing.mortgageLender || "Unavailable"}</span></div>
                        <div>Loan: <span className="text-white/82">{formatMoney(selectedVaultListing.mortgageAmount)}</span></div>
                        <div>Contact: <span className="text-white/82">{bestContactLine(selectedVaultListing)}</span></div>
                        <div>Lane: <span className="text-white/82">{executionLaneCopy(selectedVaultListing.executionLane || selectedVaultListing.suggestedExecutionLane)}</span></div>
                        <div>Agency: <span className="text-white/82">{executionRealityCopy(selectedVaultListing.ownerAgency)}</span></div>
                        <div>Control: <span className="text-white/82">{executionRealityCopy(selectedVaultListing.controlParty)}</span></div>
                        <div>Workability: <span className="text-white/82">{executionRealityCopy(selectedVaultListing.workabilityBand)}</span></div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => setActiveTab("admin")}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                        >
                          Open Validation Queue
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedVaultListing.slug)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10"
                        >
                          Copy Slug
                        </button>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Packet Viewer</div>
                            <div className="mt-1 text-sm text-white/58">
                              Internal operator view for {selectedVaultListing.packetLabel || "vault packet"}
                            </div>
                          </div>
                        </div>
                        <iframe
                          key={selectedVaultListing.slug}
                          title={`Operator packet for ${selectedVaultListing.title || selectedVaultListing.slug}`}
                          src={`/api/operator/packet?slug=${selectedVaultListing.slug}`}
                          className="h-[920px] w-full bg-black"
                        />
                      </div>
                    </>
                  ) : (
                    <EmptyState title="Select a live vault listing to review it and open its packet here." />
                  )}
                </article>
              </section>
            ) : null}

            {activeTab === "updates" ? (
              <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/45">Update Feed</div>
                      <div className="mt-2 text-2xl font-semibold text-white">What happened recently</div>
                    </div>
                    <button
                      onClick={() => loadWorkspace(secret)}
                      disabled={loading}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {updateFeed.length ? (
                      updateFeed.map((item) => (
                        <div key={item.id} className={`rounded-2xl border p-4 ${toneClasses(item.tone)}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{item.title}</div>
                              <div className="mt-1 text-sm text-white/60">{item.detail}</div>
                            </div>
                            <div className="text-xs uppercase tracking-[0.18em] text-white/45">{formatDateTime(item.at)}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No recent updates yet." />
                    )}
                  </div>
                </article>

                <div className="grid gap-6">
                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Lifecycle Feed</div>
                    <div className="mt-2 text-xl font-semibold text-white">Recent upstream movement</div>
                    <div className="mt-5 grid gap-3">
                      {(workspace.report?.foreclosureIntake?.recentEvents ?? []).length ? (
                        (workspace.report.foreclosureIntake.recentEvents ?? []).slice(0, 8).map((row: any) => (
                          <div key={row.event_key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="text-base font-semibold text-white">{row.address || row.lead_key}</div>
                            <div className="mt-1 text-sm text-white/58">{executionRealityCopy(row.source)} • {saleStatusCopy(row.derived_status)} • {formatDateTime(row.event_at)}</div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No lifecycle events are visible right now." />
                      )}
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Completed Tasks</div>
                    <div className="mt-2 text-xl font-semibold text-white">Recent desk actions</div>
                    <div className="mt-5 grid gap-3">
                      {history.length ? (
                        history.slice(0, 8).map((task: any) => (
                          <div key={task.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{task.title}</div>
                                <div className="mt-1 text-sm text-white/58">{task.detail}</div>
                              </div>
                              <button
                                onClick={() => restoreTask(task.id)}
                                disabled={processingId === `task:${task.id}:restore`}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/78 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === `task:${task.id}:restore` ? "Saving..." : "Restore"}
                              </button>
                            </div>
                            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/42">{formatSectionLabel(task.section)} • {formatDateTime(task.completedAt)}</div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No completed tasks recorded yet." />
                      )}
                    </div>
                  </article>
                </div>
              </section>
            ) : null}

            {activeTab === "admin" ? (
              <section className="mt-6 grid gap-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-white/45">Approvals</div>
                        <div className="mt-2 text-2xl font-semibold text-white">Partner access</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{(workspace.accessRequests ?? []).filter((row: any) => row.status === "pending").length} pending</span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {(workspace.accessRequests ?? []).filter((row: any) => row.status === "pending").length ? (
                        (workspace.accessRequests ?? [])
                          .filter((row: any) => row.status === "pending")
                          .map((request: any) => (
                            <div key={request.requestId} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <div className="text-base font-semibold text-white">{request.fullName || request.email}</div>
                              <div className="mt-1 text-sm text-white/58">{request.company || "No company"} • {request.accessType || "No access type"}</div>
                              <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/42">{request.email} • {formatDateTime(request.submittedAt)}</div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  onClick={() => handleApprovalAction(request.requestId, "approve")}
                                  disabled={processingId === request.requestId}
                                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === request.requestId ? "Saving..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleApprovalAction(request.requestId, "reject")}
                                  disabled={processingId === request.requestId}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === request.requestId ? "Saving..." : "Reject"}
                                </button>
                              </div>
                            </div>
                          ))
                      ) : (
                        <EmptyState title="No pending access approvals right now." />
                      )}
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-white/45">Routing</div>
                        <div className="mt-2 text-2xl font-semibold text-white">Pursuit requests</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{openRoutingQueue.length} open</span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {openRoutingQueue.length ? (
                        openRoutingQueue.map((group: any) => (
                          <div key={group.listingSlug} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="text-base font-semibold text-white">{group.listingSlug}</div>
                            <div className="mt-4 grid gap-3">
                              {(group.requests ?? []).map((request: any) => (
                                <div key={request.requestId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <div className="text-sm font-semibold text-white">{request.fullName || request.email}</div>
                                  <div className="mt-1 text-sm text-white/58">{statusCopy(request.status)} • {formatDateTime(request.submittedAt)}</div>
                                  {request.message ? <div className="mt-2 text-sm text-white/65">{request.message}</div> : null}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={() => handleRoutingAction(request.requestId, "reserve")} disabled={processingId === request.requestId} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">Reserve</button>
                                    <button onClick={() => handleRoutingAction(request.requestId, "decline")} disabled={processingId === request.requestId} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Decline</button>
                                    <button onClick={() => handleRoutingAction(request.requestId, "release")} disabled={processingId === request.requestId} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Release</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No open routing requests right now." />
                      )}
                    </div>
                  </article>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-white/45">Validation Queue</div>
                        <div className="mt-2 text-2xl font-semibold text-white">Live listings needing operator judgment</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">{validationQueue.length} open</span>
                    </div>

                    <div className="mt-5 grid gap-4">
                      {validationQueue.length ? (
                        validationQueue.map((listing: any) => (
                          <div key={listing.slug} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-white">{listing.title || listing.slug}</div>
                                <div className="mt-1 text-sm text-white/58">{listing.county || "Unknown county"} • {listing.distressType || "Unknown type"}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${badgeClasses(listing.auctionReadiness)}`}>{listing.auctionReadiness || "Unknown"}</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">{validationOutcomeCopy(listing.validationOutcome)}</span>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-white/65">
                              <div>Lane: <span className="text-white/82">{executionLaneCopy(listing.suggestedExecutionLane)}</span></div>
                              <div>Agency: <span className="text-white/82">{executionRealityCopy(listing.ownerAgency)}</span></div>
                              <div>Control: <span className="text-white/82">{executionRealityCopy(listing.controlParty)}</span></div>
                              <div>Workability: <span className="text-white/82">{executionRealityCopy(listing.workabilityBand)}</span></div>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
                              <select
                                value={validationLanes[listing.slug] ?? "unclear"}
                                onChange={(event) => setValidationLanes((current) => ({ ...current, [listing.slug]: event.target.value as VaultExecutionLane }))}
                                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
                              >
                                <option value="unclear">Lane: Unclear</option>
                                <option value="borrower_side">Borrower Side</option>
                                <option value="lender_trustee">Lender / Trustee</option>
                                <option value="auction_only">Auction Only</option>
                                <option value="mixed">Mixed</option>
                              </select>

                              <textarea
                                value={validationNotes[listing.slug] ?? ""}
                                onChange={(event) => setValidationNotes((current) => ({ ...current, [listing.slug]: event.target.value }))}
                                className="min-h-[84px] rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                                placeholder="Operator note."
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button onClick={() => handleValidationAction(listing.slug, "validated_execution_path")} disabled={processingId === `validation:${listing.slug}:validated_execution_path`} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">{processingId === `validation:${listing.slug}:validated_execution_path` ? "Saving..." : "Validated"}</button>
                              <button onClick={() => handleValidationAction(listing.slug, "needs_more_info")} disabled={processingId === `validation:${listing.slug}:needs_more_info`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{processingId === `validation:${listing.slug}:needs_more_info` ? "Saving..." : "Needs Info"}</button>
                              <button onClick={() => handleValidationAction(listing.slug, "no_real_control_path")} disabled={processingId === `validation:${listing.slug}:no_real_control_path`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{processingId === `validation:${listing.slug}:no_real_control_path` ? "Saving..." : "No Control"}</button>
                              <button onClick={() => handleValidationAction(listing.slug, "low_leverage")} disabled={processingId === `validation:${listing.slug}:low_leverage`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{processingId === `validation:${listing.slug}:low_leverage` ? "Saving..." : "Low Leverage"}</button>
                              <button onClick={() => handleValidationAction(listing.slug, "dead_lead")} disabled={processingId === `validation:${listing.slug}:dead_lead`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{processingId === `validation:${listing.slug}:dead_lead` ? "Saving..." : "Dead Lead"}</button>
                              <button
                                onClick={() => openVaultDesk(listing.slug)}
                                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/10"
                              >
                                View In Desk
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No live validation queue right now." />
                      )}
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">System Status</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Workflow health</div>
                    <div className="mt-2 text-sm text-white/58">{workspace.report?.sourceNote}</div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-sm font-semibold text-white">{formatWorkflowStorageMode(workspace.report?.workflowStorage?.mode)}</div>
                      <div className="mt-1 text-sm text-white/58">{workspace.report?.workflowStorage?.readyCount ?? 0} of {workspace.report?.workflowStorage?.totalCount ?? 0} workflow tables ready</div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {(workspace.report?.workflowStorage?.tables ?? []).map((table: any) => (
                        <div key={table.name} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                          <div className="text-sm font-semibold text-white">{workflowTableLabel(table.name)}</div>
                          <div className="mt-1 text-sm text-white/58">{table.ready ? "Ready" : "Fallback"}</div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
