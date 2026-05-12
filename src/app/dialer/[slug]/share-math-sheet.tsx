// Compact one-page math sheet for SMS attachment. Renders ~1/4 the
// height of the full MathSheetContent at 380px wide so it fits any
// iPhone iMessage preview without scrolling. Same scenario-aware
// hero language and underlying math, just trimmed to the bottom-line
// + 3 outcome cards + footer.
//
// Used by the "compact math" share button on lead-detail. The
// original full math sheet is still available via the existing share
// button for operators who want the detailed reference.

"use client"

import {
  computeMath,
  defaultInputsFor,
  fmt,
  type MathInputs,
} from "@/lib/math-sheet"
import { foreclosureHeroLine } from "@/lib/foreclosure-language"
import {
  resolveScenario,
  type Scenario,
} from "@/app/admin/math-sheet/[id]/scenario-config"
import type { HomeownerSnapshot } from "@/app/admin/math-sheet/[id]/math-sheet-content"

/** Inline duplicate of estimateRebuildCost so this client component
 *  doesn't pull in the math-sheet/[id] module's full data extractor.
 *  $200/sqft TN baseline; 2,000 sqft fallback when sqft missing. */
function estimateRebuildCostInline(sqft: number | null | undefined): number {
  const s = sqft && sqft > 0 ? sqft : 2000
  return Math.round(s * 200)
}

function daysBetween(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / 86400000)
}

function fmtDateHuman(iso: string | null | undefined): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

function Card({
  eyebrow,
  value,
  sub,
  tone,
}: {
  eyebrow: string
  value: string
  sub: string
  tone: "loss" | "meh" | "win"
}) {
  const palette = {
    loss: { border: "#fecaca", bg: "#fef2f2", value: "#b91c1c" },
    meh: { border: "#e5e5e5", bg: "#fafaf9", value: "#171717" },
    win: { border: "#34d399", bg: "#ecfdf5", value: "#047857" },
  }[tone]
  return (
    <div
      style={{
        padding: "8px 10px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          fontWeight: 700,
          color: "#737373",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 16,
          fontWeight: 700,
          color: palette.value,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: 10,
          color: "#525252",
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
    </div>
  )
}

export function ShareMathSheet({
  snapshot,
}: {
  snapshot: HomeownerSnapshot
}) {
  const cfg = resolveScenario(snapshot.distressType, null)
  const arv =
    snapshot.propertyValue && snapshot.propertyValue > 0
      ? snapshot.propertyValue
      : snapshot.mortgageBalance
      ? Math.round((snapshot.mortgageBalance * 1.6) / 1000) * 1000
      : 400000
  const loanBalance = snapshot.mortgageBalance ?? 0
  const seed = defaultInputsFor(arv, loanBalance)

  const isCv = cfg.scenario === "code_violation"
  const isDemo = cfg.scenario === "demolition"

  // Demo / rehab seed — same logic as MathSheetContent.demoDefaults but
  // condensed for the compact share sheet. Subtype controls auction
  // clearance + which cost legs are populated.
  const demoSubtype = snapshot.demolition?.subtype ?? "unknown"
  const demoPermitCost = snapshot.demolition?.constCost ?? 0
  const demoFields = isDemo
    ? demoSubtype === "fire_damage" || demoSubtype === "storm_damage"
      ? {
          auctionMin: 0.55,
          auctionMax: 0.65,
          demolitionCost: 0,
          constructionCost: demoPermitCost > 0 ? demoPermitCost : 75_000,
          constructionMonths: 6,
        }
      : demoSubtype === "teardown" || demoSubtype === "major_rebuild"
      ? {
          auctionMin: 0.62,
          auctionMax: 0.72,
          demolitionCost: demoPermitCost > 0 ? demoPermitCost : 12_000,
          constructionCost: estimateRebuildCostInline(snapshot.sqft ?? null),
          constructionMonths: 14,
        }
      : {
          auctionMin: 0.65,
          auctionMax: 0.78,
          demolitionCost: demoPermitCost > 0 ? demoPermitCost : 0,
          constructionCost: 0,
          constructionMonths: 0,
        }
    : null

  const inputs: MathInputs = {
    arv,
    loanBalance,
    repairs: isCv ? 30000 : seed.repairs,
    assignmentFee: seed.assignmentFee,
    investorMargin: seed.investorMargin,
    closingCosts: seed.closingCosts,
    buyerPremiumPct: seed.buyerPremiumPct,
    auctionMinPct: isCv ? 0.65 : demoFields?.auctionMin ?? seed.auctionMinPct,
    auctionMaxPct: isCv ? 0.75 : demoFields?.auctionMax ?? seed.auctionMaxPct,
    auctionWorstPct: seed.auctionWorstPct,
    wholesalerMaoPct: seed.wholesalerMaoPct,
    wholesalerStretchPct: seed.wholesalerStretchPct,
    taxLienAmount: 0,
    monthlyFineAccrual: isCv ? 1500 : 0,
    repairMonths: isCv ? 3 : 0,
    applyTrusteeFee: cfg.applyTrusteeFee,
    mlsClearancePct: seed.mlsClearancePct,
    mlsCommissionPct: seed.mlsCommissionPct,
    mlsCarryingPerMonth: seed.mlsCarryingPerMonth,
    mlsCarryingMonths: seed.mlsCarryingMonths,
    demolitionCost: demoFields?.demolitionCost ?? 0,
    constructionCost: demoFields?.constructionCost ?? 0,
    constructionMonths: demoFields?.constructionMonths ?? 0,
    constructionCarryPerMonth: seed.constructionCarryPerMonth,
  }
  const out = computeMath(inputs)

  // Honor the manual sale-status flag the same way MathSheetContent
  // does — cancelled / reinstated / ran override the days-to-sale.
  const ts = snapshot.trusteeSaleStatus
  const dts =
    ts === "cancelled" || ts === "reinstated"
      ? null
      : ts === "ran"
      ? -1
      : daysBetween(snapshot.trusteeSaleDate)

  const isFc = cfg.scenario === "foreclosure"
  const auctionLow = out.auction.low.netToHomeowner
  const auctionHigh = out.auction.high.netToHomeowner
  const range =
    out.auction.netRangeLabel ||
    `${fmt(auctionLow)} – ${fmt(auctionHigh)}`
  const heroTemplate = isFc ? foreclosureHeroLine(dts) : cfg.heroLine
  const heroChunks = heroTemplate.split("{range}")
  const equity = arv - loanBalance

  const wholesalerNet = out.wholesaler.realisticNet
  const wholesalerLabel =
    wholesalerNet > 0 ? fmt(wholesalerNet) : "$0 (offer below loan)"

  const doNothingEyebrow = isDemo
    ? "Stay the course"
    : isCv
    ? "Self-remediate"
    : "Do nothing"
  const doNothingValue = isDemo
    ? `− ${fmt(out.demoRoute.totalOutOfPocket)}`
    : isCv
    ? fmt(out.selfRemediate.netToHomeowner)
    : "$0"
  const doNothingSub = isDemo
    ? `Demo + construction + ${out.demoRoute.constructionMonths} mo of carry — that's the commitment before any cash returns.`
    : isCv
    ? "Fines keep accruing. Liens stack. Eventually the city forces the sale and you get nothing."
    : "Bank takes it at the trustee sale. Equity wiped out."

  const auctionSub = isDemo
    ? "Open competition. State-licensed auctioneer. Investor-buyers take on the demo or rehab. Closes in 30–45 days. No commission from you."
    : isCv
    ? "Open competition. State-licensed auctioneer. Investor pool buys as-is, violations transfer at closing. Closes in 30–45 days. No commission from you."
    : "Open competition. State-licensed auctioneer. Closes in 30–45 days. No commission from you."

  return (
    <article
      className="share-math-sheet"
      style={{
        width: 380,
        background: "#fff",
        color: "#171717",
        padding: "16px 14px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.32em",
          fontWeight: 700,
          color: "#047857",
          textTransform: "uppercase",
        }}
      >
        {cfg.headerEyebrow}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.25,
        }}
      >
        {snapshot.propertyAddress || "—"}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: "#525252" }}>
        {snapshot.county || "—"} County
        {snapshot.trusteeSaleDate &&
          ` · ${cfg.dateFieldLabel.toLowerCase()} ${fmtDateHuman(
            snapshot.trusteeSaleDate
          )}${dts !== null ? ` (${dts}d)` : ""}`}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          padding: "8px 10px",
          background: "#f5f5f4",
          borderRadius: 6,
          fontSize: 10,
        }}
      >
        <FactCol label="ARV" value={fmt(arv)} />
        <FactCol label="Mortgage" value={fmt(loanBalance)} />
        <FactCol
          label="Equity"
          value={fmt(equity)}
          valueColor={equity > 0 ? "#047857" : "#b91c1c"}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "12px 12px",
          border: "1.5px solid #34d399",
          borderRadius: 8,
          background: "#ecfdf5",
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            fontWeight: 700,
            color: "#047857",
            textTransform: "uppercase",
          }}
        >
          The bottom line
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "#0f172a",
          }}
        >
          {heroChunks.map((chunk, i, arr) => (
            <span key={i}>
              {chunk}
              {i < arr.length - 1 && (
                <span
                  style={{
                    color: "#047857",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {range}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
        }}
      >
        <Card
          eyebrow={doNothingEyebrow}
          value={doNothingValue}
          tone="loss"
          sub={doNothingSub}
        />
        <Card
          eyebrow="Wholesaler offer"
          value={wholesalerLabel}
          tone="meh"
          sub="Cash offer, fast close. They deduct repairs + their margin."
        />
        <Card
          eyebrow="Marketed auction"
          value={range}
          tone="win"
          sub={auctionSub}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 8,
          borderTop: "1px solid #e5e5e5",
          fontSize: 9,
          color: "#737373",
          lineHeight: 1.5,
        }}
      >
        Estimates from public records + standard market assumptions.
        Confirm payoff with your servicer before any decision.
      </div>

      {/* Contact block — name + phone + emails so recipient has a
          callback path without needing a business card. Emerald-
          bordered to match the printable sheet's contact card. */}
      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          border: "1.5px solid #34d399",
          borderRadius: 6,
          background: "#ecfdf5",
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            fontWeight: 700,
            color: "#047857",
            textTransform: "uppercase",
          }}
        >
          How to reach me
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 13,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.2,
          }}
        >
          Patrick Yuri Armour
        </div>
        <div
          style={{
            marginTop: 5,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            fontSize: 10,
            color: "#171717",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.14em",
                fontWeight: 700,
                color: "#737373",
                textTransform: "uppercase",
              }}
            >
              Phone / text
            </div>
            <div style={{ marginTop: 1, fontWeight: 600 }}>601-213-8868</div>
          </div>
          <div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.14em",
                fontWeight: 700,
                color: "#737373",
                textTransform: "uppercase",
              }}
            >
              Email
            </div>
            <div style={{ marginTop: 1 }}>falco@falco.llc</div>
            <div style={{ color: "#525252" }}>yuriarmour@gmail.com</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            color: "#525252",
          }}
        >
          falco.llc · Nashville, TN
        </div>
      </div>
    </article>
  )
}

function FactCol({
  label,
  value,
  valueColor = "#171717",
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div>
      <div
        style={{
          color: "#737373",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: 12, color: valueColor }}>
        {value}
      </div>
    </div>
  )
}

// Re-export for convenience: the scenario module exposes the type.
export type { Scenario }
