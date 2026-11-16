import { fmt, type MathOutput } from "@/lib/math-sheet"
import type { Scenario, ScenarioConfig } from "./scenario-config"
import type { HomeownerSnapshot } from "./math-sheet-content"

/**
 * Homeowner math sheet, current default (layout "simple2"; the previous
 * version is simple-sheet.tsx, still reachable with ?layout=simple).
 * Differences from simple-sheet.tsx: honest status-quo ranges (foreclosure
 * shows the surplus a third-party bidder can leave; a cash range that starts
 * at the payoff reads "Up to"), the site's black-and-white look with color
 * only where it means something, the property address and date on top, the
 * auctioneer license on the contact card, and a closing call line.
 *
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

/** Auction.com Q2 2026 (~40% of US foreclosure auctions): third-party
 *  buyers paid an average 67.6% of value, and about half of sales went to a
 *  third party instead of back to the lender. Same basis as the homepage
 *  ledger. */
const FORECLOSURE_BID_RATIO = 0.676
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
  owed: number,
): { label: string; amount: string; note: string } | null {
  switch (s) {
    case "foreclosure": {
      const surplus = Math.max(0, out.inputs.arv * FORECLOSURE_BID_RATIO - owed)
      const some = k(surplus) !== "$0"
      return {
        label: saleCalledOff ? "If the foreclosure comes back" : "If the bank forecloses",
        amount: some ? `$0 to ${k(surplus)}` : "$0",
        note: some
          ? "Nothing if the bank takes it back, about half the time. If a bidder pays more than you owe, the extra is yours, but you have to claim it and it takes months."
          : "The bank takes it for what is owed.",
      }
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

export default function SimpleSheetV2({
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
    : Math.round(cashLow / 1000) <= 0
    ? `Up to ${k(cashHigh)}`
    : `${k(cashLow)} to ${k(cashHigh)}`

  const boxes: Box[] = []
  // A called-off foreclosure sale makes "usually $0" a weak and shaky
  // comparison, so that box is dropped (the operator gets a warning).
  const sq = saleCalledOff ? null : statusQuo(s, out, saleCalledOff, owed)
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
      : Math.round(cashLow / 1000) <= 0
      ? `Cash buyers usually offer ${pct(CASH_LOW_PCT)} to ${pct(CASH_HIGH_PCT)} of value. The low end only covers what is owed.`
      : s === "probate"
      ? "Investors watch probate filings and mail low offers."
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
    note: `A set sale date. Sold as-is. Closes in about ${TIMELINE_TEXT}.`,
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
          .simple-sheet .print-break ol > li + li { margin-top: 8px !important; }
          .simple-sheet .print-break ol li > div:last-child > div:last-child { font-size: 13px !important; }
          .simple-sheet .contact-card { padding: 16px 20px !important; }
          .simple-sheet .contact-card > div + div { margin-top: 12px !important; padding-top: 12px !important; }
          .simple-sheet .action-tiles a { padding-top: 8px !important; padding-bottom: 8px !important; gap: 4px !important; }
          .simple-sheet .action-tiles a > span:first-child { height: 34px !important; width: 34px !important; }
          .simple-sheet .action-tiles svg { height: 17px !important; width: 17px !important; }
          .simple-sheet .contact-card img { height: 76px !important; }
          .simple-sheet .card-quote { margin-top: 10px !important; font-size: 14px !important; }
          .simple-sheet .contact-line { margin-top: 8px !important; font-size: 12px !important; }
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

      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/falco-bird-black.png" alt="FALCO" className="h-9 w-auto" />
          <span className="text-[17px] font-bold tracking-[0.18em]">FALCO</span>
        </div>
        <div className="text-right text-[13px] leading-[1.45] text-[#666]">
          <div className="font-medium text-[#111]">
            {estate ? "For the estate of " : "For "}
            {homeowner.fullName || (estate ? "the owner" : "you")}
          </div>
          {homeowner.propertyAddress && <div>{homeowner.propertyAddress}</div>}
          <div>Prepared {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })}</div>
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
          It costs you $0 to use us.
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
            At closing the loan gets paid off and the rest goes to {estate ? "the estate" : "you"}.
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
            <div className="text-[15px] font-medium text-[#333]">CEO / Founder, FALCO</div>
            <div className="text-[14px] text-[#666]">Licensed Tennessee Auctioneer #7622</div>
            <div className="text-[15px] text-[#666]">Nashville, Tennessee</div>
          </div>
        </div>
        <blockquote className="card-quote mt-5 border-l-[3px] border-[#111] pl-4 text-[17px] font-medium leading-snug text-[#222]">
          &ldquo;Your home&apos;s value belongs to you. Our job is making sure you keep it.&rdquo;
        </blockquote>
        <div className="mt-6 border-t border-[#eee] pt-5">
          {/* Tap targets: on a phone these open the dialer, messages and mail.
              Kept in print so a texted PDF carries them as live links. */}
          <div className="action-tiles grid grid-cols-3 gap-3">
            <ActionTile href="tel:+16012138868" label="Call" icon="phone" />
            <ActionTile href="sms:+16012138868" label="Text" icon="text" />
            <ActionTile href="mailto:pat@falco.llc" label="Email" icon="mail" />
          </div>
          <div className="contact-line mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13px] text-[#444]">
            <a href="tel:+16012138868" className="font-semibold text-[#111] tabular-nums">
              601-213-8868
            </a>
            <span className="text-[#ccc]">|</span>
            <a href="mailto:pat@falco.llc" className="text-[#111]">
              pat@falco.llc
            </a>
            <span className="text-[#ccc]">|</span>
            <a href="https://www.falco.llc" className="text-[#111]">
              www.falco.llc
            </a>
          </div>
        </div>
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
          {s === "foreclosure" && (
            <li>
              <strong className="text-[#222]">The foreclosure range</strong> assumes an outside bidder pays about{" "}
              {pct(FORECLOSURE_BID_RATIO)} of value, the 2026 national average. About half of foreclosure sales go
              back to the bank instead, and then there is nothing left over.
            </li>
          )}
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
        <div className="mt-10 rounded-2xl bg-[#0c0c0b] px-6 py-5 text-white">
          <div className="text-[15px] text-white/70">Questions about these numbers?</div>
          <a href="tel:+16012138868" className="mt-1 block text-[22px] font-semibold tracking-[-0.01em]">
            Call or text Patrick: 601-213-8868
          </a>
        </div>
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
  red: { box: "bg-white border border-[#e5e5e5]", amount: "text-[#111]" },
  amber: { box: "bg-white border border-[#e5e5e5]", amount: "text-[#111]" },
  green: { box: "bg-[#0c0c0b] text-white", amount: "text-white" },
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0c0c0b] text-[16px] font-semibold text-white">
        {n}
      </div>
      <div>
        <div className="text-[17px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[15px] leading-[1.5] text-[#555]">{children}</div>
      </div>
    </li>
  )
}

const ICONS: Record<"phone" | "text" | "mail", React.ReactNode> = {
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  text: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
}

function ActionTile({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: "phone" | "text" | "mail"
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f6f6f4] py-4 transition-colors hover:bg-[#efefec]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0c0c0b]">
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px]"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {ICONS[icon]}
        </svg>
      </span>
      <span className="text-[15px] font-semibold text-[#111]">{label}</span>
    </a>
  )
}

function MathRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3 ${bold ? "font-semibold text-[#111]" : ""}`}>
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
