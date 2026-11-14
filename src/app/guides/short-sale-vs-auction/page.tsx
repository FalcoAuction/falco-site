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

const META_TITLE = "Short Sale vs. Selling Before the Trustee Sale in Tennessee | FALCO"
const META_DESCRIPTION =
  "When a short sale makes sense in Tennessee, when it doesn't, and how it compares to selling your home outright before the foreclosure. Plain-English guide from a licensed TN auctioneer."

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: "/guides/short-sale-vs-auction" },
  ...ogMeta({
    key: "guide-short-sale-vs-auction",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/short-sale-vs-auction",
  }),
}

export default function ShortSaleVsAuctionGuide() {
  return (
    <>
      <GuideJsonLd
        slug="short-sale-vs-auction"
        headline="Short Sale vs. Selling Before the Trustee Sale in Tennessee"
        description="When a short sale makes sense in Tennessee, when it doesn't, and how it compares to selling your home outright before the foreclosure."
        datePublished="2026-07-12"
        dateModified="2026-11-14"
        breadcrumbName="Short Sale vs. Auction"
      />
      <GuideShell
        answer="A short sale is for owners who owe more than the home is worth: the lender agrees to take less than the balance, and unless it waives the rest in writing, you may still owe it. Since 2026, forgiven mortgage debt is generally taxable unless an exception such as insolvency applies. If your home is worth more than you owe, you do not need a short sale. Selling before the trustee sale lets you keep the difference."
        eyebrow="Comparison guide"
        title={
          <>
            Short sale, or{" "}
            <span className="text-[var(--mocha)]">sell before the sale</span>?
          </>
        }
        standfirst={
          <>
            These two sound similar and are completely different. One is for
            homeowners who owe more than the house is worth. The other is for
            homeowners who still have equity to protect. Getting the two mixed
            up costs people money. Here is how to tell which one is yours.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The one question that decides everything">
          <p>
            Before anything else, answer this: is your home worth{" "}
            <strong className="text-[var(--ink)]">more</strong> than you owe, or{" "}
            <strong className="text-[var(--ink)]">less</strong>? That single fact
            splits the road.
          </p>
          <GuideKey>
            If the home is worth more than the loan balance, you have equity,
            and a short sale is the wrong tool. If the home is worth less than
            you owe, you are underwater, and a normal sale is the wrong tool.
            Same street, opposite directions.
          </GuideKey>
        </GuideSection>

        <GuideSection id="what-is-short-sale" title="What a short sale actually is">
          <p>
            A short sale is when you sell the home for{" "}
            <strong className="text-[var(--ink)]">less than you owe</strong> and
            the lender agrees to accept that lower amount and release its lien.
            It is a tool for people who are underwater. The lender has to
            approve it, which takes time and paperwork.
          </p>
          <GuideNote label="Get the remaining balance waived in writing">
            Releasing the lien is not the same as forgiving the debt. Unless
            the lender agrees in writing to waive the remaining balance, it may
            still be able to collect it.
            <Cite href="https://www.consumerfinance.gov/ask-cfpb/what-is-a-short-sale-en-290/" n={1} /> Tennessee
            law allows lenders to pursue a deficiency after a foreclosure, so
            the waiver matters here.
            <Cite href="https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-117/" n={2} />
          </GuideNote>
          <GuideNote label="The tax change in 2026">
            Forgiven debt is generally treated as income, and the lender
            reports it on Form 1099-C. The federal exclusion for forgiven
            mortgage debt on a primary home does not apply to debt forgiven
            after December 31, 2025. Other exceptions, such as insolvency, can
            still apply.
            <Cite href="https://www.irs.gov/publications/p4681" n={3} /> Talk to a
            tax professional before you sign.
          </GuideNote>
          <GuideNote label="Who should handle a short sale">
            Because a short sale requires negotiating with your lender, it is
            best run through a{" "}
            <strong className="text-[var(--ink)]">licensed Tennessee real estate
            broker</strong> experienced with lender approvals, and it is worth
            a conversation with a tax advisor.
            This is not a do-it-yourself situation, and it is not something to
            hand to whoever knocked on your door.
          </GuideNote>
        </GuideSection>

        <GuideSection id="what-is-sell-before" title="What 'selling before the sale' means">
          <p>
            If you have equity, you are not doing a short sale at all. You are
            doing a normal sale, just on a faster clock than a leisurely retail
            listing allows, because the trustee sale date is coming. The goal
            is to sell the home for close to full value, pay off the loan, and{" "}
            <strong className="text-[var(--ink)]">walk away with the difference</strong>
            . A marketed auction is built for exactly this: real buyer
            competition, a set sale date usually a matter of weeks out, and
            your equity preserved.
          </p>
        </GuideSection>

        <GuideSection id="compare" title="How they compare">
          <div className="overflow-x-auto rounded-xl border border-[var(--rule-strong)]">
            <table className="w-full text-[13px] md:text-[14px]">
              <thead>
                <tr className="border-b border-[var(--rule-strong)] text-[var(--ink-faint)]">
                  <th className="text-left font-medium py-3 px-4"></th>
                  <th className="text-left font-medium py-3 px-4">Short sale</th>
                  <th className="text-left font-medium py-3 px-4">Sell before the sale (auction)</th>
                </tr>
              </thead>
              <tbody className="text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4 text-[var(--ink-faint)]">For whom</td>
                  <td className="py-3 px-4">Owe more than it&apos;s worth</td>
                  <td className="py-3 px-4 text-[var(--mocha-deep)]/90">Have equity to protect</td>
                </tr>
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4 text-[var(--ink-faint)]">Lender approval</td>
                  <td className="py-3 px-4">Required</td>
                  <td className="py-3 px-4">Not required (loan and liens are paid in full)</td>
                </tr>
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4 text-[var(--ink-faint)]">What you walk with</td>
                  <td className="py-3 px-4">Usually nothing; goal is to avoid the shortfall</td>
                  <td className="py-3 px-4 text-[var(--mocha-deep)]/90">Your equity, after the loan and costs</td>
                </tr>
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4 text-[var(--ink-faint)]">Timeline</td>
                  <td className="py-3 px-4">Slower; depends on lender</td>
                  <td className="py-3 px-4">Weeks, to a set sale date</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-[var(--ink-faint)]">Run it through</td>
                  <td className="py-3 px-4">Licensed real estate broker</td>
                  <td className="py-3 px-4">Licensed Tennessee real estate and auction firm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GuideSection>

        <GuideSection title="Not sure which one is yours?">
          <GuideKey>
            The honest first step is finding out what your home would actually
            sell for and comparing it to your payoff. That one number tells you
            whether you are protecting equity or avoiding a shortfall. We will
            run it with you for free, and if a short sale is the right path, we
            will tell you that plainly and point you to the right licensed
            professional, even though it is not what we do.
          </GuideKey>
        </GuideSection>

        <GuideRelated
          links={[
            { href: "/guides/tennessee-foreclosure-process", label: "The full Tennessee foreclosure timeline" },
            { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the math" },
            { href: "/homeowners", label: "Find out where you stand: free call" },
          ]}
        />
      </GuideShell>
    </>
  )
}
