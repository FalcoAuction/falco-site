import Link from "next/link"
import { requireDialerSession } from "./require-session"
import { listDialerLeads, STATUS_LABELS, type DialerLead } from "@/lib/dialer-data"
import { distressTypeLabel } from "@/lib/dialer-inventory"
import { PhoneLink } from "./phone-link"

export const dynamic = "force-dynamic"

function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
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

function fmtCurrency(n?: number | null): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function daysToSale(saleIso?: string): number | null {
  if (!saleIso) return null
  const ms = new Date(saleIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function statusPill(status: DialerLead["workflow"]["status"]) {
  const map: Record<string, string> = {
    new: "bg-white/10 text-white/70 border-white/15",
    attempting_contact: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    rpc_made: "bg-blue-400/15 text-blue-200 border-blue-400/30",
    parkes_booked: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
    listing_signed: "bg-emerald-400/30 text-emerald-100 border-emerald-400/50",
    auction_live: "bg-emerald-500/30 text-emerald-50 border-emerald-500/50",
    closed_won: "bg-emerald-600/40 text-white border-emerald-600/60",
    closed_lost: "bg-red-400/15 text-red-200 border-red-400/30",
  }
  return map[status] ?? "bg-white/10 text-white/70 border-white/15"
}

function distressPill(category: ReturnType<typeof distressTypeLabel>["category"]) {
  const map: Record<string, string> = {
    lis_pendens: "bg-violet-400/15 text-violet-200 border-violet-400/30",
    pre_foreclosure: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    foreclosure: "bg-red-400/15 text-red-200 border-red-400/30",
    fsbo: "bg-blue-400/15 text-blue-200 border-blue-400/30",
    other: "bg-white/8 text-white/60 border-white/12",
  }
  return map[category] ?? map.other
}

function dtsClass(dts: number | null): string {
  if (dts === null) return "text-white/40"
  if (dts <= 14) return "text-red-300 font-semibold"
  if (dts <= 30) return "text-amber-200"
  if (dts <= 60) return "text-white/85"
  return "text-white/55"
}

export default async function DialerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  await requireDialerSession("/dialer")
  const params = await searchParams
  const filter = params.filter ?? "open"
  const leads = await listDialerLeads()

  const filtered = leads.filter((l) => {
    const s = l.workflow.status
    if (filter === "all") return true
    if (filter === "open") return s !== "closed_lost" && s !== "closed_won"
    if (filter === "new") return s === "new"
    if (filter === "in_progress") return s === "attempting_contact" || s === "rpc_made"
    if (filter === "booked") return s === "parkes_booked" || s === "listing_signed" || s === "auction_live"
    if (filter === "closed") return s === "closed_won" || s === "closed_lost"
    return true
  })

  const counts = {
    all: leads.length,
    open: leads.filter((l) => l.workflow.status !== "closed_lost" && l.workflow.status !== "closed_won").length,
    new: leads.filter((l) => l.workflow.status === "new").length,
    in_progress: leads.filter(
      (l) => l.workflow.status === "attempting_contact" || l.workflow.status === "rpc_made"
    ).length,
    booked: leads.filter(
      (l) =>
        l.workflow.status === "parkes_booked" ||
        l.workflow.status === "listing_signed" ||
        l.workflow.status === "auction_live"
    ).length,
    closed: leads.filter((l) => l.workflow.status === "closed_won" || l.workflow.status === "closed_lost").length,
  }

  const tabs: Array<{ key: string; label: string; count: number }> = [
    { key: "open", label: "Open", count: counts.open },
    { key: "new", label: "New", count: counts.new },
    { key: "in_progress", label: "In Progress", count: counts.in_progress },
    { key: "booked", label: "Booked / Listed", count: counts.booked },
    { key: "closed", label: "Closed", count: counts.closed },
    { key: "all", label: "All", count: counts.all },
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Queue</h1>
          <p className="mt-1 text-sm text-white/55">
            Sorted by sale date — soonest first. Click any lead to log a call.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.key
          return (
            <Link
              key={tab.key}
              href={`/dialer?filter=${tab.key}`}
              className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                active
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                  : "border-white/12 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]"
              }`}
            >
              {tab.label}{" "}
              <span className={active ? "text-emerald-200/80" : "text-white/40"}>
                {tab.count}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_130px_140px_130px_120px_150px_110px] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/45">
          <div>Property / Owner</div>
          <div>Phone</div>
          <div>Type</div>
          <div>Sale Date</div>
          <div>Mortgage</div>
          <div>Status</div>
          <div className="text-right">Last Activity</div>
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
            const mortgage = lead.mortgageAmount
            const dt = distressTypeLabel(lead.distressType)
            return (
              <li key={lead.slug}>
                <Link
                  href={`/dialer/${lead.slug}`}
                  className="block hover:bg-white/[0.04] transition-colors"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_140px_130px_120px_150px_110px] gap-2 sm:gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">
                        {lead.address ?? lead.title}
                      </div>
                      <div className="text-xs text-white/55 truncate">
                        {lead.ownerName ?? "Unknown owner"} · {lead.county}
                      </div>
                    </div>
                    <div className="text-xs text-white/75 sm:self-center">
                      {phone ? (
                        <PhoneLink
                          number={phone}
                          display={fmtPhone(phone)}
                          className="text-emerald-300 hover:underline"
                        />
                      ) : (
                        <span className="text-white/35">no phone</span>
                      )}
                    </div>
                    <div className="sm:self-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${distressPill(
                          dt.category
                        )}`}
                      >
                        {dt.label}
                      </span>
                    </div>
                    <div className={`text-xs sm:self-center ${dtsClass(dts)}`}>
                      {fmtDate(lead.currentSaleDate)}
                      {dts !== null && (
                        <span className="ml-1.5 text-[11px] opacity-75">
                          ({dts}d)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/75 sm:self-center">
                      {fmtCurrency(mortgage)}
                    </div>
                    <div className="sm:self-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusPill(
                          lead.workflow.status
                        )}`}
                      >
                        {STATUS_LABELS[lead.workflow.status]}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/45 sm:text-right sm:self-center">
                      {fmtDate(lead.workflow.lastContactAt)}
                      {lead.workflow.attemptCount > 0 && (
                        <div className="text-[10px] text-white/35">
                          {lead.workflow.attemptCount} attempt
                          {lead.workflow.attemptCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-6 text-[11px] text-white/35 text-center">
        {leads.length} total leads · showing {filtered.length}
      </p>
    </main>
  )
}
