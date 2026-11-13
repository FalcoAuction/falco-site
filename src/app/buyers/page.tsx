import BuyerSignupForm from "./buyer-signup-form"
import { PageHead, PageSec, SitePage } from "../v2/site-page"
import { ogMeta } from "@/lib/og"

export const metadata = {
  title: "Buy Distressed Assets at Auction in Tennessee | FALCO Buyer Access",
  description:
    "Homes, land, vehicles, equipment and more headed to open bidding in Tennessee. Register once and hear about matching auctions before they go public.",
  alternates: { canonical: "/buyers" },
  ...ogMeta({
    key: "buyers",
    title: "Buy Distressed Assets at Auction in Tennessee | FALCO Buyer Access",
    description: "Homes, land, vehicles, equipment and more headed to open bidding in Tennessee. Register once and hear about matching auctions before they go public.",
    path: "/buyers",
  }),
}

export default function BuyersLandingPage() {
  return (
    <SitePage>
      <PageHead
        label="For buyers"
        title="Hear about Tennessee auctions first."
        lede="Homes, land, vehicles, equipment and more, headed to open bidding through licensed Tennessee auction firms. Tell us what you buy and we'll tell you when it lists."
      >
        <a className="pill dark" href="#register">
          Register <sub>→</sub>
        </a>
      </PageHead>

      <PageSec label="What you get" title="Three things, no noise.">
        <ul className="rows r">
          <li>
            <b>First notice</b>
            <span>An email the moment something matching your criteria is headed to auction.</span>
          </li>
          <li>
            <b>Open bidding</b>
            <span>Every sale is run by a licensed Tennessee auction firm, in the open, on a set date.</span>
          </li>
          <li>
            <b>A standard premium</b>
            <span>A 10% buyer&rsquo;s premium on top of the winning bid. No hidden fees.</span>
          </li>
        </ul>
      </PageSec>

      <PageSec label="How it works" title="Three steps.">
        <div className="quiet-steps" data-stagger="90">
          <div className="r">
            <span className="n">Step 01</span>
            <h3 className="d3">You register</h3>
            <p>Tell us what you buy, where, and your price range. We store it. We don&apos;t spam it.</p>
          </div>
          <div className="r">
            <span className="n">Step 02</span>
            <h3 className="d3">We route the sale</h3>
            <p>Sellers come to us when something has to sell. We send it to the licensed firm that sells it best.</p>
          </div>
          <div className="r">
            <span className="n">Step 03</span>
            <h3 className="d3">You bid</h3>
            <p>When it matches your criteria, you hear about it first. The auction firm runs the sale.</p>
          </div>
        </div>
      </PageSec>

      <PageSec id="register" label="Register" title="Tell us what you buy." note="Takes 90 seconds. We only email when something matches. Questions: sales@falco.llc.">
        <div className="pg-form pg-legacy r">
          <BuyerSignupForm />
        </div>
      </PageSec>
    </SitePage>
  )
}
