import PartnerForm from "./partner-form"
import { PageHead, PageSec, SitePage } from "../v2/site-page"
import { ogMeta } from "@/lib/og"

export const metadata = {
  title: "For Auction Firms: Matched Sellers in Tennessee | FALCO",
  description:
    "Run a Tennessee auction firm? FALCO routes sellers with real value and real deadlines to the firm whose buyers want what they have. You run the sale.",
  alternates: { canonical: "/partners" },
  ...ogMeta({
    key: "partners",
    title: "For Auction Firms: Matched Sellers in Tennessee | FALCO",
    description: "Run a Tennessee auction firm? FALCO routes sellers with real value and real deadlines to the firm whose buyers want what they have. You run the sale.",
    path: "/partners",
  }),
}

export default function PartnersPage() {
  return (
    <SitePage>
      <PageHead
        label="For auction firms"
        title="Sellers with real value, routed to your specialty."
        lede="We find Tennessee assets that have to sell, from estates to closings to foreclosures, and send each one to the licensed firm whose buyers want it. You run the sale."
      >
        <a className="pill dark" href="#apply">
          Start a conversation <sub>→</sub>
        </a>
        <a className="pill line" href="mailto:sales@falco.llc">
          sales@falco.llc
        </a>
      </PageHead>

      <PageSec label="What you get" title="Three things, no noise.">
        <ul className="rows r">
          <li>
            <b>Sellers who expect your call</b>
            <span>They already understand the process and the numbers. You get an introduction, not a cold list.</span>
          </li>
          <li>
            <b>Matched to what you sell</b>
            <span>Land to land firms, equipment to equipment auctioneers. Routing weighs what each firm clears, how often sales close, and which buyers it reaches.</span>
          </li>
          <li>
            <b>Terms in writing first</b>
            <span>A simple signed agreement before anything is routed. Your sale, your process.</span>
          </li>
        </ul>
      </PageSec>

      <PageSec label="How it works" title="Three steps.">
        <div className="quiet-steps" data-stagger="90">
          <div className="r">
            <span className="n">Step 01</span>
            <h3 className="d3">We talk</h3>
            <p>A call about your firm, the counties you cover and what you sell best.</p>
          </div>
          <div className="r">
            <span className="n">Step 02</span>
            <h3 className="d3">Terms in writing</h3>
            <p>Signed before a single seller is routed to you. Nothing on a handshake.</p>
          </div>
          <div className="r">
            <span className="n">Step 03</span>
            <h3 className="d3">Sellers come to you</h3>
            <p>Matched by asset, county and track record. You run the sale your way.</p>
          </div>
        </div>
      </PageSec>

      <PageSec
        id="apply"
        label="Start a conversation"
        title="Five quick questions."
        note="We'll set up a call within one business day."
      >
        <div className="pg-form r">
          <PartnerForm />
        </div>
      </PageSec>
    </SitePage>
  )
}
