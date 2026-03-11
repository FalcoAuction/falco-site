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
  run_id?: string
  bytes?: number
  vaultLive: boolean
  vaultSlug: string | null
  vaultPublishReady?: boolean
  topTierReady?: boolean
  packetCompletenessPct?: number | null
  executionBlockers?: string[]
}

type OperatorReport = {
  generatedAt: string
  dbPath: string
  sourceMode: "full" | "snapshot" | "site_fallback"
  sourceNote: string
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
  executionPosture?: string
  workabilityBand?: string
  suggestedExecutionLane?: VaultExecutionLane
  suggestedLaneConfidence?: string
  suggestedLaneReasons?: string[]
  topTierReady?: boolean
  vaultPublishReady?: boolean
  routingState?: "open" | "in_discussion" | "reserved" | "closed"
  validationOutcome?: VaultValidationOutcome
  executionLane?: VaultExecutionLane
  validationNote?: string
  validatedAt?: string
  validatedBy?: string
}

type OutreachCandidate = {
  track: "auction_partner" | "principal_broker"
  rank: number
  score: number
  organization: string
  contact_name: string
  email: string
  website: string
  domain: string
  city: string
  state: string
  reason: string
  snippet: string
  personalized_line: string
  subject: string
  body: string
  query?: string
}

type OutreachTrackReport = {
  track: "auction_partner" | "principal_broker"
  generatedAt: string | null
  fileName: string | null
  candidates: OutreachCandidate[]
}

type OutreachReport = {
  generatedAt: string
  sourceMode: "full" | "fallback"
  sourceNote: string
  sourceDir: string
  tracks: OutreachTrackReport[]
}

type OperatorWorkspace = {
  report: OperatorReport
  accessRequests: AccessRequestRecord[]
  routingQueue: VaultRoutingListing[]
  outreach: OutreachReport
  liveListings: LiveVaultListing[]
  taskHistory: TaskHistoryItem[]
}

type TaskItem = {
  id: string
  title: string
  detail: string
  section: "approvals" | "routing" | "vault" | "outreach"
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

function formatTrackLabel(track: OutreachTrackReport["track"]) {
  return track === "auction_partner" ? "Auction Partners" : "Principal Brokers"
}

function statusCopy(status: VaultPursuitRecord["status"]) {
  if (status === "pursuit_reserved") return "Reserved"
  if (status === "pursuit_declined") return "Declined"
  if (status === "pursuit_released") return "Released"
  return "Requested"
}

function formatSectionLabel(section: TaskItem["section"]) {
  if (section === "approvals") return "Approvals"
  if (section === "routing") return "Routing"
  if (section === "vault") return "Vault"
  return "Outreach"
}

function formatWorkspaceMode(mode: OperatorReport["sourceMode"]) {
  if (mode === "full") return "Full upstream + vault"
  if (mode === "snapshot") return "Hosted snapshot"
  return "Site fallback"
}

function validationOutcomeCopy(value?: VaultValidationOutcome) {
  if (value === "validated_execution_path") return "Validated Path"
  if (value === "needs_more_info") return "Needs More Info"
  if (value === "no_real_control_path") return "No Control Path"
  if (value === "low_leverage") return "Low Leverage"
  if (value === "dead_lead") return "Dead Lead"
  return "Validation Required"
}

function executionLaneCopy(value?: VaultExecutionLane) {
  if (value === "borrower_side") return "Borrower Side"
  if (value === "lender_trustee") return "Lender / Trustee"
  if (value === "auction_only") return "Auction Only"
  if (value === "mixed") return "Mixed"
  return "Unclear"
}

function laneConfidenceCopy(value?: string) {
  if (!value) return "Low"
  const normalized = value.toUpperCase()
  if (normalized === "HIGH") return "High"
  if (normalized === "MEDIUM") return "Medium"
  return "Low"
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
  const [history, setHistory] = useState<TaskHistoryItem[]>([])

  const tasks = useMemo(() => {
    if (!workspace) return []

    const items: TaskItem[] = []

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

    for (const track of workspace.outreach.tracks) {
      if (!track.candidates.length) continue
      items.push({
        id: `outreach:${track.track}`,
        title: `Review ${formatTrackLabel(track.track)} outreach drafts`,
        detail: `${track.candidates.length} draft${track.candidates.length === 1 ? "" : "s"} ready for review`,
        section: "outreach",
        priority: "medium",
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
      ["Tracked Leads", workspace.report.overview.totalLeads],
      ["Priority Review", workspace.liveListings.filter((listing) => listing.topTierReady).length],
      [
        "Validated Paths",
        workspace.liveListings.filter(
          (listing) => listing.validationOutcome === "validated_execution_path"
        ).length,
      ],
      ["Vault Live", workspace.report.overview.vaultLive],
      [
        "Pending Approvals",
        workspace.accessRequests.filter((row) => row.status === "pending").length,
      ],
      [
        "Routing Requests",
        workspace.routingQueue.reduce(
          (sum, listing) =>
            sum + listing.requests.filter((row) => row.status === "pursuit_requested").length,
          0
        ),
      ],
      [
        "Outreach Drafts",
        workspace.outreach.tracks.reduce((sum, track) => sum + track.candidates.length, 0),
      ],
    ]
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
      for (const listing of data.workspace.liveListings ?? []) {
        nextNotes[listing.slug] = listing.validationNote ?? ""
        nextLanes[listing.slug] =
          listing.executionLane ?? listing.suggestedExecutionLane ?? "unclear"
      }
      setValidationNotes(nextNotes)
      setValidationLanes(nextLanes)
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
    action: "clear" | VaultValidationOutcome
  ) {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    setProcessingId(`validation:${listingSlug}:${action}`)
    setError("")
    setResult("")

    try {
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
                access approvals, staged opportunity review, operator validation, routing, and outreach drafts.
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
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white/68">
              {workspace.report.sourceNote}
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
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

            <div className="mt-8 grid gap-8">
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

                              <div className="mt-5 grid gap-4 md:grid-cols-4">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Contact Path</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.contactPathQuality || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Likely Control</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.controlParty || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Execution Posture</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.executionPosture || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Workability</div>
                                  <div className="mt-2 text-sm text-white/82">{listing.workabilityBand || "—"}</div>
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/68">
                                <div>Validation status: <span className="text-white/82">{validationOutcomeCopy(listing.validationOutcome)}</span></div>
                                <div className="mt-2">
                                  Agent suggested lane:{" "}
                                  <span className="text-white/82">
                                    {executionLaneCopy(listing.suggestedExecutionLane)}
                                  </span>
                                  {listing.suggestedLaneConfidence ? (
                                    <span className="text-white/45">
                                      {" "}• {laneConfidenceCopy(listing.suggestedLaneConfidence)} confidence
                                    </span>
                                  ) : null}
                                </div>
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
                                  {processingId === `${processingKeyPrefix}low_leverage` ? "Processing..." : "Low Leverage"}
                                </button>
                                <button
                                  onClick={() => handleValidationAction(listing.slug, "dead_lead")}
                                  disabled={processingId === `${processingKeyPrefix}dead_lead`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processingId === `${processingKeyPrefix}dead_lead` ? "Processing..." : "Dead Lead"}
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

              <section
                id="outreach"
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Outreach</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Draft Queues
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                    {workspace.outreach.tracks.reduce((sum, track) => sum + track.candidates.length, 0)} drafts
                  </div>
                </div>

                <div className="mt-6 grid gap-6">
                  {workspace.outreach.tracks.map((track) => (
                    <article key={track.track} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">{formatTrackLabel(track.track)}</div>
                          <div className="mt-2 text-sm text-white/55">
                            {track.candidates.length} candidates • {track.fileName || "No file"}
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                          {track.generatedAt || "snapshot"}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4">
                        {track.candidates.slice(0, 4).map((candidate) => (
                          <div key={`${track.track}-${candidate.rank}-${candidate.email}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="text-base font-semibold text-white">{candidate.organization}</div>
                                <div className="mt-1 text-sm text-white/55">
                                  {candidate.email || "No email"} • {candidate.city || "Unknown city"}{candidate.state ? `, ${candidate.state}` : ""}
                                </div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-black">
                                Rank {candidate.rank}
                              </div>
                            </div>

                            <div className="mt-4 text-sm leading-7 text-white/68">
                              {candidate.reason || candidate.snippet || "No reason captured."}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              {candidate.website ? (
                                <a
                                  href={candidate.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                                >
                                  Open Site
                                </a>
                              ) : null}
                              {candidate.email ? (
                                <a
                                  href={`mailto:${candidate.email}?subject=${encodeURIComponent(candidate.subject || "")}&body=${encodeURIComponent(candidate.body || "")}`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                                >
                                  Open Draft
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}

                        {!track.candidates.length ? (
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                            No drafts in this queue yet.
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}
