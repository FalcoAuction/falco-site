import Link from "next/link"
import { requireDialerSession } from "./require-session"
import { listDialerLeads, STATUS_LABELS, type DialerLead } from "@/lib/dialer-data"
import { PhoneLink } from "./phone-link"
import { ScrollRestorer } from "./scroll-restorer"
import { CountyFilter } from "./county-filter"

export const dynamic = "force-dynamic"

function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw
}

function fmtCurrencyShort(n?: number | null): string {
  if (n === null || n === undefined) return "—"
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toFixed(0)}`
}

function daysToSale(saleIso?: string): number | null {
  if (!saleIso) return null
  const ms = new Date(saleIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function dtsClass(dts: number | null): string {
  if (dts === null) return "text-white/35"
  if (dts <= 14) return "text-red-300 font-semibold"
  if (dts <= 30) return "text-amber-200"
  if (dts <= 60) return "text-white/85"
  return "text-white/55"
}

function statusPill(status: DialerLead["workflow"]["status"]) {
  const map: Record<string, string> = {
    new: "bg-white/8 text-white/65 border-white/12",
    attempting_contact: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    rpc_made: "bg-blue-400/15 text-blue-200 border-blue-400/30",
    auction_booked: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
    listing_signed: "bg-emerald-400/30 text-emerald-100 border-emerald-400/50",
    auction_live: "bg-emerald-500/30 text-emerald-50 border-emerald-500/50",
    closed_won: "bg-emerald-600/40 text-white border-emerald-600/60",
    closed_lost: "bg-red-400/15 text-red-200 border-red-400/30",
  }
  return map[status] ?? "bg-white/8 text-white/65 border-white/12"
}

// Middle TN — the pilot geography. Default queue is filtered to this set.
const MIDDLE_TN_COUNTIES = new Set([
  "davidson",
  "williamson",
  "wilson",
  "sumner",
  "rutherford",
  "cheatham",
  "robertson",
  "dickson",
  "maury",
  "montgomery",
])

function normalizeCounty(c: string | null | undefined): string {
  return (c || "").toLowerCase().replace(/\s+county$/i, "").trim()
}

function inMiddleTN(county: string | null | undefined): boolean {
  return MIDDLE_TN_COUNTIES.has(normalizeCounty(county))
}

export default async function DialerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; county?: string }>
}) {
  await requireDialerSession("/dialer")
  const params = await searchParams
  const filter = params.filter ?? "open"
  const countyFilter = params.county ?? ""

  const leads = await listDialerLeads()

  // Geographic filter — Middle TN by default; specific county drills in
  const byRegion = leads.filter((l) => {
    if (countyFilter) return normalizeCounty(l.county) === normalizeCounty(countyFilter)
    return inMiddleTN(l.county)
  })

  // Status filter
  const byStatus = byRegion.filter((l) => {
    const s = l.workflow.status
    if (filter === "all") return true
    if (filter === "open") return s !== "closed_lost" && s !== "closed_won"
    if (filter === "new") return s === "new"
    if (filter === "in_progress") return s === "attempting_contact" || s === "rpc_made"
    if (filter === "booked") return s === "auction_booked" || s === "listing_signed" || s === "auction_live"
    if (filter === "closed") return s === "closed_won" || s === "closed_lost"
    return true
  })

  // Sort: nearest sale date first (urgency); leads without sale date last
  const filtered = byStatus.slice().sort((a, b) => {
    const ad = a.currentSaleDate ? new Date(a.currentSaleDate).getTime() : Infinity
    const bd = b.currentSaleDate ? new Date(b.currentSaleDate).getTime() : Infinity
    return ad - bd
  })

  // County options for the dropdown — only Middle TN counties with at
  // least one lead, sorted by count desc.
  const countyMap = new Map<string, number>()
  for (const l of leads) {
    const c = normalizeCounty(l.county)
    if (!c || !MIDDLE_TN_COUNTIES.has(c)) continue
    countyMap.set(c, (countyMap.get(c) || 0) + 1)
  }
  const countyOptions = Array.from(countyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => ({
      value: c,
      label: c.replace(/\b\w/g, (m) => m.toUpperCase()),
      count: n,
    }))

  // Status tabs — counts respect the current geo filter so they're meaningful
  const counts = {
    open: byRegion.filter(
      (l) => l.workflow.status !== "closed_lost" && l.workflow.status !== "closed_won"
    ).length,
    new: byRegion.filter((l) => l.workflow.status === "new").length,
    in_progress: byRegion.filter(
      (l) => l.workflow.status === "attempting_contact" || l.workflow.status === "rpc_made"
    ).length,
    booked: byRegion.filter(
      (l) =>
        l.workflow.status === "auction_booked" ||
        l.workflow.status === "listing_signed" ||
        l.workflow.status === "auction_live"
    ).length,
    closed: byRegion.filter(
      (l) => l.workflow.status === "closed_won" || l.workflow.status === "closed_lost"
    ).length,
    all: byRegion.length,
  }

  const tabs = [
    { key: "open", label: "Open", count: counts.open },
    { key: "new", label: "New", count: counts.new },
    { key: "in_progress", label: "Working", count: counts.in_progress },
    { key: "booked", label: "Booked", count: counts.booked },
    { key: "closed", label: "Closed", count: counts.closed },
    { key: "all", label: "All", count: counts.all },
  ] as const

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScrollRestorer />

      {/* Header — minimal */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Call Queue</h1>
          <p className="mt-0.5 text-xs text-white/45">
            Sorted by sale date · click any lead to log a call
          </p>
        </div>
        <CountyFilter options={countyOptions} selected={countyFilter} />
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = filter === tab.key
          const href = countyFilter
            ? `/dialer?filter=${tab.key}&county=${countyFilter}`
            : `/dialer?filter=${tab.key}`
          return (
            <Link
              key={tab.key}
              href={href}
              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors ${
                active
                  ? "border-emerald-400/45 bg-emerald-400/12 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
              }`}
            >
              {tab.label}{" "}
              <span className={active ? "text-emerald-200/75" : "text-white/35"}>
                {tab.count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Lead list */}
      <div className="mt-5 rounded-xl border border-white/10 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[80px_1fr_140px_80px_120px] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-wider text-white/40">
          <div>Sale</div>
          <div>Property · Owner</div>
          <div>Phone</div>
          <div className="text-right">Equity</div>
          <div>Status</div>
        </div>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-white/55">
            No leads in this view.
          </div>
        )}
        <ul className="divide-y divide-white/5">
          {filtered.map((lead) => {
            const dts = daysToSale(lead.currentSaleDate)
            const phone = lead.ownerPhonePrimary ?? lead.saleControllerPhonePrimary
            // avmMid is stashed at runtime in inventoryToListing extras
            // but not declared on DialerLead; access through a cast.
            const avm = (lead as DialerLead & { avmMid?: number | null }).avmMid
            const mortgage = lead.mortgageAmount
            const equity = avm && mortgage ? avm - mortgage : null
            const equityClass =
              equity === null
                ? "text-white/35"
                : equity < 0
                ? "text-red-300"
                : equity >= 100_000
                ? "text-emerald-300 font-semibold"
                : equity >= 30_000
                ? "text-emerald-200"
                : "text-white/75"
            const county = normalizeCounty(lead.county)
            const countyLabel = county.replace(/\b\w/g, (m) => m.toUpperCase())
            return (
              <li key={lead.slug}>
                <Link
                  href={`/dialer/${lead.slug}`}
                  className="block hover:bg-white/[0.04] transition-colors"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_140px_80px_120px] gap-2 sm:gap-3 px-4 py-3 text-sm">
                    {/* Sale date / DTS */}
                    <div className={`text-xs sm:self-center ${dtsClass(dts)}`}>
                      {dts !== null ? (
                        <>
                          <div className="font-semibold text-[13px]">
                            {dts}d
                          </div>
                          <div className="text-[10px] opacity-75">
                            {fmtDate(lead.currentSaleDate)}
                          </div>
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </div>

                    {/* Property + owner + county */}
                    <div className="min-w-0 sm:self-center">
                      <div className="font-medium text-white truncate">
                        {lead.address ?? lead.title}
                      </div>
                      <div className="text-[11px] text-white/55 truncate">
                        {lead.ownerName || "Owner unknown"}
                        {countyLabel && (
                          <span className="text-white/35"> · {countyLabel}</span>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="text-xs sm:self-center">
                      {phone ? (
                        <PhoneLink
                          number={phone}
                          display={fmtPhone(phone)}
                          className="text-emerald-300 hover:underline"
                        />
                      ) : (
                        <span className="text-white/30">no phone</span>
                      )}
                    </div>

                    {/* Equity */}
                    <div className={`text-right text-xs sm:self-center ${equityClass}`}>
                      {fmtCurrencyShort(equity)}
                    </div>

                    {/* Status */}
                    <div className="sm:self-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusPill(
                          lead.workflow.status
                        )}`}
                      >
                        {STATUS_LABELS[lead.workflow.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-4 text-[11px] text-white/35 text-center">
        {filtered.length} of {byRegion.length} {countyFilter ? countyFilter : "Middle TN"} leads
      </p>
    </main>
  )
}
