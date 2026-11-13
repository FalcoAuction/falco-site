import Link from "next/link"
import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
  GuideFaq,
  GuideSources,
} from "../guide-chrome"
import { ogMeta } from "@/lib/og"

const SLUG = "tennessee-tax-sale-delinquent-property"
const HEADLINE = "Selling Tax-Delinquent Property Before a Tennessee Tax Sale"
const DESCRIPTION =
  "When Tennessee property taxes go delinquent, how the county's tax lawsuit and sale work, the redemption period after the 2026 change, excess proceeds, and why selling before the sale usually keeps more of the equity."

const META_TITLE = `${HEADLINE} | FALCO`
const META_DESCRIPTION =
  DESCRIPTION

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  ...ogMeta({
    key: "guide-tennessee-tax-sale-delinquent-property",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/tennessee-tax-sale-delinquent-property",
  }),
}

const SOURCES = [
  { n: 1, label: "University of Tennessee CTAS, Delinquency Date", href: "https://www.ctas.tennessee.edu/eli/delinquency-date" },
  { n: 2, label: "University of Tennessee CTAS, Interest on Delinquent Taxes (Tenn. Code Ann. § 67-5-2010)", href: "https://www.ctas.tennessee.edu/eli/interest-delinquent-taxes" },
  { n: 3, label: "Tenn. Code Ann. § 67-5-2010 (interest on delinquent taxes)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2010/" },
  { n: 4, label: "University of Tennessee CTAS, Delinquent Tax Suit", href: "https://www.ctas.tennessee.edu/eli/delinquent-tax-suit" },
  { n: 5, label: "Tenn. Code Ann. § 67-5-2404 (delinquent tax attorney; filing suit)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2404/" },
  { n: 6, label: "Tenn. Code Ann. § 67-5-2005 (municipal delinquent taxes)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2005/" },
  { n: 7, label: "Tenn. Code Ann. § 67-5-2501 (tax sales; conducted by the clerk; subject to redemption)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2501/" },
  { n: 8, label: "Tenn. Code Ann. § 67-5-2701 (redemption)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2701/" },
  { n: 9, label: "2026 Tenn. Pub. Acts ch. 971 (SB1983), amending the redemption period", href: "https://capitol.tn.gov/Bills/114/Bill/SB1983.pdf" },
  { n: 10, label: "Tenn. Code Ann. § 67-5-2702 (excess proceeds)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2702/" },
  { n: 11, label: "Tenn. Code Ann. § 67-5-2001 (partial payments)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2001/" },
  { n: 12, label: "Tennessee Comptroller, Property Tax Relief brochure", href: "https://comptroller.tn.gov/content/dam/cot/pa/documents/tax-relief/TaxReliefBrochure.pdf" },
  { n: 13, label: "Tennessee Comptroller, Property Tax Freeze program", href: "https://comptroller.tn.gov/office-functions/pa/property-taxes/property-tax-programs/property-tax-freeze.html" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "When do property taxes become delinquent in Tennessee?",
    a: "Tennessee property taxes become delinquent on March 1 after the due date. Interest of 1.5% per month is then added, starting March 1 and again on the first of each month after that.",
  },
  {
    q: "How long do you have to redeem a property after a Tennessee tax sale?",
    a: "For sales confirmed on or after July 1, 2026, the redemption period runs from the court's order confirming the sale: one year if the taxes were delinquent three years or less, and 90 days if they were delinquent more than three years. A shorter 30-day period can apply to vacant and abandoned property that has been inspected and documented. To redeem, you pay the purchase price plus 12% annual interest and certain other costs.",
  },
  {
    q: "Can I sell my house if it has delinquent property taxes?",
    a: "Yes. The delinquent taxes are a lien on the property, and they are normally paid off at closing from the sale proceeds, the same way a mortgage is. Paying the taxes, interest and costs in full ends the county's tax lawsuit for that property.",
  },
  {
    q: "What happens to the extra money if my property sells at a tax sale for more than I owe?",
    a: "The excess proceeds are held by the court. After the sale is confirmed, interested people can file a motion to claim them. They are paid in order: remaining taxes, then lienholders, then the former owner (if they were named in the tax suit, or their heirs). Unclaimed money eventually goes to the state's unclaimed property program.",
  },
  {
    q: "Can I make payments on delinquent property taxes in Tennessee?",
    a: "Only in limited ways. A county trustee may accept partial payments if it has adopted a plan with the Comptroller, but a partial payment does not release the lien and the property can still go to tax sale. Once the tax suit is filed, the court clerk generally cannot accept partial payments.",
  },
  {
    q: "What does it cost to sell through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy property. Licensed Tennessee real estate and auction firms run every sale.",
  },
]

export default function TaxSaleGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Before a Tax Sale"
      />
      <GuideShell
        variant="situation"
        answer="Tennessee property taxes go delinquent March 1, then grow 1.5% a month until the county sues and the court orders a sale. You can sell before that and pay the taxes from the proceeds at closing. After a tax sale confirmed on or after July 1, 2026, you have one year to redeem, or 90 days if the taxes were more than three years behind."
        eyebrow="Property tax guide"
        title={
          <>
            Selling <span className="text-[var(--mocha)]">tax-delinquent</span>{" "}
            property before a Tennessee tax sale
          </>
        }
        standfirst={
          <>
            Behind on property taxes is one of the most common ways Tennessee
            families lose real equity, because a tax sale only has to cover
            the tax bill, not what the property is worth. Here is how the
            process works, how long it takes, what redemption really costs,
            and why selling on your own terms first usually keeps far more of
            the value.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="How taxes go from late to a lawsuit">
          <p>
            Tennessee property taxes become{" "}
            <strong className="text-[var(--ink)]">delinquent on March 1</strong>{" "}
            after the due date.
            <Cite href={src(1)} n={1} /> From then on, interest of 1.5% per month
            is added, starting March 1 and again on the first of every month
            after.
            <Cite href={src(2)} n={2} />
            <Cite href={src(3)} n={3} /> That works out to about 18% a year on
            the unpaid tax.
          </p>
          <p>
            Collecting county taxes is not left to letters forever. The county
            trustee turns the delinquent list over to a delinquent tax
            attorney, who files a lawsuit against the owners in chancery or
            circuit court.
            <Cite href={src(4)} n={4} />
            <Cite href={src(5)} n={5} /> The trustee generally hands over the
            list between February 1 and April 1 of the year after the taxes
            went delinquent.
            <Cite href={src(5)} n={5} />
          </p>
          <GuideNote label="City taxes can follow a separate track">
            Cities can collect their own delinquent property taxes under their
            charters, or turn them over to the county trustee instead.
            <Cite href={src(6)} n={6} /> If you owe both city and county taxes,
            you may be dealing with two collectors and, in some places, two
            separate lawsuits.
          </GuideNote>
          <GuideKey>
            Paying the delinquent taxes, interest and costs in full ends the
            tax lawsuit for that property.
            <Cite href={src(4)} n={4} /> Every step below is avoidable if the
            bill gets paid, and a sale of the property is often the way it
            gets paid.
          </GuideKey>
        </GuideSection>

        <GuideSection id="the-sale" title="How a Tennessee tax sale works">
          <p>
            If the suit runs its course, the court orders the property sold.
            The sale is conducted by the court clerk, can be held online, and
            every tax sale is subject to the owner&apos;s right of redemption.
            <Cite href={src(7)} n={7} /> Bidding opens at the amount owed: the
            taxes, interest and costs.
          </p>
          <p>
            That is the core problem. A tax sale is built to collect a tax
            bill, not to find the buyer who will pay the most. There is no
            listing, no showings, and little marketing beyond the legal
            notices. Tax-sale buyers know that, and they bid accordingly.
          </p>
        </GuideSection>

        <GuideSection id="redemption" title="Redemption: the second chance, and what it costs">
          <p>
            After a tax sale, the former owner (and other interested people)
            can still get the property back by{" "}
            <strong className="text-[var(--ink)]">redeeming</strong> it within a
            set period. Tennessee changed that period in 2026.
          </p>
          <GuideNote label="Redemption period for sales confirmed on or after July 1, 2026">
            <ul className="list-disc ml-4 space-y-1">
              <li>
                <strong className="text-[var(--ink)]">One year</strong> from the
                order confirming the sale, if the taxes were delinquent three
                years or less.
              </li>
              <li>
                <strong className="text-[var(--ink)]">90 days</strong> from that
                order, if they were delinquent more than three years.
              </li>
            </ul>
            <Cite href={src(9)} n={9} />
            <Cite href={src(8)} n={8} />
          </GuideNote>
          <p>
            A shorter 30-day period can apply to vacant and abandoned property,
            but only after inspections over a two-month period document that
            it is abandoned.
            <Cite href={src(8)} n={8} />
          </p>
          <GuideNote label="What it takes to redeem">
            To redeem, you first pay the clerk the delinquent taxes, interest,
            penalties and court costs, plus interest at{" "}
            <strong className="text-[var(--ink)]">12% a year</strong> on the full
            amount the tax-sale buyer paid, running from the day they paid it.
            The buyer can also claim certain added costs, such as later taxes
            and insurance they paid.
            <Cite href={src(8)} n={8} />
          </GuideNote>
          <p>
            Redemption is real, but it is expensive, and it has to be paid in
            cash within a short window. For most owners who were behind
            because money was tight, it is harder to redeem after the sale
            than it would have been to sell before it.
          </p>
        </GuideSection>

        <GuideSection id="excess-proceeds" title="Excess proceeds: what happens to the rest of the money">
          <p>
            When a property sells at a tax sale for more than what is owed,
            the extra is called{" "}
            <strong className="text-[var(--ink)]">excess proceeds</strong>. It
            does not go to the county as a bonus. After the court confirms the
            sale, an interested person can file a motion in the tax suit to
            claim it. The money is paid in this order:
            <Cite href={src(10)} n={10} />
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Any remaining taxes owed to the taxing entity</li>
            <li>Lienholders as of the sale, then later lienholders</li>
            <li>
              The former owner, if they were a defendant in the tax suit (or
              their heirs)
            </li>
            <li>
              Anything left over goes to the state under the unclaimed property
              law
            </li>
          </ol>
          <p>
            There is no fixed one-year filing deadline in the statute. A claim
            can be filed until the money is actually sent to the state, and the
            money is not presumed abandoned until a year after the redemption
            period ends.
            <Cite href={src(10)} n={10} /> If you think excess proceeds are owed
            to you, contact the clerk of the court that handled the tax suit.
          </p>
          <GuideKey>
            Excess proceeds are whatever is left after a sale that was never
            designed to get full price. Selling the property yourself before
            the tax sale puts your equity in your hands at closing, instead of
            leaving you to claim what remains after a discount sale.
          </GuideKey>
        </GuideSection>

        <GuideSection id="sell-first" title="Selling before the tax sale">
          <p>
            Delinquent property taxes are a lien on the property, the same way
            a mortgage is. When a property sells, liens are normally paid off
            at closing from the sale proceeds, and paying the taxes, interest
            and costs in full ends the tax suit for that property.
            <Cite href={src(4)} n={4} /> You do not need to come up with the tax
            money first to be able to sell.
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Get the payoff in writing.</strong>{" "}
              Ask the county trustee (and the city, if city taxes are owed),
              or the clerk if the suit is already filed, for the full amount
              due as of a date. Interest grows every month.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Watch the calendar.</strong>{" "}
              The earlier you start, the more selling options you have. Once a
              sale date is set, timing gets tight.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Think about every lien.</strong>{" "}
              Mortgages, judgment liens and city liens also come out of the
              proceeds. Knowing the total tells you what you would actually
              walk away with.
            </li>
          </ul>
          <p>
            A marketed auction, run by a licensed Tennessee real estate and
            auction firm, can work on a schedule set around the tax deadline
            and puts the property in front of buyers who compete for it. In
            Tennessee, auctions of real property must be run by someone
            licensed both as an auctioneer and as a real estate broker or
            affiliate broker. Our{" "}
            <Link href="/guides/land-commercial-property-wont-sell" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              guide to land and commercial property
            </Link>{" "}
            explains how those sales run.
          </p>
        </GuideSection>

        <GuideSection id="help" title="Before you sell: check for help paying the taxes">
          <p>
            Not everyone behind on taxes wants or needs to sell. If you can
            keep the property, these are worth checking first:
          </p>
          <GuideNote label="Partial payments">
            A county trustee may accept partial payments on delinquent taxes,
            but only if it has filed a plan with the Comptroller. A partial
            payment does not release the lien, and the property can still go
            to tax sale. Once the suit is filed, the clerk generally cannot
            take partial payments.
            <Cite href={src(11)} n={11} />
          </GuideNote>
          <GuideNote label="Tax relief for older, disabled and veteran homeowners">
            Tennessee&apos;s property tax relief program helps qualifying
            homeowners who are 65 or older, disabled, or disabled veterans and
            their surviving spouses. For 2026, the income limit for older and
            disabled homeowners is $38,470 (based on 2025 income). Applications
            go through the county trustee, and the taxes must be paid within
            the deadline to receive relief.
            <Cite href={src(12)} n={12} /> Some counties and cities also offer a
            tax freeze for homeowners 65 and older.
            <Cite href={src(13)} n={13} />
          </GuideNote>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Statute text above was checked against the current published Tennessee Code and the 2026 redemption amendment. County practices vary, so confirm amounts and dates with your county trustee or clerk."
        />

        <GuideRelated
          links={[
            { href: "/guides/land-commercial-property-wont-sell", label: "Land or commercial property that won't sell" },
            { href: "/guides/tennessee-foreclosure-surplus-funds", label: "Foreclosure surplus funds" },
            { href: "/guides/selling-estate-property-tennessee", label: "Inherited property with back taxes" },
            { href: "/start", label: "Tell us what you are dealing with" },
          ]}
        />
      </GuideShell>
    </>
  )
}
