"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  computeMath,
  defaultInputsFor,
  fmt,
  fmtSigned,
  type MathInputs,
} from "@/lib/math-sheet"
import { resolveScenario, type Scenario } from "./scenario-config"
import {
  daysSince,
  estimateFineAccrual,
  type CodeViolationData,
} from "./code-violation-data"
import {
  estimateRebuildCost,
  type DemolitionData,
} from "./demolition-data"
import {
  foreclosureHeroLine,
  foreclosureSpreadComparator,
} from "@/lib/foreclosure-language"

export type HomeownerSnapshot = {
  id: string
  fullName: string
  email: string
  phone: string
  propertyAddress: string
  county: string
  trusteeSaleDate: string | null
  mortgageBalance: number | null
  submittedAt: string
  /** Pipeline-enriched ARV (e.g. ATTOM AVM). Defaults math-sheet ARV input
   *  when present, falling back to mortgage × 1.6 when absent. */
  propertyValue: number | null
  propertyValueSource: string | null
  /** Pipeline distress_type — drives per-scenario framing on the printed
   *  sheet. Null/unknown falls back to foreclosure (the default flow). */
  distressType?: string | null
  /** Code-violation specifics extracted from raw_payload (Nashville
   *  Metro Codes / Memphis 311 / etc.) by extractCodeViolationData().
   *  Null for non-CV leads. */
  codeViolation?: CodeViolationData | null
  /** Demolition / fire-rehab specifics extracted from raw_payload
   *  (davidson_demolition_bot) by extractDemolitionData(). Null for
   *  non-demolition leads. Powers the "stay the course" Path 1 cost
   *  projection on demolition-scenario sheets. */
  demolition?: DemolitionData | null
  /** Building square footage from assessor enrichment. Used to estimate
   *  new-construction cost (sqft × $200/sqft TN baseline) for the
   *  teardown subtype of the demolition scenario. */
  sqft?: number | null
  /** Manual trustee-sale status override set via /api/dialer/[slug]/sale-status.
   *  When `cancelled` or `reinstated`, the foreclosure hero falls back to the
   *  unscheduled framing (no urgency pitch). When `ran`, it falls back to
   *  past-sale framing. `postponed` is a no-op here because the underlying
   *  trustee_sale_date column has already been updated to the new date. */
  trusteeSaleStatus?: "cancelled" | "postponed" | "ran" | "reinstated" | null
}

function fmtDateHuman(iso: string | null): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export default function MathSheetContent({
  homeowner,
  backHref = "/admin",
  backLabel = "← Admin",
  scenarioOverride,
  embed = false,
}: {
  homeowner: HomeownerSnapshot
  /** Where the chrome back-link goes. Defaults to /admin so the
   *  /admin/math-sheet/[id] route works without changes. The dialer
   *  passes the lead URL so callers don't get bounced to admin. */
  backHref?: string
  backLabel?: string
  /** Force a specific scenario regardless of homeowner.distressType.
   *  Used by the BK pre-petition / § 363 toggle (?view=...). */
  scenarioOverride?: Scenario | null
  /** When true (?embed=1), strips the dark chrome bar + input panel and
   *  renders only the printable sheet. Used by the off-screen iframe in
   *  the lead-page share flow so html-to-image captures a clean PNG. */
  embed?: boolean
}) {
  // Toggle URL is built client-side from the current pathname — passing
  // a function from the server page would crash the RSC boundary
  // ("Functions cannot be passed directly to Client Components").
  const pathname = usePathname()
  // ARV default priority:
  //   1. Pipeline-synced property_value (best — already an AVM from ATTOM)
  //   2. Loan balance × 1.6 (60% LTV guess) when no AVM yet
  //   3. $400K when neither is known
  const pipelineArv =
    homeowner.propertyValue && homeowner.propertyValue > 0 ? homeowner.propertyValue : null
  const hasPipelineArv = pipelineArv !== null
  const arvDefault =
    hasPipelineArv
      ? Math.round(pipelineArv / 1000) * 1000
      : homeowner.mortgageBalance
      ? Math.round((homeowner.mortgageBalance * 1.6) / 1000) * 1000
      : 400000
  const arvSourceLabel = hasPipelineArv
    ? homeowner.propertyValueSource || "Pipeline property value"
    : homeowner.mortgageBalance
    ? "Fallback estimate: loan balance / 0.60"
    : "Fallback estimate: default $400K"
  // Compute property-aware defaults (deductions scale with ARV so the
  // model is sensible across $100K Memphis properties → $1M Nashville).
  const seed = defaultInputsFor(arvDefault, homeowner.mortgageBalance ?? 0)
  const baseWholesalePct = fmtPct(seed.wholesalerMaoPct)
  const stretchWholesalePct = fmtPct(seed.wholesalerStretchPct)

  // Per-scenario framing + scenario-aware default seeds. Need to compute
  // these BEFORE useState so the seeds can flow in. Code-violation auction
  // clears at 65–75% (vs 80–88% standard) because investors price in
  // their repair budget; repair / fine defaults seed the self-remediate
  // model. (The framing-level scenarioCfg is resolved again below for
  // copy purposes — it's pure, so the duplicate compute is fine.)
  const scenarioCfgInit = resolveScenario(homeowner.distressType, scenarioOverride)
  const isCodeViolation = scenarioCfgInit.scenario === "code_violation"
  const isDemolition = scenarioCfgInit.scenario === "demolition"
  const cvDefaults = isCodeViolation
    ? {
        auctionMin: 0.65,
        auctionMax: 0.75,
        repairs: 30000,
        monthlyFineAccrual: 1500,
        repairMonths: 3,
      }
    : null

  // Demolition / fire-rehab seed defaults. Subtype drives the math:
  //   teardown / major_rebuild  → demo cost from permit + sqft-modeled
  //                               new-construction over 14 months
  //   fire_damage / storm_damage → permit Const_Cost is the rehab budget
  //                               (no demo phase) over 6 months
  //   unknown                    → no seed; rep enters values manually
  // Auction clearance also tightens for demolition (60-72%) because
  // investor-buyers price in their teardown / rehab cost.
  const demoDefaults = isDemolition
    ? (() => {
        const subtype = homeowner.demolition?.subtype ?? "unknown"
        const permitCost = homeowner.demolition?.constCost ?? 0
        if (subtype === "teardown" || subtype === "major_rebuild") {
          return {
            auctionMin: 0.62,
            auctionMax: 0.72,
            demolitionCost: permitCost > 0 ? permitCost : 12_000,
            constructionCost: estimateRebuildCost(homeowner.sqft, 200),
            constructionMonths: 14,
            constructionCarryPerMonth: 1500,
          }
        }
        if (subtype === "fire_damage" || subtype === "storm_damage") {
          return {
            auctionMin: 0.55,
            auctionMax: 0.65,
            demolitionCost: 0,
            constructionCost: permitCost > 0 ? permitCost : 75_000,
            constructionMonths: 6,
            constructionCarryPerMonth: 1500,
          }
        }
        return {
          auctionMin: 0.65,
          auctionMax: 0.78,
          demolitionCost: permitCost > 0 ? permitCost : 0,
          constructionCost: 0,
          constructionMonths: 0,
          constructionCarryPerMonth: 1500,
        }
      })()
    : null

  const [arv, setArv] = useState<number>(arvDefault)
  const [arvManuallyEdited, setArvManuallyEdited] = useState<boolean>(false)
  const [loanBalance, setLoanBalance] = useState<number>(homeowner.mortgageBalance ?? 0)
  const [repairs, setRepairs] = useState<number>(cvDefaults?.repairs ?? seed.repairs)
  const [assignmentFee, setAssignmentFee] = useState<number>(seed.assignmentFee)
  const [investorMargin, setInvestorMargin] = useState<number>(seed.investorMargin)
  const [closingCosts, setClosingCosts] = useState<number>(seed.closingCosts)
  const [auctionMinPct, setAuctionMinPct] = useState<number>(
    cvDefaults?.auctionMin ?? demoDefaults?.auctionMin ?? seed.auctionMinPct
  )
  const [auctionMaxPct, setAuctionMaxPct] = useState<number>(
    cvDefaults?.auctionMax ?? demoDefaults?.auctionMax ?? seed.auctionMaxPct
  )
  const [taxLienAmount, setTaxLienAmount] = useState<number>(0)
  const [monthlyFineAccrual, setMonthlyFineAccrual] = useState<number>(
    cvDefaults?.monthlyFineAccrual ?? 0
  )
  const [repairMonths, setRepairMonths] = useState<number>(
    cvDefaults?.repairMonths ?? 0
  )
  const [demolitionCost, setDemolitionCost] = useState<number>(
    demoDefaults?.demolitionCost ?? 0
  )
  const [constructionCost, setConstructionCost] = useState<number>(
    demoDefaults?.constructionCost ?? 0
  )
  const [constructionMonths, setConstructionMonths] = useState<number>(
    demoDefaults?.constructionMonths ?? 0
  )

  // Per-scenario framing (probate / code violation / FSBO / etc.) drives
  // the eyebrow, hero line, Path 1 card, and section intros. The math
  // engine is unchanged — only the copy and labels swap.
  const scenarioCfg = scenarioCfgInit

  // Foreclosure hero is sale-date-aware: a homeowner with 60 days to
  // sale needs different framing than one with 12 days. We override
  // scenarioCfg.heroLine + spreadComparator only for foreclosure
  // scenarios (the others — probate, BK, etc. — are sale-date-agnostic).
  const daysToSale = (() => {
    // Manual overrides win — caller talked to the homeowner and confirmed
    // the sale was cancelled / borrower reinstated / sale already ran.
    const ts = homeowner.trusteeSaleStatus
    if (ts === "cancelled" || ts === "reinstated") return null
    if (ts === "ran") return -1
    if (!homeowner.trusteeSaleDate) return null
    const ms = new Date(homeowner.trusteeSaleDate).getTime() - Date.now()
    if (Number.isNaN(ms)) return null
    return Math.ceil(ms / (1000 * 60 * 60 * 24))
  })()
  const isForeclosure = scenarioCfg.scenario === "foreclosure"
  const effectiveHeroLine = isForeclosure
    ? foreclosureHeroLine(daysToSale)
    : scenarioCfg.heroLine
  const effectiveSpreadComparator = isForeclosure
    ? foreclosureSpreadComparator(daysToSale)
    : scenarioCfg.spreadComparator

  const inputs: MathInputs = {
    arv,
    loanBalance,
    repairs,
    assignmentFee,
    investorMargin,
    closingCosts,
    buyerPremiumPct: seed.buyerPremiumPct,
    auctionMinPct,
    auctionMaxPct,
    auctionWorstPct: seed.auctionWorstPct,
    wholesalerMaoPct: seed.wholesalerMaoPct,
    wholesalerStretchPct: seed.wholesalerStretchPct,
    taxLienAmount,
    monthlyFineAccrual,
    repairMonths,
    applyTrusteeFee: scenarioCfg.applyTrusteeFee,
    mlsClearancePct: seed.mlsClearancePct,
    mlsCommissionPct: seed.mlsCommissionPct,
    mlsCarryingPerMonth: seed.mlsCarryingPerMonth,
    mlsCarryingMonths: seed.mlsCarryingMonths,
    demolitionCost,
    constructionCost,
    constructionMonths,
    constructionCarryPerMonth:
      demoDefaults?.constructionCarryPerMonth ?? seed.constructionCarryPerMonth,
  }
  const out = useMemo(() => computeMath(inputs), [inputs])
  const arvNeedsVerification = !hasPipelineArv && !arvManuallyEdited
  const handlePrint = () => {
    if (arvNeedsVerification) {
      window.alert(
        "Verify ARV before sending: this sheet is using a fallback value, not a pipeline AVM or comp."
      )
      return
    }
    window.print()
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 print:bg-white">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
          body { background: white !important; }
        }
        /* SHARE-NARROW MODE
         * Used by the inline-render share flow on lead-detail. iOS Safari
         * clamps offscreen / unusual layouts to device width when html-to-image
         * captures, so the PNG was clipping on the right when the article
         * was rendered at 768px. Forcing a single-column ~380px layout
         * means the captured PNG is narrow enough to fit any iPhone
         * viewport — the recipient sees everything regardless of how iOS
         * decides to render the offscreen container. */
        .embed-narrow {
          padding: 14px 12px !important;
          max-width: 380px !important;
        }
        .embed-narrow .grid { grid-template-columns: minmax(0, 1fr) !important; gap: 8px !important; }
        .embed-narrow .text-3xl, .embed-narrow .md\\:text-3xl { font-size: 18px !important; line-height: 1.25 !important; }
        .embed-narrow .text-2xl, .embed-narrow .md\\:text-2xl { font-size: 16px !important; line-height: 1.25 !important; }
        .embed-narrow .text-xl,  .embed-narrow .md\\:text-xl  { font-size: 15px !important; line-height: 1.3  !important; }
        .embed-narrow .text-lg,  .embed-narrow .md\\:text-lg  { font-size: 14px !important; line-height: 1.3  !important; }
        .embed-narrow .text-\\[26px\\], .embed-narrow .md\\:text-\\[26px\\] { font-size: 16px !important; }
        .embed-narrow .text-\\[20px\\], .embed-narrow .md\\:text-\\[20px\\] { font-size: 14px !important; }
        .embed-narrow .text-\\[15px\\] { font-size: 13px !important; }
        .embed-narrow .text-\\[14px\\] { font-size: 12px !important; }
        .embed-narrow .text-\\[13px\\] { font-size: 12px !important; }
        .embed-narrow .text-\\[12px\\] { font-size: 11px !important; }
        .embed-narrow .text-\\[11px\\] { font-size: 10px !important; }
        .embed-narrow .py-10, .embed-narrow .md\\:py-14 { padding-top: 10px !important; padding-bottom: 10px !important; }
        .embed-narrow .px-6,  .embed-narrow .md\\:px-10 { padding-left: 0 !important; padding-right: 0 !important; }
        .embed-narrow .mt-8 { margin-top: 18px !important; }
        .embed-narrow .mt-6 { margin-top: 14px !important; }
        .embed-narrow .mt-4 { margin-top: 10px !important; }
        .embed-narrow table { font-size: 11px !important; }
        .embed-narrow th, .embed-narrow td { padding: 6px 6px !important; word-break: break-word !important; }
        .embed-narrow * { word-wrap: break-word !important; overflow-wrap: anywhere !important; }
        .embed-narrow .truncate { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
      `}</style>

      {/* CHROME (hidden on print + embed mode) */}
      {!embed && (
      <div className="no-print bg-[#060606] text-white border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={backHref}
              className="text-[12px] tracking-[0.22em] text-white/55 hover:text-white transition-colors whitespace-nowrap"
            >
              {backLabel}
            </Link>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 truncate">
              Math sheet · {homeowner.fullName || "(no name)"}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            {scenarioCfg.viewToggle && pathname && (
              <Link
                href={`${pathname}?view=${scenarioCfg.viewToggle.scenario}`}
                className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                {scenarioCfg.viewToggle.label}
              </Link>
            )}
            <a
              href={`mailto:${homeowner.email}?subject=${encodeURIComponent(
                `Your FALCO math — ${homeowner.propertyAddress || "your property"}`
              )}`}
              className="text-white/65 hover:text-white transition-colors"
            >
              Email →
            </a>
            <button
              onClick={handlePrint}
              className={`rounded-md font-semibold px-3.5 py-1.5 transition-colors ${
                arvNeedsVerification
                  ? "bg-amber-300 hover:bg-amber-200 text-black"
                  : "bg-emerald-400 hover:bg-emerald-300 text-black"
              }`}
            >
              {arvNeedsVerification ? "Verify ARV before PDF" : "Print / Save PDF"}
            </button>
          </div>
        </div>

        {/* INPUTS PANEL — hidden on print */}
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-4 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 mb-3">
            Inputs (override before printing)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <NumInput
              label="ARV ($)"
              value={arv}
              onChange={(v) => {
                setArv(v)
                setArvManuallyEdited(true)
              }}
            />
            <NumInput label="Loan ($)" value={loanBalance} onChange={setLoanBalance} />
            <NumInput label="Tax lien ($)" value={taxLienAmount} onChange={setTaxLienAmount} />
            <NumInput label="Repairs ($)" value={repairs} onChange={setRepairs} />
            <NumInput label="Assign. fee ($)" value={assignmentFee} onChange={setAssignmentFee} />
            <NumInput label="Inv. margin ($)" value={investorMargin} onChange={setInvestorMargin} />
            <NumInput label="Auction low %" value={auctionMinPct * 100} step={1} onChange={(v) => setAuctionMinPct(v / 100)} />
            <NumInput label="Auction high %" value={auctionMaxPct * 100} step={1} onChange={(v) => setAuctionMaxPct(v / 100)} />
          </div>
          {isCodeViolation && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
              <NumInput label="Monthly fines ($)" value={monthlyFineAccrual} step={100} onChange={setMonthlyFineAccrual} />
              <NumInput label="Cure months" value={repairMonths} step={1} onChange={setRepairMonths} />
            </div>
          )}
          {isDemolition && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
              <NumInput label="Demo cost ($)" value={demolitionCost} step={1000} onChange={setDemolitionCost} />
              <NumInput label="Construction / rehab ($)" value={constructionCost} step={5000} onChange={setConstructionCost} />
              <NumInput label="Construction months" value={constructionMonths} step={1} onChange={setConstructionMonths} />
            </div>
          )}
          <div className="mt-2 text-[10px] text-white/35 leading-[1.5]">
            ARV source: {arvSourceLabel}. Replace fallback values with a real AVM or comp before sending.
            <br />
            Closing costs default {fmt(closingCosts)}, buyer&apos;s premium {fmtPct(seed.buyerPremiumPct)} (paid by buyer), wholesale model {baseWholesalePct} base / {stretchWholesalePct} stretch.
          </div>
        </div>
      </div>
      )}

      {/* PRINTABLE SHEET */}
      <article
        className={`print-page mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14 ${
          embed ? "embed-narrow" : ""
        }`}
      >
        {/* Header — minimal: who, when, key facts */}
        <header className="border-b border-neutral-300 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
                {scenarioCfg.headerEyebrow}
              </div>
              <div className="mt-1 text-[15px] text-neutral-700 leading-tight">
                Prepared for{" "}
                <span className="text-neutral-900 font-semibold">
                  {homeowner.fullName || "—"}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-neutral-500 leading-[1.6]">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <Field label="Property" value={homeowner.propertyAddress || "—"} />
            <Field label="County" value={homeowner.county || "—"} />
            <Field label={scenarioCfg.dateFieldLabel} value={fmtDateHuman(homeowner.trusteeSaleDate)} />
            <Field label="Mortgage balance" value={fmt(loanBalance)} />
          </dl>
          {arvNeedsVerification && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-[11px] leading-[1.5] text-amber-950">
              <strong>Verify before seller use:</strong> this sheet is using an ARV fallback
              ({arvSourceLabel}), not a pipeline AVM or checked comp. Replace the ARV input before
              printing or sending.
            </div>
          )}
        </header>

        {/* Code violations specifics — visible only on code_violation
            scenario when we have data extracted from the city's
            citation system. Surfaces the actual violation list,
            days outstanding, and an estimated fine accrual range. */}
        {isCodeViolation && homeowner.codeViolation && (homeowner.codeViolation.violations || homeowner.codeViolation.caseNumber) && (() => {
          const cv = homeowner.codeViolation
          const days = daysSince(cv.receivedDate)
          const accrual = estimateFineAccrual(days, cv.violationCount, cv.violations)
          const tierLabel = accrual
            ? accrual.tier === "severe"
              ? "$100–$500/day (declared dangerous / unfit / demolition tier)"
              : accrual.tier === "minor"
              ? "$25–$50/day (lawn / single-maintenance tier)"
              : "$50–$100/day (standard property-maintenance tier)"
            : ""
          return (
            <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 md:p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-bold">
                Active code violations
                {cv.caseNumber && (
                  <span className="ml-2 text-amber-900/70 normal-case tracking-normal font-normal">
                    Case {cv.caseNumber}
                    {cv.city && ` · ${cv.city}`}
                  </span>
                )}
              </div>
              {cv.violations && (
                <div className="mt-2 text-[12px] text-neutral-800 leading-[1.55]">
                  {cv.violations}
                </div>
              )}
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                {cv.receivedDate && (
                  <Field label="Citation filed" value={fmtDateHuman(cv.receivedDate)} />
                )}
                {days !== null && (
                  <Field label="Days outstanding" value={`${days.toLocaleString()} days`} />
                )}
                {accrual && (
                  <Field
                    label={`Fines accrued (last ${accrual.accrualDays}d)`}
                    value={`${fmt(accrual.low)} – ${fmt(accrual.high)}`}
                  />
                )}
              </dl>
              <p className="mt-2 text-[10px] text-amber-900/70 leading-[1.5]">
                {accrual
                  ? `Tier: ${tierLabel}. First ${accrual.cureDays} days are cure window — fines start accruing only after. Capped at 365 days; long-running cases typically settle below theoretical max in Environmental Court. Confirm exact total with the city.`
                  : days !== null && days <= 30
                  ? `Still inside the typical 30-day cure window — no fines accruing yet. They start once the citation stays open past day ${30 - (days ?? 0)}.`
                  : `Confirm fine total with the city codes office.`}
              </p>
            </section>
          )
        })()}

        {/* HERO — the single number a homeowner needs to see in 5 seconds.
            The whole point of the page is to make this comparison
            unmistakable. Everything below is supporting evidence. */}
        <section className="mt-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6 md:p-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold">
            The bottom line
          </div>
          <div className="mt-3 text-[22px] md:text-[28px] font-semibold tracking-tight leading-tight text-neutral-900">
            {effectiveHeroLine.split("{range}").map((chunk, i, arr) => (
              <span key={i}>
                {chunk}
                {i < arr.length - 1 && (
                  <span className="text-emerald-700 font-bold whitespace-nowrap">
                    {out.auction.netRangeLabel}
                  </span>
                )}
              </span>
            ))}
          </div>
          {out.spreadEstimate.midpointGain > 0 && (
            <div className="mt-3 text-[14px] md:text-[15px] text-neutral-700 leading-snug">
              That&apos;s roughly{" "}
              <span className="text-emerald-700 font-semibold">
                {fmt(out.spreadEstimate.midpointGain)}
              </span>{" "}
              more than a wholesaler offer
              {out.spreadEstimate.bestCaseGain > out.spreadEstimate.midpointGain * 1.1 && (
                <>
                  {" "}
                  (up to{" "}
                  <span className="text-emerald-700 font-semibold">
                    {fmt(out.spreadEstimate.bestCaseGain)}
                  </span>{" "}
                  in a strong campaign)
                </>
              )}
              , and meaningfully more than {effectiveSpreadComparator}.
            </div>
          )}
        </section>

        {/* Three or four paths — color-coded so the comparison is instant.
            Loss / meh / win pattern reinforces the hero number above.
            For probate + FSBO we render a 4th MLS column because that's
            the homeowner's actual default option. */}
        <section
          className={`mt-6 grid gap-3 ${
            scenarioCfg.showMls
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-3"
          }`}
        >
          <PathCard
            label={scenarioCfg.path1.label}
            value={
              scenarioCfg.scenario === "foreclosure"
                ? fmt(out.trusteeNetToHomeowner ?? 0)
                : scenarioCfg.scenario === "tax_lien"
                ? fmt(out.taxSale?.netToHomeowner ?? 0)
                : scenarioCfg.scenario === "code_violation"
                ? fmt(out.selfRemediate?.netToHomeowner ?? 0)
                : scenarioCfg.scenario === "demolition"
                ? `− ${fmt(out.demoRoute?.totalOutOfPocket ?? 0)}`
                : scenarioCfg.path1.valueText
            }
            sub={scenarioCfg.path1.sub}
            tone={scenarioCfg.path1.tone}
          />
          <PathCard
            label="Wholesaler offer"
            value={
              out.wholesaler.scenario === "walks"
                ? "$0 / no deal"
                : fmt(out.wholesaler.realisticNet)
            }
            sub={
              out.wholesaler.scenario === "walks"
                ? "Most wholesalers walk at this LTV; some try seller-financing or 'subject-to' deals."
                : out.wholesaler.scenario === "stretched"
                ? `Base ${baseWholesalePct} offer doesn't pencil here. ${stretchWholesalePct} stretch on a thinner deal.`
                : `Modeled at ${baseWholesalePct} of ARV, matching distressed cash-offer reality.`
            }
            tone="meh"
          />
          {scenarioCfg.showMls && (
            <PathCard
              label="MLS / agent listing"
              value={fmt(out.mls.netToSeller)}
              sub={`6% agent commission on ${fmt(out.mls.closedPrice)}, ~${out.mls.carryingMonths} months exposure with carrying costs of ${fmt(out.mls.carryingCost)}.`}
              tone="meh"
            />
          )}
          <PathCard
            label="Marketed auction"
            value={out.auction.netRangeLabel}
            sub={
              scenarioCfg.showMls
                ? "Same retail clearance as MLS but no seller commission, 30–45 days, no showings."
                : "Open competitive bidding through a state-licensed TN auction firm. Closes in 30–45 days."
            }
            tone="win"
          />
        </section>

        {/* Wholesaler walkthrough */}
        <section className="mt-8">
          <h2 className="text-[16px] font-semibold tracking-tight">
            How a wholesaler arrives at their offer
          </h2>
          <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
            {scenarioCfg.wholesalerIntro}
          </p>
          <table className="mt-3 w-full text-[13px] border border-neutral-200">
            <tbody>
              <Row label="After-repair value (ARV)" value={fmt(out.wholesaler.arv)} />
              <Row label={`× ${baseWholesalePct} - distressed cash-offer ceiling`} value={fmt(out.wholesaler.maoCeiling)} />
              <Row label="− Estimated repairs (assumed)" value={fmtSigned(-out.wholesaler.repairs)} />
              <Row label="− Wholesaler assignment fee" value={fmtSigned(-out.wholesaler.assignmentFee)} />
              <Row label="− Investor's required profit margin" value={fmtSigned(-out.wholesaler.investorMargin)} />
              <Row
                label="Standard cash offer to seller"
                value={fmt(out.wholesaler.cashOfferStandard)}
                bold
              />
              <Row label="− Loan payoff" value={fmtSigned(-out.wholesaler.loanBalance)} />
              {out.wholesaler.taxLien > 0 && (
                <Row label="− Tax lien payoff" value={fmtSigned(-out.wholesaler.taxLien)} />
              )}
              <Row
                label={
                  out.wholesaler.netStandard < 0
                    ? "Standard rule outcome"
                    : "Net to you (standard rule)"
                }
                value={
                  out.wholesaler.netStandard < 0
                    ? `Underwater by ${fmt(Math.abs(out.wholesaler.netStandard))}`
                    : fmt(out.wholesaler.netStandard)
                }
                bold
                negative={out.wholesaler.netStandard < 0}
              />
            </tbody>
          </table>

          {/* Scenario-aware follow-up: what actually happens on this property */}
          {out.wholesaler.scenario === "stretched" && (
            <div className="mt-4 rounded-md border border-amber-300/70 bg-amber-50 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-semibold">
                What the wholesaler actually does on this property
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-800 leading-[1.6]">
                The base {baseWholesalePct} distressed offer doesn&apos;t leave them margin to close. To
                make a deal happen, they stretch up to {stretchWholesalePct} of ARV (eating some
                of their own profit). Realistic offer math:
              </p>
              <table className="mt-2 w-full text-[12px] border border-amber-200/60 bg-white">
                <tbody>
                  <Row label={`× ${stretchWholesalePct} - stretched offer`} value={fmt(out.wholesaler.arv * seed.wholesalerStretchPct)} />
                  <Row label="− Same deductions (repairs / fee / margin)" value={fmtSigned(-(out.wholesaler.repairs + out.wholesaler.assignmentFee + out.wholesaler.investorMargin))} />
                  <Row label="Stretched cash offer" value={fmt(out.wholesaler.cashOfferStretched)} bold />
                  <Row label="− Loan payoff" value={fmtSigned(-out.wholesaler.loanBalance)} />
                  <Row label="Net to you (realistic)" value={fmt(out.wholesaler.netStretched)} bold />
                </tbody>
              </table>
            </div>
          )}

          {out.wholesaler.scenario === "walks" && (
            <div className="mt-4 rounded-md border border-red-300/70 bg-red-50 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-red-700 font-semibold">
                What actually happens here
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-800 leading-[1.6]">
                Even stretched to {stretchWholesalePct} of ARV, the wholesaler can&apos;t cover
                your loan and still earn enough to bother. <strong>Most walk
                away.</strong> A few try creative deals — &quot;subject-to,&quot;
                seller financing, novation — that take the property without
                paying off the loan. Those are highly situational and often
                end badly for the homeowner. <strong>If a wholesaler walks,
                your real choice is between {scenarioCfg.path1.label.toLowerCase()} and a
                marketed auction. Wholesale isn&apos;t actually on the table.</strong>
              </p>
            </div>
          )}
        </section>

        {/* Self-remediate walkthrough — code_violation only. The owner
            could fix it themselves and list normally; we model that
            honestly so the comparison to auction is real. */}
        {isCodeViolation && (
          <section className="mt-8">
            <h2 className="text-[16px] font-semibold tracking-tight">
              How &quot;self-remediate then sell&quot; arrives at its number
            </h2>
            <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
              Owner pays for repairs out of pocket, eats fines while permits and contractors
              arrange ({out.selfRemediate.repairMonths} months modeled), then lists on MLS.
              Highest dollar outcome IF the owner has the capital, capacity, and patience.
              Most owners in citation status don&apos;t — but the math is here so you can compare.
            </p>
            <table className="mt-3 w-full text-[13px] border border-neutral-200">
              <tbody>
                <Row label="Closed price (MLS, ~95% clearance)" value={fmt(out.selfRemediate.closedPrice)} />
                <Row label="− Out-of-pocket repair budget" value={fmtSigned(-out.selfRemediate.repairCost)} />
                <Row
                  label={`− Fines accrued during cure (${out.selfRemediate.repairMonths} mo × ${fmt(out.selfRemediate.finesAccrued / Math.max(1, out.selfRemediate.repairMonths))}/mo)`}
                  value={fmtSigned(-out.selfRemediate.finesAccrued)}
                />
                <Row label="− Agent commission (6%)" value={fmtSigned(-out.selfRemediate.agentCommission)} />
                <Row
                  label={`− Carrying costs (${out.selfRemediate.repairMonths} mo)`}
                  value={fmtSigned(-out.selfRemediate.carryingCost)}
                />
                <Row label="− Loan payoff" value={fmtSigned(-out.selfRemediate.loanBalance)} />
                {out.selfRemediate.taxLien > 0 && (
                  <Row label="− Tax lien payoff" value={fmtSigned(-out.selfRemediate.taxLien)} />
                )}
                <Row label="− Closing costs" value={fmtSigned(-out.selfRemediate.closingCosts)} />
                <Row label="Net to you" value={fmt(out.selfRemediate.netToHomeowner)} bold />
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-neutral-600 italic leading-[1.6]">
              Conventional buyer lenders won&apos;t lend on properties with open code
              violations — the cure has to happen <strong>before</strong> the sale closes.
              That&apos;s why &quot;list as-is on MLS&quot; isn&apos;t a real path here, and
              why most code-violation properties exit through wholesale or auction.
            </p>
          </section>
        )}

        {/* Demo / fire-rehab walkthrough — demolition scenario only. The
            owner has paid the city for a permit and committed to a
            costly path: tear down + rebuild OR rehab a damaged structure.
            We model the total commitment so the auction-now alternative
            is unmistakable. */}
        {isDemolition && (
          <section className="mt-8">
            <h2 className="text-[16px] font-semibold tracking-tight">
              What &quot;stay the course&quot; actually costs
            </h2>
            <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
              The permit is the commitment to spend.
              {homeowner.demolition?.subtype === "fire_damage" ||
              homeowner.demolition?.subtype === "storm_damage" ? (
                <> Rehabbing a damaged structure means paying for the work + carrying the property while it sits unfinished.</>
              ) : (
                <> Tearing down means demo cost + new construction + months of carry before the property has any cash value to you again.</>
              )}
            </p>
            <table className="mt-3 w-full text-[13px] border border-neutral-200">
              <tbody>
                {out.demoRoute.demolitionCost > 0 && (
                  <Row
                    label="− Demolition cost (permit)"
                    value={fmtSigned(-out.demoRoute.demolitionCost)}
                  />
                )}
                {out.demoRoute.constructionCost > 0 && (
                  <Row
                    label={
                      homeowner.demolition?.subtype === "fire_damage" ||
                      homeowner.demolition?.subtype === "storm_damage"
                        ? "− Rehab cost"
                        : "− New construction (sqft × $200/sqft baseline)"
                    }
                    value={fmtSigned(-out.demoRoute.constructionCost)}
                  />
                )}
                {out.demoRoute.carryingCost > 0 && (
                  <Row
                    label={`− Carrying costs (${out.demoRoute.constructionMonths} mo × ${fmt(out.demoRoute.constructionCarryPerMonth)}/mo)`}
                    value={fmtSigned(-out.demoRoute.carryingCost)}
                  />
                )}
                <Row
                  label="Total commitment before any cash returns"
                  value={`− ${fmt(out.demoRoute.totalOutOfPocket)}`}
                  bold
                  negative
                />
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-neutral-600 italic leading-[1.6]">
              End-state property value isn&apos;t included — it depends on what gets built and the
              market when work finishes. The {fmt(out.demoRoute.totalOutOfPocket)} above is just the
              out-of-pocket / financed commitment, before you&apos;ve sold anything.
            </p>
          </section>
        )}

        {/* MLS walkthrough — probate + FSBO scenarios only.
            This is the seller's actual mental default. We're not
            attacking agents; we're laying out the math so the
            comparison to auction is honest and complete. */}
        {scenarioCfg.showMls && (
          <section className="mt-8">
            <h2 className="text-[16px] font-semibold tracking-tight">
              How an MLS listing arrives at its number
            </h2>
            <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
              An agent lists at a slight premium (~5% above ARV), the property
              clears at roughly retail, then commission and carrying costs come
              out of the proceeds.
            </p>
            <table className="mt-3 w-full text-[13px] border border-neutral-200">
              <tbody>
                <Row label="Listed at (~5% over ARV)" value={fmt(out.mls.listPrice)} />
                <Row label="Closed price (typical 95% clearance)" value={fmt(out.mls.closedPrice)} />
                <Row label="− Agent commission (6%)" value={fmtSigned(-out.mls.agentCommission)} />
                <Row
                  label={`− Carrying costs (~${out.mls.carryingMonths} mo: taxes, insurance, mortgage if any)`}
                  value={fmtSigned(-out.mls.carryingCost)}
                />
                {scenarioCfg.applyTrusteeFee && (
                  <Row
                    label="− Trustee fee (11 USC § 326 cap)"
                    value={fmtSigned(-out.mls.trusteeFee)}
                  />
                )}
                <Row label="− Loan payoff" value={fmtSigned(-out.mls.loanBalance)} />
                {out.mls.taxLien > 0 && (
                  <Row label="− Tax lien payoff" value={fmtSigned(-out.mls.taxLien)} />
                )}
                <Row label="− Closing costs" value={fmtSigned(-out.mls.closingCosts)} />
                <Row
                  label={scenarioCfg.applyTrusteeFee ? "Net to estate" : "Net to seller"}
                  value={fmt(out.mls.netToSeller)}
                  bold
                />
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-neutral-600 italic leading-[1.6]">
              MLS often delivers the highest gross price, but pays for it in
              60–120 days of exposure, 6% agent commission, and the showings/
              negotiation cycle. Auction trades a small clearance haircut for
              <strong> no seller commission, 30–45 day close, and no showings</strong> —
              the spread between MLS net and auction midpoint here is{" "}
              <strong>
                {fmt(
                  Math.abs(
                    out.mls.netToSeller -
                      (out.auction.low.netToHomeowner +
                        out.auction.high.netToHomeowner) /
                        2
                  )
                )}
              </strong>
              .
            </p>
          </section>
        )}

        {/* Marketed auction walkthrough */}
        <section className="mt-8">
          <h2 className="text-[16px] font-semibold tracking-tight">
            How a marketed auction arrives at its number
          </h2>
          <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
            {scenarioCfg.auctionIntro}
          </p>
          <table className="mt-3 w-full text-[13px] border border-neutral-200">
            <thead>
              <tr className="bg-neutral-50">
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em] text-neutral-500 font-semibold">Scenario</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.16em] text-red-600/80 font-semibold">Worst case ({Math.round(out.auction.worst.retailPct * 100)}%)</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.16em] text-neutral-500 font-semibold">Conservative ({Math.round(out.auction.low.retailPct * 100)}%)</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.16em] text-emerald-700/80 font-semibold">Strong ({Math.round(out.auction.high.retailPct * 100)}%)</th>
              </tr>
            </thead>
            <tbody>
              <RowTriple
                label="Winning bid"
                w={out.auction.worst.winningBid}
                lo={out.auction.low.winningBid}
                hi={out.auction.high.winningBid}
              />
              <RowTriple
                label="− Loan payoff"
                w={-out.auction.worst.loanBalance}
                lo={-out.auction.low.loanBalance}
                hi={-out.auction.high.loanBalance}
                negative
              />
              <RowTriple
                label="− Closing costs"
                w={-out.auction.worst.closingCosts}
                lo={-out.auction.low.closingCosts}
                hi={-out.auction.high.closingCosts}
                negative
              />
              {out.auction.low.taxLien > 0 && (
                <RowTriple
                  label="− Tax lien payoff"
                  w={-out.auction.worst.taxLien}
                  lo={-out.auction.low.taxLien}
                  hi={-out.auction.high.taxLien}
                  negative
                />
              )}
              {scenarioCfg.applyTrusteeFee && (
                <RowTriple
                  label="− Trustee fee (11 USC § 326)"
                  w={-out.auction.worst.trusteeFee}
                  lo={-out.auction.low.trusteeFee}
                  hi={-out.auction.high.trusteeFee}
                  negative
                />
              )}
              <RowTriple
                label={scenarioCfg.applyTrusteeFee ? "Net to estate" : "Net to you"}
                w={out.auction.worst.netToHomeowner}
                lo={out.auction.low.netToHomeowner}
                hi={out.auction.high.netToHomeowner}
                bold
              />
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-neutral-600 italic leading-[1.6]">
            The buyer pays a 10% premium on top of their winning bid. That premium
            covers the auction firm and FALCO. You don&apos;t pay it, and you don&apos;t pay
            seller&apos;s commission either — you just see the hammer price minus loan
            payoff and standard closing fees.
          </p>

          {/* Worst-case-still-beats-wholesaler callout — strongest pitch when true */}
          {out.wholesaler.scenario !== "walks" && out.auction.worstStillBeatsWholesaler && (
            <div className="mt-4 rounded-md border border-emerald-300/70 bg-emerald-50 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 font-semibold">
                The bottom of the range still wins
              </div>
              <p className="mt-1.5 text-[13px] text-neutral-800 leading-[1.6]">
                Even if your auction underperforms badly and only clears{" "}
                <strong>{Math.round(out.auction.worst.retailPct * 100)}% of retail</strong>,
                you walk away with{" "}
                <strong>{fmt(out.auction.worst.netToHomeowner)}</strong> — still
                roughly{" "}
                <strong>{fmt(out.auction.worst.netToHomeowner - out.wholesaler.realisticNet)}</strong>{" "}
                more than the wholesaler offer.
                {out.auction.breakevenPct !== null && out.auction.breakevenPct > 0.5 && out.auction.breakevenPct < out.auction.worst.retailPct && (
                  <>
                    {" "}For the wholesaler to come out ahead, the auction would
                    need to clear below{" "}
                    <strong>{Math.round(out.auction.breakevenPct * 100)}% of retail</strong>.
                  </>
                )}
              </p>
            </div>
          )}
          {out.wholesaler.scenario !== "walks" && !out.auction.worstStillBeatsWholesaler && (
            <div className="mt-4 rounded-md border border-amber-300/70 bg-amber-50 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-semibold">
                Honest read on the range
              </div>
              <p className="mt-1.5 text-[13px] text-neutral-800 leading-[1.6]">
                The auction would need to clear at least{" "}
                <strong>{out.auction.breakevenPct !== null ? `${Math.round(out.auction.breakevenPct * 100)}% of retail` : "above the worst-case modeled here"}</strong>{" "}
                to net you more than the wholesaler offer. The conservative and
                strong scenarios both clear that bar, but a weak auction outcome
                could underperform the wholesaler. We&apos;ll only list if we
                believe the campaign can clear comfortably above breakeven.
              </p>
            </div>
          )}
          {out.wholesaler.scenario === "walks" && (
            <div className="mt-4 rounded-md border border-emerald-300/70 bg-emerald-50 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 font-semibold">
                The auction is your real path to equity
              </div>
              <p className="mt-1.5 text-[13px] text-neutral-800 leading-[1.6]">
                With the wholesaler walking away and {scenarioCfg.scenario === "foreclosure" ? "the trustee sale paying you nothing" : `${scenarioCfg.path1.label.toLowerCase()} netting nothing`},
                the auction is the only route that puts money in your pocket.
                Even at our worst-case scenario ({Math.round(out.auction.worst.retailPct * 100)}%
                of retail), you&apos;d walk away with{" "}
                <strong>{fmt(out.auction.worst.netToHomeowner)}</strong>.
                {out.auction.worst.netToHomeowner < 5000 && " That's still tight; we'd want to see strong comparables before committing to list."}
              </p>
            </div>
          )}
        </section>

        {/* What we'll do next */}
        <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">
            {scenarioCfg.ctaHeader}
          </div>
          <ol className="mt-3 space-y-2 text-[13px] text-neutral-800 leading-[1.6] list-decimal pl-5">
            <li>We&apos;ll introduce you to our state-licensed Tennessee auction partner who&apos;ll run the sale.</li>
            <li>You sign a standard listing agreement — no upfront fees, no obligation if it doesn&apos;t close.</li>
            <li>30–60 day marketed campaign with photos, advertising, and a defined sale day.</li>
            <li>Auction day. Buyers compete. Highest bidder wins.</li>
            <li>Closing — you walk away with the net above.</li>
          </ol>
          <p className="mt-3 text-[12px] text-neutral-600 leading-[1.6]">
            If the auction route doesn&apos;t fit your situation, we&apos;ll tell you that
            plainly. We don&apos;t make money unless your property closes.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-5 border-t border-neutral-200 text-[10px] text-neutral-500 leading-[1.6]">
          <div className="font-semibold text-neutral-700 uppercase tracking-[0.18em] mb-2">
            Methodology &amp; sources
          </div>
          <ul className="space-y-1">
            <li>• Wholesaler offer modeled at {baseWholesalePct} of ARV, with a {stretchWholesalePct} reach scenario when a cash buyer gives up margin to close. The published 70% rule is treated as the investor-side ceiling, not the homeowner&apos;s actual cash offer.</li>
            <li>• Marketed auction net modeled at {Math.round(out.auction.low.retailPct * 100)}–{Math.round(out.auction.high.retailPct * 100)}% of retail less loan payoff less typical closing costs.</li>
            <li>• {scenarioCfg.methodologyPath1}</li>
            <li>• Numbers are estimates based on the inputs above. Final auction outcome depends on market conditions, buyer turnout, and property condition.</li>
            <li>• Full sourcing for industry assumptions: <span className="text-emerald-700">falco.llc/manifesto#sources</span></li>
          </ul>
          <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-400">
            <div>FALCO · Tennessee · falco@falco.llc</div>
            <div>Prepared {new Date().toLocaleString()}</div>
          </div>
        </footer>
      </article>
    </main>
  )
}

// ============================================================================
// Small primitives
// ============================================================================

function NumInput({
  label,
  value,
  onChange,
  step = 1000,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 mb-1">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-emerald-400/60 tabular-nums"
      />
    </label>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] text-neutral-900 truncate">{value}</div>
    </div>
  )
}

function PathCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: "loss" | "meh" | "win"
}) {
  const accent =
    tone === "win"
      ? "border-emerald-400 bg-emerald-50"
      : tone === "loss"
      ? "border-red-300 bg-red-50"
      : "border-neutral-300 bg-neutral-50"
  const valueColor =
    tone === "win" ? "text-emerald-700" : tone === "loss" ? "text-red-600" : "text-neutral-900"
  return (
    <div className={`rounded-lg border-2 ${accent} p-3.5 md:p-4`}>
      <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-600 font-semibold leading-tight">
        {label}
      </div>
      <div className={`mt-2 text-[20px] md:text-[26px] font-semibold tabular-nums leading-tight ${valueColor}`}>
        {value}
      </div>
      <div className="mt-2 text-[11px] leading-[1.5] text-neutral-600">{sub}</div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  negative,
}: {
  label: string
  value: string
  bold?: boolean
  negative?: boolean
}) {
  return (
    <tr className="border-t border-neutral-200">
      <td className={`px-3 py-2 text-neutral-700 ${bold ? "font-semibold text-neutral-900" : ""}`}>
        {label}
      </td>
      <td
        className={`px-3 py-2 text-right tabular-nums ${
          bold ? "font-semibold" : ""
        } ${negative ? "text-red-600" : "text-neutral-900"}`}
      >
        {value}
      </td>
    </tr>
  )
}

function RowPair({
  label,
  lo,
  hi,
  bold,
  negative,
}: {
  label: string
  lo: number
  hi: number
  bold?: boolean
  negative?: boolean
}) {
  const cls = `px-3 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""} ${negative ? "text-red-600" : "text-neutral-900"}`
  return (
    <tr className="border-t border-neutral-200">
      <td className={`px-3 py-2 text-neutral-700 ${bold ? "font-semibold text-neutral-900" : ""}`}>
        {label}
      </td>
      <td className={cls}>{lo < 0 ? fmtSigned(lo) : fmt(lo)}</td>
      <td className={cls}>{hi < 0 ? fmtSigned(hi) : fmt(hi)}</td>
    </tr>
  )
}

function RowTriple({
  label,
  w,
  lo,
  hi,
  bold,
  negative,
}: {
  label: string
  w: number
  lo: number
  hi: number
  bold?: boolean
  negative?: boolean
}) {
  const baseCls = `px-3 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""}`
  const fmtCell = (n: number) => (n < 0 ? fmtSigned(n) : fmt(n))
  return (
    <tr className="border-t border-neutral-200">
      <td className={`px-3 py-2 text-neutral-700 ${bold ? "font-semibold text-neutral-900" : ""}`}>
        {label}
      </td>
      <td className={`${baseCls} ${negative ? "text-red-600" : bold ? "text-amber-700" : "text-neutral-700"}`}>
        {fmtCell(w)}
      </td>
      <td className={`${baseCls} ${negative ? "text-red-600" : "text-neutral-900"}`}>
        {fmtCell(lo)}
      </td>
      <td className={`${baseCls} ${negative ? "text-red-600" : bold ? "text-emerald-700" : "text-neutral-900"}`}>
        {fmtCell(hi)}
      </td>
    </tr>
  )
}
