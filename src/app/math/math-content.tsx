"use client"

import Link from "next/link"
import { Ledger } from "../v2/v2-content"
import WhoRouter from "../v2/who-router"
import { AnswersCue, PageHead, PageSec, SitePage, WHY_AUCTION_HREF } from "../v2/site-page"

/**
 * /math: one example house, the three ways out, and the sources, on the
 * site's shared frame. The percentages match the math sheet every seller
 * receives (simple-sheet-v2.tsx): auction 80% to 88% of value from 104
 * local auctions, cash offers 55% to 70%, outside foreclosure bids 65.3% (Auction.com, Q3 2026).
 */

const VALUE = 500_000
const OWED = 300_000
const CLOSING = 5_000
const BID_RATIO = 0.653
const CASH_LOW = 0.55
const CASH_HIGH = 0.7
const AUCTION_LOW = 0.8
const AUCTION_HIGH = 0.88

const usd = (n: number) => "$" + (Math.round(Math.max(n, 0) / 1000) * 1000).toLocaleString("en-US")

const surplus = VALUE * BID_RATIO - OWED
const cashHigh = VALUE * CASH_HIGH - OWED
const auctionLow = VALUE * AUCTION_LOW - OWED - CLOSING
const auctionHigh = VALUE * AUCTION_HIGH - OWED - CLOSING

const EXITS = [
  {
    n: "Exit 01",
    h: "Let the forced sale happen",
    amount: `$0 to ${usd(surplus)}`,
    rows: [
      "About half the time nobody outbids the lender, and it takes the house for what is owed. You keep nothing.",
      `The other half, an outside bidder pays about ${Math.round(BID_RATIO * 100)}% of value, near ${usd(VALUE * BID_RATIO)} here. What is left after the debt is yours.`,
      "But only after other liens, only if you file a claim, and usually months later.",
    ],
  },
  {
    n: "Exit 02",
    h: "Take a cash offer",
    amount: `Up to ${usd(cashHigh)}`,
    rows: [
      `Cash buyers usually offer ${Math.round(CASH_LOW * 100)}% to ${Math.round(CASH_HIGH * 100)}% of value: ${usd(VALUE * CASH_LOW)} to ${usd(VALUE * CASH_HIGH)} here.`,
      "At the low end that only covers what is owed. Their profit is the gap between the offer and the real value.",
      "Fast and certain, which is what you are paying for.",
    ],
  },
  {
    n: "Exit 03",
    h: "Sell at a marketed auction",
    amount: `${usd(auctionLow)} to ${usd(auctionHigh)}`,
    rows: [
      `Advertised, open bidding through a licensed Tennessee firm. We plan on ${Math.round(AUCTION_LOW * 100)}% to ${Math.round(AUCTION_HIGH * 100)}% of value: ${usd(VALUE * AUCTION_LOW)} to ${usd(VALUE * AUCTION_HIGH)}.`,
      `Minus what is owed and about ${usd(CLOSING)} in closing costs.`,
      "The buyer pays a 10% premium on top of the winning bid. It does not come out of your money.",
    ],
    dark: true,
  },
]

export default function MathContent() {
  return (
    <SitePage>
      <PageHead
        label="The math"
        title="One house. Three ways out."
        lede="Same house, same debt, different exits. Here is what each one would leave you, using the same numbers we put on every math sheet we send."
      >
        <a className="pill dark" href="#start">
          Get your numbers <sub>→</sub>
        </a>
        <a className="pill line" href="#math">
          Run your own
        </a>
      </PageHead>

      <PageSec label="The example" title="Start with the house.">
        <ul className="rows r">
          <li>
            <b>Worth {usd(VALUE)}</b>
            <span>What it would sell for on the open market.</span>
          </li>
          <li>
            <b>Still owed {usd(OWED)}</b>
            <span>The loan payoff, before any late fees.</span>
          </li>
          <li>
            <b>Equity {usd(VALUE - OWED)}</b>
            <span>Yours on paper. How much of it you keep depends on how it sells.</span>
          </li>
        </ul>
      </PageSec>

      <PageSec label="The three ways out" title="What each one leaves you.">
        <div className="mx-exits" data-stagger="90">
          {EXITS.map((e) => (
            <div className={`mx-exit r${e.dark ? " on" : ""}`} key={e.n}>
              <span className="n">{e.n}</span>
              <h3>{e.h}</h3>
              <p className="mx-amount">{e.amount}</p>
              <ul>
                {e.rows.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="sm r" style={{ marginTop: 32 }}>
          Same house. Same debt. The difference is how many buyers compete for it.
        </p>
      </PageSec>

      <PageSec id="start" label="Your numbers" title="See it for what you have.">
        <div className="pg-form r">
          <WhoRouter audience="seller" />
        </div>
        <AnswersCue />
      </PageSec>

      <Ledger full={false} />

      <PageSec id="answers" label="Where the numbers come from" title="Sources, not guesses.">
        <ul className="rows r">
          <li>
            <b>Auction prices</b>
            <span>
              104 recent home auctions in Middle Tennessee, matched to county deeds. Half sold for 92% or more of
              the county&apos;s value and 1 in 4 below 79%. We plan on 80% to 88% to stay on the safe side.
            </span>
          </li>
          <li>
            <b>Foreclosure bids</b>
            <span>
              Auction.com, Q3 2026: outside buyers paid an average of 65.3% of value, and 45.5% of foreclosure
              auctions sold. The rest went back to the lender.
            </span>
          </li>
          <li>
            <b>Cash offers</b>
            <span>
              Distressed cash buyers commonly open around 55% of value, up to the investor &ldquo;70% rule&rdquo;
              ceiling. A real offer you already have replaces the range on your sheet.
            </span>
          </li>
          <li>
            <b>Costs</b>
            <span>
              Nothing to you: no listing fee and no commission from your side. The buyer pays a 10% premium on top
              of the winning bid. We assume about {usd(CLOSING)} in closing costs.
            </span>
          </li>
          <li>
            <b>These are estimates, not a promise</b>
            <span>The final price depends on the market, how many buyers show up and the condition of the property.</span>
          </li>
        </ul>
      </PageSec>

      <PageSec label="Not just houses" title="The same math holds for anything with buyers.">
        <p className="lede r">
          Land, equipment, vehicles, boats and collections all follow the same pattern. A forced sale or a quick
          cash offer prices in the seller&apos;s deadline. A marketed auction prices in the buyers.
        </p>
        <p className="r" style={{ marginTop: 28 }}>
          <Link className="pill line" href="/manifesto">
            How it works, start to finish <sub>→</sub>
          </Link>{" "}
          <Link className="pill line" href={WHY_AUCTION_HREF}>
            Why auction <sub>→</sub>
          </Link>
        </p>
      </PageSec>

    </SitePage>
  )
}
