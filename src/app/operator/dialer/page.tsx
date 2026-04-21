import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifySessionPayload } from "@/lib/session-signing"
import { OPERATOR_SESSION_COOKIE } from "@/lib/operator-access-session"
import { computeDialerMetrics, type DialerLeadSummary, type ActivityWithLead } from "@/lib/dialer-metrics"
import {
  STATUS_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  distressTypeLabel,
} from "@/lib/dialer-types"

export const dynamic = "force-dynamic"

export const metadata = { title: "Dialer Activity · FALCO Operator" }

async function requireOperator() {
  const store = await cookies()
  const val = store.get(OPERATOR_SESSION_COOKIE)?.value?.trim()
  if (!val) redirect("/operator")
  const payload = verifySessionPayload<{ kind: string; nonce: string; exp: number }>(val)
  if (!payload || payload.kind !== "operator") redirect("/operator")
}

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return String(raw)
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function fmtRelative(iso?: string | null): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return String(iso)
  const mins = Math.round(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default async function OperatorDialerActivityPage() {
  await requireOperator()
  const m = await computeDialerMetrics()

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white bg-[#060606] min-h-screen">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">
            Operator · Dialer Activity
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Today on the Dialer</h1>
          <p className="mt-1 text-xs text-white/50">
            Live view of what the caller has worked. Generated{" "}
            {fmtDateTime(m.generatedAt)} UTC.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/55">
          <Link href="/dialer" className="rounded-md border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 uppercase tracking-wider">
            Open Dialer →
          </Link>
          <Link href="/operator" className="rounded-md border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 uppercase tracking-wider">
            ← Operator
          </Link>
        </div>
      </div>

      {/* Top stat strip: today */}
      <section className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Dial attempts (24h)" value={m.today.dialAttempts} tone="emerald" />
        <Stat label="RPCs (24h)" value={m.today.rpcs} tone="blue" />
        <Stat label="Bookings (24h)" value={m.today.bookings} tone="emerald-strong" />
        <Stat label="Calls (24h)" value={m.today.byChannel.call} />
        <Stat label="Texts (24h)" value={m.today.byChannel.text} />
      </section>

      {/* 7-day context */}
      <section className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Dials (7d)" value={m.last7days.dialAttempts} subdued />
        <Stat label="RPCs (7d)" value={m.last7days.rpcs} subdued />
        <Stat label="Bookings (7d)" value={m.last7days.bookings} subdued />
        <Stat label="Closed lost (7d)" value={m.last7days.closedLost} subdued />
        <Stat label="Total activity (7d)" value={m.last7days.totalActivities} subdued />
      </section>

      {/* Pipeline status distribution */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
            Pipeline snapshot
          </h2>
          <div className="text-[11px] text-white/45">
            {m.callableLeads} open · {m.totalLeads} total
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(
            [
              ["new", "New"],
              ["attempting_contact", "Attempting"],
              ["rpc_made", "RPC made"],
              ["auction_booked", "Auction booked"],
              ["listing_signed", "Listing signed"],
              ["auction_live", "Auction live"],
              ["closed_won", "Closed won"],
              ["closed_lost", "Closed lost"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="rounded-lg border border-white/8 bg-black/20 p-2.5"
            >
              <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
              <div className="mt-1 text-xl font-semibold text-white">{m.status[key]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active caller breakdown */}
      {Object.keys(m.last7days.byCaller).length > 0 && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
            Activity by caller (7 days)
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(m.last7days.byCaller)
              .sort((a, b) => b[1] - a[1])
              .map(([caller, count]) => (
                <div
                  key={caller}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs"
                >
                  <span className="text-white font-medium">{caller}</span>
                  <span className="ml-2 text-white/45">{count} touches</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Due today + overdue */}
      <LeadListSection
        title="Overdue (next action time passed)"
        leads={m.overdue}
        emptyMsg="Nothing overdue. Clean queue."
        tone="danger"
      />
      <LeadListSection
        title="Due today"
        leads={m.dueToday}
        emptyMsg="Nothing scheduled for today."
        tone="warn"
      />
      <LeadListSection
        title="Stuck (in progress > 3 days)"
        leads={m.stuck}
        emptyMsg="No stuck leads."
        tone="info"
        showStuckDays
      />

      {/* Recent activity feed */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
          Recent activity (last 50)
        </h2>
        {m.recentActivities.length === 0 ? (
          <div className="mt-3 text-xs text-white/45">No activity yet.</div>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {m.recentActivities.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Stat({
  label,
  value,
  tone = "default",
  subdued = false,
}: {
  label: string
  value: number
  tone?: "default" | "emerald" | "emerald-strong" | "blue"
  subdued?: boolean
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/10"
      : tone === "emerald-strong"
      ? "border-emerald-400/50 bg-emerald-400/15"
      : tone === "blue"
      ? "border-blue-400/30 bg-blue-400/10"
      : "border-white/10 bg-white/[0.04]"
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className={`text-[10px] uppercase tracking-wider ${subdued ? "text-white/35" : "text-white/55"}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${subdued ? "text-white/70" : "text-white"}`}>
        {value}
      </div>
    </div>
  )
}

function LeadListSection({
  title,
  leads,
  emptyMsg,
  tone,
  showStuckDays,
}: {
  title: string
  leads: DialerLeadSummary[]
  emptyMsg: string
  tone: "danger" | "warn" | "info"
  showStuckDays?: boolean
}) {
  const borderCls =
    tone === "danger"
      ? "border-red-400/25 bg-red-400/[0.04]"
      : tone === "warn"
      ? "border-amber-400/25 bg-amber-400/[0.04]"
      : "border-white/10 bg-white/[0.03]"
  return (
    <section className={`mt-6 rounded-2xl border ${borderCls} p-4`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">{title}</h2>
        <div className="text-[11px] text-white/45">{leads.length}</div>
      </div>
      {leads.length === 0 ? (
        <div className="mt-3 text-xs text-white/45">{emptyMsg}</div>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {leads.slice(0, 25).map((lead) => {
            const dt = distressTypeLabel(lead.distressType)
            return (
              <li key={lead.key} className="py-2.5">
                <Link
                  href={`/dialer/${lead.key}`}
                  className="block hover:bg-white/[0.03] -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">
                        {lead.address}
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-white/40">
                          {dt.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/45 truncate">
                        {lead.ownerName || "Owner unknown"}
                        {lead.county ? ` · ${lead.county}` : ""}
                        {lead.phone ? ` · ${fmtPhone(lead.phone)}` : ""}
                      </div>
                      {lead.summaryNotes && (
                        <div className="text-[11px] text-white/55 mt-0.5 line-clamp-1">
                          {lead.summaryNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-right shrink-0">
                      <div className="text-white/80">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </div>
                      {showStuckDays && lead.stuckDays !== undefined ? (
                        <div className="text-amber-300/80">
                          stuck {lead.stuckDays}d
                        </div>
                      ) : lead.nextActionAt ? (
                        <div className="text-white/45">
                          {fmtDateTime(lead.nextActionAt)}
                        </div>
                      ) : null}
                      {lead.attemptCount > 0 && (
                        <div className="text-white/35">{lead.attemptCount} touches</div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function ActivityRow({ a }: { a: ActivityWithLead }) {
  return (
    <li className="py-2">
      <Link
        href={`/dialer/${a.listingSlug}`}
        className="block hover:bg-white/[0.03] -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="text-[11px] text-white/45 shrink-0 w-20">
            {fmtRelative(a.occurredAt)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs">
              <span className="text-emerald-300/90 font-medium">{a.createdBy || "—"}</span>
              <span className="mx-1.5 text-white/25">·</span>
              <span className="text-white/75">{CHANNEL_LABELS[a.channel]}</span>
              <span className="mx-1.5 text-white/25">·</span>
              <span className="text-white/55">{OUTCOME_LABELS[a.outcome]}</span>
            </div>
            <div className="text-[11px] text-white/45 truncate">
              {a.address}
              {a.ownerName ? ` · ${a.ownerName}` : ""}
            </div>
            {a.notes && (
              <div className="text-[11px] text-white/65 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                {a.notes}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
