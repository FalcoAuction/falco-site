import { fmt, type MathOutput } from "@/lib/math-sheet"
import type { Scenario, ScenarioConfig } from "./scenario-config"
import type { HomeownerSnapshot } from "./math-sheet-content"

/**
 * The homeowner math sheet. Built to be read in ten seconds by someone
 * under stress: three colored boxes with one big number each, one line
 * on cost, one button to call. Everything else is a few lines of small
 * print at the bottom so the numbers stay honest.
 *
 * Copy rules: short plain words, no industry terms, no em dashes,
 * numbers rounded to the nearest $1,000 ("about"), and never claim more
 * than the math on the page shows. Full walkthrough: ?layout=classic.
 */

/** 104 Parks home auctions matched to county deeds (falco-workspace/
 *  partners/parks_deeds.json, 2026-11-12): median 92%, 1 in 4 below 79%
 *  of county value. Auction to deed median 27 days; with a 30-60 day
 *  campaign that is 2 to 3 months from signing. */
const LOCAL_AUCTIONS_N = 104
const TIMELINE_TEXT = "2 to 3 months"
const TIMELINE_DAYS = 75

type Tone = "red" | "amber" | "green"
type Box = { key: string; label: string; amount: string; note: string; tone: Tone }

function k(n: number): string {
  return fmt(Math.round(n / 1000) * 1000)
}

function statusQuo(
  s: Scenario,
  out: MathOutput,
  saleCalledOff: boolean,
): { label: string; amount: string; note: string } | null {
  switch (s) {
    case "foreclosure":
      return {
        label: saleCalledOff ? "If the foreclosure comes back" : "If the bank forecloses",
        amount: "Usually $0",
        note: "You lose the house and the money in it.",
      }
    case "probate":
      return {
        label: "If the house just sits",
        amount: "Costs money",
        note: "Taxes, insurance and upkeep every month.",
      }
    case "code_violation":
      return {
        label: "If you fix it, then sell",
        amount: k(out.selfRemediate.netToHomeowner),
        note: "You pay for repairs and fines first.",
      }
    case "bankruptcy_pre_petition":
      return {
        label: "If you file bankruptcy first",
        amount: "Up to $35,000",
        note: "The most you can usually protect ($52,500 if filing together).",
      }
    case "tax_lien":
      return {
        label: "If the county sells it for taxes",
        amount: k(out.taxSale.netToHomeowner),
        note: "Tax sale bids are usually low.",
      }
    case "demolition":
      return {
        label: "If you rebuild or repair",
        amount: `You pay ${k(out.demoRoute.totalOutOfPocket)}`,
        note: "Before the house is worth anything to you.",
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
  // Probate / post-petition: the reader is an executor, heir or trustee.
  const estate = scenarioCfg.applyTrusteeFee || s === "probate"
  const firstName = (homeowner.fullName || "").trim().split(/\s+/)[0] || ""
  const low = out.auction.low.netToHomeowner
  const high = out.auction.high.netToHomeowner
  const saleCalledOff =
    homeowner.trusteeSaleStatus === "cancelled" || homeowner.trusteeSaleStatus === "reinstated"

  const cashWalks = out.wholesaler.scenario === "walks"
  const boxes: Box[] = []
  const sq = statusQuo(s, out, saleCalledOff)
  if (sq) boxes.push({ key: "sq", ...sq, tone: "red" })
  boxes.push({
    key: "cash",
    label: "If you sell to a cash buyer",
    amount: cashWalks ? "Likely no offer" : k(out.wholesaler.realisticNet),
    note: cashWalks ? "Too much is owed for them to profit." : "They pay low so they can profit.",
    tone: "amber",
  })
  if (scenarioCfg.showMls) {
    boxes.push({
      key: "mls",
      label: "If you list with an agent",
      amount: k(out.mls.netToSeller),
      note: "Can pay more, but takes months of showings and a 6% fee.",
      tone: "amber",
    })
  }
  boxes.push({
    key: "auction",
    label: estate ? "If the estate sells at auction with us" : "If you sell at auction with us",
    amount: `${k(low)} to ${k(high)}`,
    note: "Buyers bid against each other.",
    tone: "green",
  })

  const urgent = (() => {
    if (s !== "foreclosure" || saleCalledOff || !homeowner.trusteeSaleDate) return null
    if (daysToSale === null) return null
    if (daysToSale < 0) return "Your sale date has passed. Call us. There may still be options."
    const d = fmtShortDate(homeowner.trusteeSaleDate)
    return daysToSale < TIMELINE_DAYS
      ? `Your foreclosure sale is ${d}. Call this week so we can ask the bank for more time.`
      : `Your foreclosure sale is ${d}. You have time to do this right.`
  })()

  return (
    <article className="print-page simple-sheet mx-auto max-w-[560px] px-5 py-8 sm:py-12 text-[#111]">
      {needsVerification && (
        <div className="no-print mb-5 rounded-xl bg-amber-100 p-3 text-[13px] text-amber-950">
          Home value is a guess. Fix it under Edit numbers before sending.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon-512.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-[16px] font-bold tracking-[0.16em]">FALCO</span>
        </div>
        <div className="text-[14px] text-[#666]">
          {estate ? "For the estate of " : "For "}
          {homeowner.fullName || (estate ? "the owner" : "you")}
        </div>
      </div>

      <h1 className="mt-10 text-[34px] sm:text-[40px] font-bold leading-[1.1] tracking-[-0.02em]">
        {estate
          ? "Here is what the estate could keep."
          : `${firstName ? `${firstName}, here` : "Here"} is what you could keep.`}
      </h1>
      {urgent && (
        <p className="mt-3 text-[18px] font-semibold text-[#b42318] leading-snug">{urgent}</p>
      )}

      <div className="mt-8 space-y-4">
        {boxes.map((b) => (
          <BoxCard key={b.key} box={b} />
        ))}
      </div>

      <p className="mt-8 text-center text-[24px] font-bold leading-tight">
        It costs you $0 to use us.
      </p>
      <p className="mt-1 text-center text-[17px] text-[#555]">
        The buyer pays the auction fee. Not you.
      </p>

      <a
        href="tel:16012138868"
        className="mt-8 block rounded-2xl bg-[#12804a] px-6 py-5 text-center text-white no-underline"
      >
        <span className="block text-[17px] font-medium text-white/90">Call or text Patrick</span>
        <span className="block text-[32px] font-bold tracking-[-0.01em] tabular-nums text-white">601-213-8868</span>
      </a>

      <p className="mt-10 text-[12px] leading-[1.6] text-[#888]">
        These are estimates, not a promise. Home value: {k(out.inputs.arv)}. Loan owed: about{" "}
        {k(loanBalance)} (your real payoff may be higher with late fees).
        {out.auction.low.taxLien > 0 ? ` Back taxes: ${k(out.auction.low.taxLien)}.` : ""} Auction price:{" "}
        {pct(out.auction.low.retailPct)} to {pct(out.auction.high.retailPct)} of value, a careful guess
        from {LOCAL_AUCTIONS_N} local auctions. Closing costs: about {k(out.auction.low.closingCosts)}.
        {s === "bankruptcy_363_sale" ? " Bankruptcy trustee fee taken out at its legal maximum." : ""}
        {cashWalks ? "" : ` Cash offer: about ${cashPct(out)}% of value.`} Signing to closing takes about{" "}
        {TIMELINE_TEXT}.
        {s === "bankruptcy_pre_petition" || s === "bankruptcy_363_sale"
          ? " Not legal advice. Talk to a bankruptcy lawyer."
          : ""}{" "}
        FALCO, Nashville TN. Auctions run by licensed Tennessee auction companies.
      </p>
    </article>
  )
}

const TONES: Record<Tone, { box: string; amount: string }> = {
  red: { box: "bg-[#fdecea]", amount: "text-[#b42318]" },
  amber: { box: "bg-[#fff4e0]", amount: "text-[#a15c00]" },
  green: { box: "bg-[#12804a] text-white", amount: "text-white" },
}

function BoxCard({ box }: { box: Box }) {
  const t = TONES[box.tone]
  const big = box.tone === "green"
  return (
    <div className={`rounded-2xl px-6 ${big ? "py-7" : "py-5"} ${t.box}`}>
      <div className={`text-[17px] font-semibold ${big ? "text-white" : "text-[#333]"}`}>{box.label}</div>
      <div
        className={`mt-1 font-bold tracking-[-0.02em] leading-[1.05] tabular-nums ${t.amount} ${
          big ? "text-[40px] sm:text-[48px]" : "text-[32px]"
        }`}
      >
        {box.amount}
      </div>
      <div className={`mt-1 text-[16px] ${big ? "text-white/90" : "text-[#555]"}`}>{box.note}</div>
    </div>
  )
}

function cashPct(out: MathOutput): number {
  return Math.round(
    (out.wholesaler.scenario === "stretched"
      ? out.inputs.wholesalerStretchPct
      : out.inputs.wholesalerMaoPct) * 100
  )
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}
