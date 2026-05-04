"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  computeMath,
  DEFAULT_INPUTS,
  defaultInputsFor,
  fmt,
  fmtSigned,
  type MathInputs,
} from "@/lib/math-sheet"

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

export default function MathSheetContent({
  homeowner,
  backHref = "/admin",
  backLabel = "← Admin",
}: {
  homeowner: HomeownerSnapshot
  /** Where the chrome back-link goes. Defaults to /admin so the
   *  /admin/math-sheet/[id] route works without changes. The dialer
   *  passes the lead URL so callers don't get bounced to admin. */
  backHref?: string
  backLabel?: string
}) {
  // ARV default priority:
  //   1. Pipeline-synced property_value (best — already an AVM from ATTOM)
  //   2. Loan balance × 1.6 (60% LTV guess) when no AVM yet
  //   3. $400K when neither is known
  const arvDefault =
    homeowner.propertyValue && homeowner.propertyValue > 0
      ? Math.round(homeowner.propertyValue / 1000) * 1000
      : homeowner.mortgageBalance
      ? Math.round((homeowner.mortgageBalance * 1.6) / 1000) * 1000
      : 400000
  // Compute property-aware defaults (deductions scale with ARV so the
  // model is sensible across $100K Memphis properties → $1M Nashville).
  const seed = defaultInputsFor(arvDefault, homeowner.mortgageBalance ?? 0)
  const [arv, setArv] = useState<number>(arvDefault)
  const [loanBalance, setLoanBalance] = useState<number>(homeowner.mortgageBalance ?? 0)
  const [repairs, setRepairs] = useState<number>(seed.repairs)
  const [assignmentFee, setAssignmentFee] = useState<number>(seed.assignmentFee)
  const [investorMargin, setInvestorMargin] = useState<number>(seed.investorMargin)
  const [closingCosts, setClosingCosts] = useState<number>(DEFAULT_INPUTS.closingCosts)
  const [auctionMinPct, setAuctionMinPct] = useState<number>(DEFAULT_INPUTS.auctionMinPct)
  const [auctionMaxPct, setAuctionMaxPct] = useState<number>(DEFAULT_INPUTS.auctionMaxPct)

  const inputs: MathInputs = {
    arv,
    loanBalance,
    repairs,
    assignmentFee,
    investorMargin,
    closingCosts,
    buyerPremiumPct: DEFAULT_INPUTS.buyerPremiumPct,
    auctionMinPct,
    auctionMaxPct,
    auctionWorstPct: DEFAULT_INPUTS.auctionWorstPct,
    wholesalerMaoPct: DEFAULT_INPUTS.wholesalerMaoPct,
    wholesalerStretchPct: DEFAULT_INPUTS.wholesalerStretchPct,
  }
  const out = useMemo(() => computeMath(inputs), [inputs])

  return (
    <main className="min-h-screen bg-white text-neutral-900 print:bg-white">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* CHROME (hidden on print) */}
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
            <a
              href={`mailto:${homeowner.email}?subject=${encodeURIComponent(
                `Your FALCO math — ${homeowner.propertyAddress || "your property"}`
              )}`}
              className="text-white/65 hover:text-white transition-colors"
            >
              Email →
            </a>
            <button
              onClick={() => window.print()}
              className="rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold px-3.5 py-1.5 transition-colors"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* INPUTS PANEL — hidden on print */}
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-4 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 mb-3">
            Inputs (override before printing)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <NumInput label="ARV ($)" value={arv} onChange={setArv} />
            <NumInput label="Loan ($)" value={loanBalance} onChange={setLoanBalance} />
            <NumInput label="Repairs ($)" value={repairs} onChange={setRepairs} />
            <NumInput label="Assign. fee ($)" value={assignmentFee} onChange={setAssignmentFee} />
            <NumInput label="Inv. margin ($)" value={investorMargin} onChange={setInvestorMargin} />
            <NumInput label="Auction low %" value={auctionMinPct * 100} step={1} onChange={(v) => setAuctionMinPct(v / 100)} />
            <NumInput label="Auction high %" value={auctionMaxPct * 100} step={1} onChange={(v) => setAuctionMaxPct(v / 100)} />
          </div>
          <div className="mt-2 text-[10px] text-white/35 leading-[1.5]">
            ARV defaulted from loan ÷ 0.60 — replace with your actual comp.
            Closing costs default {fmt(closingCosts)}, premium 8%, 70% rule.
          </div>
        </div>
      </div>

      {/* PRINTABLE SHEET */}
      <article className="print-page mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14">
        {/* Header */}
        <header className="border-b border-neutral-300 pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
                FALCO
              </div>
              <h1 className="mt-2 text-[26px] md:text-[30px] font-semibold tracking-tight leading-tight">
                Your three options, in real numbers.
              </h1>
            </div>
            <div className="text-right text-[11px] text-neutral-500 leading-[1.6]">
              Prepared for<br />
              <span className="text-neutral-900 font-medium text-[13px]">
                {homeowner.fullName || "—"}
              </span>
              <br />
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <Field label="Property" value={homeowner.propertyAddress || "—"} />
            <Field label="County" value={homeowner.county || "—"} />
            <Field label="Trustee sale" value={fmtDateHuman(homeowner.trusteeSaleDate)} />
            <Field label="Mortgage balance" value={fmt(loanBalance)} />
          </dl>
        </header>

        {/* Three big stat cards */}
        <section className="mt-7 grid grid-cols-3 gap-3">
          <PathCard
            label="If the trustee sale closes"
            value={fmt(out.trusteeNetToHomeowner)}
            sub="Bank takes the property for the loan balance. Equity vaporized."
            tone="loss"
          />
          <PathCard
            label={
              out.wholesaler.scenario === "walks"
                ? "Wholesaler typically walks"
                : out.wholesaler.scenario === "stretched"
                ? "Wholesaler offer (stretched)"
                : "Wholesaler offer (typical)"
            }
            value={
              out.wholesaler.scenario === "walks"
                ? "$0 / no deal"
                : fmt(out.wholesaler.realisticNet)
            }
            sub={
              out.wholesaler.scenario === "walks"
                ? "No offer makes economic sense for the wholesaler at this loan-to-value. Most walk; some try seller-financing or 'subject-to' deals."
                : out.wholesaler.scenario === "stretched"
                ? "The strict 70% rule doesn't pencil here, so the wholesaler eats some margin (~78% MAO) to close a thinner deal."
                : "Built on the wholesale industry's standard 70% rule."
            }
            tone="meh"
          />
          <PathCard
            label="Marketed auction"
            value={out.auction.netRangeLabel}
            sub="Open competitive bidding through a state-licensed TN auction firm."
            tone="win"
          />
        </section>

        {/* Spread headline */}
        <section className="mt-7 rounded-lg border border-emerald-300/60 bg-emerald-50 p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">
            What this means for you
          </div>
          <div className="mt-2 text-[20px] md:text-[24px] font-semibold tracking-tight leading-tight text-neutral-900">
            A marketed auction nets you roughly{" "}
            <span className="text-emerald-700">{fmt(out.spreadEstimate.midpointGain)}</span>{" "}
            more than the typical wholesaler offer
            {out.spreadEstimate.bestCaseGain > out.spreadEstimate.midpointGain * 1.1 && (
              <>
                {" "}
                — up to{" "}
                <span className="text-emerald-700">{fmt(out.spreadEstimate.bestCaseGain)}</span>{" "}
                in a strong campaign.
              </>
            )}
          </div>
        </section>

        {/* Wholesaler walkthrough */}
        <section className="mt-8">
          <h2 className="text-[16px] font-semibold tracking-tight">
            How a wholesaler arrives at their offer
          </h2>
          <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
            The wholesale industry uses a published formula — the &quot;70% rule.&quot; They
            aren&apos;t pulling numbers out of a hat; they&apos;re pulling them out of YOU.
          </p>
          <table className="mt-3 w-full text-[13px] border border-neutral-200">
            <tbody>
              <Row label="After-repair value (ARV)" value={fmt(out.wholesaler.arv)} />
              <Row label="× 70% — wholesaler MAO ceiling" value={fmt(out.wholesaler.maoCeiling)} />
              <Row label="− Estimated repairs (assumed)" value={fmtSigned(-out.wholesaler.repairs)} />
              <Row label="− Wholesaler assignment fee" value={fmtSigned(-out.wholesaler.assignmentFee)} />
              <Row label="− Investor's required profit margin" value={fmtSigned(-out.wholesaler.investorMargin)} />
              <Row
                label="Standard cash offer to seller"
                value={fmt(out.wholesaler.cashOfferStandard)}
                bold
              />
              <Row label="− Loan payoff" value={fmtSigned(-out.wholesaler.loanBalance)} />
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
                The strict 70% rule doesn&apos;t leave them margin to close. To
                make a deal happen, they stretch up to ~78% of ARV (eating some
                of their own profit). Realistic offer math:
              </p>
              <table className="mt-2 w-full text-[12px] border border-amber-200/60 bg-white">
                <tbody>
                  <Row label="× 78% — stretched MAO" value={fmt(out.wholesaler.arv * 0.78)} />
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
                Even stretched to 78% of ARV, the wholesaler can&apos;t cover
                your loan and still earn enough to bother. <strong>Most walk
                away.</strong> A few try creative deals — &quot;subject-to,&quot;
                seller financing, novation — that take the property without
                paying off the loan. Those are highly situational and often
                end badly for the homeowner. <strong>If a wholesaler walks,
                your real choice is between the trustee sale and a marketed
                auction. Wholesale isn&apos;t actually on the table.</strong>
              </p>
            </div>
          )}
        </section>

        {/* Marketed auction walkthrough */}
        <section className="mt-8">
          <h2 className="text-[16px] font-semibold tracking-tight">
            How a marketed auction arrives at its number
          </h2>
          <p className="mt-1 text-[12px] text-neutral-600 leading-[1.6]">
            Same property. Different process: photos, advertising, a 30–60 day
            campaign, a defined sale day, and buyers competing openly on price.
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
              <RowTriple
                label="Net to you"
                w={out.auction.worst.netToHomeowner}
                lo={out.auction.low.netToHomeowner}
                hi={out.auction.high.netToHomeowner}
                bold
              />
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-neutral-600 italic leading-[1.6]">
            The buyer pays an 8% premium on top of their winning bid. That premium
            covers the auction firm and FALCO. You don&apos;t pay it. You don&apos;t see it.
            Your only cost is the closing fees above.
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
                With the wholesaler walking away and the trustee sale paying
                you nothing, the auction is the only route that puts money
                in your pocket. Even at our worst-case scenario ({Math.round(out.auction.worst.retailPct * 100)}%
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
            If you want to move forward
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
            <li>• Wholesaler offer derived from the published &quot;70% rule&quot; (Maximum Allowable Offer = ARV × 0.70 less repairs less assignment fee less investor margin).</li>
            <li>• Marketed auction net modeled at {Math.round(out.auction.low.retailPct * 100)}–{Math.round(out.auction.high.retailPct * 100)}% of retail less loan payoff less typical closing costs.</li>
            <li>• Trustee sale closes at the loan balance — homeowner equity is consumed by the foreclosing lender.</li>
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
