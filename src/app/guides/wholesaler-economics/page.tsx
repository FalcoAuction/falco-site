import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
} from "../guide-chrome"
import { ogMeta } from "@/lib/og"

const META_TITLE = "How a Wholesaler Prices Your House: The 70% Rule Explained | FALCO"
const META_DESCRIPTION =
  "The rule of thumb behind most 'we buy houses' cash offers, worked out on a real example: why the discount exists, where your equity goes, and what Tennessee's 2025 wholesaling law requires."

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: "/guides/wholesaler-economics" },
  ...ogMeta({
    key: "guide-wholesaler-economics",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/wholesaler-economics",
  }),
}

export default function WholesalerEconomicsGuide() {
  return (
    <>
      <GuideJsonLd
        slug="wholesaler-economics"
        headline="How a Wholesaler Prices Your House: The 70% Rule Explained"
        description="The rule of thumb behind most 'we buy houses' cash offers, why the discount exists, and where your equity goes when you take one."
        datePublished="2026-07-12"
        dateModified="2026-11-14"
        breadcrumbName="Wholesaler Economics"
      />
      <GuideShell
        answer="Most wholesalers and cash investors start from the 70% rule: offer no more than 70% of the home's fixed-up value, minus repairs. On a $484,000 home needing $25,000 of work, that is $313,800, and a wholesaler's fee comes out of it. Wholesaling is legal in Tennessee, but since 2025 the wholesaler must give you written disclosures."
        eyebrow="Comparison guide"
        title={
          <>
            How a wholesaler{" "}
            <span className="text-[var(--mocha)]">prices your house</span>.
          </>
        }
        standfirst={
          <>
            Most &quot;we buy houses&quot; cash offers start from the same rule
            of thumb. Once you can see it, the offer in your inbox stops
            looking like a lifeline and starts looking like what it is: a
            wholesale price. Here is the whole thing, worked out.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="What a wholesaler actually does">
          <p>
            A real estate wholesaler does not usually buy your house to keep
            it. They put it under contract at a low price, then sell that
            contract to an investor for a fee, often without ever owning the
            home. Their profit is the gap between what they talk you down to
            and what the investor will pay. To protect that gap, many price
            from the same rule of thumb.
          </p>
          <GuideNote label="Why this matters to you">
            None of this makes wholesalers villains. Wholesaling is legal in
            Tennessee, and a 2025 state law requires wholesalers to give
            sellers written disclosures, including that they intend to market
            the contract to someone else, before you sign.
            <Cite href="https://www.capitol.tn.gov/Bills/114/Bill/SB0909.pdf" n={2} /> But
            it means their offer is engineered around{" "}
            <strong className="text-[var(--ink)]">their</strong> margin, not your
            equity. The number they give you is the largest discount they think
            you will accept, not the most your home is worth.
          </GuideNote>
        </GuideSection>

        <GuideSection id="the-formula" title="The 70% rule, line by line">
          <p>
            Investors often work out a{" "}
            <strong className="text-[var(--ink)]">maximum allowable offer</strong>{" "}
            with the 70% rule, a rule of thumb rather than a standard: 70% of
            the home&apos;s fixed-up value, minus repairs. The 30% that is left
            is meant to cover the investor&apos;s profit, holding and resale
            costs.
            <Cite href="https://www.biggerpockets.com/blog/70-percent-rule" n={1} /> Here
            it is on a home worth about $484,000 fixed up:
          </p>
          <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] overflow-hidden">
            {[
              ["After-repair value (what it's worth fixed up)", "$484,000"],
              ["x 70%", "$338,800"],
              ["Minus repairs the investor expects to do", "- $25,000"],
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
              <span className="text-[var(--ink)]">Most a 70%-rule buyer offers</span>
              <span className="tabular-nums text-[var(--ink-soft)] whitespace-nowrap">$313,800</span>
            </div>
          </div>
          <p>
            If a wholesaler sits in the middle, their assignment fee usually
            comes out of that number too. With a $10,000 fee, the offer to you
            is about $303,800 on a home worth nearly half a million dollars.
          </p>
        </GuideSection>

        <GuideSection id="where-equity-goes" title="Where your equity goes">
          <p>
            The gap between the $484,000 value and the $313,800 offer is about{" "}
            <strong className="text-[var(--ink)]">$170,000</strong>. Repairs are
            $25,000 of it, and they are real work the investor will pay for.
            The other $145,000 or so covers the investor&apos;s profit, holding
            and resale costs, and any wholesaler&apos;s fee. That is the price
            of a fast, certain close.
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
                "Few agents or auction firms reach out to homeowners facing foreclosure, and lenders do not. The cash buyer is often the only voice in the room.",
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

        <GuideRelated
          links={[
            { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the full comparison" },
            { href: "/guides/tennessee-foreclosure-process", label: "The Tennessee foreclosure timeline" },
            { href: "/homeowners", label: "What would your home actually clear? Free call" },
          ]}
        />
      </GuideShell>
    </>
  )
}
