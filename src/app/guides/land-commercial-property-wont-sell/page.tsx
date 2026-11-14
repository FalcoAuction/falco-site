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

const SLUG = "land-commercial-property-wont-sell"
const HEADLINE = "Land or Commercial Property That Won't Sell in Tennessee"
const DESCRIPTION =
  "When an auction beats another listing for Tennessee land and commercial property, how licensed real estate auctions work, and how heirs' property and property with multiple owners gets to a sale, including partition and Tennessee's heirs property law."

const META_TITLE = `${HEADLINE} | FALCO`
const META_DESCRIPTION =
  DESCRIPTION

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  ...ogMeta({
    key: "guide-land-commercial-property-wont-sell",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/land-commercial-property-wont-sell",
  }),
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 62-19-102 (auctioneer license required; auctions of real property require auctioneer and broker licenses)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-102/" },
  { n: 2, label: "Tenn. Code Ann. § 62-13-102 (broker definition includes anyone who auctions real estate)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-13-102/" },
  { n: 3, label: "Tenn. Code Ann. § 62-19-112 (written contract before the sale; escrow of proceeds)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-112/" },
  { n: 4, label: "Tenn. Code Ann. § 47-2-328 (sale by auction of goods; with and without reserve)", href: "https://codes.findlaw.com/tn/title-47-commercial-instruments-and-transactions/tn-code-sect-47-2-328/" },
  { n: 5, label: "Tenn. Code Ann. § 30-2-712 (recorded affidavit of heirship)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-712/" },
  { n: 6, label: "Tenn. Code Ann. § 31-2-103 (real property passes to heirs or devisees)", href: "https://law.justia.com/codes/tennessee/title-31/chapter-2/section-31-2-103/" },
  { n: 7, label: "Tenn. Code Ann. § 29-27-101 (who may petition for partition)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-101/" },
  { n: 8, label: "Tenn. Code Ann. § 29-27-201 (partition sale)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-201/" },
  { n: 9, label: "Tenn. Code Ann. § 29-27-302 (Uniform Partition of Heirs Property Act definitions)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-302/" },
  { n: 10, label: "Tenn. Code Ann. § 29-27-306 (determination of value)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-306/" },
  { n: 11, label: "Tenn. Code Ann. § 29-27-307 (cotenant buyout)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-307/" },
  { n: 12, label: "Tenn. Code Ann. § 29-27-310 (open-market sale, sealed bids or auction)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-310/" },
  { n: 13, label: "2026 Tenn. Pub. Acts ch. 717 (HB2451), heirs property act and sales to pay estate debts", href: "https://wapp.capitol.tn.gov/apps/BillInfo/Default.aspx?BillNumber=HB2451&GA=114" },
  { n: 14, label: "Tenn. Code Ann. § 62-19-103 (exemptions from auctioneer licensing, including court-ordered and fiduciary sales)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-103/" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Is it better to auction land or list it in Tennessee?",
    a: "It depends on the property and your deadline. A listing lets you wait for the right buyer at your price, which works when the property is easy to understand and you have time. An auction sets a date, gathers the interested buyers at once and lets them compete, which tends to suit unusual property, property that has already sat on the market, or a seller who needs a firm timeline. Both are run by licensed real estate professionals in Tennessee.",
  },
  {
    q: "Who can run a real estate auction in Tennessee?",
    a: "Tennessee law makes it unlawful to conduct an auction of real property unless the person is licensed both as an auctioneer (or affiliate auctioneer) and as a real estate broker (or affiliate broker). Auctions ordered by a court, and sales by fiduciaries or trustees under a deed of trust, are among the exemptions from auctioneer licensing.",
  },
  {
    q: "What is heirs' property?",
    a: "Heirs' property is land that passed to family members, often over more than one generation, without the title being cleared through probate or a deed. The owners are usually co-owners with each other, and selling it normally requires every co-owner to sign or a court order.",
  },
  {
    q: "Can one co-owner force the sale of inherited land in Tennessee?",
    a: "Any co-owner can ask a court to partition the property, and the court can order it sold if it cannot be fairly divided or a sale is clearly better for the owners. If the land qualifies as heirs property, Tennessee's heirs property law adds steps first, including a court-determined value and a chance for the other co-owners to buy out the share of the co-owner who asked for the sale.",
  },
  {
    q: "What is the difference between an absolute auction and a reserve auction?",
    a: "In an absolute auction the property sells to the highest bidder regardless of price. In a reserve auction the seller can decline the high bid. For goods, Tennessee's version of the Uniform Commercial Code treats an auction as with reserve unless it is expressly announced as without reserve. For real estate, the auction contract and the posted terms of sale control.",
  },
  {
    q: "What does it cost to sell through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy, list or broker real estate. A licensed Tennessee real estate and auction firm runs every real estate sale.",
  },
]

export default function LandCommercialGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Land and Commercial That Won't Sell"
      />
      <GuideShell
        variant="situation"
        situation="hard-to-sell"
        answer="An auction tends to beat another listing when the property is hard to price, has already sat, or has to sell by a date. In Tennessee a real estate auction must be run by someone licensed as both an auctioneer and a real estate broker. If co-owners cannot agree, any of them can ask a court to divide or sell the property."
        eyebrow="Land and commercial guide"
        title={
          <>
            Land or commercial property{" "}
            <span className="text-[var(--mocha)]">that won&apos;t sell</span>
          </>
        }
        standfirst={
          <>
            Rural acreage that has sat for a year. A vacant building on the
            wrong side of town. A family farm with nine owners and no plan.
            Here is why some Tennessee property does not move on the market,
            when an auction is the better tool, and how property with more
            than one owner actually gets to a sale.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="Why some property just sits">
          <p>
            Most houses sell because there are a lot of buyers who want a
            house. Land and commercial property are different. The buyer pool
            is smaller, each buyer wants something specific, and the right
            buyer may not be looking at the right moment. A few patterns show
            up again and again:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">The price is anchored to a hope.</strong>{" "}
              Without many comparable sales, the asking price is often a guess,
              and a listing that starts too high goes stale.
            </li>
            <li>
              <strong className="text-[var(--ink)]">The right buyers never saw it.</strong>{" "}
              A hunting tract, a small industrial building and a downtown
              storefront each have their own buyers, and a general listing may
              not reach them.
            </li>
            <li>
              <strong className="text-[var(--ink)]">The title is not clean.</strong>{" "}
              Unclear ownership, missing heirs or a co-owner who will not sign
              can stop a sale before a buyer ever gets serious.
            </li>
            <li>
              <strong className="text-[var(--ink)]">There is no deadline.</strong>{" "}
              Without a date, buyers have no reason to act now.
            </li>
          </ul>
        </GuideSection>

        <GuideSection id="auction-vs-listing" title="Auction or another listing?">
          <p>
            Both are legitimate ways to sell real estate, and both are run by
            licensed professionals. They solve different problems.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <GuideNote label="A listing tends to fit when">
              <ul className="list-disc ml-4 space-y-1">
                <li>The property is easy to compare to recent sales</li>
                <li>You can wait for the right buyer</li>
                <li>The title is clean and every owner agrees</li>
              </ul>
            </GuideNote>
            <GuideNote label="An auction tends to fit when">
              <ul className="list-disc ml-4 space-y-1">
                <li>The property is unusual or hard to price</li>
                <li>It has already sat on the market</li>
                <li>You need a firm date: an estate, a debt, a deadline</li>
                <li>Several owners want a price no one can second-guess</li>
              </ul>
            </GuideNote>
          </div>
          <p>
            The core idea of an auction is simple: instead of one buyer at a
            time negotiating against your asking price, the interested buyers
            show up on the same day and bid against each other. A well-run
            auction is marketed for weeks before the sale, so the buyers who
            want that kind of property know it is coming.
          </p>
          <GuideNote label="Absolute or reserve">
            In an <strong className="text-[var(--ink)]">absolute</strong> auction
            the property sells to the highest bidder regardless of price. In a{" "}
            <strong className="text-[var(--ink)]">reserve</strong> auction the
            seller keeps the right to decline the high bid. For goods,
            Tennessee&apos;s commercial code treats an auction as with reserve
            unless it is expressly announced as without reserve.
            <Cite href={src(4)} n={4} /> For real estate, the auction contract and
            the posted terms of sale set the rules, so read them before you
            sign.
          </GuideNote>
        </GuideSection>

        <GuideSection id="licensing" title="Who is allowed to auction real estate in Tennessee">
          <p>
            This matters, because plenty of people will offer to &quot;sell your
            land at auction.&quot; In Tennessee it is unlawful to conduct or
            offer to conduct an auction of real property unless the person is
            licensed both as an auctioneer (or affiliate auctioneer){" "}
            <strong className="text-[var(--ink)]">and</strong> as a real estate
            broker (or affiliate broker).
            <Cite href={src(1)} n={1} /> Tennessee&apos;s real estate license law
            likewise counts anyone who auctions real estate for others as
            acting as a broker.
            <Cite href={src(2)} n={2} />
          </p>
          <GuideNote label="What the auction firm owes you">
            Tennessee auctioneers must have a written contract with the seller
            before the sale, and must keep auction proceeds in an escrow or
            trust account, separate from their own money, and pay them out
            within a reasonable time.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <GuideKey>
            FALCO does not list, broker or auction real estate. We look at the
            property and route it to the licensed Tennessee real estate and
            auction firm whose buyers fit it best. That firm signs the
            contract with you and runs the sale.
          </GuideKey>
        </GuideSection>

        <GuideSection id="heirs-property" title="Heirs' property: when the owner on paper has died">
          <p>
            A lot of land in Tennessee is still titled to someone who died
            years, sometimes decades, ago. Under Tennessee law, real estate
            passes at death to the heirs, or to the people named in a will.
            <Cite href={src(6)} n={6} /> When nobody probates the estate or signs
            a new deed, the land ends up owned in shares by a growing family
            tree. That is what people mean by{" "}
            <strong className="text-[var(--ink)]">heirs&apos; property</strong>.
          </p>
          <p>
            Before it can be sold cleanly, a buyer and a title company need to
            know who the owners are. Common tools include:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Probating the estate</strong>{" "}
              of the person on the deed, even years later. See our{" "}
              <Link href="/guides/selling-estate-property-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
                estate property guide
              </Link>
              .
            </li>
            <li>
              <strong className="text-[var(--ink)]">A recorded affidavit of heirship.</strong>{" "}
              Tennessee lets family facts identifying a person&apos;s heirs be
              recorded with the register of deeds, and a recorded affidavit is
              evidence of those facts. It does not itself transfer title, and
              swearing to a false one is a felony.
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong className="text-[var(--ink)]">Every owner signs.</strong>{" "}
              Once the owners are known, the simplest sale is one where all of
              them sign the contract and the deed.
            </li>
          </ul>
          <p>
            A real estate attorney or title company can tell you which of these
            your property needs. That work comes before any sale.
          </p>
        </GuideSection>

        <GuideSection id="multiple-owners" title="When co-owners cannot agree: partition">
          <p>
            When co-owners cannot agree on whether to sell, Tennessee law gives
            any of them a way out. A co-owner can petition the court for{" "}
            <strong className="text-[var(--ink)]">partition</strong>.
            <Cite href={src(7)} n={7} /> The court can divide the land, or order
            it sold if it cannot be fairly divided or a sale is clearly better
            for the owners.
            <Cite href={src(8)} n={8} />
          </p>
          <GuideNote label="Tennessee's heirs property law">
            Since July 1, 2022, Tennessee has had the Uniform Partition of Heirs
            Property Act. It applies to partition cases over land that
            qualifies as heirs property, generally land co-owned by relatives
            where at least one owner got their share from a relative and no
            written agreement controls how it is divided.
            <Cite href={src(9)} n={9} /> In those cases, before any sale:
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>
                The court determines the property&apos;s value, by the
                owners&apos; agreement, the tax appraisal, or an independent
                appraisal if someone objects.
                <Cite href={src(10)} n={10} />
              </li>
              <li>
                The other co-owners get the chance to buy out the share of the
                owner who asked for the sale, at that value.
                <Cite href={src(11)} n={11} />
              </li>
              <li>
                If the land is still to be sold, the court picks the method
                that is most economically advantageous: an open-market sale
                through a licensed broker, sealed bids, or an auction.
                <Cite href={src(12)} n={12} />
              </li>
            </ul>
          </GuideNote>
          <p>
            A 2026 amendment clarified that the heirs property act does not
            apply when land is sold to pay a decedent&apos;s debts.
            <Cite href={src(13)} n={13} /> Partition is a lawsuit, and lawsuits take
            time and legal fees. Families
            often find that seeing a realistic auction value in writing is
            enough to reach a voluntary sale without one.
          </p>
        </GuideSection>

        <GuideSection id="commercial" title="Commercial property: what buyers will ask for">
          <p>
            Commercial buyers underwrite before they bid. The more of their
            questions you can answer up front, the more of them show up and
            the harder they compete. Before an auction, gather what you have:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>Leases, rent rolls and any tenant estoppel letters</li>
            <li>Recent income and operating expenses</li>
            <li>A survey, the zoning, and any permits or code notices</li>
            <li>Environmental reports, if any were ever done</li>
            <li>Loan payoff and any liens, so the net is clear</li>
          </ul>
          <p>
            Missing documents do not stop a sale, but buyers price uncertainty.
            The licensed firm running the auction will tell you which items
            matter most for your property.
          </p>
        </GuideSection>

        <GuideSection title="What FALCO does, and what it costs">
          <p>
            We look at the property, the ownership and your timeline, tell you
            plainly whether an auction is likely to beat another listing, and
            if it is, route it to the licensed Tennessee real estate and
            auction firm best suited to sell it.
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
            { href: "/guides/selling-estate-property-tennessee", label: "Selling estate and probate property" },
            { href: "/guides/tennessee-tax-sale-delinquent-property", label: "Behind on property taxes?" },
            { href: "/situations/hard-to-sell", label: "How FALCO handles hard-to-sell property" },
            { href: "/start?s=hard-to-sell", label: "Tell us about the property" },
          ]}
        />
      </GuideShell>
    </>
  )
}
