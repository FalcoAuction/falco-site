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

/** Cash-buyer offers modeled as a range: 55% of value (what distressed
 *  cash buyers commonly open at) up to 70% (the investor "70% rule"
 *  ceiling). A range is more honest than one number we can't source,
 *  and a real offer typed into Edit numbers replaces it. */
const CASH_LOW_PCT = 0.55
const CASH_HIGH_PCT = 0.7

/** The licensed auction firm FALCO routes to. Null until a partner
 *  agreement is signed and Patrick's principal broker is chosen. When
 *  set, the auction box names the firm and the footer carries its name
 *  and phone (TN advertising rules require the brokerage's name and
 *  number on anything soliciting a listing), plus one proof line. */
const AUCTION_PARTNER: { name: string; phone: string; proof: string } | null = null
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
  valueChecked,
  realCashOffer,
}: {
  homeowner: HomeownerSnapshot
  out: MathOutput
  scenarioCfg: ScenarioConfig
  daysToSale: number | null
  loanBalance: number
  needsVerification: boolean
  /** Operator ticked "Value checked" (or typed a value in). */
  valueChecked: boolean
  /** A real cash offer the homeowner already has. 0 = none. */
  realCashOffer: number
}) {
  const s = scenarioCfg.scenario
  // Probate / post-petition: the reader is an executor, heir or trustee.
  const estate = scenarioCfg.applyTrusteeFee || s === "probate"
  const firstName = (homeowner.fullName || "").trim().split(/\s+/)[0] || ""
  const low = out.auction.low.netToHomeowner
  const high = out.auction.high.netToHomeowner
  const saleCalledOff =
    homeowner.trusteeSaleStatus === "cancelled" || homeowner.trusteeSaleStatus === "reinstated"

  // Cash buyer: a real offer wins; otherwise a 55% to 70% range.
  const owed = loanBalance + out.auction.low.taxLien
  const hasRealOffer = realCashOffer > 0
  const cashLow = hasRealOffer ? realCashOffer - owed : out.inputs.arv * CASH_LOW_PCT - owed
  const cashHigh = hasRealOffer ? cashLow : out.inputs.arv * CASH_HIGH_PCT - owed
  const cashWalks = cashHigh <= 0
  const cashAmount = cashWalks
    ? hasRealOffer
      ? "$0"
      : "Likely no offer"
    : hasRealOffer || k(Math.max(0, cashLow)) === k(cashHigh)
    ? k(Math.max(0, cashLow))
    : `${k(Math.max(0, cashLow))} to ${k(cashHigh)}`

  const boxes: Box[] = []
  // A called-off foreclosure sale makes "usually $0" a weak and shaky
  // comparison, so that box is dropped (the operator gets a warning).
  const sq = saleCalledOff ? null : statusQuo(s, out, saleCalledOff)
  if (sq) boxes.push({ key: "sq", ...sq, tone: "red" })
  boxes.push({
    key: "cash",
    label: hasRealOffer
      ? `If ${estate ? "the estate takes" : "you take"} the cash offer`
      : `If ${estate ? "the estate sells" : "you sell"} to a cash buyer`,
    amount: cashAmount,
    note: hasRealOffer
      ? `${k(realCashOffer)} offer, minus what is owed.`
      : cashWalks
      ? "Too much is owed for them to profit."
      : "They pay low so they can profit.",
    tone: "amber",
  })
  if (scenarioCfg.showMls) {
    boxes.push({
      key: "mls",
      label: `If ${estate ? "the estate lists" : "you list"} with an agent`,
      amount: k(out.mls.netToSeller),
      note: "Can pay more, but takes months of showings and a 6% fee.",
      tone: "amber",
    })
  }
  boxes.push({
    key: "auction",
    label: AUCTION_PARTNER
      ? `If ${estate ? "the estate sells" : "you sell"} at auction through ${AUCTION_PARTNER.name}`
      : `If ${estate ? "the estate sells" : "you sell"} at auction through our licensed partner`,
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
    <article className="simple-sheet mx-auto max-w-[560px] px-5 py-8 sm:py-12 text-[#111]">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.45in; }
          .simple-sheet { max-width: 100% !important; padding: 0 !important; }
          .simple-sheet, .simple-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .simple-sheet section, .simple-sheet .box-card { break-inside: avoid; page-break-inside: avoid; }
          .simple-sheet .print-break { break-before: page; page-break-before: always; margin-top: 0 !important; }
          /* Fit on one sheet, front and back: page 1 = the numbers and
             the cost, page 2 = next steps, contact card and the math. */
          body::after { display: none !important; }
          .simple-sheet h1 { margin-top: 22px !important; font-size: 30px !important; }
          .simple-sheet > div, .simple-sheet > section { margin-top: 22px !important; }
          .simple-sheet > div:first-of-type { margin-top: 0 !important; }
          .simple-sheet .box-card { padding-top: 14px !important; padding-bottom: 14px !important; }
          .simple-sheet .box-card + .box-card { margin-top: 10px !important; }
          .simple-sheet .box-card .tabular-nums { font-size: 30px !important; }
          .simple-sheet .box-card:last-child .tabular-nums { font-size: 38px !important; }
          .simple-sheet .cost-box { padding-top: 18px !important; padding-bottom: 18px !important; }
          .simple-sheet .print-break h2, .simple-sheet .math-section h2 { font-size: 19px !important; }
          .simple-sheet .print-break ol { margin-top: 12px !important; }
          .simple-sheet .print-break ol > li + li { margin-top: 10px !important; }
          .simple-sheet .contact-card { padding: 16px 20px !important; }
          .simple-sheet .contact-card > div + div { margin-top: 12px !important; }
          .simple-sheet .math-section dl { margin-top: 10px !important; font-size: 13px !important; }
          .simple-sheet .math-section dl > div { padding-top: 5px !important; padding-bottom: 5px !important; }
          .simple-sheet .math-section ul { margin-top: 12px !important; font-size: 11.5px !important; line-height: 1.45 !important; }
          .simple-sheet .math-section ul > li + li { margin-top: 5px !important; }
          .simple-sheet .math-section > p { margin-top: 10px !important; }
        }
      `}</style>
      {(needsVerification || !valueChecked || saleCalledOff) && (
        <div className="no-print mb-5 space-y-1 rounded-xl bg-amber-100 p-3 text-[13px] text-amber-950">
          {needsVerification && <div>Home value is a guess. Fix it under Edit numbers before sending.</div>}
          {!needsVerification && !valueChecked && (
            <div>
              Check the home value ({k(out.inputs.arv)}) against a real comp, then tick &quot;Value
              checked&quot; up top.
            </div>
          )}
          {saleCalledOff && (
            <div>This foreclosure sale looks called off. Confirm it before sending. The foreclosure box is hidden.</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/falco-bird-black.png" alt="FALCO" className="h-9 w-auto" />
          <span className="text-[17px] font-bold tracking-[0.18em]">FALCO</span>
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

      {/* COST */}
      <section className="cost-box mt-16 rounded-2xl bg-[#f6f6f4] px-6 py-8 text-center">
        <p className="text-[26px] font-bold leading-tight">
          <span className="underline decoration-[#d92d20] decoration-[3px] underline-offset-[6px]">
            It costs you $0 to use us.
          </span>
        </p>
        <p className="mt-4 text-[17px] text-[#555]">The buyer pays the auction fee. Not you.</p>
        <p className="mt-1 text-[17px] text-[#555]">No commission. Nothing up front.</p>
      </section>

      {/* WHAT HAPPENS NEXT */}
      <section className="mt-20 print-break">
        <h2 className="text-[22px] font-bold tracking-[-0.01em]">What happens next</h2>
        <ol className="mt-5 space-y-5">
          <Step n={1} title="We talk for 15 minutes">
            We go over these numbers with you and check what you owe.
          </Step>
          <Step n={2} title="You meet the auction company">
            They look at the house and make a plan. You only sign if it makes sense.
          </Step>
          <Step n={3} title="Auction day, then closing">
            Buyers bid. At closing the loan gets paid off and the rest goes to {estate ? "the estate" : "you"}.
            About {TIMELINE_TEXT} start to finish.
          </Step>
        </ol>
      </section>

      {/* CONTACT CARD */}
      <section className="contact-card mt-20 rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/patrick-armour.jpg" alt="Patrick Yuri Armour" className="h-24 w-auto shrink-0 rounded-xl object-cover" />
          <div>
            <div className="text-[22px] font-bold leading-tight">Patrick Yuri Armour</div>
            <div className="text-[15px] font-semibold text-[#12804a]">CEO / Founder, FALCO</div>
            <div className="text-[15px] text-[#666]">Nashville, Tennessee</div>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-[17px]">
          <ContactRow label="Call or text" value="601-213-8868" href="tel:16012138868" />
          <ContactRow label="Email" value="falco@falco.llc" href="mailto:falco@falco.llc" />
          <ContactRow label="Website" value="falco.llc" href="https://falco.llc" />
        </div>
        <a
          href="tel:16012138868"
          className="no-print mt-6 block rounded-xl bg-[#12804a] py-4 text-center text-[18px] font-bold text-white"
        >
          <span className="text-white">Call</span>
        </a>
      </section>

      {/* HOW WE GOT THESE NUMBERS */}
      <section className="math-section mt-20">
        <h2 className="text-[22px] font-bold tracking-[-0.01em]">How we got these numbers</h2>
        <dl className="mt-5 divide-y divide-[#eee] border-y border-[#eee] text-[16px]">
          <MathRow label="What the house is worth" value={k(out.inputs.arv)} />
          <MathRow
            label={`Auction price (${pct(out.auction.low.retailPct)} to ${pct(out.auction.high.retailPct)} of that)`}
            value={`${k(out.auction.low.winningBid)} to ${k(out.auction.high.winningBid)}`}
          />
          <MathRow label="Minus what is owed on the loan" value={`- ${k(loanBalance)}`} />
          {out.auction.low.taxLien > 0 && (
            <MathRow label="Minus back taxes" value={`- ${k(out.auction.low.taxLien)}`} />
          )}
          <MathRow label="Minus closing costs" value={`- ${k(out.auction.low.closingCosts)}`} />
          {s === "bankruptcy_363_sale" && (
            <MathRow
              label="Minus the bankruptcy trustee's fee"
              value={`- ${k(out.auction.low.trusteeFee)} to ${k(out.auction.high.trusteeFee)}`}
            />
          )}
          <MathRow
            label={estate ? "What the estate keeps" : "What you keep"}
            value={`${k(low)} to ${k(high)}`}
            bold
          />
        </dl>

        <ul className="mt-6 space-y-3 text-[14px] leading-[1.55] text-[#555]">
          <li>
            <strong className="text-[#222]">Why {pct(out.auction.low.retailPct)} to {pct(out.auction.high.retailPct)}?</strong>{" "}
            We looked up {LOCAL_AUCTIONS_N} recent home auctions in Middle Tennessee. Half sold for 92% or
            more of the county&apos;s value. We picked a lower range to be safe.
          </li>
          <li>
            <strong className="text-[#222]">The loan amount is an estimate.</strong> If payments were missed,
            late fees and legal fees can make the real payoff higher. We will confirm it with your lender.
          </li>
          <li>
            {hasRealOffer ? (
              <>
                <strong className="text-[#222]">The cash offer</strong> is the {k(realCashOffer)} offer you
                told us about, minus what is owed.
              </>
            ) : (
              <>
                <strong className="text-[#222]">The cash offer</strong> assumes a buyer pays{" "}
                {pct(CASH_LOW_PCT)} to {pct(CASH_HIGH_PCT)} of what the house is worth. That is the usual
                range for a fast cash sale. Have a real offer? We will put it on this sheet.
              </>
            )}
          </li>
          <li>
            <strong className="text-[#222]">Who pays the auction fee?</strong> The winning buyer pays a 10% fee
            on top of their bid. It does not come out of your money.
          </li>
          <li>
            <strong className="text-[#222]">These are estimates, not a promise.</strong> The final price depends
            on the market, how many buyers show up and the shape of the house.
          </li>
          {(s === "bankruptcy_pre_petition" || s === "bankruptcy_363_sale") && (
            <li>
              <strong className="text-[#222]">Not legal advice.</strong> Talk to a bankruptcy lawyer before you
              decide.
            </li>
          )}
        </ul>

        {AUCTION_PARTNER && (
          <p className="mt-6 text-[14px] text-[#555]">{AUCTION_PARTNER.proof}</p>
        )}
        <p className="mt-8 text-[12px] text-[#999]">
          {AUCTION_PARTNER
            ? `Auction conducted by ${AUCTION_PARTNER.name}, ${AUCTION_PARTNER.phone}. FALCO · Nashville, Tennessee.`
            : "FALCO · Nashville, Tennessee · Auctions are run by licensed Tennessee auction companies."}
        </p>
      </section>
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
    <div className={`box-card rounded-2xl px-6 ${big ? "py-7" : "py-5"} ${t.box}`}>
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12804a] text-[16px] font-bold text-white">
        {n}
      </div>
      <div>
        <div className="text-[17px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[15px] leading-[1.5] text-[#555]">{children}</div>
      </div>
    </li>
  )
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[14px] text-[#777]">{label}</span>
      <a href={href} className="font-semibold text-[#111] tabular-nums">
        {value}
      </a>
    </div>
  )
}

function MathRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3 ${bold ? "font-bold text-[#12804a]" : ""}`}>
      <dt className={bold ? "" : "text-[#444]"}>{label}</dt>
      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
    </div>
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
