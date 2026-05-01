// /admin/today — the page Patrick opens every morning.
// One screen, scannable in 60 seconds, tells him what to do.

import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import {
  getPriorityOutreach,
  getUrgentSaleDates,
  getRecentReplies,
  getMetrics,
  getHealth,
  getActiveTodos,
} from "@/lib/today-data"
import { TodoEditor } from "./todo-editor"
import type { TodayLead } from "@/lib/today-data"

export const dynamic = "force-dynamic"

function fmtCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const d = String(raw).replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

function streetOnly(addr: string): string {
  const m = addr.match(/^[\d-]+\s+([^,]+)/)
  return m ? `${addr.split(",")[0]}` : addr.split(",")[0]
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const h = Math.floor(ms / (60 * 60 * 1000))
  if (h < 1) return `${Math.floor(ms / (60 * 1000))}m ago`
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// Static milestones the page counts down to. Update as life happens.
const MILESTONES = [
  { label: "TN broker exam target", date: "2026-06-15" },
  { label: "Pilot 90-day mark", date: "2026-07-29" },
] as const

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

export default async function TodayPage() {
  const session = await readAdminSessionFromCookies()
  if (!session) {
    const h = await headers()
    const path = h.get("x-pathname") || "/admin/today"
    redirect(`/admin/login?next=${encodeURIComponent(path)}`)
  }

  const [outreach, urgent, replies, metrics, health, todos] = await Promise.all([
    getPriorityOutreach(8),
    getUrgentSaleDates(),
    getRecentReplies(),
    getMetrics(),
    getHealth(),
    getActiveTodos(),
  ])

  const today = new Date()

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

        {/* HEADER */}
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">
              FALCO · TODAY
            </div>
            <h1 className="text-2xl font-bold mt-1 sm:text-3xl">{fmtFullDate(today)}</h1>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-white/55">
            {MILESTONES.map((m) => {
              const d = daysUntil(m.date)
              return (
                <div key={m.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">{m.label}</div>
                  <div className="text-sm font-semibold text-white">
                    {d > 0 ? `${d} days` : d === 0 ? "TODAY" : `${Math.abs(d)}d ago`}
                  </div>
                </div>
              )
            })}
          </div>
        </header>

        {/* ───────── PRIORITY OUTREACH ───────── */}
        <Section
          title="Send these texts today"
          subtitle={outreach.length ? `Top ${outreach.length} ranked by sale-date sweet spot + value` : "No leads ready — check back after the bot cron runs"}
          accent="emerald"
        >
          {outreach.length === 0 ? (
            <Empty>No outreach queue right now.</Empty>
          ) : (
            <ul className="divide-y divide-white/5">
              {outreach.map((l) => (
                <LeadRow key={l.slug} lead={l} />
              ))}
            </ul>
          )}
        </Section>

        {/* ───────── REPLIES ───────── */}
        {replies.length > 0 && (
          <Section
            title="Replies needing response"
            subtitle="Last 48 hours — handle these before sending more cold"
            accent="amber"
          >
            <ul className="divide-y divide-white/5">
              {replies.map((l) => (
                <LeadRow key={l.slug + l.reason} lead={l} replyMode />
              ))}
            </ul>
          </Section>
        )}

        {/* ───────── URGENT SALE DATES ───────── */}
        {urgent.length > 0 && (
          <Section
            title={`This week urgent · ${urgent.length} sale${urgent.length === 1 ? "" : "s"} in next 14 days`}
            subtitle="Beyond the marketed-auction window — call, don't text"
            accent="red"
          >
            <ul className="divide-y divide-white/5">
              {urgent.map((l) => (
                <LeadRow key={l.slug} lead={l} urgentMode />
              ))}
            </ul>
          </Section>
        )}

        {/* ───────── YOUR TODAY (manual) ───────── */}
        <Section title="Your today" subtitle="Personal scratch list — broker license, pilot ops, follow-ups" accent="blue">
          <TodoEditor initial={todos} />
        </Section>

        {/* ───────── METRICS ───────── */}
        <Section title="Numbers" subtitle="Today + pipeline at a glance" accent="white">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Texts today" value={metrics.textsToday} />
            <Stat label="Emails today" value={metrics.emailsToday} />
            <Stat label="Replies (24h)" value={metrics.repliesLast24h} />
            <Stat label="Booked today" value={metrics.bookedToday} highlight={metrics.bookedToday > 0} />
            <Stat label="Total leads" value={metrics.totalLeads} />
            <Stat label="With AVM" value={metrics.leadsWithAvm} sub={`${pct(metrics.leadsWithAvm, metrics.totalLeads)}%`} />
            <Stat label="With phone" value={metrics.leadsWithPhone} sub={`${pct(metrics.leadsWithPhone, metrics.totalLeads)}%`} />
            <Stat label="Underwater" value={metrics.underwaterCount} sub={`${pct(metrics.underwaterCount, metrics.totalLeads)}%`} />
          </div>
        </Section>

        {/* ───────── HEALTH ───────── */}
        <Section title="System health" subtitle="What's broken or thinning" accent="white">
          <ul className="space-y-2 text-sm">
            <HealthRow
              ok={health.enrichmentCronStatus === "ok"}
              label={`Enrichment cron · last ran ${timeAgo(health.enrichmentCronLastRun)}`}
              detail={
                health.enrichmentCronStatus === "ok"
                  ? "fresh"
                  : health.enrichmentCronStatus === "stale"
                  ? "STALE — investigate"
                  : "no signal yet"
              }
            />
            <HealthRow
              ok={health.leadsMissingPhone < 50}
              label={`${health.leadsMissingPhone} leads missing phone`}
              detail="skip-trace queue"
            />
            <HealthRow
              ok={health.leadsMissingAvm < 20}
              label={`${health.leadsMissingAvm} leads missing AVM`}
              detail="enrichment queue"
            />
            <HealthRow
              ok={health.leadsMissingEmail < 50}
              label={`${health.leadsMissingEmail} leads missing email`}
              detail="lower-priority enrich"
            />
            <HealthRow
              ok={health.staleAttemptingContact === 0}
              label={`${health.staleAttemptingContact} leads stuck in 'attempting_contact' > 7d`}
              detail={health.staleAttemptingContact > 0 ? "needs status update" : "clean"}
            />
          </ul>
        </Section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-white/40">
          <Link href="/admin" className="hover:text-white/70 underline-offset-2 hover:underline">
            ← admin home
          </Link>
          <div>refresh page for live state · auto-pulled from supabase</div>
        </footer>
      </div>
    </main>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Building blocks
// ───────────────────────────────────────────────────────────────────────

function pct(n: number, denom: number): number {
  if (!denom) return 0
  return Math.round((n / denom) * 100)
}

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  accent: "emerald" | "amber" | "red" | "blue" | "white"
  children: React.ReactNode
}) {
  const accentColor = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
    white: "text-white/60",
  }[accent]
  return (
    <section className="mt-6">
      <div className="mb-3">
        <h2 className={`text-[11px] font-bold uppercase tracking-[0.2em] ${accentColor}`}>
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-white/40">{subtitle}</p>}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 text-sm text-white/45">{children}</div>
}

function LeadRow({
  lead,
  replyMode,
  urgentMode,
}: {
  lead: TodayLead
  replyMode?: boolean
  urgentMode?: boolean
}) {
  const dtsBadge =
    lead.daysToSale === null ? null : (
      <span
        className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${
          lead.daysToSale < 14
            ? "bg-red-500/20 text-red-300"
            : lead.daysToSale < 30
            ? "bg-amber-500/20 text-amber-300"
            : "bg-emerald-500/20 text-emerald-300"
        }`}
      >
        {lead.daysToSale}d
      </span>
    )
  return (
    <li className="px-4 py-3 hover:bg-white/[0.025] transition-colors">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dialer/${lead.slug}`}
            className="text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
          >
            {streetOnly(lead.address)}
          </Link>
          <span className="ml-2 text-xs text-white/45">{lead.county || ""}</span>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
            {lead.ownerName && <span>{lead.ownerName}</span>}
            {lead.phone && <span className="font-mono">{fmtPhone(lead.phone)}</span>}
            {lead.email && <span className="text-white/40">{lead.email}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dtsBadge}
          <span className="text-xs font-semibold text-white">{fmtCurrency(lead.arv)}</span>
          <span
            className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
              urgentMode
                ? "bg-red-500/20 text-red-200"
                : replyMode
                ? "bg-amber-500/20 text-amber-200"
                : "bg-white/8 text-white/60"
            }`}
          >
            {lead.reason}
          </span>
        </div>
      </div>
    </li>
  )
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: number | string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-xl font-bold ${highlight ? "text-emerald-300" : "text-white"}`}>
          {value}
        </div>
        {sub && <div className="text-[11px] text-white/40">{sub}</div>}
      </div>
    </div>
  )
}

function HealthRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center justify-between border-b border-white/5 px-4 py-2 last:border-0">
      <div className="flex items-center gap-2 text-white/85">
        <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-[11px] text-white/45 uppercase tracking-wider">{detail}</span>
    </li>
  )
}
