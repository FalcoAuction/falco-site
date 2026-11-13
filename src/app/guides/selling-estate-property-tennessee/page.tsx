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

const SLUG = "selling-estate-property-tennessee"
const HEADLINE = "Selling Estate and Probate Property in Tennessee"
const DESCRIPTION =
  "How estate property gets sold in Tennessee: the executor's authority, when a court has to approve a sale, the creditor period, heirs who disagree, and selling the house alongside the vehicles, firearms and collections."

const META_TITLE = `${HEADLINE} | FALCO`
const META_DESCRIPTION =
  DESCRIPTION

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  ...ogMeta({
    key: "guide-selling-estate-property-tennessee",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/selling-estate-property-tennessee",
  }),
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 16-16-201 (probate jurisdiction of chancery court; clerk and master grants letters)", href: "https://law.justia.com/codes/tennessee/title-16/chapter-16/part-2/section-16-16-201/" },
  { n: 2, label: "Tenn. Code Ann. § 31-2-103 (real property passes to heirs or devisees)", href: "https://law.justia.com/codes/tennessee/title-31/chapter-2/section-31-2-103/" },
  { n: 3, label: "Tenn. Code Ann. § 35-50-110 (fiduciary powers, including power of sale)", href: "https://law.justia.com/codes/tennessee/title-35/chapter-50/section-35-50-110/" },
  { n: 4, label: "Tenn. Code Ann. § 30-2-418 (court-ordered sale of real property)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-4/section-30-2-418/" },
  { n: 5, label: "Tenn. Code Ann. § 30-2-402 (petition to sell real estate to pay debts)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-402/" },
  { n: 6, label: "Tenn. Code Ann. § 30-2-303 (sale of personal property by the personal representative)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-3/section-30-2-303/" },
  { n: 7, label: "Tenn. Code Ann. § 30-2-306 (notice to creditors)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-306/" },
  { n: 8, label: "Tenn. Code Ann. § 30-2-307 (filing claims; closing before twelve months)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-3/section-30-2-307/" },
  { n: 9, label: "Tenn. Code Ann. § 30-2-301 (inventory; notice to beneficiaries)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-3/section-30-2-301/" },
  { n: 10, label: "Tenn. Code Ann. § 30-4-103 (small estates; limited letters)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-4/section-30-4-103/" },
  { n: 11, label: "Tennessee Department of Revenue, GI-4: Inherited Vehicle Title and Registration Process", href: "https://revenue.support.tn.gov/hc/en-us/articles/360060413731-GI-4-Inherited-Vehicle-Title-Registration-Process" },
  { n: 12, label: "Tennessee Department of Revenue, Affidavit of Inheritance (RV-F1310501)", href: "https://www.tn.gov/content/dam/tn/revenue/documents/forms/titlereg/f1310501Fill-in.pdf" },
  { n: 13, label: "Tennessee Department of Revenue, GI-3: Changing Title and Registration to a Surviving Spouse", href: "https://revenue.support.tn.gov/hc/en-us/articles/360060413451-GI-3-How-to-Change-Title-and-Registration-to-Surviving-Spouse-s-Name" },
  { n: 14, label: "Tenn. Code Ann. § 30-2-712 (recorded affidavit of heirship)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-712/" },
  { n: 15, label: "Tenn. Code Ann. § 29-27-201 (partition sale)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-201/" },
  { n: 16, label: "Tenn. Code Ann. § 62-19-102 (auctions of real property require auctioneer and broker licenses)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-102/" },
  { n: 17, label: "Tenn. Code Ann. § 62-19-112 (written contract and escrow of auction proceeds)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-112/" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Can the executor sell the house without going to court in Tennessee?",
    a: "Sometimes. Real estate passes to the heirs or the people named in the will at death, so the executor only controls it if the will says so or a court orders a sale. If the will gives the executor a power of sale, the executor can usually sell without a court order. If it does not, either the people who inherited the house sign the deed together, or the executor asks the court for permission, which is typically done when the estate's other assets cannot cover its debts. An estate attorney can tell you which path fits your will.",
  },
  {
    q: "Does the executor need court approval to sell furniture, vehicles or collections?",
    a: "Generally no. Tennessee lets a personal representative sell the estate's personal property at a public or private sale without a court order, unless the will says otherwise or the item was left to someone specific. The big exception is a private sale to the executor, a relative of the executor, or a business associate, which needs court approval or the written consent of everyone who shares in what is left of the estate.",
  },
  {
    q: "How long do creditors have to file claims against a Tennessee estate?",
    a: "Creditors must file by the earlier of two dates: four months from the first publication of the notice to creditors (or 60 days after a creditor actually received a mailed notice, if that came late), or twelve months from the date of death.",
  },
  {
    q: "Can we sell estate property before the creditor period ends?",
    a: "Selling is usually allowed once the executor has authority. What waits is distributing the money to heirs. Proceeds go into the estate account, creditors are paid, and the remainder is distributed when the court allows it. Ask your estate attorney before distributing anything.",
  },
  {
    q: "What if the heirs cannot agree on whether to sell the house?",
    a: "Start by putting everyone in front of the same numbers. If co-owners of inherited land still cannot agree, any one of them can ask a Tennessee court to divide the property or order it sold. Tennessee also has a heirs' property law that adds protections when family members inherit land together. That is a court process, so it runs through an attorney.",
  },
  {
    q: "What does it cost the estate to use FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy, list or sell anything itself. Licensed Tennessee auction firms run every sale, and a licensed real estate firm handles any real estate.",
  },
]

export default function EstatePropertyGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Selling Estate Property"
      />
      <GuideShell
        variant="situation"
        situation="estate"
        answer="Nobody can sell estate property until a court issues letters to the executor or administrator. In Tennessee the house passes straight to the heirs or the people named in the will, so it is sold under a power of sale in the will, by all the heirs signing together, or by court order. Vehicles, guns and collections can usually be sold by the personal representative without a court order."
        eyebrow="Estate guide"
        title={
          <>
            Selling <span className="text-[var(--mocha)]">estate and probate</span>{" "}
            property in Tennessee
          </>
        }
        standfirst={
          <>
            When someone dies, the house, the truck, the guns and the
            collections all need a plan. Tennessee treats each of them a
            little differently. Here is who has the authority to sell, when a
            court has to sign off, how long the process takes, and how to get
            every asset in front of buyers who compete for it.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="Step one: nobody sells anything without authority">
          <p>
            An estate is settled by a{" "}
            <strong className="text-[var(--ink)]">personal representative</strong>.
            If there is a will, that is the executor named in it. If there is
            no will, the court appoints an administrator, usually a close
            family member. Either way, the authority comes from a court order
            called <strong className="text-[var(--ink)]">letters</strong>:
            letters testamentary for an executor, letters of administration
            for an administrator.
          </p>
          <p>
            In most Tennessee counties, probate is handled by the chancery
            court, and the clerk and master issues the letters. A few counties
            route probate to a different court under local law, so check with
            the clerk in the county where the person lived.
            <Cite href={src(1)} n={1} />
          </p>
          <GuideKey>
            Until letters are issued, no one has the power to sign for the
            estate. Buyers, title companies, the county clerk and every
            licensed auction firm will ask to see them. Getting letters is the
            first real step, and it is usually done with an estate attorney.
          </GuideKey>
        </GuideSection>

        <GuideSection id="the-house" title="The house works differently from everything else">
          <p>
            This is the part that surprises families. In Tennessee, real
            estate does not automatically go into the estate. At the moment of
            death it passes to the heirs (if there is no will) or to the people
            the will names, unless the will says the real estate should be
            handled as part of the estate. The personal representative takes
            charge of the personal property, and can only reach the real
            estate in limited situations, such as when the other assets cannot
            pay the estate&apos;s debts.
            <Cite href={src(2)} n={2} />
          </p>
          <p>That leaves three common ways the house gets sold:</p>
          <GuideNote label="1. The will gives the executor a power of sale">
            Many wills say the executor may sell real estate, either in their
            own words or by adopting the list of fiduciary powers in Tennessee
            law, which includes selling real or personal property at a public
            or private sale. When the will grants that power, the executor can
            usually sell without a separate court order.
            <Cite href={src(3)} n={3} /> Those statutory powers only apply if
            the will actually brings them in, so read the will closely or
            have the estate attorney confirm it.
          </GuideNote>
          <GuideNote label="2. The people who inherited it sell it together">
            Because title passed to the heirs or the people named in the will,
            they can generally sell the house themselves by all signing the
            deed. When several siblings share a house, that means every one of
            them has to agree and sign. A title company will want to see how
            heirship was established, which often means a probated will or a
            recorded affidavit of heirship.
            <Cite href={src(14)} n={14} />
          </GuideNote>
          <GuideNote label="3. The court orders a sale">
            When there is no will, or the will gives no power of sale, and the
            estate&apos;s personal property is not enough to pay its debts,
            expenses and taxes, the personal representative can ask the court
            to order the real estate sold. The heirs and surviving spouse get
            notice and a hearing, and the court considers an appraisal before
            approving a public or private sale.
            <Cite href={src(4)} n={4} />
            <Cite href={src(5)} n={5} />
          </GuideNote>
          <p>
            Which of these fits your family depends on the will, the debts and
            whether the heirs agree. That is a question for the estate&apos;s
            attorney, and it is worth asking early, because it decides who
            signs the listing or auction agreement and who signs at closing.
          </p>
        </GuideSection>

        <GuideSection id="personal-property" title="Vehicles, guns, collections and contents">
          <p>
            Personal property is simpler. Tennessee lets a personal
            representative sell the estate&apos;s personal property at a
            public or private sale without a court order, unless the will
            limits that power or the item was left to a specific person. The
            personal representative can hire someone to run the sale, such as
            an auctioneer, and the reasonable cost of the sale is an estate
            expense.
            <Cite href={src(6)} n={6} />
          </p>
          <GuideKey>
            One rule matters a lot in families: a private sale to the
            executor, the executor&apos;s immediate family or a business
            associate needs either court approval or the written consent of
            everyone who shares in what is left of the estate.
            <Cite href={src(6)} n={6} /> A public auction with open bidding
            avoids the appearance that anyone got a sweetheart deal, because
            the price is set by buyers competing in public.
          </GuideKey>
          <p>
            Some assets have their own paperwork. Vehicles need a title
            transfer (covered below). Firearms have federal and state rules
            that are worth reading before anything changes hands; see{" "}
            <Link href="/guides/estate-firearms-collections-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              selling firearms and collections from an estate
            </Link>
            . Boats, trailers, equipment and aircraft are covered in{" "}
            <Link href="/guides/sell-vehicles-equipment-boats-aircraft-auction" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              selling vehicles, equipment, boats and aircraft
            </Link>
            .
          </p>
          <p>
            Ordinary furniture and household goods rarely justify a
            specialist auction. An estate-sale company or a donation pickup
            is usually the better fit for those, and we will tell you so.
          </p>
        </GuideSection>

        <GuideSection id="vehicles" title="Selling a vehicle titled to someone who died">
          <p>
            The Tennessee Department of Revenue lays out three paths,
            depending on the family&apos;s situation:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">There is an executor or administrator.</strong>{" "}
              The personal representative signs the title as seller and
              provides the probated will or the letters to the county clerk.
              <Cite href={src(11)} n={11} />
            </li>
            <li>
              <strong className="text-[var(--ink)]">No will, no estate opened, no surviving spouse.</strong>{" "}
              All of the heirs sign an Affidavit of Inheritance (form
              RV-F1310501), stating that the person left no estate that
              needed administration and no letters were issued. In that
              situation a vehicle can be transferred without opening an
              estate.
              <Cite href={src(12)} n={12} />
            </li>
            <li>
              <strong className="text-[var(--ink)]">There is a surviving spouse.</strong>{" "}
              The spouse can have the title and registration changed into
              their own name, at no cost within the first year after the
              death.
              <Cite href={src(13)} n={13} />
            </li>
          </ul>
          <p>
            Once the right person can sign the title, a vehicle can be sold
            like any other, and a licensed auction firm that sells vehicles
            will handle the title paperwork with the buyer.
          </p>
        </GuideSection>

        <GuideSection id="timeline" title="The timeline, and what can happen when">
          <p>
            Tennessee does not set one fixed length for an estate. What it
            sets are a handful of deadlines that shape when money can move:
          </p>
          <GuideNote label="Notice to creditors">
            Within 30 days after letters are issued, the clerk publishes
            a notice to creditors for two consecutive weeks.
            The personal representative must also mail notice to creditors
            they know about.
            <Cite href={src(7)} n={7} />
          </GuideNote>
          <GuideNote label="The claim deadline">
            Creditors must file by the earlier of: four months from the first
            publication (or 60 days after a creditor received a mailed notice
            that arrived late), or twelve months from the date of death.
            <Cite href={src(7)} n={7} />
            <Cite href={src(8)} n={8} />
          </GuideNote>
          <GuideNote label="Inventory">
            The personal representative files an inventory of the estate
            within 60 days. For an estate that can pay its debts, the will or
            all of the people who share in the remainder can waive it, unless
            one of them asks for it.
            <Cite href={src(9)} n={9} />
          </GuideNote>
          <GuideNote label="Closing">
            The court can allow final distribution and close the estate before
            twelve months from the date of death. If it does, a creditor who
            shows up later looks to the people who received distributions,
            not to the personal representative.
            <Cite href={src(8)} n={8} />
          </GuideNote>
          <GuideKey>
            Selling and distributing are different things. Once the personal
            representative has authority, assets can usually be sold and the
            money held in the estate account. Distribution to heirs waits for
            the creditor period and the court. Selling early often protects
            value: vacant houses, idle vehicles and stored boats lose value
            and cost money every month they sit.
          </GuideKey>
        </GuideSection>

        <GuideSection id="small-estates" title="Small estates: limited letters, not real estate">
          <p>
            For estates with personal property worth $50,000 or less,
            Tennessee offers a simpler small-estate process. Since 2023 it
            works through <strong className="text-[var(--ink)]">limited letters</strong>{" "}
            rather than the older affidavit. Heirs can generally file 45 days
            after the death, no notice to creditors is published, and the
            limited letters stay open for one year.
            <Cite href={src(10)} n={10} />
          </p>
          <p>
            The small-estate process covers personal property only. It gives
            no authority over real estate, so if the house is part of the
            picture, one of the paths above still applies.
          </p>
        </GuideSection>

        <GuideSection id="heirs" title="When the heirs do not agree">
          <p>
            Most estate fights are really about two questions: what is it
            worth, and is someone getting a better deal than everyone else?
            The fastest way to calm both is to put the same written numbers in
            front of every heir and sell in the open, where buyers set the
            price by bidding against each other.
          </p>
          <p>
            When family members end up co-owning inherited land and cannot
            agree, any co-owner can ask a Tennessee court to divide the
            property, and the court can order it sold if it cannot be fairly
            divided or a sale is clearly better for the owners.
            <Cite href={src(15)} n={15} /> Tennessee has also adopted a heirs&apos;
            property law that adds protections when relatives inherit land
            together. Both are court processes run through an attorney; our
            guide to{" "}
            <Link href="/guides/land-commercial-property-wont-sell" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              land and property with multiple owners
            </Link>{" "}
            explains them in more depth.
          </p>
        </GuideSection>

        <GuideSection id="auction" title="How an estate auction actually runs">
          <p>
            An estate rarely has just one kind of asset, and no single
            auctioneer is the best seller of all of them. A firm that gets top
            dollar for farmland is not necessarily the one gun collectors
            follow. FALCO looks at what the estate holds and routes each piece
            to the licensed Tennessee firm that sells that kind of asset best.
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Real estate</strong> is
              sold by a licensed real estate firm. In Tennessee, conducting an
              auction of real property requires both an auctioneer license and
              a real estate broker or affiliate broker license.
              <Cite href={src(16)} n={16} />
            </li>
            <li>
              <strong className="text-[var(--ink)]">A written contract comes first.</strong>{" "}
              Tennessee auctioneers must have a written contract with the
              seller before the sale, and must hold auction proceeds in an
              escrow or trust account rather than mixing them with their own
              money.
              <Cite href={src(17)} n={17} />
            </li>
            <li>
              <strong className="text-[var(--ink)]">Proceeds go to the estate,</strong>{" "}
              with a written record of what each item sold for. That record is
              exactly what an executor wants when it is time to account to the
              court and the heirs.
            </li>
          </ul>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. FALCO never buys,
            lists or takes possession of anything.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/estate-firearms-collections-tennessee", label: "Selling firearms and collections from an estate" },
            { href: "/guides/land-commercial-property-wont-sell", label: "Land with multiple owners" },
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, boats and equipment" },
            { href: "/start?s=estate", label: "Tell us about the estate" },
          ]}
        />
      </GuideShell>
    </>
  )
}
