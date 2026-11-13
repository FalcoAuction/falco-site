"use client"

import Link from "next/link"
import ChatBox from "./chat-box"
import { HUB_FAQ } from "./situations"
import { Foot, LiteVideo, Nav, useReveals } from "./v2-content"

/**
 * Homepage, simplified: the hero is the chat, and every section after it
 * gets a full screen of room. Copy covers any asset, not only houses.
 */
export default function HubContent() {
  useReveals()
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <WhyWeExist />
        <BestRoute />
        <WaysIn />
        <Steps />
        <Incentive />
        <Founder />
        <Faq />
        <Closing />
      </main>
      <Foot />
    </>
  )
}

function Hero() {
  return (
    <section className="calm hero-chat" id="ask">
      <div className="wrap narrow" data-stagger="90">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-bird r" src="/media/falco-bird-ink.png" alt="FALCO" />
        <h1 className="d1 r">Built to keep what&apos;s yours.</h1>
        <p className="lede r">
          When a house, an estate, a business or anything else has to sell, we
          route it to a licensed Tennessee auction firm so buyers compete for
          it. No cost to you.
        </p>
        <div className="r">
          <ChatBox />
        </div>
      </div>
    </section>
  )
}

function WhyWeExist() {
  const ways = [
    {
      h: "A forced sale",
      p: "The lender, court or lienholder sells it to cover what's owed, not to get you the best price.",
    },
    {
      h: "A quick cash offer",
      p: "Fast and certain, but the buyer's profit is your discount.",
    },
    {
      h: "A marketed auction",
      p: "Buyers compete in the open on a set date, so demand sets the price. This is the one we build.",
    },
  ]
  return (
    <section className="calm">
      <div className="wrap">
        <div className="split">
          <div data-stagger="80">
            <p className="lbl r">Why we exist</p>
            <h2 className="d2 r">
              Two of three ways out leave money on the table.
            </h2>
            <ol className="ways r">
              {ways.map((w, i) => (
                <li key={w.h} className={i === 2 ? "on" : undefined}>
                  <b>{w.h}</b>
                  <span>{w.p}</span>
                </li>
              ))}
            </ol>
            <p className="r">
              <Link className="pill line" href="/manifesto">
                How it works, start to finish <sub>→</sub>
              </Link>
            </p>
          </div>
          <div className="media r">
            <LiteVideo
              src="/media/hero.mp4"
              srcMob="/media/hero-mob.mp4"
              poster="/media/hero.jpg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function BestRoute() {
  const tracked = [
    {
      n: "Sales",
      h: "What it cleared",
      p: "What each firm's auctions actually bring in, by asset type and county, measured against what the asset was worth going in.",
    },
    {
      n: "Completions",
      h: "Whether it closed",
      p: "How often a sale closes on schedule, and how often it stalls, falls through or goes back to the seller.",
    },
    {
      n: "Best fits",
      h: "Who it sells to",
      p: "Which firms draw the most bidders for which kinds of assets, so the next sale starts in front of the right room.",
    },
  ]
  return (
    <section className="calm">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">How we pick the route</p>
            <h2 className="d2 r">
              Every asset goes where
              <br />
              it nets the most.
            </h2>
          </div>
          <p className="lede note r">
            Hunting land, a suburban home, a plane and a yacht each have their
            own buyers, and different firms reach them. Our system compares the
            routes for what you&apos;re selling and sends it to the one most
            likely to leave you the most.
          </p>
        </div>
        <div className="quiet-steps" data-stagger="90">
          {tracked.map((t) => (
            <div className="r" key={t.n}>
              <span className="n">{t.n}</span>
              <h3 className="d3">{t.h}</h3>
              <p>{t.p}</p>
            </div>
          ))}
        </div>
        <p className="sm r" style={{ marginTop: "clamp(40px,5vw,64px)" }}>
          Every sale we route adds to the record, so the match gets sharper
          with each one.
        </p>
      </div>
    </section>
  )
}

function WaysIn() {
  const lanes = [
    {
      href: "/start",
      img: "/media/homeowner.jpg",
      h: "Sellers",
      p: "Something has to sell. Get the numbers before you sign anything.",
      cta: "Get my numbers",
    },
    {
      href: "/buyers",
      img: "/media/house-white.jpg",
      h: "Buyers",
      p: "Tennessee property and assets headed to open bidding. Hear about them first.",
      cta: "Register for access",
    },
    {
      href: "/partners",
      img: "/media/partner.jpg",
      h: "Auction firms",
      p: "Sellers with real value and real deadlines, matched to your specialty. You run the sale.",
      cta: "Partner with us",
    },
  ]
  return (
    <section className="calm">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Who you are</p>
            <h2 className="d2 r">Three ways in.</h2>
          </div>
          <p className="lede note r">
            Whichever one is yours, the numbers are on the table from the first
            conversation.
          </p>
        </div>
        <div className="grid3" data-stagger="90">
          {lanes.map((l) => (
            <Link className="tile r" key={l.href} href={l.href}>
              <span className="media">
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

function Steps() {
  const steps = [
    {
      n: "Step 01",
      h: "We read the filings",
      p: "Probate, foreclosure, court sale and closure notices are public record. We read them every business day, so we reach you while there's still time.",
    },
    {
      n: "Step 02",
      h: "You get the numbers",
      p: "A free call: what a forced sale, a cash offer and a marketed auction would each leave you. In writing.",
    },
    {
      n: "Step 03",
      h: "A licensed firm sells it",
      p: "The Tennessee auction firm that knows what you're selling runs the sale, timed to beat your deadline.",
    },
  ]
  return (
    <section className="calm">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">How it works</p>
            <h2 className="d2 r">Three steps.</h2>
          </div>
          <p className="lede note r">
            Stop after any one of them. Nothing is owed either way.
          </p>
        </div>
        <div className="quiet-steps" data-stagger="90">
          {steps.map((s) => (
            <div className="r" key={s.n}>
              <span className="n">{s.n}</span>
              <h3 className="d3">{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Incentive() {
  return (
    <section className="calm">
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
              If we did, every dollar we made on the spread would be a dollar
              out of your pocket.
            </p>
            <p className="lede r">
              Instead we&apos;re paid from the buyer&apos;s premium, the way
              auction houses have been paid for two hundred years. So we have no
              reason to push your price down and every reason to push it up.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="calm" id="faq">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Common questions</p>
            <h2 className="d2 r">Straight answers.</h2>
          </div>
        </div>
        <div className="faq-ask r">
          <ChatBox
            mode="faq"
            inputId="faqInput"
            greeting="Ask a question in your own words."
            placeholder="Ask anything about how this works"
            starters={[
              "What does it cost me?",
              "How do you pick the auction firm?",
              "Do you buy anything?",
              "How did you find me?",
            ]}
          />
        </div>
        <p className="lbl r">Or browse the common ones</p>
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

function Closing() {
  return (
    <section className="calm close-line">
      <div className="wrap" data-stagger="80">
        <h2 className="d2 r">Get the numbers before anything sells.</h2>
        <p className="lede r">
          Tell us what has to sell. We&apos;ll tell you what it would likely
          clear and who would sell it. Free, even if you go elsewhere.
        </p>
        <div className="pills r">
          <a className="pill dark" href="#ask">
            Ask FALCO <sub>→</sub>
          </a>
          <a className="pill line" href="mailto:falco@falco.llc">
            falco@falco.llc
          </a>
        </div>
      </div>
    </section>
  )
}

function Founder() {
  const creds = [
    { k: "Tennessee auctioneer", v: "Licensed, #7622" },
    { k: "Tennessee real estate license", v: "In progress" },
    { k: "Based in", v: "Nashville, Tennessee" },
  ]
  return (
    <section className="calm founder">
      <div className="wrap">
        <div className="founder-grid">
          <div className="founder-photo r">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/patrick.jpg" alt="Patrick Armour, founder of FALCO" loading="lazy" />
          </div>
          <div data-stagger="80">
            <p className="lbl r">Meet the founder</p>
            <h2 className="d2 r">Patrick Armour</h2>
            <p className="founder-role r">Founder and CEO</p>
            <p className="lede r">
              I&apos;m a licensed Tennessee auctioneer. I started FALCO after
              watching the same thing happen again and again: a death, a debt
              or a deadline, and people selling what they had for far less than
              it was worth, just because they ran out of time.
            </p>
            <p className="lede r">
              An open auction fixes that. Buyers compete, and the price comes
              from the market instead of whoever showed up first. My job is to
              get every asset to the firm that will sell it best, and to tell
              you the truth about the numbers, even when the answer is not us.
            </p>
            <dl className="founder-creds r">
              {creds.map((c) => (
                <div key={c.k}>
                  <dt>{c.k}</dt>
                  <dd>{c.v}</dd>
                </div>
              ))}
            </dl>
            <blockquote className="founder-mission r">
              Nothing should sell for less than it&apos;s worth just because
              someone ran out of time.
            </blockquote>
            <p className="r">
              <a className="pill line" href="mailto:falco@falco.llc">
                Write to me: falco@falco.llc
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
