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

const SLUG = "tennessee-tax-sale-redemption-period"
const HEADLINE = "Tennessee Tax Sale Redemption Period: The 2026 Change"
const DESCRIPTION =
  "How long you have to redeem property after a Tennessee tax sale under the law that took effect July 1, 2026, the old periods for earlier sales, the 30-day rule for vacant property, what redemption costs, and how to file."

export const metadata = {
  title: "Tennessee Tax Sale Redemption Period (2026 Law Change) | FALCO",
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "2026 Tenn. Pub. Acts ch. 971 (SB1983), amending Tenn. Code Ann. § 67-5-2701(a)(1)(C)", href: "https://publications.tnsosfiles.com/acts/114/pub/pc0971.pdf" },
  { n: 2, label: "Tennessee General Assembly, SB1983 bill history", href: "https://wapp.capitol.tn.gov/apps/BillInfo/Default.aspx?BillNumber=SB1983&GA=114" },
  { n: 3, label: "Tenn. Code Ann. § 67-5-2701 (redemption)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2701/" },
  { n: 4, label: "Tenn. Code Ann. § 67-5-2503 (possession after the order confirming sale)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2503/" },
  { n: 5, label: "University of Tennessee CTAS, Redemption", href: "https://www.ctas.tennessee.edu/eli/redemption" },
  { n: 6, label: "Tenn. Code Ann. § 67-5-2702 (excess proceeds)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2702/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "For Tennessee tax sales confirmed on or after July 1, 2026, you have one year from the court's order confirming the sale to redeem if the taxes were delinquent three years or less, and 90 days if they were delinquent more than three years. Vacant, abandoned property can have a 30-day period. To redeem, you file a motion and first pay the clerk the taxes and costs plus 12% a year on what the buyer paid."

const FAQ = [
  {
    q: "What is the redemption period for a Tennessee tax sale in 2026?",
    a: "For sales whose confirmation order was entered on or after July 1, 2026, the period is set by how long the taxes were delinquent: one year from the order confirming the sale if delinquent three years or less, and 90 days if delinquent more than three years.",
  },
  {
    q: "What was the redemption period before July 1, 2026?",
    a: "For confirmation orders entered before July 1, 2026, the earlier scale applies: one year if the taxes were delinquent five years or less, 180 days if more than five but less than eight years, and 90 days if eight years or more.",
  },
  {
    q: "How much does it cost to redeem a property after a Tennessee tax sale?",
    a: "Before filing the motion to redeem, you pay the clerk the delinquent taxes, penalty, interest and court costs, plus interest at 12% a year on the full price the tax-sale buyer paid, from the date they paid it. The buyer can then claim certain added sums, such as later taxes and insurance they paid.",
  },
  {
    q: "Can the tax sale buyer take possession during the redemption period?",
    a: "The order confirming the sale gives the purchaser the right to possession, and a writ of possession can issue on the purchaser's application in a proper case. If you are still living in the property, talk to an attorney about your situation right away.",
  },
  {
    q: "What happens if the redemption is not completed on time?",
    a: "If the required amounts are not paid to the clerk on time, the redemption fails under the statute. If the buyer's added sums are not paid by the later of the end of the redemption period or 30 days after the court's order, the redemption also fails.",
  },
  {
    q: "What does it cost to sell through FALCO before a tax sale?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy property. Licensed Tennessee real estate and auction firms run every sale.",
  },
]

export default function RedemptionGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Tax Sale Redemption Period"
      />
      <GuideShell
        variant="situation"
        answer={ANSWER}
        eyebrow="Property tax guide"
        title="Tennessee tax sale redemption period: the 2026 change"
        standfirst={
          <>
            Tennessee shortened and simplified the redemption period for tax
            sales on July 1, 2026. If your property sold at a tax sale, or is
            about to, the date of the court&apos;s confirmation order now
            decides which set of rules you are under. Here is what changed,
            what redemption costs, and how it is done.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The new rule, for sales confirmed on or after July 1, 2026">
          <p>
            Public Chapter 971 rewrote the redemption period so that it turns
            on one thing: how long the taxes were delinquent.
            <Cite href={src(1)} n={1} />
          </p>
          <ul>
            <li>
              <strong>Delinquent three years or less:</strong> one year from
              the entry of the order confirming the sale.
            </li>
            <li>
              <strong>Delinquent more than three years:</strong> 90 days from
              the entry of that order.
            </li>
          </ul>
          <p>
            The change applies to confirmation orders entered on or after July
            1, 2026.
            <Cite href={src(1)} n={1} />
            <Cite href={src(2)} n={2} />
          </p>
          <GuideKey>
            The clock runs from the court&apos;s order confirming the sale, not
            from the sale day itself. Ask the clerk for the date that order was
            entered.
          </GuideKey>
        </GuideSection>

        <GuideSection id="before-2026" title="Sales confirmed before July 1, 2026">
          <p>
            For confirmation orders entered before July 1, 2026, the earlier
            scale still applies:
            <Cite href={src(3)} n={3} />
          </p>
          <ul>
            <li>Delinquent five years or less: one year</li>
            <li>More than five but less than eight years: 180 days</li>
            <li>Eight years or more: 90 days</li>
          </ul>
        </GuideSection>

        <GuideSection id="vacant" title="Vacant and abandoned property: 30 days">
          <p>
            The redemption period can be as short as 30 days when the court is
            shown the property is vacant and abandoned. That showing requires
            periodic inspections over a two-month period, at different times
            of day, with at least three of them showing the property is
            abandoned.
            <Cite href={src(3)} n={3} />
          </p>
        </GuideSection>

        <GuideSection id="how" title="How redemption actually works">
          <ol>
            <li>
              <strong>Pay the clerk first.</strong> Before filing the motion to
              redeem, pay the clerk the delinquent taxes, penalty, interest and
              court costs, plus interest at 12% a year on the entire purchase
              price the buyer paid, running from the date they paid it. If the
              money is not paid on time, the redemption fails.
              <Cite href={src(3)} n={3} />
            </li>
            <li>
              <strong>File the motion to redeem</strong> in the same tax
              lawsuit, within the redemption period.
              <Cite href={src(3)} n={3} />
            </li>
            <li>
              <strong>The buyer can claim added sums.</strong> The clerk
              notifies the buyer within 10 days, and the buyer has 30 days to
              claim certain extra costs: taxes it paid, insurance, costs to
              prevent waste, code or zoning compliance costs, homeowners
              association dues, and additional interest.
              <Cite href={src(3)} n={3} />
            </li>
            <li>
              <strong>Pay the added sums on time.</strong> They are due by the
              later of the end of the redemption period or 30 days after the
              court&apos;s order. If they are not paid, the redemption fails.
              <Cite href={src(3)} n={3} />
            </li>
            <li>
              <strong>Title comes back.</strong> When redemption is complete,
              the buyer&apos;s title is divested.
              <Cite href={src(3)} n={3} />
            </li>
          </ol>
          <GuideNote label="The 12% math">
            Say the tax-sale buyer paid $40,000 and you redeem six months
            later. The redemption interest alone is about $40,000 x 12% x 0.5 =
            $2,400. That is on top of the delinquent taxes, interest, penalty,
            court costs and any added sums the buyer claims. The higher the
            sale price and the longer you wait, the more it costs.
          </GuideNote>
        </GuideSection>

        <GuideSection id="during" title="During the redemption period">
          <GuideNote label="Possession">
            The order confirming the sale gives the buyer the right to
            possession, and a writ of possession can issue on the buyer&apos;s
            application in a proper case.
            <Cite href={src(4)} n={4} />
          </GuideNote>
          <GuideNote label="The deed">
            According to the University of Tennessee&apos;s County Technical
            Assistance Service, the clerk can issue the tax deed before or
            after the redemption period ends; one issued before is marked
            subject to statutory redemption.
            <Cite href={src(5)} n={5} />
          </GuideNote>
          <GuideNote label="Someone offering to buy your redemption right">
            The right to redeem can be transferred, but the court will deny a
            redemption by someone engaged in speculation or profiteering. That
            is presumed when they paid you less than the sale price minus the
            redemption amount, and the court can award attorney fees.
            <Cite href={src(3)} n={3} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="options" title="If you cannot afford to redeem">
          <p>
            Redemption has to be paid in cash on a short clock. If that is not
            realistic, two things are worth knowing. If the sale brought more
            than what was owed, the former owner may be able to claim the
            excess proceeds.
            <Cite href={src(6)} n={6} /> See{" "}
            <Link href="/guides/claim-tax-sale-excess-proceeds-tennessee">
              how to claim tax sale excess proceeds
            </Link>
            .
          </p>
          <p>
            And if the sale has not happened yet, selling the property yourself
            first usually keeps far more of the equity, with the taxes paid at
            closing. See{" "}
            <Link href="/guides/tennessee-tax-sale-delinquent-property">
              selling tax-delinquent property before a tax sale
            </Link>
            .
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. FALCO routes the property
            to a licensed Tennessee real estate and auction firm.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Statute text was checked against Public Chapter 971 and the published code. Redemption deadlines are strict; confirm dates and amounts with the clerk and an attorney."
        />

        <GuideRelated
          links={[
            { href: "/guides/tennessee-tax-sale-delinquent-property", label: "Before a Tennessee tax sale" },
            { href: "/guides/claim-tax-sale-excess-proceeds-tennessee", label: "Claiming tax sale excess proceeds" },
            { href: "/guides/do-you-need-probate-to-sell-a-house-tennessee", label: "Inherited property with back taxes" },
            { href: "/start", label: "Tell us what you are dealing with" },
          ]}
        />
      </GuideShell>
    </>
  )
}
