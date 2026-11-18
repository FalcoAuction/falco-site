"use client"

import { PageHead, PageSec, SitePage } from "../v2/site-page"
import AgentForm from "./agent-form"

/** The referral, as a share of the winning bid. Paid by the auction firm to
 *  the agent's principal broker under the firm's written referral terms. */
const REFERRAL_PCT = 1
const EXAMPLE_BID = 300000
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

const FITS = [
  { h: "Expired and stale listings", p: "Price cuts haven't moved it. A sale date will." },
  { h: "Estates", p: "Heirs in three states and a house nobody wants to manage." },
  { h: "A foreclosure date", p: "A seller with a trustee sale coming and no time for 90 days on market." },
  { h: "Houses that won't finance", p: "Condition, title or tenants that keep loan-backed buyers away." },
  { h: "Investor exits", p: "A client who wants out of one property or ten, on a known date." },
  { h: "Land and commercial", p: "Farms, lots and buildings with a thin buyer pool on the MLS." },
]

const WHY_AUCTION = [
  { n: "01", h: "A set date", p: "Bidding opens and closes on days the seller knows in advance. No open-ended waiting." },
  { n: "02", h: "As-is", p: "No repair list and no appraisal fight. Buyers inspect before the sale and bid on what is there." },
  { n: "03", h: "$0 seller commission", p: "The buyer pays a 10% premium on top of the winning bid. That is how the firm, FALCO and your referral are paid." },
  { n: "04", h: "Price set in the open", p: "Weeks of marketing and competing bids, not a courthouse-steps sale to whoever shows up." },
]

const WHY_FALCO = [
  { h: "We pick the firm", p: "Each property goes to the licensed Tennessee auction firm whose buyers want that kind of property in that county." },
  { h: "Numbers in writing", p: "Within one business day: a likely range, the firm, and the timeline. Something you can put in front of your seller." },
  { h: "Your client stays yours", p: "You're copied on every update, from the first call to the closing." },
  { h: "One contact", p: "You talk to one person, not three auction houses." },
]

const CLEAN = [
  { h: "We never pay agents directly", p: "Every referral dollar goes from the auction firm to your principal broker. Tennessee law says you're paid through your broker, so that's the only way we do it." },
  { h: "Terms in writing first", p: "The firm signs a referral agreement with your broker before your property goes to the firm. That agreement sets the final terms." },
  { h: "Your listing comes first", p: "If the property is under a listing agreement, your broker decides how it moves: a release, or a co-listing with the auction firm." },
  { h: "Licensed firms only", p: "Real estate auctions in Tennessee are run by firms that hold both an auction and a real estate license." },
  { h: "We never buy", p: "We don't take a position in anything we route." },
]

/** Winning bids shown in the pay table. */
const PAY_POINTS = [200000, 300000, 500000, 1000000]
/** A typical agent-to-agent referral: 25% of a 2.5% listing side. */
const TYPICAL_REFERRAL = 0.025 * 0.25

export default function AgentsContent() {
  const premium = EXAMPLE_BID * 0.1
  const referral = EXAMPLE_BID * (REFERRAL_PCT / 100)
  return (
    <SitePage>
      <PageHead
        label="For real estate agents"
        title="Get paid on the listings that won't sell."
        lede={`${REFERRAL_PCT}% of the winning bid, paid to your broker at closing. ${usd(referral)} on a ${usd(EXAMPLE_BID)} house. Send us the expireds, the estates and the sellers out of time, and a licensed Tennessee auction firm sells it on a set date.`}
      >
        <a className="pill dark" href="#join">
          Sign up <sub>→</sub>
        </a>
        <a className="pill line" href="mailto:pat@falco.llc">
          pat@falco.llc
        </a>
      </PageHead>

      <PageSec
        label="What you make"
        title={`${REFERRAL_PCT}% of the winning bid. Every sale.`}
        note="An expired listing pays nothing. The typical figure is a 25% referral on a 2.5% listing side."
      >
        <ul className="rows r">
          {PAY_POINTS.map((bid) => (
            <li key={bid}>
              <b>
                {usd(bid * (REFERRAL_PCT / 100))} on a {usd(bid)} sale
              </b>
              <span>A typical referral on the same house: {usd(bid * TYPICAL_REFERRAL)}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec
        id="join"
        label="Sign up"
        title="Two minutes to get on the list."
        note="We check your license, then the auction firm sends its referral agreement to your broker. Founded by Patrick Armour, licensed Tennessee auctioneer #7622."
      >
        <div className="pg-form r">
          <AgentForm />
        </div>
      </PageSec>

      <PageSec label="When auction fits" title="The listings that sit.">
        <ul className="rows r">
          {FITS.map((f) => (
            <li key={f.h}>
              <b>{f.h}</b>
              <span>{f.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec label="Why auction" title="What your seller gets.">
        <div className="quiet-steps four" data-stagger="90">
          {WHY_AUCTION.map((d) => (
            <div className="r" key={d.n}>
              <span className="n">{d.n}</span>
              <h3 className="d3">{d.h}</h3>
              <p>{d.p}</p>
            </div>
          ))}
        </div>
      </PageSec>

      <PageSec label="Why route it through FALCO" title="The right firm, not the nearest one.">
        <ul className="rows r">
          {WHY_FALCO.map((w) => (
            <li key={w.h}>
              <b>{w.h}</b>
              <span>{w.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec label="Where the money comes from" title="The buyer pays. Your seller doesn't.">
        <ul className="rows r">
          <li>
            <b>Winning bid</b>
            <span>{usd(EXAMPLE_BID)}</span>
          </li>
          <li>
            <b>Buyer&apos;s premium</b>
            <span>{usd(premium)}, paid by the buyer on top of the bid</span>
          </li>
          <li>
            <b>Your seller pays in commission</b>
            <span>$0</span>
          </li>
          <li>
            <b>Paid to your broker at closing</b>
            <span>
              {usd(referral)}, from the auction firm, under its written referral agreement
            </span>
          </li>
        </ul>
      </PageSec>

      <PageSec label="How we stay clean" title="Broker to broker. Nothing on the side.">
        <ul className="rows r">
          {CLEAN.map((c) => (
            <li key={c.h}>
              <b>{c.h}</b>
              <span>{c.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>
    </SitePage>
  )
}
