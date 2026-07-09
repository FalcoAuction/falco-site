import Link from "next/link"
import { requireDialerSession } from "./require-session"
import { listDialerLeads, STATUS_LABELS, type DialerLead } from "@/lib/dialer-data"
import { PhoneLink } from "./phone-link"
import { ScrollRestorer } from "./scroll-restorer"
import { CountyFilter } from "./county-filter"
import { DistressFilter } from "./distress-filter"

const DISTRESS_LABELS: Record<string, string> = {
  TRUSTEE_NOTICE: "Trustee Notice",
  PRE_FORECLOSURE: "Pre-foreclosure",
  CODE_VIOLATION: "Code Violation",
  PROBATE: "Probate",
  TAX_LIEN: "Tax Lien",
  FSBO: "FSBO",
  BANKRUPTCY: "Bankruptcy",
  LIS_PENDENS: "Lis Pendens",
  PREFORECLOSURE: "Pre-foreclosure",
  DEMOLITION: "Demolition / Rehab",
}

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

/** Phone line-type badge: short, color-coded for scannability.
 *  Mobile is highest-conversion; landline second; VoIP often a forwarder
 *  (lower priority); unvalidated means Twilio Lookup hasn't run yet. */
function phoneTypeBadge(lineType?: string, validated?: boolean) {
  if (!validated) return null
  const lt = (lineType || "").toLowerCase()
  if (lt === "mobile") {
    return { label: "MOB", tone: "border-emerald-400/40 bg-emerald-400/12 text-emerald-200" }
  }
  if (lt === "landline" || lt === "fixed_line_or_mobile") {
    return { label: "LAND", tone: "border-blue-400/35 bg-blue-400/10 text-blue-200" }
  }
  if (lt.includes("voip")) {
    return { label: "VOIP", tone: "border-amber-400/35 bg-amber-400/10 text-amber-200" }
  }
  return null
}

/** Returns true if a lead is fully ready for outreach: defensible
 *  mortgage source + valid mobile/landline phone + name + addr.
 *  Mirrors the gate used by middle_tn_dial_probe_bot. */
function isReadyToDial(lead: ReadyDialLead): boolean {
  if (!lead.mortgageDefensible) return false
  if (!lead.phoneValidated) return false
  const phone = lead.ownerPhonePrimary || lead.saleControllerPhonePrimary
  if (!phone) return false
  const lt = (lead.phoneLineType || "").toLowerCase()
  if (lt.includes("voip")) return false  // forwarders skipped
  if (!(lead.ownerName || lead.title)) return false
  if (!lead.address) return false
  return true
}

type ReadyDialLead = {
  ownerPhonePrimary?: string | null
  saleControllerPhonePrimary?: string | null
  ownerName?: string | null
  title?: string | null
  address?: string | null
  mortgageDefensible?: boolean
  phoneValidated?: boolean
  phoneLineType?: string
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
  searchParams: Promise<{ filter?: string; county?: string; distress?: string }>
}) {
  await requireDialerSession("/dialer")
  const params = await searchParams
  // Default to "open" — every workable lead, urgency-sorted. "ready"
  // (Twilio-validated subset) sits behind a click; with phone
  // validation stale it was defaulting the queue to an empty page.
  const filter = params.filter ?? "open"
  const countyFilter = params.county ?? ""
  const distressFilter = params.distress ?? ""

  const leads = await listDialerLeads()

  // Geographic filter — Middle TN by default; specific county drills in
  const byRegion = leads.filter((l) => {
    if (countyFilter) return normalizeCounty(l.county) === normalizeCounty(countyFilter)
    return inMiddleTN(l.county)
  })

  // Distress filter — applied on top of region. PREFORECLOSURE and
  // PRE_FORECLOSURE are the same bucket in older vs newer data.
  const byDistress = distressFilter
    ? byRegion.filter((l) => {
        const dt = (l.distressType || "").toUpperCase()
        if (distressFilter === "PRE_FORECLOSURE") {
          return dt === "PRE_FORECLOSURE" || dt === "PREFORECLOSURE" || dt === "LIS_PENDENS"
        }
        return dt === distressFilter
      })
    : byRegion

  // "New" = ingested in the last 36 hours. Time-based instead of
  // workflow-status-based — the dialer's "new" workflow status is the
  // default for every never-touched lead so it was useless as a
  // freshness signal. 36h covers both daily cron passes (12 UTC + 21
  // UTC) so a lead added in either run shows up.
  const NEW_LEAD_WINDOW_HOURS = 36
  const newCutoff = Date.now() - NEW_LEAD_WINDOW_HOURS * 60 * 60 * 1000
  const isFreshlyIngested = (l: DialerLead) => {
    const t = l.createdAt ? new Date(l.createdAt).getTime() : NaN
    return Number.isFinite(t) && t >= newCutoff
  }

  // Status filter — "ready" is special: defensible + validated phone
  // + complete profile, regardless of workflow status.
  const byStatus = byDistress.filter((l) => {
    const s = l.workflow.status
    if (filter === "ready") return isReadyToDial(l as unknown as ReadyDialLead)
    if (filter === "all") return true
    if (filter === "open") return s !== "closed_lost" && s !== "closed_won"
    if (filter === "new") return isFreshlyIngested(l)
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

  // Distress options — counts respect region+county scope (so the
  // dropdown reflects what's actually visible after geo filter).
  const distressMap = new Map<string, number>()
  for (const l of byRegion) {
    let dt = (l.distressType || "").toUpperCase()
    if (!dt) continue
    // Collapse duplicates
    if (dt === "PREFORECLOSURE" || dt === "LIS_PENDENS") dt = "PRE_FORECLOSURE"
    distressMap.set(dt, (distressMap.get(dt) || 0) + 1)
  }
  const distressOptions = Array.from(distressMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([dt, n]) => ({
      value: dt,
      label: DISTRESS_LABELS[dt] ?? dt,
      count: n,
    }))

  // Status tabs — counts respect the current geo + distress filter so
  // they're meaningful (clicking a tab won't surprise with 0 results).
  const counts = {
    ready: byDistress.filter((l) => isReadyToDial(l as unknown as ReadyDialLead)).length,
    open: byDistress.filter(
      (l) => l.workflow.status !== "closed_lost" && l.workflow.status !== "closed_won"
    ).length,
    new: byDistress.filter(isFreshlyIngested).length,
    in_progress: byDistress.filter(
      (l) => l.workflow.status === "attempting_contact" || l.workflow.status === "rpc_made"
    ).length,
    booked: byDistress.filter(
      (l) =>
        l.workflow.status === "auction_booked" ||
        l.workflow.status === "listing_signed" ||
        l.workflow.status === "auction_live"
    ).length,
    closed: byDistress.filter(
      (l) => l.workflow.status === "closed_won" || l.workflow.status === "closed_lost"
    ).length,
    all: byDistress.length,
  }

  const tabs = [
    { key: "ready", label: "Ready", count: counts.ready },
    { key: "open", label: "Open", count: counts.open },
    { key: "new", label: "New (36h)", count: counts.new },
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bulk AI compose — drafts opener/followup/reply for every
              active foreclosure lead, one card at a time, auto-advance.
              The fastest way to plow through the whole pool. */}
          <Link
            href="/dialer/inbox"
            className="rounded-md bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/45 px-3 py-1.5 text-[12px] font-semibold text-emerald-50 transition-colors"
            title="Bulk AI compose queue — go through every active foreclosure lead with AI-drafted texts. One card at a time, auto-advance."
          >
            ✦ AI Inbox
          </Link>
          <Link
            href="/dialer/drafts"
            className="rounded-md bg-sky-400/15 hover:bg-sky-400/25 border border-sky-400/40 px-3 py-1.5 text-[12px] font-semibold text-sky-100 transition-colors"
            title="Machine-drafted texts waiting for review — campaign dry runs and brain escalations. Read, edit, approve, or reject."
          >
            Drafts
          </Link>
          <CountyFilter options={countyOptions} selected={countyFilter} />
          <DistressFilter options={distressOptions} selected={distressFilter} />
        </div>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = filter === tab.key
          const qs = new URLSearchParams()
          qs.set("filter", tab.key)
          if (countyFilter) qs.set("county", countyFilter)
          if (distressFilter) qs.set("distress", distressFilter)
          const href = `/dialer?${qs.toString()}`
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
            // Enrichment fields stashed via inventoryToListing extras
            // (not declared on DialerLead). Cast once to access.
            const x = lead as DialerLead & {
              avmMid?: number | null
              phoneLineType?: string
              phoneValidated?: boolean
              phoneDnc?: boolean
              mortgageDefensible?: boolean
              mortgageLenderResolved?: string
              mortgageOriginationYear?: number
              equityAmount?: number
            }
            const avm = x.avmMid
            const mortgage = lead.mortgageAmount
            // Prefer amortizer's exact equity calc; fall back to AVM−balance.
            const equity = x.equityAmount ?? (avm && mortgage ? avm - mortgage : null)
            const phoneBadge = phoneTypeBadge(x.phoneLineType, x.phoneValidated)
            const lender = x.mortgageLenderResolved ?? lead.mortgageLender ?? null
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
              <li key={lead.slug} data-lead-slug={lead.slug}>
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

                    {/* Property + owner + county + lender. Lender on
                        sub-line so rep can verify "you have a loan with
                        Wells Fargo, right?" before pitching. */}
                    <div className="min-w-0 sm:self-center">
                      <div className="font-medium text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{lead.address ?? lead.title}</span>
                        {x.mortgageDefensible && (
                          <span
                            title="Mortgage data verified from public record (ROD or HMDA)"
                            className="shrink-0 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 text-[9px] uppercase tracking-wider px-1 py-px"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/55 truncate">
                        {lead.ownerName || "Owner unknown"}
                        {countyLabel && (
                          <span className="text-white/35"> · {countyLabel}</span>
                        )}
                        {lender && (
                          <span className="text-white/45">
                            {" · "}
                            <span className="text-white/70">{lender}</span>
                            {x.mortgageOriginationYear && (
                              <span className="text-white/40"> ({x.mortgageOriginationYear})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Phone — with line-type badge so rep prioritizes
                        mobile numbers + can skip VoIP forwarders. */}
                    <div className="text-xs sm:self-center">
                      {phone ? (
                        <div className="flex flex-col gap-0.5">
                          <PhoneLink
                            number={phone}
                            display={fmtPhone(phone)}
                            className={`hover:underline ${
                              x.phoneDnc
                                ? "text-red-300 line-through"
                                : "text-emerald-300"
                            }`}
                          />
                          <div className="flex items-center gap-1">
                            {phoneBadge && (
                              <span
                                className={`inline-flex items-center rounded border px-1 py-px text-[9px] uppercase tracking-wider ${phoneBadge.tone}`}
                              >
                                {phoneBadge.label}
                              </span>
                            )}
                            {x.phoneDnc && (
                              <span className="text-[9px] uppercase tracking-wider text-red-300/80">
                                DNC
                              </span>
                            )}
                          </div>
                        </div>
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
        {filtered.length} of {byDistress.length} {countyFilter ? countyFilter : "Middle TN"}
        {distressFilter && ` · ${(DISTRESS_LABELS[distressFilter] ?? distressFilter).toLowerCase()}`} leads
      </p>
    </main>
  )
}
