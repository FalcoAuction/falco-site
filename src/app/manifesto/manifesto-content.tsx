"use client"

import Link from "next/link"
import { Foot, Nav, useReveals } from "../v2/v2-content"

const REASONS = [
  "Someone passed away and their things have to be sold",
  "A loan went bad and there is a sale date",
  "A business is closing",
  "Taxes or a bill went unpaid and a lien is being enforced",
  "A court or trustee ordered a sale",
  "Land or property just won't sell the normal way",
]

const EXITS = [
  {
    h: "The forced sale",
    p: "The lender, court or lienholder sells it on their schedule. Their goal is to cover what's owed, not to get you top dollar.",
    tag: "Leaves money on the table",
  },
  {
    h: "The quick cash offer",
    p: "A buyer pays fast, at a discount. Their profit is the gap between what they pay you and what it's really worth.",
    tag: "Leaves money on the table",
  },
  {
    h: "The marketed auction",
    p: "The asset is advertised, buyers compete in the open, and it sells on a set date. Competition sets the price, not one buyer.",
    tag: "What we build",
  },
]

const STEPS = [
  {
    h: "We find it",
    p: "Probate filings, foreclosure notices, court sales, business closings, and tax and lien sale notices are public record. We read them every business day. Or you reach out first.",
  },
  {
    h: "We learn what you have",
    p: "A free conversation: what it is, where it is, what's owed on it, and when it has to sell.",
  },
  {
    h: "We pick the route",
    p: "Our system compares licensed auction firms on what their sales cleared, how often they close, and which buyers they reach. Hunting land, a suburban home, a plane and a yacht each go to a different specialist.",
  },
  {
    h: "You get the numbers in writing",
    p: "What a forced sale, a cash offer and a marketed auction would each likely leave you. You decide. No obligation.",
  },
  {
    h: "A licensed firm sells it",
    p: "Marketing, open bidding, a set sale date, then closing. Debts and liens are paid from the sale. The rest is yours.",
  },
]

const DONT = [
  "We don't buy anything we route.",
  "We don't list, broker or sell real estate. Licensed Tennessee firms do.",
  "We don't give legal, tax or financial advice. We'll tell you when you need an attorney.",
  "We don't take items too small for an auction to make sense. We'll say so up front.",
]

export default function ManifestoContent() {
  useReveals()
  return (
    <>
      <Nav />
      <main id="main" className="mf">
        <section className="mf-sec mf-top">
          <div className="wrap" data-stagger="80">
            <p className="lbl r">Manifesto</p>
            <h1 className="d1 r">
              When something has to sell fast, most people lose money they
              didn&apos;t have to.
            </h1>
            <p className="lede r">
              Here is the whole process in plain language. Any asset, any
              reason it has to sell.
            </p>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">01 · The situation</p>
            <h2 className="d2 r">Something has to sell, and there&apos;s a deadline.</h2>
            <ul className="mf-list r">
              {REASONS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mf-note r">
              Deadlines push people to take the first offer. That&apos;s where the
              money goes.
            </p>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">02 · The three ways out</p>
            <h2 className="d2 r">Two of them leave money on the table.</h2>
            <div className="mf-exits" data-stagger="80">
              {EXITS.map((e, i) => (
                <div className={`box r${i === 2 ? " on" : ""}`} key={e.h}>
                  <span className="n">{e.tag}</span>
                  <h4>{e.h}</h4>
                  <p>{e.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">03 · What we do</p>
            <h2 className="d2 r">Five steps, start to finish.</h2>
            <ol className="mf-steps" data-stagger="70">
              {STEPS.map((s, i) => (
                <li className="r" key={s.h}>
                  <span className="mf-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mf-note r">Stop after any step. Nothing is owed either way.</p>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">04 · What it costs</p>
            <h2 className="d2 r">Nothing to you.</h2>
            <ul className="mf-list r">
              <li>No listing fee and no commission from your side.</li>
              <li>The buyer pays a 10% premium on top of the winning bid. That pays the auction firm and FALCO.</li>
              <li>If it doesn&apos;t sell, you owe nobody anything.</li>
            </ul>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">05 · Why you can trust the incentives</p>
            <h2 className="d2 r">We only win when your sale does.</h2>
            <ul className="mf-list r">
              <li>We never buy what we route, so we never profit from a low price.</li>
              <li>We&apos;re paid only when buyers compete and the sale closes, so we push for more bidders.</li>
              <li>Every sale adds to our record of which firm sells what best, so the next match is sharper.</li>
            </ul>
          </div>
        </section>

        <section className="mf-sec">
          <div className="wrap">
            <p className="lbl r">06 · What we don&apos;t do</p>
            <h2 className="d2 r">Straight about our limits.</h2>
            <ul className="mf-list r">
              {DONT.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mf-sec mf-end">
          <div className="wrap" data-stagger="80">
            <h2 className="d2 r">Tell us what has to sell.</h2>
            <p className="lede r">
              We&apos;ll tell you what it would likely clear and who would sell
              it. Free, even if you go elsewhere.
            </p>
            <div className="pills r">
              <Link className="pill dark" href="/#ask">
                Ask FALCO <sub>→</sub>
              </Link>
              <Link className="pill line" href="/start">
                Use the form
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Foot />
    </>
  )
}
