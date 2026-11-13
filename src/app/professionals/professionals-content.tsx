"use client"

import Link from "next/link"
import { Foot, Nav, useReveals } from "../v2/v2-content"
import { PageHead } from "../v2/site-page"

const ROLES = [
  { h: "Estate attorneys", p: "Probate estates with a house, vehicles, firearms and collections, handled through one contact." },
  { h: "Executors and administrators", p: "A plan for every asset, in writing, that you can show the heirs and the court." },
  { h: "Bankruptcy trustees", p: "Firms that already know court-approved employment and sales, matched by asset class." },
  { h: "Receivers and lenders", p: "Collateral sold in the open, on a schedule, with results asset by asset." },
  { h: "CPAs and business advisors", p: "Clients closing or selling a business, without a fire sale." },
  { h: "Marinas and lienholders", p: "Abandoned property sold by the book, with title that holds up." },
]

const DELIVERS = [
  { n: "01", h: "One contact", p: "Every asset in the file runs through one person. You don't chase six auction houses." },
  { n: "02", h: "Inventory with ranges", p: "What is there, a value range for each item, and what is not worth auctioning." },
  { n: "03", h: "Licensed routing", p: "Each class goes to a licensed Tennessee specialist with signed terms on file." },
  { n: "04", h: "A sale record", p: "Results, bidder counts and proceeds by asset, ready for the court file or the books." },
]

export default function ProfessionalsContent() {
  useReveals()
  return (
    <>
      <Nav />
      <main id="main" className="pg">
        <PageHead
          label="For professionals"
          title="One contact for every asset in the file."
          lede="Estates, bankruptcies, receiverships and closings rarely hold just one kind of property. We inventory it, match each asset to the licensed Tennessee auctioneer who sells it best, and report back in a form you can file."
        >
          <Link className="pill dark" href="/start?r=professional">
            Send us a file <sub>→</sub>
          </Link>
          <a className="pill line" href="mailto:falco@falco.llc">
            falco@falco.llc
          </a>
        </PageHead>

        <section className="pg-sec">
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="lbl r">Who we work with</p>
                <h2 className="d2 r">The people who have to sell it.</h2>
              </div>
              <p className="lede note r">
                You have the authority and the deadline. We bring the buyers
                and the right firm for each kind of asset.
              </p>
            </div>
            <div className="agrid" data-stagger="50">
              {ROLES.map((r) => (
                <div className="box r" key={r.h}>
                  <h4>{r.h}</h4>
                  <p>{r.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pg-sec">
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="lbl r">What you get</p>
                <h2 className="d2 r">Four things, every file.</h2>
              </div>
            </div>
            <div className="quiet-steps" data-stagger="90">
              {DELIVERS.map((d) => (
                <div className="r" key={d.n}>
                  <span className="n">{d.n}</span>
                  <h3 className="d3">{d.h}</h3>
                  <p>{d.p}</p>
                </div>
              ))}
            </div>
            <p className="r" style={{ marginTop: 40 }}>
              <Link className="pill dark" href="/start?r=professional">
                Send us a file <sub>→</sub>
              </Link>
            </p>
          </div>
        </section>

        <section className="pg-sec">
          <div className="wrap">
            <div className="split">
              <div data-stagger="80">
                <p className="lbl r">How we stay clean</p>
                <h2 className="d2 r">
                  No side deals.
                  <br />
                  No shortcuts.
                </h2>
              </div>
              <div data-stagger="80">
                <p className="lede r">
                  We don&apos;t pay referral fees and we don&apos;t ask for them.
                  We never buy what we route, and we don&apos;t give legal advice.
                </p>
                <p className="lede r">
                  Court approval, notice periods and authority to sell stay with
                  you and the court. We work on that timeline, not around it.
                  Real estate is listed and sold only by licensed Tennessee
                  firms.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Foot />
    </>
  )
}
