"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LEAD_STATUSES,
  type Lead,
  type LeadKind,
  type LeadsBundle,
  type LeadStatus,
} from "@/lib/admin-leads"

const TABS: Array<{ key: LeadKind; label: string; emoji: string }> = [
  { key: "pipeline", label: "Pipeline", emoji: "🛰" },
  { key: "homeowner", label: "Inbound", emoji: "🏠" },
  { key: "buyer", label: "Buyers", emoji: "🆕" },
  { key: "partner", label: "Partners", emoji: "🤝" },
  { key: "inquiry", label: "Inquiries", emoji: "📨" },
]

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  listed: "Listed",
  closed: "Closed",
  lost: "Lost",
}

/** Tailwind classes per status — used for the chip badge + dropdown styling. */
const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-white/[0.07] text-white/70 border-white/15",
  contacted: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  qualified: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
  listed: "bg-emerald-500/25 text-emerald-100 border-emerald-400/50",
  closed: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
  lost: "bg-white/[0.04] text-white/35 border-white/10",
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const diff = Date.now() - t
  const min = Math.round(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** "in 3h" / "in 2d" / "2d overdue" / "today" — for next_action_at chip. */
function fmtNextAction(iso: string | null): { text: string; overdue: boolean; today: boolean } | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const diff = t - Date.now()
  const absMin = Math.abs(Math.round(diff / 60_000))
  const isOverdue = diff < 0
  const today = !isOverdue && diff < 24 * 60 * 60 * 1000
  if (absMin < 60) {
    return { text: isOverdue ? `${absMin}m overdue` : `in ${absMin}m`, overdue: isOverdue, today }
  }
  const absHr = Math.round(absMin / 60)
  if (absHr < 24) {
    return { text: isOverdue ? `${absHr}h overdue` : `in ${absHr}h`, overdue: isOverdue, today }
  }
  const absD = Math.round(absHr / 24)
  return { text: isOverdue ? `${absD}d overdue` : `in ${absD}d`, overdue: isOverdue, today }
}

/** Convert an ISO datetime string → "YYYY-MM-DDTHH:MM" for <input type="datetime-local"> */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function replySubject(lead: Lead): string {
  switch (lead.kind) {
    case "pipeline":
    case "homeowner":
      return `Re: your FALCO request${lead.summary ? ` — ${lead.summary.split(" · ")[0]}` : ""}`
    case "buyer":
      return "Re: your FALCO buyer registration"
    case "partner":
      return "Re: your FALCO partnership inquiry"
    case "inquiry":
      return "Re: your FALCO inquiry"
  }
}

export default function AdminContent({ bundle }: { bundle: LeadsBundle }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LeadKind>("pipeline")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all" | "open" | "overdue">(
    "open"
  )
  const [openId, setOpenId] = useState<string | null>(null)

  const leadsByTab: Record<LeadKind, Lead[]> = {
    pipeline: bundle.pipeline,
    homeowner: bundle.homeowners,
    buyer: bundle.buyers,
    partner: bundle.partners,
    inquiry: bundle.inquiries,
  }

  // Aggregate "needs attention" — overdue or next-action today across all tabs.
  const needsAttention = useMemo(() => {
    const all = [
      ...bundle.pipeline,
      ...bundle.homeowners,
      ...bundle.buyers,
      ...bundle.partners,
      ...bundle.inquiries,
    ]
    return all.filter((l) => {
      if (l.status === "closed" || l.status === "lost") return false
      const na = fmtNextAction(l.nextActionAt)
      return na?.overdue || na?.today
    }).length
  }, [bundle])

  const filtered = useMemo(() => {
    const all = leadsByTab[activeTab]
    return all.filter((l) => {
      // Status filter
      if (statusFilter === "open") {
        if (l.status === "closed" || l.status === "lost") return false
      } else if (statusFilter === "overdue") {
        const na = fmtNextAction(l.nextActionAt)
        if (!na?.overdue) return false
      } else if (statusFilter !== "all" && l.status !== statusFilter) {
        return false
      }
      // Search
      if (query.trim()) {
        const q = query.toLowerCase()
        const haystack = [
          l.name,
          l.email,
          l.summary,
          l.notes,
          ...l.details.map((d) => d.value),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [activeTab, query, statusFilter, leadsByTab])

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.04),transparent_45%)]" />

      <header className="border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[12px] font-semibold tracking-[0.28em] text-white">FALCO</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              Admin · Lead Inbox
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <a
              href="/admin/today"
              className="text-emerald-300 hover:text-emerald-200 transition-colors font-semibold"
              title="Daily focus page — what to do right now"
            >
              ★ Today
            </a>
            <a
              href="/admin/staging"
              className="text-amber-300 hover:text-amber-200 transition-colors"
              title="Review new scraper output before it hits Chris's queue"
            >
              ⌛ Staging
            </a>
            {needsAttention > 0 && (
              <button
                onClick={() => {
                  setStatusFilter("overdue")
                  setOpenId(null)
                }}
                className="text-amber-300 hover:text-amber-200 transition-colors font-medium"
                title="Filter by overdue / due today"
              >
                ⚠ {needsAttention} need attention
              </button>
            )}
            <button
              onClick={() => router.refresh()}
              className="text-white/55 hover:text-white transition-colors"
              title="Pull the latest"
            >
              ↻ Refresh
            </button>
            <button onClick={logout} className="text-white/55 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-6">
        {/* Stats banner */}
        {bundle.unavailable ? (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
            Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Stat label="Total leads" value={bundle.totals.total} accent />
            <Stat label="Pipeline" value={bundle.totals.pipeline} sub={bundle.last24h.pipeline} accent />
            <Stat label="Inbound" value={bundle.totals.homeowners} sub={bundle.last24h.homeowners} />
            <Stat label="Buyers" value={bundle.totals.buyers} sub={bundle.last24h.buyers} />
            <Stat
              label="Partners + Inq."
              value={bundle.totals.partners + bundle.totals.inquiries}
              sub={bundle.last24h.partners + bundle.last24h.inquiries}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
            {TABS.map((t) => {
              const count = leadsByTab[t.key].length
              const isActive = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key)
                    setOpenId(null)
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium tracking-wide transition-colors ${
                    isActive
                      ? "bg-emerald-400 text-black"
                      : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="mr-1.5">{t.emoji}</span>
                  {t.label}
                  <span
                    className={`ml-2 text-[11px] tabular-nums ${
                      isActive ? "text-black/65" : "text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, notes, details…"
            className="md:w-72 rounded-md bg-black/40 border border-white/12 px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-emerald-400/60"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <FilterChip
            active={statusFilter === "open"}
            onClick={() => setStatusFilter("open")}
            label="Open"
          />
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label="All"
          />
          {LEAD_STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_LABELS[s]}
              dotClass={STATUS_STYLES[s]}
            />
          ))}
          <FilterChip
            active={statusFilter === "overdue"}
            onClick={() => setStatusFilter("overdue")}
            label="⚠ Overdue"
            tone="amber"
          />
        </div>

        {/* Lead list */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-14 text-center text-[13px] text-white/40">
              No {activeTab === "homeowner" ? "homeowner requests" : `${activeTab}s`} match
              {query.trim() ? " that search" : " this filter"}.
            </div>
          ) : (
            filtered.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isFirst={i === 0}
                isOpen={openId === lead.id}
                onToggle={() => setOpenId(openId === lead.id ? null : lead.id)}
                onUpdated={() => router.refresh()}
              />
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-[11px] text-white/30 leading-relaxed">
          Sessions expire after 12 hours. Status, notes, and next-action are saved
          immediately. ↻ Refresh to pull the latest from any device.
        </div>
      </section>
    </main>
  )
}

// ============================================================================
// LeadRow — collapsed row + expanded workflow controls
// ============================================================================

function LeadRow({
  lead,
  isFirst,
  isOpen,
  onToggle,
  onUpdated,
}: {
  lead: Lead
  isFirst: boolean
  isOpen: boolean
  onToggle: () => void
  onUpdated: () => void
}) {
  // Local optimistic state so the UI updates instantly on save.
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.notes)
  const [nextAction, setNextAction] = useState<string>(isoToLocalInput(lead.nextActionAt))
  const [pending, start] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const naBadge = fmtNextAction(lead.nextActionAt)

  function patch(payload: Record<string, string | null>) {
    start(async () => {
      const res = await fetch(`/api/admin/leads/${lead.kind}/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSavedAt(Date.now())
        // Soft refresh in the background so other rows + counts update too.
        onUpdated()
      } else {
        const err = await res.json().catch(() => null)
        console.error("update failed:", err)
      }
    })
  }

  return (
    <div className={`border-t border-white/[0.06] ${isFirst ? "border-t-0" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={lead.status} />
              <div className="font-medium text-white truncate">
                {lead.name || "(no name)"}
              </div>
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] text-emerald-300/85 hover:text-emerald-200 hover:underline underline-offset-4 truncate"
              >
                {lead.email}
              </a>
              {naBadge && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide ${
                    naBadge.overdue
                      ? "border-red-400/40 bg-red-400/10 text-red-200"
                      : naBadge.today
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                      : "border-white/15 bg-white/[0.04] text-white/55"
                  }`}
                >
                  {naBadge.text}
                </span>
              )}
            </div>
            <div className="mt-1 text-[12px] text-white/55 truncate">{lead.summary}</div>
            {lead.notes && !isOpen && (
              <div className="mt-1 text-[11px] text-white/35 italic truncate">
                📝 {lead.notes}
              </div>
            )}
          </div>
          <div className="text-[11px] text-white/40 tabular-nums whitespace-nowrap">
            {fmtRelative(lead.submittedAt)}
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 -mt-1 space-y-4">
          {/* Workflow controls */}
          <div className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
            <div className="grid md:grid-cols-[160px_1fr_180px] gap-3 items-start">
              {/* Status dropdown */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-white/45 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as LeadStatus
                    setStatus(next)
                    patch({ status: next })
                  }}
                  className={`w-full rounded-md border bg-black/40 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-400/60 ${STATUS_STYLES[status]}`}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-[#0a0a0a] text-white">
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes textarea */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-white/45 mb-1.5">
                  Internal notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== lead.notes) patch({ notes })
                  }}
                  rows={2}
                  placeholder="What happened on the call, who's the decision-maker, what's the next step…"
                  className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-emerald-400/60 resize-y leading-[1.55]"
                />
              </div>

              {/* Next action date picker */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-white/45 mb-1.5">
                  Next action
                </label>
                <input
                  type="datetime-local"
                  value={nextAction}
                  onChange={(e) => {
                    setNextAction(e.target.value)
                    const iso = e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null
                    patch({ next_action_at: iso })
                  }}
                  className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-400/60 [color-scheme:dark]"
                />
                {nextAction && (
                  <button
                    onClick={() => {
                      setNextAction("")
                      patch({ next_action_at: null })
                    }}
                    className="mt-1.5 text-[10px] text-white/40 hover:text-white/65 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/35">
              <div>
                {pending ? (
                  <span>Saving…</span>
                ) : savedAt ? (
                  <span className="text-emerald-300/70">✓ Saved</span>
                ) : null}
              </div>
              {lead.lastContactedAt && (
                <div>Last contacted {fmtRelative(lead.lastContactedAt)}</div>
              )}
            </div>
          </div>

          {/* Submitted details */}
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02]">
            <table className="w-full text-[13px]">
              <tbody>
                {lead.details.map((d) => (
                  <tr
                    key={d.label}
                    className="border-t border-white/[0.04] first:border-t-0"
                  >
                    <td className="px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/45 align-top w-[140px]">
                      {d.label}
                    </td>
                    <td className="px-4 py-2 text-white/85 whitespace-pre-wrap">
                      {d.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <a
              href={`mailto:${lead.email}?subject=${encodeURIComponent(replySubject(lead))}`}
              className="rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold px-3 py-1.5 transition-colors"
              onClick={() => {
                // Mark contacted on opening reply
                if (lead.status === "new") {
                  setStatus("contacted")
                  patch({ status: "contacted" })
                }
              }}
            >
              Reply
            </a>
            <a
              href={`mailto:${lead.email}`}
              className="rounded-md border border-white/15 hover:border-white/30 px-3 py-1.5 text-white/70 hover:text-white transition-colors"
            >
              New email
            </a>
            {lead.kind === "homeowner" && (
              <Link
                href={`/admin/math-sheet/${lead.id}`}
                className="rounded-md border border-emerald-400/40 hover:border-emerald-400/70 bg-emerald-400/[0.06] hover:bg-emerald-400/[0.12] px-3 py-1.5 text-emerald-200 hover:text-emerald-100 font-medium transition-colors"
                title="Generate the 3-path math sheet for this homeowner"
              >
                Math sheet →
              </Link>
            )}
            <span className="text-[11px] text-white/35 ml-auto">
              ID: {lead.id.slice(0, 8)} · {new Date(lead.submittedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Small primitives
// ============================================================================

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  dotClass,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  dotClass?: string
  tone?: "amber"
}) {
  const baseTone =
    tone === "amber"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-white/15 bg-white/[0.04] text-white/55"
  const activeTone =
    tone === "amber"
      ? "border-amber-400/60 bg-amber-400/20 text-amber-100"
      : "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors ${
        active ? activeTone : `${baseTone} hover:text-white hover:border-white/25`
      }`}
    >
      {dotClass && (
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass.split(" ")[0].replace("bg-", "bg-")}`}
        />
      )}
      {label}
    </button>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub?: number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        accent
          ? "border-emerald-400/25 bg-emerald-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div
          className={`text-[22px] font-semibold tabular-nums ${
            accent ? "text-emerald-300" : "text-white"
          }`}
        >
          {value}
        </div>
        {sub !== undefined && sub > 0 && (
          <div className="text-[11px] text-emerald-300/85 tabular-nums">+{sub} 24h</div>
        )}
      </div>
    </div>
  )
}
