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

const SLUG = "claim-tax-sale-excess-proceeds-tennessee"
const HEADLINE = "How to Claim Tax Sale Excess Proceeds in Tennessee"
const DESCRIPTION =
  "Who is owed the money left over after a Tennessee property tax sale, the order it is paid, how to file the motion, county filing fees, when unclaimed money goes to the state, and what to know before signing with a surplus recovery firm."

export const metadata = {
  title: `${HEADLINE} | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 67-5-2702 (excess proceeds)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2702/" },
  { n: 2, label: "Davidson County Clerk and Master, Excess Sale Proceeds information sheet (revised 12/30/2025)", href: "https://chanceryclerkandmaster.nashville.gov/wp-content/uploads/excess-sale-proceeds-information-sheet-revised-12.30.25.pdf" },
  { n: 3, label: "Blount County, Excess Proceeds", href: "https://blounttn.gov/2175/Excess-Proceeds" },
  { n: 4, label: "Knox County Trustee, Motion to Claim Excess Sale Proceeds (with statute)", href: "https://knoxcounty.org/trustee/taxsale23/MotionClaimExcessSaleProceedsWithStatute.pdf" },
  { n: 5, label: "Tenn. Code Ann. § 66-29-176 (agreements to locate unclaimed property)", href: "https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-29-176/" },
  { n: 6, label: "Tennessee Department of Treasury, Unclaimed Property", href: "https://treasury.tn.gov/Unclaimed-Property" },
  { n: 7, label: "Tennessee Department of Treasury, Third-Party Locators", href: "https://treasury.tn.gov/Unclaimed-Property/About-Unclaimed-Property/Third-Party-Locators" },
  { n: 8, label: "Tennessee Supreme Court, unauthorized practice of law statutes (Tenn. Code Ann. §§ 23-3-101, 23-3-103)", href: "https://www.tncourts.gov/sites/default/files/docs/upl_statutes.pdf" },
  { n: 9, label: "Tenn. Code Ann. § 30-2-712 (recorded affidavit of heirship)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-712/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "After a Tennessee tax sale is confirmed, anyone with an interest can file a motion in the same tax lawsuit to claim the excess. The court pays the taxing entity first, then lienholders, then the former owners who were defendants in the suit, or their heirs. There is no fixed filing deadline in the statute, but unclaimed money eventually goes to the state's unclaimed property program."

const FAQ = [
  {
    q: "What are excess proceeds from a Tennessee tax sale?",
    a: "They are the money left after a tax sale brings more than the delinquent taxes, interest, penalties and costs. The excess is held by the court that handled the tax lawsuit and is paid out on motion to the people entitled to it.",
  },
  {
    q: "Who gets tax sale excess proceeds in Tennessee?",
    a: "The statute sets an order: first any remaining taxes owed to the taxing entity, then lienholders as of the sale, then later lienholders, then the taxpayer who was a defendant in the tax suit or that person's heirs or devisees. Anything still unclaimed goes to the state under the unclaimed property law.",
  },
  {
    q: "Is there a deadline to claim tax sale excess proceeds in Tennessee?",
    a: "The statute does not set a fixed filing deadline. A claim can be filed until the money is forwarded to the state. The money is not presumed abandoned until the later of all motions being resolved or one year after the redemption period ends.",
  },
  {
    q: "How do I file a claim for excess proceeds?",
    a: "File a motion in the tax lawsuit after the sale is confirmed, and serve it on all interested persons at least 30 days before the hearing. If you are claiming through a deed or as an heir, the deed or affidavit of heirship generally has to be recorded more than 30 days before the hearing. Many clerks publish a form and charge a filing fee.",
  },
  {
    q: "Should I sign with a surplus recovery company?",
    a: "Read the agreement first. Tennessee caps locator fees at 10% or $50, whichever is greater, only once the money is held by the state Treasurer, and voids agreements made within two years after it reaches the Treasurer. Before that, we found no percentage cap. You can file the motion yourself or through your own attorney, and only a licensed attorney can represent you in court.",
  },
  {
    q: "What does it cost to sell through FALCO before a tax sale?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy property. Licensed Tennessee real estate and auction firms run every sale.",
  },
]

export default function ExcessProceedsGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Tax Sale Excess Proceeds"
      />
      <GuideShell
        variant="situation"
        answer={ANSWER}
        eyebrow="Property tax guide"
        title="How to claim tax sale excess proceeds in Tennessee"
        standfirst={
          <>
            When a Tennessee property sells at a tax sale for more than what
            was owed, the leftover money does not go to the county. It sits
            with the court until someone with a right to it asks. Here is who
            that is, how to ask, and how to avoid giving a big cut to someone
            else for doing it.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="Who is paid, and in what order">
          <p>
            After the court confirms a tax sale, the excess proceeds are paid
            out in this order:
            <Cite href={src(1)} n={1} />
          </p>
          <ol>
            <li>Any remaining taxes owed to the taxing entity</li>
            <li>Lienholders as of the date of the sale</li>
            <li>Lienholders whose liens arose after the sale</li>
            <li>
              The taxpayer who was a defendant in the tax lawsuit, or that
              person&apos;s heirs or devisees
            </li>
            <li>
              Anything left goes to the state under the unclaimed property law
            </li>
          </ol>
          <GuideKey>
            If there was a mortgage or a judgment lien on the property, those
            creditors are ahead of the former owner. The excess you can
            actually collect is what is left after them.
          </GuideKey>
        </GuideSection>

        <GuideSection id="file" title="How to file a claim">
          <ol>
            <li>
              <strong>Wait for the confirmation order.</strong> Claims are made
              after the court confirms the sale.
              <Cite href={src(1)} n={1} />
            </li>
            <li>
              <strong>File a motion in the same tax lawsuit</strong>, in the
              court that handled the sale.
              <Cite href={src(1)} n={1} />
            </li>
            <li>
              <strong>Serve everyone with an interest</strong> at least 30 days
              before the hearing.
              <Cite href={src(1)} n={1} />
            </li>
            <li>
              <strong>Record your proof of ownership in time.</strong> If you
              claim through a deed or as an heir, the deed or affidavit of
              heirship generally has to be recorded more than 30 days before
              the hearing.
              <Cite href={src(1)} n={1} />
              <Cite href={src(9)} n={9} />
            </li>
          </ol>
          <GuideNote label="Forms and fees vary by county">
            The statute does not set a clerk fee, but counties do. Davidson
            County&apos;s Clerk and Master and Blount County each list a $75
            filing fee, and Blount says funds are released 30 days after the
            order.
            <Cite href={src(2)} n={2} />
            <Cite href={src(3)} n={3} /> Knox County publishes its motion form
            along with the statute.
            <Cite href={src(4)} n={4} /> Ask the clerk of the court that
            handled your sale for its current form and fee.
          </GuideNote>
        </GuideSection>

        <GuideSection id="deadline" title="Is there a deadline?">
          <p>
            The statute does not set a fixed filing deadline. A claim can be
            filed until the money is forwarded to the state. The money is not
            presumed abandoned until the later of all pending motions being
            resolved or one year after the redemption period ends.
            <Cite href={src(1)} n={1} />
          </p>
          <p>
            Once it reaches the state, you can still claim it, for free,
            through the Treasury&apos;s unclaimed property program at
            ClaimItTN.
            <Cite href={src(6)} n={6} />
          </p>
        </GuideSection>

        <GuideSection id="recovery-firms" title="Before you sign with a recovery firm">
          <p>
            If a tax sale produced excess proceeds, expect letters offering to
            &quot;recover&quot; the money for a percentage. Know the rules first:
          </p>
          <GuideNote label="Fee caps apply only once the state holds the money">
            Tennessee caps a locator&apos;s fee at 10% or $50, whichever is
            greater, for property already held by the state Treasurer, and
            agreements made within two years after the money reaches the
            Treasurer are void. For property not yet reported to the state, an
            agreement must be in writing and show the value before and after
            the fee, but we found no percentage cap.
            <Cite href={src(5)} n={5} /> The Treasury also requires locators to
            be licensed private investigators.
            <Cite href={src(7)} n={7} />
          </GuideNote>
          <GuideNote label="Court filings are the practice of law">
            In Tennessee, preparing and filing a court claim for someone else,
            or representing them in court, is the practice of law. A non-lawyer
            doing that for a fee is breaking the law.
            <Cite href={src(8)} n={8} /> You can file your own motion or hire
            your own attorney.
          </GuideNote>
        </GuideSection>

        <GuideSection title="Better than excess proceeds: your full equity">
          <p>
            Excess proceeds are what is left after a sale that only had to
            cover a tax bill. If the sale has not happened yet, selling the
            property yourself first puts the equity in your hands at closing,
            with the taxes paid from the proceeds. See{" "}
            <Link href="/guides/tennessee-tax-sale-delinquent-property">
              selling before a Tennessee tax sale
            </Link>{" "}
            and{" "}
            <Link href="/guides/tennessee-tax-sale-redemption-period">
              the redemption period
            </Link>
            . Mortgage foreclosure surplus follows a different process; see{" "}
            <Link href="/guides/tennessee-foreclosure-surplus-funds">
              foreclosure surplus funds
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

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/tennessee-tax-sale-redemption-period", label: "Tax sale redemption period" },
            { href: "/guides/tennessee-tax-sale-delinquent-property", label: "Before a Tennessee tax sale" },
            { href: "/guides/tennessee-foreclosure-surplus-funds", label: "Foreclosure surplus funds" },
            { href: "/start", label: "Tell us what you are dealing with" },
          ]}
        />
      </GuideShell>
    </>
  )
}
