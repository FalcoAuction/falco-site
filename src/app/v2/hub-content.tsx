"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Count,
  Foot,
  LiteVideo,
  Nav,
  usePanelPins,
  useReveals,
  useStackDepth,
} from "./v2-content"
import { ASSET_CLASSES, HUB_FAQ, NOT_US, SITUATIONS } from "./situations"

/**
 * Homepage for the any-asset FALCO: the visitor picks the situation they
 * are in, sees how one situation splits into several assets that each go
 * to a different licensed specialist, then picks who they are. Same
 * design system and sticky deck as the foreclosure homepage it replaces;
 * that page now lives at /situations/foreclosure.
 */
export default function HubContent() {
  useReveals()
  usePanelPins()
  useStackDepth()
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Situations />
        <Routing />
        <HowItWorks />
        <WhatWeRoute />
        <WhoYouAre />
        <Incentive />
        <Faq />
        <ClosingCta />
      </main>
      <Foot />
    </>
  )
}

function Hero() {
  return (
    <section className="hero full">
      <div className="hcard">
        <div className="hcopy" data-stagger="90">
          <h1 className="d1 r">Everything has a buyer.</h1>
          <p className="lede r">
            When a death, a debt or a closing forces a sale, FALCO finds every
            asset worth auctioning and routes each one to the licensed
            Tennessee auctioneer who sells it best. Then buyers compete. No
            cost to you.
          </p>
          <div className="pills r">
            <a className="pill light" href="#situations">
              What happened? <sub>→</sub>
            </a>
            <a className="pill line" href="#how">
              How it works
            </a>
          </div>
        </div>
        <div className="hmedia">
          <div className="frame">
            <LiteVideo
              src="/media/hero.mp4"
              srcMob="/media/hero-mob.mp4"
              poster="/media/hero.jpg"
            />
          </div>
        </div>
      </div>
      <div className="hero-stats">
        <div className="stats" data-stagger="90">
          <div className="stat r">
            <b>${<Count to={0} />}</b>
            <span>FALCO fee to the seller.</span>
          </div>
          <div className="stat r">
            <b>
              <Count to={9} />
            </b>
            <span>Kinds of assets we route.</span>
          </div>
          <div className="stat r">
            <b>
              <Count to={1} />
            </b>
            <span>Call for everything that has to sell.</span>
          </div>
          <div className="stat r">
            <b>0</b>
            <span>Things we buy. We only route.</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Situations() {
  return (
    <section className="sec full" id="situations">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Start with what happened</p>
            <h2 className="d2 r">What brings you here?</h2>
          </div>
          <p className="lede note r">
            Pick the one closest to yours. Each page explains what we do, what
            it costs and what happens next, in plain terms.
          </p>
        </div>
        <div className="sitgrid" data-stagger="70">
          {SITUATIONS.map((s, i) => (
            <Link className="sit r" key={s.slug} href={`/situations/${s.slug}`}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.label}</h3>
              <p>{s.short}</p>
              <span className="go">
                See how it works <sub>→</sub>
              </span>
            </Link>
          ))}
        </div>
        <p className="sm r" style={{ marginTop: 18 }}>
          Something else? <Link href="/start" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Tell us what happened</Link> and we will tell you straight whether auction fits.
        </p>
      </div>
    </section>
  )
}

type Route = { a: string; note: string; to: string; who: string; tag: string; pass?: boolean }

const SCENARIOS: Array<{ id: string; label: string; intro: string; rows: Route[] }> = [
  {
    id: "estate",
    label: "An estate",
    intro: "A father in Madison passes. The family inherits the house and everything in it.",
    rows: [
      { a: "Three-bedroom house", note: "Paid off, needs work", to: "Real estate auction", who: "Licensed TN auction and realty firm", tag: "Real estate" },
      { a: "F-250 and a car trailer", note: "Titled to the estate", to: "Vehicle and equipment auction", who: "Online, statewide bidders", tag: "Vehicles" },
      { a: "31 firearms and a safe", note: "Hunting and collector pieces", to: "Firearms auction", who: "Auctioneer with a federal firearms license", tag: "Firearms" },
      { a: "18-foot bass boat", note: "On a trailer in the garage", to: "Marine and powersports auction", who: "Buyers who search for boats", tag: "Boats" },
      { a: "Coin and silver collection", note: "Three binders and a box", to: "Collectibles specialist", who: "Graded and lotted for collectors", tag: "Collections" },
      { a: "Furniture and kitchen", note: "Everyday contents", to: "Not us", who: "We point you to an estate-sale company", tag: "Pass", pass: true },
    ],
  },
  {
    id: "closing",
    label: "A shop closing",
    intro: "A machine shop in Smyrna shuts down after 30 years. The owner wants out clean.",
    rows: [
      { a: "12,000 sq ft shop building", note: "Owned by the business", to: "Commercial real estate auction", who: "Licensed TN real estate auction firm", tag: "Real estate" },
      { a: "CNC mills and lathes", note: "Six machines, running", to: "Industrial equipment auction", who: "Buyers nationwide who bid on machine tools", tag: "Equipment" },
      { a: "Forklifts and two box trucks", note: "One with a lien", to: "Vehicle and equipment auction", who: "Lender signs off, payoff at closing", tag: "Fleet" },
      { a: "Bar stock and tooling", note: "Inventory on the racks", to: "Business liquidation lots", who: "Sold with the equipment sale", tag: "Inventory" },
      { a: "Office furniture", note: "Desks, chairs, files", to: "Bundled or skipped", who: "Not worth a sale of its own", tag: "Pass", pass: true },
    ],
  },
  {
    id: "farm",
    label: "A family farm",
    intro: "Four siblings inherit 80 acres in Wilson County. Nobody wants to farm it.",
    rows: [
      { a: "80 acres with a barn", note: "Four owners, one deed", to: "Land auction", who: "Licensed TN real estate auction firm", tag: "Land" },
      { a: "Two tractors and implements", note: "Bush hog, disc, hay equipment", to: "Farm equipment auction", who: "Regional farm buyers", tag: "Equipment" },
      { a: "Side-by-side and ATVs", note: "Titled", to: "Powersports auction", who: "Online, statewide bidders", tag: "Vehicles" },
      { a: "Gun safe and collection", note: "Inherited pieces", to: "Firearms auction", who: "Auctioneer with a federal firearms license", tag: "Firearms" },
    ],
  },
]

function Routing() {
  const [id, setId] = useState(SCENARIOS[0].id)
  const sc = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">What we actually do</p>
            <h2 className="d2 r">
              One situation.
              <br />
              Many buyers.
            </h2>
          </div>
          <p className="lede note r">
            A house, a truck and a gun collection don&apos;t sell to the same
            people. We send each one to the specialist whose buyers want it,
            so you make one call instead of six.
          </p>
        </div>
        <div className="ledger r">
          <div className="lg-top">
            <div>
              <p className="lbl" style={{ marginBottom: 12 }}>
                Pick an example
              </p>
              <div className="chips">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    className="chip"
                    type="button"
                    aria-pressed={s.id === id}
                    onClick={() => setId(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="sm" style={{ maxWidth: "40ch", margin: 0 }}>
              {sc.intro}
            </p>
          </div>
          <div className="rt-rows" aria-live="polite">
            {sc.rows.map((r) => (
              <div className={`rt-row${r.pass ? " pass" : ""}`} key={r.a}>
                <span className="a">
                  {r.a}
                  <small>{r.note}</small>
                </span>
                <span className="arr" aria-hidden="true">→</span>
                <span className="to">
                  {r.to}
                  <small>{r.who}</small>
                </span>
                <span className="tag">{r.tag}</span>
              </div>
            ))}
          </div>
          <div className="lg-foot">
            <p className="sm" style={{ margin: 0, maxWidth: "52ch" }}>
              Every route is a licensed Tennessee firm with signed terms.
              You see the whole plan in writing before anything is listed.
            </p>
            <Link className="pill dark" href="/start">
              Map out yours <sub>→</sub>
            </Link>
          </div>
        </div>
        <p className="disc">
          Examples are illustrative. Which firm handles what depends on the
          asset, where it sits and who has authority to sell it.
        </p>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: "Step 01", h: "We spot it", p: "Probate filings, trustee notices, court-ordered sales and closure notices are public record. We read them every business day." },
    { n: "Step 02", h: "We take inventory", p: "What is there, roughly what it is worth, and what is not worth auctioning. In writing, free." },
    { n: "Step 03", h: "We route it", p: "Each asset goes to a licensed Tennessee auctioneer who specializes in that kind of property." },
    { n: "Step 04", h: "Buyers compete", p: "A marketed sale with open bidding on a set date. Proceeds are paid at closing." },
  ]
  return (
    <section className="sec full" id="how">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">How it works</p>
            <h2 className="d2 r">Four steps.</h2>
          </div>
          <p className="lede note r">
            Stop after any one of them. Nothing is owed either way.
          </p>
        </div>
        <div className="fcard plate r">
          <div className="steps" data-stagger="90">
            {steps.map((s) => (
              <div className="step r" key={s.n}>
                <p className="lbl">{s.n}</p>
                <h3 className="d3">{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div className="r plate-foot">
            <p className="sm" style={{ margin: 0 }}>
              Founded by Patrick Armour, licensed Tennessee auctioneer #7622.
            </p>
            <Link className="pill light" href="/start">
              Start here <sub>→</sub>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function WhatWeRoute() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">What we route</p>
            <h2 className="d2 r">If it&apos;s worth bidding on.</h2>
          </div>
          <p className="lede note r">
            Real property and the things of real value that come with it. If
            a specialist sale won&apos;t beat what you&apos;d get on your own,
            we&apos;ll tell you.
          </p>
        </div>
        <div className="agrid" data-stagger="50">
          {ASSET_CLASSES.map((a) => (
            <div className="box r" key={a.h}>
              <h4>{a.h}</h4>
              <p>{a.p}</p>
            </div>
          ))}
        </div>
        <div className="nope r">
          <b>What we don&apos;t take</b>
          {NOT_US.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhoYouAre() {
  const lanes = [
    { href: "/start", img: "/media/homeowner.jpg", h: "Families and owners", p: "Something has to be sold and you want it done right. Tell us what happened.", cta: "Start here" },
    { href: "/professionals", img: "/media/record.jpg", h: "Attorneys and trustees", p: "One contact for every asset in the file, and a sale record for the court.", cta: "Work with us" },
    { href: "/partners", img: "/media/partner.jpg", h: "Auction firms", p: "Inventory in your specialty, with the seller expecting your call.", cta: "Partner with us" },
    { href: "/buyers", img: "/media/house-white.jpg", h: "Buyers", p: "Tennessee property and assets headed to open bidding. Hear first.", cta: "Register" },
  ]
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Who you are</p>
            <h2 className="d2 r">Four ways in.</h2>
          </div>
          <p className="lede note r">
            Sellers, the professionals who advise them, the firms who run the
            sale and the people who bid. Each has its own door.
          </p>
        </div>
        <div className="grid4" data-stagger="90">
          {lanes.map((l) => (
            <Link className="tile r" key={l.href} href={l.href}>
              <span className="media" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.img} alt="" loading="lazy" decoding="async" />
              </span>
              <h3 className="d3">{l.h}</h3>
              <p>{l.p}</p>
              <span className="pill line">
                {l.cta} <sub>→</sub>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Incentive() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="split">
          <div data-stagger="80">
            <p className="lbl r">The incentive</p>
            <h2 className="d2 r">
              We don&apos;t buy
              <br />
              anything.
            </h2>
          </div>
          <div data-stagger="80">
            <p className="lede r">
              The buyer who offers you cash makes money by paying you less.
              That is the whole business.
            </p>
            <p className="lede r">
              We never take a position in what we route. The only way we do
              well is when buyers compete and your sale clears high. So
              that&apos;s what we push for.
            </p>
            <p className="r">
              <Link className="pill line" href="/manifesto">
                Read the manifesto <sub>→</sub>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="sec full" id="faq">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Common questions</p>
            <h2 className="d2 r">Straight answers.</h2>
          </div>
        </div>
        <div className="faq r">
          {HUB_FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="fcard plate r" style={{ textAlign: "center" }}>
          <h2
            className="d2"
            style={{ margin: "0 auto", maxWidth: "22ch", textWrap: "balance" }}
          >
            Know what it&apos;s worth
            <br />
            before anything sells.
          </h2>
          <p
            className="lede"
            style={{ margin: "18px auto 0", maxWidth: "52ch" }}
          >
            Tell us what happened. We&apos;ll tell you what is worth
            auctioning, who would sell it, and what you&apos;d likely clear.
            Free, even if you go elsewhere.
          </p>
          <div
            className="pills"
            style={{ justifyContent: "center", marginTop: 26 }}
          >
            <Link className="pill light" href="/start">
              Start here <sub>→</sub>
            </Link>
            <a className="pill line" href="mailto:falco@falco.llc">
              falco@falco.llc
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
