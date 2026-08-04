import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
} from "../guide-chrome"

export const metadata = {
  title: "How a Wholesaler Prices Your House: The 70% Rule Explained | FALCO",
  description:
    "The formula behind every 'we buy houses' cash offer, why the discount exists, and exactly where your equity goes when you take one. Written by a licensed Tennessee auctioneer.",
  alternates: { canonical: "/guides/wholesaler-economics" },
}

export default function WholesalerEconomicsGuide() {
  return (
    <>
      <GuideJsonLd
        slug="wholesaler-economics"
        headline="How a Wholesaler Prices Your House: The 70% Rule Explained"
        description="The formula behind every 'we buy houses' cash offer, why the discount exists, and where your equity goes when you take one."
        datePublished="2026-07-12"
        dateModified="2026-07-12"
        breadcrumbName="Wholesaler Economics"
      />
      <GuideShell
        eyebrow="Comparison guide"
        title={
          <>
            How a wholesaler{" "}
            <span className="text-[var(--mocha)]">prices your house</span>.
          </>
        }
        standfirst={
          <>
            Every &quot;we buy houses&quot; cash offer runs on the same
            formula. Once you can see it, the offer in your inbox stops looking
            like a lifeline and starts looking like exactly what it is: a
            wholesale price. Here is the whole thing, worked out.
          </>
        }
        updated="July 2026"
      >
        <GuideSection title="What a wholesaler actually does">
          <p>
            A real estate wholesaler does not usually buy your house to keep
            it. They put it under contract at a low price, then sell that
            contract to an investor for a fee, often without ever owning the
            home. Their profit is the gap between what they talk you down to
            and what the investor will pay. To protect that gap, they price
            using a fixed formula, and they price to win it every time.
          </p>
          <GuideNote label="Why this matters to you">
            None of this makes wholesalers villains. It is a legal, understood
            business. But it means their offer is engineered around{" "}
            <strong className="text-[var(--ink)]">their</strong> margin, not your
            equity. The number they give you is the largest discount they think
            you will accept, not the most your home is worth.
          </GuideNote>
        </GuideSection>

        <GuideSection id="the-formula" title="The 70% rule, line by line">
          <p>
            The industry-standard formula is called the{" "}
            <strong className="text-[var(--ink)]">maximum allowable offer</strong>,
            and its ceiling is 70% of a home&apos;s fixed-up value, minus
            repairs.
            <Cite href="https://www.investopedia.com/terms/1/70-percent-rule.asp" n={1} /> Here it
            is on a home worth about $484,000 fixed up:
          </p>
          <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] overflow-hidden">
            {[
              ["After-repair value (what it's worth fixed up)", "$484,000"],
              ["× 70% ceiling", "$338,800"],
              ["− Repairs the investor expects to do", "− $25,000"],
              ["− Wholesaler's assignment fee", "− $10,000"],
              ["− Investor's required profit margin", "− $40,000"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-[var(--rule)] text-[14px]"
              >
                <span className="text-[var(--ink-soft)]">{label}</span>
                <span className="tabular-nums text-[var(--ink-soft)] whitespace-nowrap">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--paper-raised)] text-[15px] font-semibold">
              <span className="text-[var(--ink)]">Offer to you</span>
              <span className="tabular-nums text-[var(--ink-soft)] whitespace-nowrap">≈ $263,800</span>
            </div>
          </div>
          <p>
            On a home worth nearly half a million dollars, the machine produces
            an offer around $264,000. Every dollar between that number and the
            real value is not lost. It is transferred, from you to the buyer.
          </p>
        </GuideSection>

        <GuideSection id="where-equity-goes" title="Where your equity goes">
          <p>
            Look at the three deductions under the 70% ceiling. Repairs are
            real, but the investor does them and keeps the upside. The
            assignment fee is the wholesaler&apos;s cut for making the
            introduction. The profit margin is exactly that. Add them up and
            you are looking at roughly{" "}
            <strong className="text-[var(--ink)]">$75,000</strong> that leaves your
            side of the table on this one house, on top of the 30% haircut the
            formula started with.
          </p>
          <GuideKey>
            The discount is not a fee for a service. It is the difference
            between a wholesale price and a market price. When your home has
            equity, that difference is your money.
          </GuideKey>
        </GuideSection>

        <GuideSection id="why-it-works" title="Why the offer still gets accepted">
          <p>
            If the math is this lopsided, why do people take it? Three reasons,
            and none of them is stupidity:
          </p>
          <div className="grid md:grid-cols-3 gap-3 mt-2">
            {[
              [
                "You cannot see the other number",
                "You know what you owe. You do not know what your home would clear at a competitive sale. The buyer does. That gap is the whole game.",
              ],
              [
                "The clock is real",
                "A trustee sale date is a hard deadline. A fast cash offer feels like the only thing that beats it, even when a marketed sale runs on the same timeline.",
              ],
              [
                "Nobody else is calling",
                "Agents do not chase distress. Auction firms do not market to homeowners. Lenders certainly do not. The cash buyer is often the only voice in the room.",
              ],
            ].map(([h, b]) => (
              <div key={h} className="rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-4">
                <div className="text-[13px] font-semibold text-[var(--mocha)]/85">{h}</div>
                <div className="mt-2 text-[13px] leading-[1.6] text-[var(--ink-soft)]">{b}</div>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection title="The alternative">
          <GuideKey>
            The fix for all three is the same: put your home in front of real
            competing buyers on a timeline that still beats the sale. That is
            what a marketed auction does, and it is what FALCO helps Tennessee
            homeowners set up, at no cost to you. See the{" "}
            <a href="/guides/cash-offer-vs-auction" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              full side-by-side math
            </a>
            .
          </GuideKey>
        </GuideSection>
      </GuideShell>

      <GuideRelated
        links={[
          { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the full comparison" },
          { href: "/guides/tennessee-foreclosure-process", label: "The Tennessee foreclosure timeline" },
          { href: "/homeowners", label: "What would your home actually clear? Free call" },
        ]}
      />
    </>
  )
}
