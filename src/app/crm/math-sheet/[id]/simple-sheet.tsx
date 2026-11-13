import { fmt, type MathOutput } from "@/lib/math-sheet"
import type { Scenario, ScenarioConfig } from "./scenario-config"
import type { HomeownerSnapshot } from "./math-sheet-content"

/**
 * Simple homeowner-facing math sheet. One page, one number, a few bars.
 *
 * Written for someone under stress reading on a phone or a printed page:
 * lead with the outcome, show the comparison as bars, say plainly why it
 * costs them nothing, give them one person to call. The full walkthrough
 * lives in the classic layout (?layout=classic).
 *
 * Copy rules:
 *  - Plain words, short sentences, no industry terms (no ARV, net,
 *    MLS, trustee sale, buyer's premium, wholesaler, as-is, pencil).
 *  - Accurate over persuasive. Only say "more than" when the math on
 *    this page shows it. Every assumption is stated in the fine print.
 *  - No em dashes. Foreground "no cost to you". No claims about how
 *    FALCO is paid.
 */

/** Real local results backing the auction range. Source: 104 home auctions
 *  by one Middle Tennessee auction company, matched to county deed records
 *  (falco-workspace/partners/parks_deeds.json, built 2026-11-12). Ratios are
 *  sale price / county appraisal. Update when the partner data is rebuilt. */
const LOCAL_AUCTIONS = { n: 104, median: 0.92, p25: 0.79, p10: 0.69 }

/** Signing to closing. Days from auction to recorded deed: median 27,
 *  p90 35 (same data). The marketing period before auction is 30 to 60
 *  days, so 2 to 3 months end to end. */
const TIMELINE_TEXT = "about 2 to 3 months"
const TIMELINE_DAYS = 75

type Bar = {
  key: string
  label: string
  /** Point value, or the low end when `high` is set. */
  value: number
  high?: number
  /** Text shown instead of the dollar figure. */
  display?: string
  note: string
  tone: "loss" | "meh" | "win"
}

type Plain = {
  label: string
  display?: string
  note: string
}

/** Plain-language status-quo option for each situation. Values come from
 *  the engine; only the words are new. Returns null when the listing bar
 *  already covers the status quo. */
function plainPath1(
  s: Scenario,
  out: MathOutput,
  months: number,
  saleCalledOff: boolean,
): Plain | null {
  switch (s) {
    case "foreclosure":
      if (saleCalledOff) {
        return {
          label: "If the foreclosure starts again",
          display: "Usually $0",
          note:
            "Your foreclosure sale looks like it was called off. If the loan falls behind again and the house goes to a foreclosure sale, the lender usually buys it for what you owe and you lose the value you built up.",
        }
      }
      return {
        label: "Let the foreclosure happen",
        display: "Usually $0",
        note:
          "The lender usually buys the house at the foreclosure sale for what you owe. You lose the house and the value you built up in it. If someone bids more than you owe, the extra comes back to you, but you can't count on it.",
      }
    case "probate":
      return {
        label: "Keep holding the house",
        display: "Costs money each month",
        note: "Taxes, insurance and upkeep keep adding up while it sits. Nobody gets paid until it sells.",
      }
    case "code_violation":
      return {
        label: "Fix it yourself, then sell",
        note: `You pay for repairs up front. City fines keep adding up while the work gets done (we assumed ${months} months). Then you pay an agent 6% to sell it.`,
      }
    case "bankruptcy_pre_petition":
      return {
        label: "File bankruptcy first",
        display: "Up to $35,000",
        note:
          "In a Tennessee bankruptcy you can usually protect up to $35,000 of home value ($52,500 if filing jointly). Value above that can go to the people you owe. Talk to a bankruptcy lawyer about your case.",
      }
    case "tax_lien":
      return {
        label: "Let it go to a tax sale",
        note: `The county sells the house to pay the back taxes. Bids at these sales are usually low. We assumed a winning bid of ${fmt(out.taxSale.winningBid)}; real bids vary a lot. You get what is left after the taxes and court costs.`,
      }
    case "demolition":
      return {
        label: "Tear down and rebuild, or repair",
        note:
          "What you would spend on the work, plus bills while it happens. This does not count what the house would be worth when it's done.",
      }
    case "fsbo":
    case "bankruptcy_363_sale":
      return null
  }
}

export default function SimpleSheet({
  homeowner,
  out,
  scenarioCfg,
  daysToSale,
  loanBalance,
  needsVerification,
}: {
  homeowner: HomeownerSnapshot
  out: MathOutput
  scenarioCfg: ScenarioConfig
  daysToSale: number | null
  loanBalance: number
  needsVerification: boolean
}) {
  const s = scenarioCfg.scenario
  // Probate and post-petition bankruptcy sheets are read by an executor,
  // heir or trustee, not the owner of record (who may have died), so the
  // money is "the estate's" and we never greet the record owner by name.
  const estate = scenarioCfg.applyTrusteeFee || s === "probate"
  const you = estate ? "the estate" : "you"
  const firstName = (homeowner.fullName || "").trim().split(/\s+/)[0] || ""
  const low = out.auction.low.netToHomeowner
  const high = out.auction.high.netToHomeowner
  const worst = out.auction.worst.netToHomeowner

  const path1Value: number | null =
    s === "tax_lien"
      ? out.taxSale.netToHomeowner
      : s === "code_violation"
      ? out.selfRemediate.netToHomeowner
      : s === "demolition"
      ? -out.demoRoute.totalOutOfPocket
      : null
  const saleCalledOff =
    homeowner.trusteeSaleStatus === "cancelled" || homeowner.trusteeSaleStatus === "reinstated"
  const p1 = plainPath1(s, out, out.selfRemediate.repairMonths, saleCalledOff)

  const cashWalks = out.wholesaler.scenario === "walks"
  const cashPct = Math.round(
    (out.wholesaler.scenario === "stretched"
      ? out.inputs.wholesalerStretchPct
      : out.inputs.wholesalerMaoPct) * 100
  )
  const cashNet = cashWalks ? 0 : out.wholesaler.realisticNet

  const bars: Bar[] = []
  if (p1) {
    bars.push({
      key: "p1",
      label: p1.label,
      value: path1Value ?? 0,
      display: path1Value === null ? p1.display : undefined,
      note: p1.note,
      tone: scenarioCfg.path1.tone,
    })
  }
  bars.push({
    key: "cash",
    label: "Sell fast to a cash buyer",
    value: cashNet,
    display: cashWalks ? "Likely no offer" : undefined,
    note: cashWalks
      ? "With this much owed on the loan, most cash buyers can't make a profit, so they won't make an offer."
      : `Cash buyers make their money by buying low. We assumed an offer of ${cashPct}% of the home's value.`,
    tone: "meh",
  })
  if (scenarioCfg.showMls) {
    bars.push({
      key: "mls",
      label: "List with a real estate agent",
      value: out.mls.netToSeller,
      note: `The agent's fee is about 6% of the price. We assumed ${out.mls.carryingMonths} months on the market, with ${fmt(out.mls.carryingCost)} in bills while it sits.`,
      tone: "meh",
    })
  }
  bars.push({
    key: "auction",
    label: "Sell at auction with FALCO",
    value: low,
    high,
    note: "Buyers bid against each other on one set day.",
    tone: "win",
  })
  const scaleMax = Math.max(1, ...bars.map((b) => Math.max(b.value, b.high ?? 0)))

  // Only claim a gain over the cash offer when the math shows one.
  const midpoint = (low + high) / 2
  const gainOverCash = cashWalks ? 0 : midpoint - cashNet
  const listingBeatsAuction = scenarioCfg.showMls && out.mls.netToSeller > midpoint

  const saleLine = (() => {
    if (s !== "foreclosure") return null
    if (saleCalledOff) return null
    if (daysToSale !== null && daysToSale < 0) {
      return "Your foreclosure sale date has passed. Call us so we can check where things stand. There may still be options."
    }
    if (!homeowner.trusteeSaleDate || daysToSale === null) return null
    const d = fmtDateHuman(homeowner.trusteeSaleDate)
    if (daysToSale < TIMELINE_DAYS) {
      return `Your foreclosure sale is set for ${d}. An auction takes ${TIMELINE_TEXT}, so we would ask your lender to move the sale date while it happens. They do not have to agree, so the sooner we talk, the better.`
    }
    return `Your foreclosure sale is set for ${d}. That is enough time to do this the right way.`
  })()

  return (
    <article className="print-page simple-sheet mx-auto max-w-[760px] px-4 sm:px-6 py-6 sm:py-10 text-[#0c0c0b]">
      {needsVerification && (
        <div className="no-print mb-4 rounded-[12px] border border-amber-300 bg-amber-50 p-3 text-[12px] leading-[1.5] text-amber-950">
          <strong>Internal:</strong> the home value is a fallback guess. Replace it with a real value
          before sending.
        </div>
      )}

      {/* HERO */}
      <section className="rounded-[30px] bg-[#101010] text-white px-6 sm:px-10 pt-7 pb-8 sm:pt-9 sm:pb-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/falco-mark-transparent.png" alt="" className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-[0.18em]">FALCO</span>
          </div>
          <div className="text-[12px] text-white/55 text-right leading-tight">
            {estate ? "For the estate of " : "For "}
            {homeowner.fullName || (estate ? "the owner" : "you")}
            <br />
            {todayHuman()}
          </div>
        </div>

        <p className="mt-8 text-[15px] sm:text-[16px] text-white/70 leading-snug max-w-[46ch]">
          {firstName && !estate ? `${firstName}, you` : "You"} have more options than it may feel like
          right now. Here is the simple math.
        </p>
        <div className="mt-5 text-[14px] text-white/60">
          If the house sells at auction, {you} could walk away with about
        </div>
        <div className="mt-1 text-[40px] sm:text-[60px] font-medium tracking-[-0.035em] leading-[1.02] tabular-nums">
          {fmt(low)} <span className="text-white/45">to</span> {fmt(high)}
        </div>
        <div className="mt-2 text-[13px] text-white/50">
          That is the money left after the loan and closing costs are paid.
        </div>
        {gainOverCash > 0 && (
          <div className="mt-3 text-[15px] text-white/80 leading-snug max-w-[52ch]">
            That is about <strong className="text-white">{fmt(gainOverCash)} more</strong> than
            selling fast to a cash buyer.
          </div>
        )}

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-[#0c0c0b] px-4 py-2 text-[14px] font-semibold">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[#0c0c0b]" />
          No cost to you. No commission. Nothing up front.
        </div>
        {saleLine && <p className="mt-4 text-[13px] text-white/65 leading-snug max-w-[60ch]">{saleLine}</p>}
      </section>

      {/* COMPARISON */}
      <section className="mt-7 sm:mt-9">
        <h2 className="text-[20px] sm:text-[22px] font-medium tracking-[-0.025em]">
          Your options, side by side
        </h2>
        <p className="mt-1 text-[13px] text-[#6d6c66]">
          {homeowner.propertyAddress ? tidyAddress(homeowner.propertyAddress) : "The property"}
          {homeowner.county ? `, ${titleCase(homeowner.county.replace(/\s+county$/i, ""))} County` : ""}. Money in {estate ? "the estate's" : "your"}{" "}
          pocket after the loan is paid off.
        </p>
        <div className="mt-5 space-y-4">
          {bars.map((b) => (
            <BarRow key={b.key} bar={b} scaleMax={scaleMax} />
          ))}
        </div>
        {listingBeatsAuction && (
          <p className="mt-5 text-[13px] text-[#6d6c66] leading-[1.55]">
            To be straight with you: listing with an agent may bring in more money if you can wait a few
            months and handle showings. Auction trades some of that for a set sale date, no showings and
            no agent fee.
          </p>
        )}
        {worst > cashNet && worst > 0 && (
          <p className="mt-5 text-[13px] text-[#6d6c66] leading-[1.55]">
            If the auction goes badly and the house sells for only{" "}
            {Math.round(out.auction.worst.retailPct * 100)}% of its value, {you} would still walk away
            with about <strong className="text-[#0c0c0b]">{fmt(worst)}</strong>
            {cashWalks ? "" : ", which is still more than the cash buyer"}. About 9 in 10 local home
            auctions we checked sold for more than that.
          </p>
        )}
      </section>

      {/* WHY FALCO */}
      <section className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Reason title="It costs you nothing">
          The buyer pays the auction company&apos;s 10% fee on top of their bid. {estate ? "The estate pays" : "You pay"} no
          commission and nothing up front. The loan and normal closing costs get paid out of the sale,
          the same as any home sale.
        </Reason>
        <Reason title="Buyers compete for the house">
          A cash buyer names one low price. At auction, a licensed Tennessee auction company advertises
          the house and buyers bid against each other.
        </Reason>
        <Reason title="A set date, no fixing up">
          It takes {TIMELINE_TEXT} from signing to closing. You don&apos;t have to fix anything or
          hold months of showings.
        </Reason>
        <Reason title="You decide">
          Nothing is final until you sign. If auction isn&apos;t right for {estate ? "the estate" : "you"}, we
          will tell you.
        </Reason>
      </section>

      {/* NEXT STEPS + CONTACT */}
      <section className="mt-8 sm:mt-10 rounded-[30px] bg-[#e8e7e3] p-6 sm:p-8">
        <h2 className="text-[20px] font-medium tracking-[-0.025em]">What happens next</h2>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[14px] leading-[1.5]">
          <Step n={1} title="A 15-minute call">
            We go over these numbers together and check them against what you owe.
          </Step>
          <Step n={2} title="Meet the auction company">
            They look at the house and lay out a plan. You sign only if it makes sense.
          </Step>
          <Step n={3} title="Auction day, then closing">
            Buyers bid. At closing the loan is paid off and the rest goes to {you}.
          </Step>
        </ol>
        <div className="mt-6 rounded-[18px] bg-[#101010] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[13px] text-white/55">Call or text me</div>
            <div className="mt-0.5 text-[18px] font-medium">Patrick Yuri Armour</div>
          </div>
          <div className="sm:text-right">
            <div className="text-[26px] font-medium tracking-[-0.02em] tabular-nums">601-213-8868</div>
            <div className="text-[13px] text-white/60">falco@falco.llc · falco.llc</div>
          </div>
        </div>
      </section>

      {/* FINE PRINT */}
      <section className="mt-8 text-[12px] text-[#6d6c66] leading-[1.55]">
        <h3 className="text-[13px] font-semibold text-[#0c0c0b]">How we did the math</h3>
        <table className="mt-2 w-full max-w-[480px] tabular-nums">
          <tbody>
            <FineRow label="What we think the house is worth" value={fmt(out.inputs.arv)} />
            <FineRow
              label={`Auction price (${pct(out.auction.low.retailPct)} to ${pct(out.auction.high.retailPct)} of that)`}
              value={`${fmt(out.auction.low.winningBid)} to ${fmt(out.auction.high.winningBid)}`}
            />
            <FineRow label="Minus what is owed on the loan" value={`- ${fmt(loanBalance)}`} />
            {out.auction.low.taxLien > 0 && (
              <FineRow label="Minus back taxes" value={`- ${fmt(out.auction.low.taxLien)}`} />
            )}
            <FineRow label="Minus normal closing costs" value={`- ${fmt(out.auction.low.closingCosts)}`} />
            {estate && (
              <FineRow
                label="Minus the bankruptcy trustee's fee (legal maximum)"
                value={`- ${fmt(out.auction.low.trusteeFee)} to ${fmt(out.auction.high.trusteeFee)}`}
              />
            )}
            <FineRow label={`Left for ${you}`} value={`${fmt(low)} to ${fmt(high)}`} bold />
          </tbody>
        </table>
        <ul className="mt-3 space-y-1.5 list-disc pl-4">
          <li>
            Why {pct(out.auction.low.retailPct)} to {pct(out.auction.high.retailPct)}: we checked{" "}
            {LOCAL_AUCTIONS.n} recent home auctions by a Middle Tennessee auction company against county
            records. Half sold for {pct(LOCAL_AUCTIONS.median)} or more of the county&apos;s value. 1 in 4
            sold for less than {pct(LOCAL_AUCTIONS.p25)}. We used a careful range on purpose.
          </li>
          <li>
            The loan amount is our best estimate. Your real payoff may be higher if there are missed
            payments, late fees or legal fees. We will confirm it with your lender.
          </li>
          {!cashWalks && (
            <li>
              Cash buyer: we assumed {cashPct}% of the home&apos;s value, minus the loan. If you already have
              a real cash offer, we will put it side by side with this.
            </li>
          )}
          <li>
            These are estimates, not a promise. The final price depends on the market, how many buyers
            show up and the condition of the house.
          </li>
          {(s === "bankruptcy_pre_petition" || s === "bankruptcy_363_sale") && (
            <li>This is not legal advice. Talk to a bankruptcy lawyer before you decide.</li>
          )}
        </ul>
        <p className="mt-3 text-[11px] text-[#8e8d86]">
          FALCO · Nashville, Tennessee · Auctions are run by licensed Tennessee auction companies.
        </p>
      </section>
    </article>
  )
}

function BarRow({ bar, scaleMax }: { bar: Bar; scaleMax: number }) {
  const top = bar.high ?? bar.value
  const width = Math.max(0, Math.min(100, (Math.max(0, top) / scaleMax) * 100))
  const lowWidth = bar.high !== undefined ? Math.max(0, (bar.value / scaleMax) * 100) : width
  const color =
    bar.tone === "win" ? "bg-[#0c0c0b]" : bar.tone === "loss" ? "bg-[#8d3f31]" : "bg-[#b9b8b2]"
  const amount =
    bar.display ??
    (bar.high !== undefined
      ? `${fmt(bar.value)} to ${fmt(bar.high)}`
      : bar.value < 0
      ? `You pay ${fmt(-bar.value)}`
      : fmt(bar.value))
  const isWin = bar.tone === "win"
  return (
    <div className={isWin ? "rounded-[18px] bg-white p-4" : "px-4"}>
      <div className="flex items-baseline justify-between gap-3">
        <div className={`text-[14px] ${isWin ? "font-semibold" : "font-medium"}`}>{bar.label}</div>
        <div
          className={`text-[16px] sm:text-[18px] tabular-nums text-right ${
            isWin ? "font-semibold" : bar.tone === "loss" ? "text-[#8d3f31] font-medium" : "font-medium"
          }`}
        >
          {amount}
        </div>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-[#e8e7e3] overflow-hidden relative">
        {width > 0 && (
          <>
            <div className={`absolute inset-y-0 left-0 rounded-full ${color} opacity-35`} style={{ width: `${width}%` }} />
            <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${lowWidth}%` }} />
          </>
        )}
      </div>
      <div className="mt-1.5 text-[12px] text-[#6d6c66] leading-[1.45]">{bar.note}</div>
    </div>
  )
}

function Reason({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] bg-white p-5">
      <div className="text-[15px] font-semibold tracking-[-0.01em]">{title}</div>
      <p className="mt-1.5 text-[13px] text-[#6d6c66] leading-[1.55]">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="list-none">
      <div className="h-7 w-7 rounded-full bg-[#0c0c0b] text-white text-[13px] font-semibold grid place-items-center">
        {n}
      </div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="mt-0.5 text-[13px] text-[#6d6c66]">{children}</div>
    </li>
  )
}

function FineRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "border-t border-[rgba(12,12,11,.12)] text-[#0c0c0b] font-semibold" : ""}>
      <td className="py-1 pr-4">{label}</td>
      <td className="py-1 text-right whitespace-nowrap">{value}</td>
    </tr>
  )
}

/** Records often come in ALL CAPS; soften those. Leave mixed case alone. */
function tidyAddress(a: string): string {
  if (a !== a.toUpperCase()) return a
  return titleCase(a).replace(/\b(Tn)\b/g, "TN").replace(/\b(Ne|Nw|Se|Sw)\b/g, (m) => m.toUpperCase())
}

function titleCase(t: string): string {
  return t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function todayHuman(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function fmtDateHuman(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}
