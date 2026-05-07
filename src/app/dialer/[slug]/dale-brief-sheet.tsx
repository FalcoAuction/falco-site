// Operator-facing one-pager for the auction partner (Dale). Renders
// just the numbers — no narrative, no homeowner-facing framing. Used
// by the "Share to Dale" button on lead-detail. Same single-column
// 380px-wide layout as the embed-narrow math sheet so the captured
// PNG fits any iPhone iMessage preview without right-edge clipping.
//
// Inputs are rough by design — Dale verifies actual payoff with the
// servicer on the call. We surface the discrepancy when the
// pipeline-amortized balance differs materially from the DB column.

"use client"

import { useMemo } from "react"

export type DaleBrief = {
  propertyAddress: string
  county: string
  trusteeSaleDate: string | null
  arv: number | null
  mortgageBalance: number | null
  /** From phone_metadata.mortgage_balance_amortized.current_balance.
   *  Surfaced as a "verify w/ servicer" flag when it differs from
   *  mortgageBalance by > 15%. Null when the amortizer hasn't run. */
  amortizedBalance?: number | null
  servicer?: string | null
  ownerPhone?: string | null
}

function fmtUsd(n: number | null | undefined, signed = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  if (n < 0) return `-${formatted}`
  if (signed && n > 0) return `+${formatted}`
  return formatted
}

function fmtDateHuman(iso: string | null): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

function daysToSale(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const CLOSING = 5000
const WHOLESALER_PCT = 0.55
const REPAIRS = 25000
const ASSIGN_FEE = 5000
const INVESTOR_MARGIN = 40000
const BUYER_PREMIUM_PCT = 0.10
const AUCTION_PCTS = [0.70, 0.80, 0.88] as const

/**
 * Compute Dale-side scenarios from the lead's basic facts. Pure —
 * shared between the on-screen render and any future server route.
 */
function computeScenarios(arv: number, mortgage: number) {
  const wholesalerCash =
    arv * WHOLESALER_PCT - REPAIRS - ASSIGN_FEE - INVESTOR_MARGIN
  const wholesalerNetToSeller = wholesalerCash - mortgage

  const auctionRows = AUCTION_PCTS.map((pct) => {
    const winningBid = arv * pct
    const netToSeller = winningBid - mortgage - CLOSING
    const buyerPremium = winningBid * BUYER_PREMIUM_PCT
    return { pct, winningBid, netToSeller, buyerPremium }
  })

  return { wholesalerCash, wholesalerNetToSeller, auctionRows }
}

export default function DaleBriefSheet({ brief }: { brief: DaleBrief }) {
  const arv = brief.arv ?? 0
  const dbMortgage = brief.mortgageBalance ?? 0
  const amortMortgage = brief.amortizedBalance ?? null
  const dts = daysToSale(brief.trusteeSaleDate)

  // Surface the amortized estimate as a sanity-check column only when
  // it differs from the DB by > 15% — Dale doesn't need a "twin"
  // column when the two sources agree.
  const balanceDiscrepancy =
    amortMortgage !== null &&
    dbMortgage > 0 &&
    Math.abs(amortMortgage - dbMortgage) / dbMortgage > 0.15

  const primary = useMemo(
    () => computeScenarios(arv, dbMortgage),
    [arv, dbMortgage]
  )
  const alt = useMemo(
    () => (balanceDiscrepancy ? computeScenarios(arv, amortMortgage as number) : null),
    [arv, amortMortgage, balanceDiscrepancy]
  )

  return (
    <article className="dale-sheet bg-white text-neutral-900">
      <header className="border-b border-neutral-300 pb-2.5">
        <div className="text-[10px] tracking-[0.32em] uppercase font-bold text-emerald-700">
          FALCO · LEAD BRIEF
        </div>
        <div className="mt-1 text-[14px] font-semibold leading-tight">
          {brief.propertyAddress || "—"}
        </div>
        <div className="text-[12px] text-neutral-700">
          {brief.county || "—"}
          {brief.trusteeSaleDate
            ? ` · trustee sale ${fmtDateHuman(brief.trusteeSaleDate)}${
                dts !== null ? ` (${dts}d)` : ""
              }`
            : ""}
        </div>
        {(brief.servicer || brief.ownerPhone) && (
          <div className="text-[12px] text-neutral-700 mt-0.5">
            {brief.servicer ? `Servicer: ${brief.servicer}` : ""}
            {brief.servicer && brief.ownerPhone ? " · " : ""}
            {brief.ownerPhone ? `Owner: ${brief.ownerPhone}` : ""}
          </div>
        )}
      </header>

      <section className="mt-3">
        <Row label="ARV (AVM)" value={fmtUsd(arv)} />
        <Row label="Mortgage balance" value={fmtUsd(dbMortgage)} />
        {balanceDiscrepancy && (
          <Row
            label="Amortized estimate"
            value={fmtUsd(amortMortgage)}
            note="verify w/ servicer"
          />
        )}
        <Row
          label="Equity (DB)"
          value={fmtUsd(arv - dbMortgage)}
          bold
        />
      </section>

      <section className="mt-4">
        <SectionTitle>
          Auction net to seller{balanceDiscrepancy ? " (DB balance)" : ""}
        </SectionTitle>
        <Table
          rows={primary.auctionRows.map((r) => ({
            label: `${Math.round(r.pct * 100)}% clear · ${fmtUsd(r.winningBid)}`,
            value: fmtUsd(r.netToSeller),
          }))}
        />
      </section>

      {alt && (
        <section className="mt-3">
          <SectionTitle>
            Auction net to seller (amortized balance — pessimistic)
          </SectionTitle>
          <Table
            rows={alt.auctionRows.map((r) => ({
              label: `${Math.round(r.pct * 100)}% clear · ${fmtUsd(r.winningBid)}`,
              value: fmtUsd(r.netToSeller),
            }))}
          />
        </section>
      )}

      <section className="mt-4">
        <SectionTitle>Comparator outcomes</SectionTitle>
        <Table
          rows={[
            {
              label: "Wholesaler standard offer",
              value: fmtUsd(primary.wholesalerNetToSeller),
            },
            { label: "Trustee sale (do nothing)", value: "$0" },
          ]}
        />
      </section>

      <section className="mt-4">
        <SectionTitle>Buyer&apos;s premium (firm revenue)</SectionTitle>
        <Table
          rows={primary.auctionRows.map((r) => ({
            label: `@${Math.round(r.pct * 100)}%`,
            value: fmtUsd(r.buyerPremium),
          }))}
        />
      </section>

      <footer className="mt-4 pt-3 border-t border-neutral-300 text-[10px] text-neutral-500 leading-snug">
        Closing costs $5K · Wholesaler model: 55% ARV − $25K repairs − $5K
        assign − $40K margin · Buyer premium 10% paid by buyer.
      </footer>
    </article>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-neutral-600 mb-1.5">
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  bold = false,
  note,
}: {
  label: string
  value: string
  bold?: boolean
  note?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-dashed border-neutral-200 text-[12px]">
      <div className="text-neutral-700">
        {label}
        {note && (
          <span className="ml-1.5 text-[10px] text-amber-700 italic">
            ({note})
          </span>
        )}
      </div>
      <div
        className={`tabular-nums ${
          bold ? "font-semibold text-neutral-900" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function Table({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-3 py-1 border-b border-dashed border-neutral-200 text-[12px]"
        >
          <div className="text-neutral-700">{r.label}</div>
          <div className="tabular-nums font-semibold text-neutral-900">
            {r.value}
          </div>
        </div>
      ))}
    </div>
  )
}
