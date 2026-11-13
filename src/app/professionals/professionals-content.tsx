"use client"

import Link from "next/link"
import { PageHead, PageSec, SitePage } from "../v2/site-page"

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

const CLEAN = [
  { h: "No referral fees", p: "We don't pay them and we don't ask for them." },
  { h: "We never buy", p: "We don't take a position in anything we route." },
  { h: "No legal advice", p: "Court approval, notice periods and authority to sell stay with you and the court. We work on that timeline." },
  { h: "Licensed firms only", p: "Real estate is listed and sold only by licensed Tennessee firms." },
]

export default function ProfessionalsContent() {
  return (
    <SitePage>
      <PageHead
        label="For professionals"
        title="One contact for every asset in the file."
        lede="Estates, bankruptcies, receiverships and closings rarely hold just one kind of property. We inventory it, match each asset to the licensed Tennessee auctioneer who sells it best, and report back in a form you can file."
      >
        <Link className="pill dark" href="/start?r=professional">
          Send us a file <sub>→</sub>
        </Link>
        <a className="pill line" href="mailto:pat@falco.llc">
          pat@falco.llc
        </a>
      </PageHead>

      <PageSec label="Who we work with" title="The people who have to sell it.">
        <ul className="rows r">
          {ROLES.map((r) => (
            <li key={r.h}>
              <b>{r.h}</b>
              <span>{r.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec label="What you get" title="Four things, every file.">
        <div className="quiet-steps four" data-stagger="90">
          {DELIVERS.map((d) => (
            <div className="r" key={d.n}>
              <span className="n">{d.n}</span>
              <h3 className="d3">{d.h}</h3>
              <p>{d.p}</p>
            </div>
          ))}
        </div>
      </PageSec>

      <PageSec label="How we stay clean" title="No side deals. No shortcuts.">
        <ul className="rows r">
          {CLEAN.map((c) => (
            <li key={c.h}>
              <b>{c.h}</b>
              <span>{c.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec label="Send us a file" title="Two minutes to start." note="Founded by Patrick Armour, licensed Tennessee auctioneer #7622.">
        <div className="pills r">
          <Link className="pill dark" href="/start?r=professional">
            Send us a file <sub>→</sub>
          </Link>
          <a className="pill line" href="mailto:pat@falco.llc">
            pat@falco.llc
          </a>
        </div>
      </PageSec>
    </SitePage>
  )
}
