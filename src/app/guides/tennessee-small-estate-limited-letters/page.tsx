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

const SLUG = "tennessee-small-estate-limited-letters"
const HEADLINE = "Small Estates in Tennessee: Limited Letters"
const DESCRIPTION =
  "How Tennessee's small estate process works since 2023: the $50,000 personal property limit, who can file and when, bond, what limited letters let you do, why they never cover real estate, and the separate route for vehicles."

export const metadata = {
  title: `${HEADLINE} ($50,000 Limit) | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 30-4-102 (small estate definitions; $50,000 limit)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-4/section-30-4-102/" },
  { n: 2, label: "Tenn. Code Ann. § 30-4-103 (small estate procedure; limited letters)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-4-103/" },
  { n: 3, label: "Davidson County Circuit Court Clerk, Small Estate Petition (without a will)", href: "https://circuitclerk.nashville.gov/wp-content/uploads/PC-Small-Estate-Petition-Without-Will.pdf" },
  { n: 4, label: "Tennessee Department of Revenue, Affidavit of Inheritance (RV-F1310501)", href: "https://www.tn.gov/content/dam/tn/revenue/documents/forms/titlereg/f1310501Fill-in.pdf" },
  { n: 5, label: "Tennessee Department of Revenue, GI-3: Changing Title and Registration to a Surviving Spouse", href: "https://revenue.support.tn.gov/hc/en-us/articles/360060413451-GI-3-How-to-Change-Title-and-Registration-to-Surviving-Spouse-s-Name" },
  { n: 6, label: "Tenn. Code Ann. § 32-2-111 (will admitted as a muniment of title)", href: "https://codes.findlaw.com/tn/title-32-wills/tn-code-sect-32-2-111/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "If the person left $50,000 or less in personal property that would otherwise go through probate, Tennessee lets the heirs ask the court for limited letters, usually at least 45 days after the death. Limited letters let one person collect and protect the assets for up to a year. They never cover real estate, and no notice to creditors is published."

const FAQ = [
  {
    q: "What is the small estate limit in Tennessee?",
    a: "$50,000. A Tennessee small estate is personal property worth $50,000 or less in total that would otherwise go through probate. Property that passes by survivorship or tenancy by the entirety, and anything payable to a named beneficiary, does not count toward the limit.",
  },
  {
    q: "Is there still a small estate affidavit in Tennessee?",
    a: "Tennessee's small estate process now works through limited letters issued by the court. Heirs file a sworn petition listing each asset and its value and each creditor and the amount owed, and the court issues limited letters to the person who will handle the estate.",
  },
  {
    q: "How long do you have to wait to file a small estate in Tennessee?",
    a: "At least 45 days after the death, with no other estate opened. The court can waive the waiting period for good cause.",
  },
  {
    q: "Can limited letters be used to sell a house?",
    a: "No. A Tennessee small estate covers personal property only, and limited letters give no authority over real estate. The house passes to the heirs or the people named in the will and is handled separately.",
  },
  {
    q: "How do you transfer a car from a small estate in Tennessee?",
    a: "Tennessee has a separate route for vehicles. When there is no will and no surviving spouse, all of the heirs can sign the Department of Revenue's Affidavit of Inheritance and transfer the title without opening an estate. A surviving spouse can have the title changed into their name.",
  },
  {
    q: "What does it cost to sell estate items through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. Licensed Tennessee auction firms run every sale.",
  },
]

export default function SmallEstateGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Small Estates: Limited Letters"
      />
      <GuideShell
        variant="situation"
        situation="estate"
        answer={ANSWER}
        eyebrow="Estate guide"
        title="Small estates in Tennessee: limited letters"
        standfirst={
          <>
            When someone dies with a bank account, a truck and not much else,
            a full probate can feel like overkill. Tennessee has a shorter
            process for small estates. It changed in 2023, and a lot of what
            is written about it online still describes the old version.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="What counts as a small estate">
          <p>
            A Tennessee small estate is{" "}
            <strong>personal property worth $50,000 or less</strong> in total
            that would otherwise have to go through probate.
            <Cite href={src(1)} n={1} />
          </p>
          <ul>
            <li>
              <strong>Counts:</strong> bank accounts in the person&apos;s name
              alone, vehicles, household goods, collections and other personal
              property that has no named beneficiary.
            </li>
            <li>
              <strong>Does not count:</strong> property that passes by
              survivorship or tenancy by the entirety, and anything payable to
              a named beneficiary, such as an account with a payable-on-death
              designation.
              <Cite href={src(1)} n={1} />
            </li>
            <li>
              <strong>Never included:</strong> real estate. The small estate
              process is for personal property only.
              <Cite href={src(2)} n={2} />
            </li>
          </ul>
        </GuideSection>

        <GuideSection id="how" title="How the process works">
          <GuideNote label="When you can file">
            At least 45 days after the death, as long as no other estate has
            been opened. The court can waive the waiting period for good cause.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="Who files">
            The adult heirs file a sworn petition. If there is a will that
            changes who inherits, it is handled through the will instead, for
            example by admitting it as a muniment of title.
            <Cite href={src(2)} n={2} />
            <Cite href={src(6)} n={6} />
          </GuideNote>
          <GuideNote label="What the petition lists">
            Each asset and its value, and each creditor and the amount owed.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="Bond">
            A bond equal to the value of the property is required, unless the
            petitioners are the only heirs or beneficiaries, or all of the
            adult heirs and beneficiaries consent in writing. A bond waiver in
            a will does not control.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="Creditors">
            No notice to creditors is published in a small estate.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="How long it lasts">
            The limited letters stay open until the one-year anniversary, and
            then the court automatically discharges the person who held them.
            <Cite href={src(2)} n={2} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="powers" title="What limited letters let you do, and what they do not">
          <p>
            Limited letters let the person named collect and preserve the
            estate&apos;s assets, remove the person&apos;s property from leased
            premises such as an apartment, and cancel insurance.
            <Cite href={src(2)} n={2} />
          </p>
          <GuideKey>
            Limited letters give no authority over real estate, and the statute
            does not spell out a power to sell. If the estate includes things
            worth auctioning, ask the court or an estate attorney how a sale
            should be handled before relying on limited letters alone.
          </GuideKey>
          <p>
            If the person owned a house, see{" "}
            <Link href="/guides/do-you-need-probate-to-sell-a-house-tennessee">
              do you need probate to sell a house in Tennessee
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="vehicles" title="Vehicles have their own shortcut">
          <p>
            Many small estates are mostly a vehicle. Tennessee&apos;s Department of
            Revenue has a separate route that does not need limited letters:
          </p>
          <ul>
            <li>
              <strong>No will and no surviving spouse:</strong> all of the
              heirs sign an Affidavit of Inheritance, swearing that the person
              left no estate that needed administration and that no letters
              were issued, and sign the vehicle over to one person. It is filed
              with the county clerk.
              <Cite href={src(4)} n={4} />
            </li>
            <li>
              <strong>A surviving spouse:</strong> the spouse can have the
              title and registration changed into their own name.
              <Cite href={src(5)} n={5} />
            </li>
          </ul>
        </GuideSection>

        <GuideSection id="county" title="County details vary">
          <p>
            Small estates are filed in the court that handles probate in the
            county where the person lived, and each court has its own forms and
            fees. In Davidson County, for example, probate is handled by the
            Seventh Circuit Court through the Circuit Court Clerk, whose small
            estate petition form calls for a certified death certificate and
            the heirs&apos; consents to waive bond.
            <Cite href={src(3)} n={3} /> Check your county clerk&apos;s current
            forms and fees before filing.
          </p>
        </GuideSection>

        <GuideSection title="When there is something worth selling">
          <p>
            Small estates still hold things buyers want: a truck, a trailer, a
            gun collection, coins. If the family decides to sell, FALCO routes
            each item to the licensed Tennessee auction firm whose buyers want
            it.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Fees and forms differ by county and change over time. Confirm with the clerk of the court that handles probate in your county."
        />

        <GuideRelated
          links={[
            { href: "/guides/selling-estate-property-tennessee", label: "Selling estate and probate property" },
            { href: "/guides/do-you-need-probate-to-sell-a-house-tennessee", label: "Do you need probate to sell?" },
            { href: "/guides/estate-firearms-collections-tennessee", label: "Estate firearms and collections" },
            { href: "/start?s=estate", label: "Tell us about the estate" },
          ]}
        />
      </GuideShell>
    </>
  )
}
