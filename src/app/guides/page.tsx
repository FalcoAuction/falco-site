import Link from "next/link"
import { Foot, Nav } from "../v2/v2-content"
import { GUIDE_GROUPS } from "./guide-index"
import GuideReveals from "./guide-reveals"
import GuideSearch from "./guide-search"
import "./guides.css"

export const metadata = {
  title: "Tennessee Guides for Estates, Business Closings, Liens and Foreclosure | FALCO",
  description:
    "Plain-English Tennessee guides for every distressed sale: estates and probate, closing a business, bankruptcy and receivership, lien sales, tax-delinquent property, land that won't sell, and foreclosure.",
  alternates: { canonical: "/guides" },
}

export default function GuidesIndexPage() {
  return (
    <>
      <GuideReveals />
      <Nav />
      <main id="main" className="gd">
        <section className="gd-top">
          <div className="gd-in" data-stagger="80">
            <p className="lbl r">Guides</p>
            <h1 className="d1 r">Selling in a hard moment, in plain English.</h1>
            <p className="lede r">
              An estate to settle, a business to close, a lien to collect,
              taxes behind, a foreclosure date on the calendar. Each one has
              its own Tennessee rules about who can sell, who has to be told,
              and how long it takes. These guides lay them out with the
              statutes cited, written by a licensed Tennessee auctioneer.
            </p>
            <nav aria-label="Situations" className="gd-chips r">
              {GUIDE_GROUPS.map((g) => (
                <a key={g.id} href={`#${g.id}`}>
                  {g.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <GuideSearch groups={GUIDE_GROUPS} />

        <section className="gd-sec gd-end">
          <div className="gd-in" data-stagger="80">
            <h2 className="d2 r">Not sure which one fits?</h2>
            <p className="lede r">
              Tell us what happened. We come back within one business day
              with what is worth auctioning and which licensed Tennessee firm
              sells it best. No cost to you. The buyer pays a 10% premium on
              top of the winning bid.
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
