"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  STATUS_LABELS,
  NEXT_ACTION_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  distressTypeLabel,
  type DialerLeadView,
  type DialerStatus,
  type DialerNextAction,
  type DialerChannel,
  type DialerOutcome,
  type DialerActivity,
} from "@/lib/dialer-types"
import { classifyTier } from "@/lib/tier-classification"
import ContactLayer from "./contact-layer"
import type { SkiptraceData } from "./contact-layer"

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return raw
}
function fmtCurrency(n?: number | null): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  })
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function daysToSale(saleIso?: string): number | null {
  if (!saleIso) return null
  const ms = new Date(saleIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const STATUS_OPTIONS: DialerStatus[] = [
  "new",
  "attempting_contact",
  "rpc_made",
  "auction_booked",
  "listing_signed",
  "auction_live",
  "closed_won",
  "closed_lost",
]

const NEXT_ACTION_OPTIONS: DialerNextAction[] = [
  "call",
  "text",
  "wait_callback",
  "hand_to_auction",
  "drop",
  "none",
]

const CHANNEL_OPTIONS: DialerChannel[] = ["call", "text", "voicemail", "email", "note"]
const OUTCOME_OPTIONS: DialerOutcome[] = [
  "connected",
  "voicemail_left",
  "no_answer",
  "wrong_number",
  "hung_up",
  "booked",
  "callback_requested",
  "not_interested",
  "do_not_call",
  "note_only",
]

export default function LeadDetail({
  lead,
  caller,
  skiptraceData,
  badPhones,
}: {
  lead: DialerLeadView
  caller: string
  skiptraceData?: SkiptraceData | null
  badPhones?: string[]
}) {
  const router = useRouter()
  const dts = daysToSale(lead.currentSaleDate)
  const phones = [
    { label: "Owner Primary", number: lead.ownerPhonePrimary, dnc: lead.ownerPhoneDncStatus },
    { label: "Owner Secondary", number: lead.ownerPhoneSecondary },
    { label: "Sale Controller", number: lead.saleControllerPhonePrimary },
    { label: "Trustee Public", number: lead.trusteePhonePublic },
    { label: "Notice Phone", number: lead.noticePhone },
  ].filter((p) => !!p.number)

  return (
    <>
      {/* Lead header */}
      <header className="mt-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {lead.address ?? lead.title}
        </h1>
        <div className="mt-1 text-sm text-white/60 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{lead.ownerName ?? "Unknown owner"}</span>
          <span className="text-white/30">·</span>
          <span>{lead.county}</span>
          {lead.distressType && (
            <>
              <span className="text-white/30">·</span>
              {(() => {
                const dt = distressTypeLabel(lead.distressType)
                const tone =
                  dt.category === "lis_pendens"
                    ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                    : dt.category === "pre_foreclosure"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    : dt.category === "foreclosure"
                    ? "border-red-400/30 bg-red-400/10 text-red-100"
                    : dt.category === "fsbo"
                    ? "border-blue-400/30 bg-blue-400/10 text-blue-100"
                    : "border-white/12 bg-white/5 text-white/60"
                return (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}
                  >
                    {dt.label}
                  </span>
                )
              })()}
            </>
          )}
          {(() => {
            const tier = classifyTier(lead.avmMid)
            if (!tier) return null
            return (
              <>
                <span className="text-white/30">·</span>
                <span
                  title={`Property tier: ${tier.label} (${tier.arvBand})`}
                  className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200"
                >
                  {tier.label} · {tier.arvBand}
                </span>
              </>
            )
          })()}
        </div>
      </header>

      {/* PRIMARY contact panel — full skip-trace data with type/validation
          badges. Renders only when we have rich legacy skiptrace_data
          (from scripts/enrich-full-skiptrace.mjs, with persons/emails/
          relatives). When that's empty, the snapshot panel below carries
          the same phones from BatchData/inventory — no need to nag the
          rep about "missing skip-trace" when phones are already visible. */}
      {skiptraceData && skiptraceData.persons && skiptraceData.persons.length > 0 && (
        <ContactLayer data={skiptraceData} badPhones={badPhones ?? []} />
      )}

      {/* Legacy quick-action panel — kept as a backup when no skip-trace data
          is available (new bot leads pre-enrichment). Falls through to the
          old phone list pulled from the dialer inventory snapshot. */}
      {(!skiptraceData || !skiptraceData.persons || skiptraceData.persons.length === 0) && phones.length > 0 && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Tap to call (snapshot)</div>
          <div className="flex flex-wrap gap-2">
            {phones.map((p) => (
              <a
                key={p.number}
                href={`tel:${(p.number ?? "").replace(/\D/g, "")}`}
                className="inline-flex flex-col rounded-xl border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-2 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                  {p.label}
                  {p.dnc && p.dnc !== "CLEAR" && (
                    <span className="ml-1.5 text-amber-300/90">[{p.dnc}]</span>
                  )}
                </span>
                <span className="text-sm font-medium text-emerald-100">{fmtPhone(p.number)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Snapshot — 3 cards (Distress moved into header pill above to
          avoid redundancy). Order: urgency → market value → loan. */}
      <section className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card
          label="Sale Date"
          value={fmtDate(lead.currentSaleDate)}
          tone={dts !== null && dts <= 14 ? "danger" : dts !== null && dts <= 30 ? "warn" : "default"}
          subtitle={dts !== null ? `${dts}d to sale` : ""}
        />
        <Card
          label="Market Value"
          value={lead.avmMid ? fmtCurrency(lead.avmMid) : "—"}
          subtitle={
            lead.avmLow && lead.avmHigh
              ? `${fmtCurrency(lead.avmLow)} – ${fmtCurrency(lead.avmHigh)}`
              : "AVM pending"
          }
          tone={lead.avmMid ? "good" : "default"}
        />
        {(() => {
          const x = lead as DialerLeadView & {
            mortgageDefensible?: boolean
            mortgageLenderResolved?: string
            mortgageOriginationYear?: number
          }
          const lender = x.mortgageLenderResolved ?? lead.mortgageLender ?? ""
          const year = x.mortgageOriginationYear
          const subtitle = lender + (year ? ` (${year})` : "")
          return (
            <Card
              label={x.mortgageDefensible ? "Current Balance" : "Loan Amount"}
              value={fmtCurrency(lead.mortgageAmount)}
              subtitle={subtitle}
              tone={x.mortgageDefensible ? "good" : "default"}
            />
          )
        })()}
      </section>

      {/* Equity Math — the centerpiece for the seller pitch */}
      <EquityWorkup lead={lead} />

      {/* Math sheet — printable 3-path comparison to send the homeowner */}
      <Link
        href={`/dialer/${lead.slug}/math-sheet`}
        className="mt-3 block rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.06] hover:bg-emerald-400/[0.12] p-4 transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300/85 font-semibold">
              Math sheet
            </div>
            <div className="text-sm text-white mt-1">
              Open the printable 3-path comparison
            </div>
            <div className="text-[11px] text-white/55 mt-0.5">
              Trustee sale vs. wholesaler offer vs. marketed auction. Edit ARV /
              loan inputs, then Print → Save PDF → email to the homeowner.
            </div>
          </div>
          <div className="text-emerald-300 text-sm font-semibold whitespace-nowrap">
            Open →
          </div>
        </div>
      </Link>

      {/* Outreach helpers — email follow-up + SMS template */}
      <OutreachHelpers lead={lead} />

      {/* Qualified Lead delivery — operational handoff to Dale */}
      <QualifiedLeadSection lead={lead} caller={caller} onDelivered={() => router.refresh()} />

      {/* Workflow controls — primary action area (status + summary). */}
      <WorkflowSection lead={lead} caller={caller} onChange={() => router.refresh()} />

      {/* Activity log + form — log every call here. */}
      <ActivitySection lead={lead} caller={caller} onAdded={() => router.refresh()} />

      {/* MORE INFO — secondary context behind a disclosure to keep the
          primary call surface tight. Tactical callouts, sale-notice
          contacts, full FALCO data dump, and packet PDF link all live
          here. Open only when needed. */}
      <details className="mt-4 mb-12 rounded-2xl border border-white/10 bg-white/[0.02] group">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs uppercase tracking-wider text-white/55 hover:text-white/80 transition-colors flex items-center justify-between">
          <span>More info · tactical, sale notice, details, packet</span>
          <span className="text-white/30 group-open:rotate-90 transition-transform">›</span>
        </summary>
        <div className="px-1 pb-1">
          <Tactical lead={lead} />
          {(lead.saleControllerName || lead.trusteePhonePublic) && (
            <SaleNoticeSection lead={lead} />
          )}
          <DetailsSection lead={lead} />
          {lead.packetUrl ? (
            <a
              href={lead.packetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] p-3 text-center transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                Full Packet (PDF)
              </div>
              <div className="text-sm text-white mt-1">{lead.packetLabel ?? "Open packet"}</div>
            </a>
          ) : null}
        </div>
      </details>
    </>
  )
}

/** Estimate current loan payoff from original amount + age, simple amortization at 4%. */
function estimatePayoff(
  originalAmount: number | null | undefined,
  mortgageDateIso: string | null | undefined
): number | null {
  if (!originalAmount || originalAmount <= 0) return null
  if (!mortgageDateIso) return Math.round(originalAmount * 0.93) // unknown age, assume light paydown
  const start = new Date(mortgageDateIso).getTime()
  if (Number.isNaN(start)) return Math.round(originalAmount * 0.93)
  const yearsHeld = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  // Simple amortization: 30-year, 4% rate. Returns remaining principal as fraction.
  const r = 0.04 / 12
  const n = 30 * 12
  const totalPayments = Math.min(yearsHeld * 12, n)
  const remainingFactor =
    (Math.pow(1 + r, n) - Math.pow(1 + r, totalPayments)) / (Math.pow(1 + r, n) - 1)
  return Math.round(originalAmount * remainingFactor)
}

function EquityWorkup({ lead }: { lead: DialerLeadView }) {
  const avmLow = lead.avmLow ?? null
  const avmMid = lead.avmMid ?? null
  const avmHigh = lead.avmHigh ?? null
  // Enrichment fields stashed via inventoryToListing extras.
  const x = lead as DialerLeadView & {
    mortgageDefensible?: boolean
    mortgageLenderResolved?: string
    mortgageOriginationYear?: number
    mortgageOriginalPrincipal?: number
    mortgageRatePct?: number
    mortgageConfidence?: number
    equityAmount?: number
  }
  // mortgageAmount holds the AMORTIZED current balance (post-mortgage_
  // amortizer_bot run). When available, prefer it over the heuristic
  // estimatePayoff fallback. Same for the equity amount.
  const loan = lead.mortgageAmount ?? null
  const verified = x.mortgageDefensible === true
  const payoffEst = verified
    ? loan
    : estimatePayoff(loan, lead.mortgageDate ?? null)
  const originalPrincipal = x.mortgageOriginalPrincipal ?? null

  if (!avmMid && !loan) {
    return (
      <section className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/45">Equity Math</div>
        <div className="mt-1 text-xs text-white/55">
          Insufficient data to compute equity. Lead is missing valuation and/or mortgage info.
        </div>
      </section>
    )
  }

  const auctionCommissionPct = 0.09
  // Conservative equity range: low AVM minus payoff and commission, vs high AVM.
  const equityLow = avmLow && payoffEst !== null
    ? Math.max(0, Math.round(avmLow * (1 - auctionCommissionPct) - payoffEst))
    : null
  const equityHigh = avmHigh && payoffEst !== null
    ? Math.max(0, Math.round(avmHigh * (1 - auctionCommissionPct) - payoffEst))
    : null
  // Mid equity prefers the amortizer's pre-computed equity_estimate
  // when verified; falls back to AVM mid - payoff - commission.
  const equityMid = (verified && x.equityAmount !== undefined && x.equityAmount !== null)
    ? Math.max(0, Math.round(x.equityAmount - (avmMid ?? 0) * auctionCommissionPct))
    : avmMid && payoffEst !== null
    ? Math.max(0, Math.round(avmMid * (1 - auctionCommissionPct) - payoffEst))
    : null

  // Wholesaler comparison — typical 65% offer
  const wholesalerOffer = avmMid ? Math.round(avmMid * 0.65) : null
  const wholesalerNet = wholesalerOffer && payoffEst !== null
    ? Math.max(0, wholesalerOffer - payoffEst)
    : null

  return (
    <section className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-emerald-300/85 font-semibold">
          Equity Math — what to walk the seller through
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/35">
          assumes 9% auction commission
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-black/20 border border-white/8 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/55">Market Value (AVM)</div>
          <div className="mt-1 text-base font-semibold text-white">
            {avmMid ? fmtCurrency(avmMid) : "—"}
          </div>
          {avmLow && avmHigh && (
            <div className="text-[11px] text-white/45 mt-0.5">
              {fmtCurrency(avmLow)} – {fmtCurrency(avmHigh)}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-black/20 border border-white/8 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/55 flex items-center gap-1.5">
            <span>{verified ? "Current Balance" : "Est. Loan Payoff"}</span>
            {verified && (
              <span
                title={`Verified from public record · ${
                  x.mortgageLenderResolved ?? "lender confirmed"
                }`}
                className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 text-[8px] uppercase tracking-wider px-1 py-px"
              >
                ✓ verified
              </span>
            )}
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            {payoffEst !== null ? fmtCurrency(payoffEst) : "—"}
          </div>
          {/* Verified line: original principal + rate + year (if any
              of those known). Falls back to the legacy "orig + date"
              line when only mortgageDate is available. */}
          {verified && (originalPrincipal || x.mortgageOriginationYear || x.mortgageRatePct) && (
            <div className="text-[11px] text-white/45 mt-0.5">
              {originalPrincipal && `orig ${fmtCurrency(originalPrincipal)}`}
              {x.mortgageOriginationYear && ` · ${x.mortgageOriginationYear}`}
              {x.mortgageRatePct && ` @ ${x.mortgageRatePct.toFixed(2)}%`}
            </div>
          )}
          {!verified && loan && (
            <div className="text-[11px] text-white/45 mt-0.5">
              orig {fmtCurrency(loan)} ·{" "}
              {lead.mortgageDate ? `mortgaged ${fmtDate(lead.mortgageDate)}` : "date unknown"}
            </div>
          )}
          {x.mortgageLenderResolved && (
            <div className="text-[11px] text-emerald-200/70 mt-0.5 truncate">
              {x.mortgageLenderResolved}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">Est. Seller Take-Home</div>
          <div className="mt-1 text-base font-semibold text-emerald-100">
            {equityLow !== null && equityHigh !== null
              ? `${fmtCurrency(equityLow)} – ${fmtCurrency(equityHigh)}`
              : equityMid !== null
              ? fmtCurrency(equityMid)
              : "—"}
          </div>
          <div className="text-[11px] text-emerald-200/70 mt-0.5">
            after payoff & commission
          </div>
        </div>
      </div>

      {/* Three-path comparison — what to actually say on the call */}
      <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-white/55 mb-2">
          Three paths · use this on the call
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-white/65">1. Trustee sale (do nothing)</span>
            <span className="text-red-300 font-semibold">$0 – $5K</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/65">2. Wholesaler at 65% of value</span>
            <span className="text-amber-200">{wholesalerNet !== null ? fmtCurrency(wholesalerNet) : "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-emerald-200 font-semibold">3. Auction listing (us)</span>
            <span className="text-emerald-200 font-bold">
              {equityLow !== null && equityHigh !== null
                ? `${fmtCurrency(equityLow)} – ${fmtCurrency(equityHigh)}`
                : "—"}
            </span>
          </div>
        </div>
        {equityLow !== null && wholesalerNet !== null && equityLow > wholesalerNet && (
          <div className="mt-2 text-[11px] text-emerald-300/85">
            Difference: <span className="font-semibold">{fmtCurrency(equityLow - wholesalerNet)}+</span> more
            in the seller's pocket vs. the wholesaler offer.
          </div>
        )}
      </div>
    </section>
  )
}

function Tactical({ lead }: { lead: DialerLeadView }) {
  const flags: Array<{ tone: "warn" | "info" | "good"; label: string; detail: string }> = []

  // Absentee owner check
  if (lead.ownerMail && lead.address) {
    const mailNorm = lead.ownerMail.toLowerCase().replace(/\s+/g, "")
    const propNorm = lead.address.toLowerCase().replace(/\s+/g, "")
    // Absentee if mailing zip / city differs significantly
    const mailFirst20 = mailNorm.slice(0, 20)
    const propFirst20 = propNorm.slice(0, 20)
    if (!mailNorm.includes(propNorm.slice(0, 12)) && mailFirst20 !== propFirst20) {
      flags.push({
        tone: "info",
        label: "Absentee owner",
        detail: `Mail goes to ${lead.ownerMail}. They likely don't live there — easier "just want it gone" conversation.`,
      })
    }
  }

  // Owned-since — tiered by tenure. Long tenure = bigger equity story to lead with on the call.
  if (lead.lastSaleDate) {
    const years = Math.floor((Date.now() - new Date(lead.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    if (years >= 25) {
      flags.push({
        tone: "good",
        label: `Owned ${years} years — deep equity`,
        detail: `Bought ${fmtDate(lead.lastSaleDate)}. Likely near-paid-off. Lead with: "You've built serious equity in this home over ${years} years — don't lose it at the courthouse."`,
      })
    } else if (years >= 18) {
      flags.push({
        tone: "good",
        label: `Owned ${years} years — long tenure`,
        detail: `Bought ${fmtDate(lead.lastSaleDate)}. Owners at this tenure often have 60%+ equity. Anchor the call on what they stand to preserve.`,
      })
    } else if (years >= 10) {
      flags.push({
        tone: "info",
        label: `Owned ${years} years`,
        detail: `Bought ${fmtDate(lead.lastSaleDate)}. Meaningful equity built up — emphasize keeping it vs. losing it to the trustee.`,
      })
    } else if (years >= 0) {
      flags.push({
        tone: "info",
        label: `Owned ${years} years`,
        detail: `Bought ${fmtDate(lead.lastSaleDate)}. Shorter tenure — check if they owe close to market; equity may be thin.`,
      })
    }
  }

  // Urgency
  const dts = (() => {
    if (!lead.currentSaleDate) return null
    const ms = new Date(lead.currentSaleDate).getTime() - Date.now()
    return Number.isNaN(ms) ? null : Math.ceil(ms / (1000 * 60 * 60 * 24))
  })()
  if (dts !== null && dts <= 14 && dts >= 0) {
    flags.push({
      tone: "warn",
      label: `Sale in ${dts} days`,
      detail: "Tight window. Lead with urgency. Auction co. will need to push for fast lender postponement.",
    })
  }

  // DNC
  if (lead.ownerPhoneDncStatus && lead.ownerPhoneDncStatus !== "CLEAR") {
    flags.push({
      tone: "warn",
      label: `Phone DNC: ${lead.ownerPhoneDncStatus}`,
      detail: "Use text or secondary number first if available.",
    })
  }

  if (flags.length === 0) return null

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/55 mb-2">
        Tactical notes
      </div>
      <div className="space-y-2">
        {flags.map((f, i) => {
          const tone =
            f.tone === "warn"
              ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
              : f.tone === "good"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-blue-400/25 bg-blue-400/8 text-blue-100"
          return (
            <div key={i} className={`rounded-lg border p-2.5 text-xs ${tone}`}>
              <span className="font-semibold">{f.label}</span>
              <span className="ml-2 opacity-90">{f.detail}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SaleNoticeSection({ lead }: { lead: DialerLeadView }) {
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/55 mb-2">Sale Notice</div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {lead.saleControllerName && (
          <div className="flex gap-2">
            <dt className="text-white/45 w-28 shrink-0">Trustee / Atty</dt>
            <dd className="text-white/85">{lead.saleControllerName}</dd>
          </div>
        )}
        {lead.trusteePhonePublic && (
          <div className="flex gap-2">
            <dt className="text-white/45 w-28 shrink-0">Trustee phone</dt>
            <dd className="text-white/85">{fmtPhone(lead.trusteePhonePublic)}</dd>
          </div>
        )}
        {lead.currentSaleDate && (
          <div className="flex gap-2">
            <dt className="text-white/45 w-28 shrink-0">Sale date</dt>
            <dd className="text-white/85">{fmtDate(lead.currentSaleDate)}</dd>
          </div>
        )}
        {lead.originalSaleDate && lead.originalSaleDate !== lead.currentSaleDate && (
          <div className="flex gap-2">
            <dt className="text-white/45 w-28 shrink-0">Originally</dt>
            <dd className="text-white/85">{fmtDate(lead.originalSaleDate)}</dd>
          </div>
        )}
        {lead.saleStatus && (
          <div className="flex gap-2">
            <dt className="text-white/45 w-28 shrink-0">Status</dt>
            <dd className="text-white/85">{lead.saleStatus}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function Card({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string
  value: string
  subtitle?: string
  tone?: "default" | "good" | "warn" | "danger"
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : tone === "warn"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : tone === "danger"
      ? "border-red-400/30 bg-red-400/10 text-red-100"
      : "border-white/10 bg-white/[0.04] text-white"
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
      {subtitle && <div className="text-[11px] opacity-60 mt-0.5 truncate">{subtitle}</div>}
    </div>
  )
}

function WorkflowSection({
  lead,
  caller,
  onChange,
}: {
  lead: DialerLeadView
  caller: string
  onChange: () => void
}) {
  const [status, setStatus] = useState<DialerStatus>(lead.workflow.status)
  const [nextAction, setNextAction] = useState<DialerNextAction>(lead.workflow.nextAction)
  const [nextActionAt, setNextActionAt] = useState<string>(
    lead.workflow.nextActionAt ? toLocalInput(lead.workflow.nextActionAt) : ""
  )
  const [auctionCallAt, setAuctionCallAt] = useState<string>(
    lead.workflow.auctionCallAt ? toLocalInput(lead.workflow.auctionCallAt) : ""
  )
  const [summary, setSummary] = useState<string>(lead.workflow.summaryNotes ?? "")
  const [closedReason, setClosedReason] = useState<string>(lead.workflow.closedLostReason ?? "")
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(false)
    start(async () => {
      const res = await fetch("/api/dialer/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug: lead.slug,
          status,
          nextAction,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
          auctionCallAt: auctionCallAt ? new Date(auctionCallAt).toISOString() : null,
          summaryNotes: summary,
          closedLostReason: status === "closed_lost" ? closedReason : null,
          updatedBy: caller,
        }),
      })
      if (res.ok) {
        setSaved(true)
        onChange()
      }
    })
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
          Workflow
        </h2>
        {saved && <span className="text-[10px] text-emerald-300">Saved ✓</span>}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DialerStatus)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action">
          <select
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value as DialerNextAction)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {NEXT_ACTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {NEXT_ACTION_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action when">
          <input
            type="datetime-local"
            value={nextActionAt}
            onChange={(e) => setNextActionAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        <Field label="Auction co. call at">
          <input
            type="datetime-local"
            value={auctionCallAt}
            onChange={(e) => setAuctionCallAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        {status === "closed_lost" && (
          <Field label="Closed-lost reason" full>
            <input
              type="text"
              value={closedReason}
              onChange={(e) => setClosedReason(e.target.value)}
              placeholder="e.g. owner already in deal, bankruptcy, dnc"
              className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
          </Field>
        )}
        <Field label="Summary notes (overall context)" full>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Big-picture notes that survive across calls — family situation, what they want, what they fear, what to mention next time"
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60 resize-y"
          />
        </Field>
      </div>
      <button
        onClick={save}
        disabled={pending}
        className="mt-3 w-full sm:w-auto rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 transition-colors"
      >
        {pending ? "Saving…" : "Save workflow"}
      </button>
    </section>
  )
}

function ActivitySection({
  lead,
  caller,
  onAdded,
}: {
  lead: DialerLeadView
  caller: string
  onAdded: () => void
}) {
  const [channel, setChannel] = useState<DialerChannel>("call")
  const [outcome, setOutcome] = useState<DialerOutcome>("connected")
  const [notes, setNotes] = useState("")
  const [nextAction, setNextAction] = useState<DialerNextAction | "">("")
  const [nextAt, setNextAt] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await fetch("/api/dialer/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug: lead.slug,
          channel,
          outcome,
          notes,
          nextAction: nextAction || null,
          nextActionAt: nextAt ? new Date(nextAt).toISOString() : null,
          createdBy: caller,
        }),
      })
      if (res.ok) {
        setNotes("")
        setNextAction("")
        setNextAt("")
        onAdded()
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? "Failed to log activity.")
      }
    })
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
        Activity log
      </h2>
      <form onSubmit={submit} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Channel">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as DialerChannel)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Outcome">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as DialerOutcome)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" full>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What was said. Context. Anything the auction co. needs to know."
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60 resize-y"
          />
        </Field>
        <Field label="Next action (optional)">
          <select
            value={nextAction}
            onChange={(e) => setNextAction((e.target.value || "") as DialerNextAction | "")}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            <option value="">— no change —</option>
            {NEXT_ACTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {NEXT_ACTION_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action when (optional)">
          <input
            type="datetime-local"
            value={nextAt}
            onChange={(e) => setNextAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        {error && (
          <div className="sm:col-span-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 transition-colors"
          >
            {pending ? "Logging…" : "+ Log activity"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">
          History ({lead.recentActivities.length})
        </div>
        {lead.recentActivities.length === 0 && (
          <div className="text-xs text-white/40 italic py-3">
            No activity yet. Make the first call.
          </div>
        )}
        <ul className="space-y-3">
          {lead.recentActivities.map((a) => (
            <ActivityRow key={a.id} a={a} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function ActivityRow({ a }: { a: DialerActivity }) {
  return (
    <li className="rounded-lg border border-white/8 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-semibold text-white">{CHANNEL_LABELS[a.channel]}</span>
          <span className="mx-1.5 text-white/30">·</span>
          <span className="text-white/75">{OUTCOME_LABELS[a.outcome]}</span>
        </div>
        <div className="text-[11px] text-white/45 whitespace-nowrap">
          {fmtDateTime(a.occurredAt)}
        </div>
      </div>
      {a.notes && <div className="mt-1.5 text-sm text-white/85 whitespace-pre-wrap">{a.notes}</div>}
      <div className="mt-1.5 text-[11px] text-white/40">
        Logged by {a.createdBy || "—"}
        {a.nextAction && (
          <>
            {" · next: "}
            <span className="text-white/60">{NEXT_ACTION_LABELS[a.nextAction]}</span>
            {a.nextActionAt && <> @ {fmtDateTime(a.nextActionAt)}</>}
          </>
        )}
      </div>
    </li>
  )
}

function DetailsSection({ lead }: { lead: DialerLeadView }) {
  const rows: Array<[string, string]> = [
    ["Address", lead.address ?? "—"],
    ["County", lead.county ?? "—"],
    ["Property type", lead.distressType ?? "—"],
    ["Owner", lead.ownerName ?? "—"],
    ["Owner mailing", lead.ownerMail ?? "—"],
    ["Year built", lead.yearBuilt ? String(Math.floor(lead.yearBuilt)) : "—"],
    ["Sqft / Beds / Baths", `${lead.buildingAreaSqft ? Math.floor(lead.buildingAreaSqft) : "—"} / ${lead.beds ?? "—"} / ${lead.baths ?? "—"}`],
    ["Mortgage lender (current)", lead.mortgageLender ?? "—"],
    ["Mortgage amount", fmtCurrency(lead.mortgageAmount)],
    ["Mortgage date", fmtDate(lead.mortgageDate)],
    ["Last sale date", fmtDate(lead.lastSaleDate)],
    ["Trustee / Sale Controller", lead.saleControllerName ?? "—"],
    ["DNC status (primary)", lead.ownerPhoneDncStatus ?? "—"],
    ["Property ID", lead.propertyIdentifier ?? "—"],
  ]
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
        FALCO data
      </h2>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
            <dt className="text-white/55 text-xs">{k}</dt>
            <dd className="text-white/90 text-right truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Format an ISO timestamp into a value usable by <input type="datetime-local"> */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

/** ============================================================================
 *  QualifiedLeadSection
 *  ----------------------------------------------------------------------------
 *  Operational handoff to Dale at Parks. When Chris confirms an appointment,
 *  this fires the QL email to Dale with the full seller package (math sheet,
 *  contact, sale timeline, equity math). Logs the handoff for tracking.
 *
 *  Compensation is commission-based on close (65 Parks / 20 Chris / 15 FALCO),
 *  not per-QL — this action is the operational trigger, not a billing event.
 *
 *  Required to deliver:
 *    - ARV present (so the equity math in Dale's email computes correctly)
 *    - Confirmed appointment time (recommended; can be deferred)
 *    - Optional notes for Dale
 *  ========================================================================= */
function QualifiedLeadSection({
  lead,
  caller,
  onDelivered,
}: {
  lead: DialerLeadView
  caller: string
  onDelivered: () => void
}) {
  const tier = classifyTier(lead.avmMid)
  const [open, setOpen] = useState(false)
  const [appointmentAt, setAppointmentAt] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, startSubmit] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // No AVM = cannot classify tier = math sheet won't compute = don't hand off
  if (!tier) {
    return (
      <section className="mt-3 rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/[0.04] p-4">
        <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
          Hand Off to Dale
        </div>
        <div className="text-xs text-amber-100/85 mt-1">
          AVM missing — equity math won&rsquo;t compute, so Dale won&rsquo;t
          have the numbers he needs. Enrich this lead (BatchData) first.
        </div>
      </section>
    )
  }

  function submit() {
    setError(null)
    setSuccess(null)
    startSubmit(async () => {
      try {
        const res = await fetch("/api/dialer/qualify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingSlug: lead.slug,
            arv: lead.avmMid,
            appointmentAt: appointmentAt
              ? new Date(appointmentAt).toISOString()
              : null,
            notes,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          setError(json?.error || `Handoff failed (HTTP ${res.status}).`)
          return
        }
        setSuccess(
          `Sent to Dale. Lead handoff logged. Standard commission split applies on close.`
        )
        setOpen(false)
        setNotes("")
        setAppointmentAt("")
        onDelivered()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.")
      }
    })
  }

  return (
    <section className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.06] p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/85 font-semibold">
            Hand Off to Dale
          </div>
          <div className="text-sm text-white mt-1">
            {tier.label} · <span className="text-white/70">{tier.arvBand}</span>
          </div>
          <div className="text-[11px] text-white/55 mt-0.5">
            Once you&rsquo;ve confirmed an appointment with the seller, this
            sends the full lead package to Dale (math sheet, contact, sale
            timeline, equity math) and logs the handoff for tracking.
            Compensation is the standard 65/20/15 commission split on close —
            no per-QL fee.
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold whitespace-nowrap rounded-lg border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 transition-colors"
          >
            Send Qualified Lead to Dale →
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Appointment time (optional, recommended)">
              <input
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </Field>
            <Field label="Sent by">
              <input
                type="text"
                value={caller}
                disabled
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/60"
              />
            </Field>
          </div>
          <Field label="Notes for Dale (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Context for Dale: seller&rsquo;s situation, urgency, any quirks worth knowing before he calls."
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-lg border border-emerald-400/50 bg-emerald-400/20 hover:bg-emerald-400/30 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors"
            >
              {submitting ? "Sending..." : "Confirm — Send to Dale"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              disabled={submitting}
              className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
          {success}
        </div>
      )}
    </section>
  )
}

/** ============================================================================
 *  OutreachHelpers
 *  ----------------------------------------------------------------------------
 *  Free outreach actions Chris uses after a call:
 *    - "Send follow-up email" — fires a personalized email with the math
 *      sheet via Resend (only enabled if email on file).
 *    - "Copy text template" — pre-fills a personalized SMS, copies to
 *      clipboard. Chris pastes into his own phone and sends — no Twilio.
 *
 *  Auto-logs the email send as a dialer_activity for audit trail.
 *  ========================================================================= */
function OutreachHelpers({ lead }: { lead: DialerLeadView }) {
  const [emailing, startEmail] = useTransition()
  const [emailMsg, setEmailMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [openerLoading, setOpenerLoading] = useState(false)
  const [openerCopied, setOpenerCopied] = useState(false)
  const [openerPreview, setOpenerPreview] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customMessage, setCustomMessage] = useState("")

  const ownerFirst = (lead.ownerName || "").split(/\s+/)[0] || "there"
  const titleCasedFirst =
    ownerFirst === ownerFirst.toUpperCase()
      ? ownerFirst.charAt(0) + ownerFirst.slice(1).toLowerCase()
      : ownerFirst

  // Legacy soft "left you a vm" template — kept for back-compat / familiarity.
  // The brute-honest opener (preferred) is fetched live via /opener-text so
  // it always reflects current numbers + lead variant (distressed/FSBO/underwater).
  const smsTemplate = `Hi ${titleCasedFirst}, Chris with FALCO — left you a vm about ${
    lead.address ?? "your property"
  }. Worth a 5-min talk about your auction options before any decisions get made. When's good?`

  function copyToClipboard(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        },
        () => {
          setCopied(false)
        }
      )
    }
  }

  // Fetch the brute-honest opener with live numbers, copy to clipboard,
  // and (if a phone is on file) open the SMS app pre-filled. iOS / Android
  // both honor sms: URIs.
  function fetchAndCopyOpener() {
    setOpenerCopied(false)
    setOpenerPreview(null)
    setEmailMsg(null)
    setOpenerLoading(true)
    fetch(`/api/dialer/${lead.slug}/opener-text`)
      .then((r) => r.json())
      .then((json: { text?: string; smsHref?: string | null; error?: string }) => {
        if (!json.text) {
          setEmailMsg({ kind: "err", text: json.error || "Couldn't build opener." })
          return
        }
        setOpenerPreview(json.text)
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(json.text).catch(() => {})
        }
        setOpenerCopied(true)
        setTimeout(() => setOpenerCopied(false), 4000)
        // If we have the homeowner's phone, open the SMS app pre-filled.
        // Patrick taps Send.
        if (json.smsHref) {
          window.location.href = json.smsHref
        }
      })
      .catch((err) => {
        setEmailMsg({
          kind: "err",
          text: err instanceof Error ? err.message : "Network error.",
        })
      })
      .finally(() => setOpenerLoading(false))
  }

  function downloadMathPdf() {
    window.open(`/api/dialer/${lead.slug}/math-pdf`, "_blank")
  }

  // Open the math sheet as a PNG in a new tab. Patrick saves to camera
  // roll (long-press on iOS, "Download image" on desktop), then attaches
  // to the iMessage when sending the opener. Image renders inline in the
  // conversation — no link, no tap-to-load, no phishing pattern.
  function downloadMathImage() {
    window.open(`/api/dialer/${lead.slug}/math-png`, "_blank")
  }

  function sendEmail() {
    setEmailMsg(null)
    startEmail(async () => {
      try {
        const res = await fetch("/api/dialer/send-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingSlug: lead.slug,
            customMessage: customMessage.trim() || undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          setEmailMsg({
            kind: "err",
            text: json?.error || `Send failed (HTTP ${res.status}).`,
          })
          return
        }
        setEmailMsg({
          kind: "ok",
          text: `Sent to ${json.sentTo}. Logged as activity.`,
        })
        setCustomMessage("")
        setShowCustom(false)
      } catch (err) {
        setEmailMsg({
          kind: "err",
          text: err instanceof Error ? err.message : "Network error.",
        })
      }
    })
  }

  const hasEmail = !!lead.ownerMail

  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/55 mb-2 font-semibold">
        Quick Outreach
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Step 1: Download the math sheet AS AN IMAGE.
            On iPhone: long-press the image → Save to Photos.
            On desktop: right-click → Save image. AirDrop / share to phone. */}
        <button
          type="button"
          onClick={downloadMathImage}
          title="Step 1 — opens the math sheet as a PNG. Long-press on iPhone to Save to Photos. This is what you'll attach to the opener text."
          className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 hover:bg-emerald-400/25 px-3 py-1.5 text-sm text-emerald-100 font-semibold transition-colors"
        >
          🖼️ 1. Download math image
        </button>

        {/* Step 2: Open the opener text — short, no math, attach the image
            from camera roll when iMessage opens. */}
        <button
          type="button"
          onClick={fetchAndCopyOpener}
          disabled={openerLoading}
          title="Step 2 — copies the brutal-short opener text and opens iMessage. After it opens, tap the camera/photo icon and attach the math image you just saved."
          className="rounded-lg border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm text-amber-100 font-semibold transition-colors"
        >
          {openerLoading
            ? "Building..."
            : openerCopied
            ? "✓ Text copied & SMS opened — attach the image"
            : "📲 2. Send opener text"}
        </button>

        {/* Hidden by default — PDF is currently flaky on serverless.
            The PNG image (button 1) covers SMS, email attachment, AND
            print just as well, so the PDF is non-essential. Re-enable
            if/when pdfkit-on-Vercel is fixed. */}
        {/* <button
          type="button"
          onClick={downloadMathPdf}
          title="PDF version — currently disabled (use the image instead)."
          className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-white/40 transition-colors"
        >
          📄 PDF (legacy)
        </button> */}

        {/* Send follow-up email — for warm leads who already replied */}
        <button
          type="button"
          onClick={sendEmail}
          disabled={!hasEmail || emailing}
          title={
            hasEmail
              ? "Send the long-form math-sheet email (use after they reply to the opener)"
              : "No email on file for this lead"
          }
          className="rounded-lg border border-blue-400/35 bg-blue-400/10 hover:bg-blue-400/20 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm text-blue-100 transition-colors"
        >
          {emailing
            ? "Sending..."
            : hasEmail
            ? "📧 Send follow-up email"
            : "📧 No email on file"}
        </button>

        {hasEmail && !showCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="text-[11px] text-white/45 hover:text-white/70 underline underline-offset-2"
          >
            add custom note
          </button>
        )}

        {/* Legacy soft SMS template — collapsed under "More" */}
        <button
          type="button"
          onClick={() => copyToClipboard(smsTemplate)}
          title="Soft 'left you a vm' template. The opener text above is preferred for first contact."
          className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-white/55 transition-colors"
        >
          {copied ? "✓ soft vm template copied" : "soft vm template"}
        </button>
      </div>

      {/* Live preview of the opener after fetch */}
      {openerPreview && (
        <div className="mt-3 rounded-md bg-amber-950/30 border border-amber-400/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1.5 font-semibold">
            Opener (copied to clipboard)
          </div>
          <pre className="whitespace-pre-wrap text-[12px] text-amber-50/90 leading-relaxed font-sans">
            {openerPreview}
          </pre>
        </div>
      )}

      {showCustom && hasEmail && (
        <div className="mt-3">
          <Field label="Custom note (optional, gets inserted into the email body)">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              placeholder="e.g. 'You mentioned you'd want to keep the house — here are options that might preserve it.'"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </Field>
        </div>
      )}

      {emailMsg && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            emailMsg.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-red-400/30 bg-red-400/10 text-red-200"
          }`}
        >
          {emailMsg.text}
        </div>
      )}

      {/* SMS template preview, collapsed under the buttons */}
      <details className="mt-2">
        <summary className="text-[11px] text-white/45 hover:text-white/70 cursor-pointer">
          preview SMS template
        </summary>
        <div className="mt-1 rounded-md bg-black/30 border border-white/8 px-3 py-2 text-[12px] text-white/75 leading-relaxed font-mono">
          {smsTemplate}
        </div>
      </details>
    </section>
  )
}
