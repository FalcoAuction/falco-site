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

const SLUG = "selling-inherited-house-with-siblings-tennessee"
const HEADLINE = "Selling an Inherited House With Siblings in Tennessee"
const DESCRIPTION =
  "Who owns what share of an inherited Tennessee house, how siblings split costs while they hold it, what happens to the mortgage, and how partition and Tennessee's heirs property buyout work when you cannot agree."

export const metadata = {
  title: `${HEADLINE} | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 31-2-103 (real property vests in heirs or devisees at death)", href: "https://codes.findlaw.com/tn/title-31-descent-and-distribution/tn-code-sect-31-2-103/" },
  { n: 2, label: "Tenn. Code Ann. § 31-2-104 (intestate shares)", href: "https://codes.findlaw.com/tn/title-31-descent-and-distribution/tn-code-sect-31-2-104/" },
  { n: 3, label: "Parker v. Lambert, 206 S.W.3d 1 (Tenn. Ct. App. 2006): cotenants share the burdens of ownership", href: "https://hallapproved.com/tn/cases/appeals/2006/1400189/" },
  { n: 4, label: "12 U.S.C. § 1701j-3(d) (Garn-St Germain: transfers that do not trigger a due-on-sale clause)", href: "https://www.law.cornell.edu/uscode/text/12/1701j-3" },
  { n: 5, label: "Tenn. Code Ann. § 29-27-101 (who may petition for partition)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-101/" },
  { n: 6, label: "Tenn. Code Ann. § 29-27-201 (partition sale)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-201/" },
  { n: 7, label: "Tenn. Code Ann. § 29-27-121 (attorney fees in partition)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-121/" },
  { n: 8, label: "Tenn. Code Ann. § 29-27-302 (heirs property definitions)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-302/" },
  { n: 9, label: "Tenn. Code Ann. § 29-27-306 (determination of value)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-306/" },
  { n: 10, label: "Tenn. Code Ann. § 29-27-307 (cotenant buyout)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-307/" },
  { n: 11, label: "Tenn. Code Ann. § 29-27-310 (open-market sale, sealed bids or auction)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-310/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "Each sibling owns a share, so selling the whole house takes every owner's signature or a court order. If you agree, you sell together and split the proceeds by share. If you cannot, any co-owner can ask a court to partition, and when Tennessee's heirs property law applies, the other siblings first get a chance to buy out the one who wants to sell, at a value the court sets."

const FAQ = [
  {
    q: "How is an inherited house split between siblings in Tennessee?",
    a: "If there is a will, it controls. If there is no will and no surviving spouse, the children inherit equally, and a child who died before the parent is represented by that child's own descendants. If there is a surviving spouse and children, the spouse takes the greater of one third or a child's share.",
  },
  {
    q: "Can one sibling sell an inherited house without the others?",
    a: "Not the whole house. Each sibling owns a share, and a buyer and title company will need every owner to sign the deed. A sibling who wants out and cannot get agreement can ask a court to partition the property.",
  },
  {
    q: "Who pays the taxes and mortgage on an inherited house while siblings decide?",
    a: "Tennessee courts treat co-owners as sharing the burdens of ownership. A co-owner who pays more than their fair share of necessary costs such as the mortgage, taxes and insurance can generally get credit from the others, and a co-owner who shuts the others out can owe them rent.",
  },
  {
    q: "Will the bank call the mortgage due when the parent dies?",
    a: "For homes with fewer than five units, federal law bars the lender from calling the loan due because of a transfer to a relative resulting from the borrower's death, or a transfer where the borrower's spouse or children become owners. The payments still have to be made.",
  },
  {
    q: "How does the heirs property buyout work in Tennessee?",
    a: "In a partition case over qualifying heirs property, the court first sets the property's value. Co-owners who did not ask for the sale then have 45 days after notice, or another period the court sets, to elect to buy the interests of those who did. The price is the whole property's value multiplied by the share being bought.",
  },
  {
    q: "What does it cost to sell through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy, list or broker real estate. A licensed Tennessee real estate and auction firm runs every real estate sale.",
  },
]

export default function SiblingsGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Inherited House With Siblings"
      />
      <GuideShell
        variant="situation"
        situation="estate"
        answer={ANSWER}
        eyebrow="Estate guide"
        title="Selling an inherited house with siblings in Tennessee"
        standfirst={
          <>
            One sibling wants to sell, one wants to keep it, one lives three
            states away and stops answering. Inherited houses split families
            more often than almost anything else. Here is who actually owns
            what, who pays what while you decide, and how a sale happens with
            or without everyone on board.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="Who owns what">
          <p>
            In Tennessee, real estate passes at death to the heirs, or to the
            people named in a will.
            <Cite href={src(1)} n={1} /> If there is a will, its terms decide
            the shares. If there is not, Tennessee&apos;s intestacy statute does:
            <Cite href={src(2)} n={2} />
          </p>
          <ul>
            <li>
              <strong>No surviving spouse:</strong> the children share equally.
              If a child died before the parent, that child&apos;s own
              descendants take the child&apos;s place.
            </li>
            <li>
              <strong>A surviving spouse and children:</strong> the spouse takes
              the greater of one third or a child&apos;s share. With one child,
              that is half each. With two children, a third each. With three
              children, the spouse takes a third and each child two ninths.
            </li>
            <li>
              <strong>No spouse and no children:</strong> the parents inherit,
              and if neither is living, the siblings of the person who died.
            </li>
          </ul>
          <p>
            Siblings who inherit together own the house together, each with a
            share. A buyer and a title company will need every owner to sign
            the deed. If there are questions about who the heirs are, see{" "}
            <Link href="/guides/do-you-need-probate-to-sell-a-house-tennessee">
              do you need probate to sell a house
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="costs" title="Who pays while you decide">
          <p>
            Houses cost money every month: the mortgage, taxes, insurance,
            utilities and repairs. Tennessee courts treat co-owners as sharing
            those burdens equally, and a co-owner who carries more than their
            share can generally get compensated by the others.
            <Cite href={src(3)} n={3} />
          </p>
          <GuideNote label="What usually counts">
            Credit for mortgage, tax and insurance payments applies to what you
            paid beyond your fair share. Only necessary repairs count, and
            personal labor generally does not unless the owners agreed to it.
            A co-owner who shuts the others out of the property can owe them
            rent.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <GuideNote label="The mortgage">
            For homes with fewer than five units, federal law bars the lender
            from calling the loan due because of a transfer to a relative
            resulting from the borrower&apos;s death, or a transfer where the
            borrower&apos;s spouse or children become owners.
            <Cite href={src(4)} n={4} /> The payments still have to be made, so
            decide early who is covering them.
          </GuideNote>
          <GuideKey>
            Keep receipts from day one. Whoever is paying the bills will want
            credit at closing, and a written record ends most of those
            arguments before they start.
          </GuideKey>
        </GuideSection>

        <GuideSection id="agree" title="If you agree: sell together">
          <p>
            When every sibling signs, an inherited house sells like any other
            house, and the proceeds are split by ownership share after the
            mortgage, liens and costs are paid. The hard part is usually the
            price, because each sibling has a different number in mind.
          </p>
          <p>
            An auction can settle that. The house is marketed to a set date,
            buyers bid against each other in the open, and nobody has to take
            anyone else&apos;s word for what the house is worth. Our guide to{" "}
            <Link href="/guides/land-commercial-property-wont-sell">
              auction versus listing
            </Link>{" "}
            explains when each one fits.
          </p>
        </GuideSection>

        <GuideSection id="partition" title="If you cannot agree: partition">
          <p>
            Any co-owner can ask a Tennessee court to partition the property.
            <Cite href={src(5)} n={5} /> The court can divide it, or order it
            sold if it cannot be fairly divided or a sale is clearly better for
            the owners.
            <Cite href={src(6)} n={6} /> When the property is sold, the court
            may pay the attorney fees out of the sale proceeds.
            <Cite href={src(7)} n={7} />
          </p>
          <GuideNote label="Heirs property: the buyout comes first">
            Tennessee has adopted the Uniform Partition of Heirs Property Act.
            It applies to partition cases over land co-owned by relatives where
            at least one owner got their share from a relative and no written
            agreement controls how the land is divided.
            <Cite href={src(8)} n={8} /> In those cases:
            <ol>
              <li>
                The court sets the value, by the owners&apos; agreement, the tax
                appraisal or an independent appraisal.
                <Cite href={src(9)} n={9} />
              </li>
              <li>
                Siblings who did not ask for the sale get 45 days after notice,
                or another period the court sets, to elect to buy out the
                sibling who did, at the whole property&apos;s value times that
                sibling&apos;s share.
                <Cite href={src(10)} n={10} />
              </li>
              <li>
                If the house is still to be sold, the court picks the method
                that is most economically advantageous: an open-market sale
                through a licensed broker, sealed bids, or an auction.
                <Cite href={src(11)} n={11} />
              </li>
            </ol>
          </GuideNote>
          <GuideKey>
            Partition works, but it is a lawsuit between family members, and
            the fees come out of the same pot. Most families do better putting
            realistic written numbers in front of everyone first.
          </GuideKey>
        </GuideSection>

        <GuideSection title="What FALCO does">
          <p>
            We give every sibling the same written numbers: what the house
            would likely bring at a marketed auction and what each share nets
            after the payoff. If you decide to sell, we route the house to the
            licensed Tennessee real estate and auction firm best suited to it.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/do-you-need-probate-to-sell-a-house-tennessee", label: "Do you need probate to sell?" },
            { href: "/guides/selling-estate-property-tennessee", label: "Selling estate and probate property" },
            { href: "/guides/land-commercial-property-wont-sell", label: "Land with multiple owners" },
            { href: "/start?s=estate", label: "Tell us about the house" },
          ]}
        />
      </GuideShell>
    </>
  )
}
