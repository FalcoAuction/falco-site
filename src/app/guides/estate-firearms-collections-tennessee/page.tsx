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

const SLUG = "estate-firearms-collections-tennessee"
const HEADLINE = "Selling Firearms and Collections From a Tennessee Estate"
const DESCRIPTION =
  "What federal and Tennessee law allow an executor to do with inherited firearms, how NFA items are handled, who can legally buy, and how coins, art and other collections from an estate are sold."

export const metadata = {
  title: `${HEADLINE}, Legally | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "18 U.S.C. § 922 (unlawful acts, including transfers to non-residents and to prohibited persons)", href: "https://www.govinfo.gov/link/uscode/18/922?type=usc&year=mostrecent&link-type=html" },
  { n: 2, label: "27 C.F.R. § 478.30 (out-of-state disposition of firearms by non-licensees, including bequests)", href: "https://www.ecfr.gov/current/title-27/part-478/section-478.30" },
  { n: 3, label: "27 C.F.R. § 479.90a (estates holding National Firearms Act items)", href: "https://www.ecfr.gov/current/title-27/part-479/section-479.90a" },
  { n: 4, label: "Tenn. Code Ann. § 39-17-1316 (sales of firearms; dealer background checks; knowing sale to a prohibited person)", href: "https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1316/" },
  { n: 5, label: "Tenn. Code Ann. § 39-17-1307 (unlawful possession of a firearm)", href: "https://law.justia.com/codes/tennessee/title-39/chapter-17/part-13/section-39-17-1307/" },
  { n: 6, label: "18 U.S.C. § 921 (definitions, including antique firearm)", href: "https://www.law.cornell.edu/uscode/text/18/921" },
  { n: 7, label: "Tenn. Code Ann. § 30-2-303 (sale of estate personal property)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-3/section-30-2-303/" },
  { n: 8, label: "Tenn. Comp. R. & Regs. 1320-05-01-.09 (occasional and isolated sales)", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-1320-05-01-.09" },
  { n: 9, label: "Tennessee Department of Revenue, MF-17: Auctioneers Are Not Marketplace Facilitators", href: "https://revenue.support.tn.gov/hc/en-us/articles/5585962326932-MF-17-Auctioneers-are-Not-Marketplace-Facilitators" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Can an executor give a deceased person's guns to an heir who lives in another state?",
    a: "Federal law allows a transfer made to carry out a bequest, or to an heir by intestate succession, even across state lines, as long as the heir is legally allowed to own that firearm in their home state. The heir must not be a prohibited person, and NFA items such as suppressors and machine guns have their own ATF transfer process.",
  },
  {
    q: "Does Tennessee require a background check for a private gun sale?",
    a: "Tennessee requires licensed dealers to run a background check through the Tennessee Bureau of Investigation before handing over a firearm, but that requirement does not apply to an occasional sale of a used firearm by someone who is not a dealer. It is still a crime to sell a firearm to someone you know is prohibited from having one, and federal law adds 'reasonable cause to believe.'",
  },
  {
    q: "Can I sell an estate's firearm to a buyer from another state?",
    a: "Not directly. A private seller may not transfer a firearm to someone they believe lives in another state, except for bequests and inheritance. Sales to out-of-state buyers go through a licensed dealer. A dealer can sell a rifle or shotgun in person to a non-resident when the sale is legal in both states. Handguns go through a dealer in the buyer's home state.",
  },
  {
    q: "What happens to a suppressor or machine gun in an estate?",
    a: "The executor may hold registered NFA items during probate, but must apply to ATF to transfer them no later than the close of probate. Transfers to a beneficiary go on a tax-exempt Form 5. Transfers to anyone else go on a tax-paid Form 4, with proof of the executor's appointment, the death certificate and the will.",
  },
  {
    q: "Are antique guns treated differently?",
    a: "Yes. Under federal law, an 'antique firearm' includes one made in or before 1898 and certain replicas and muzzleloaders, and antiques are excluded from the federal definition of 'firearm.' Tennessee's dealer background check statute also excludes them. Value depends heavily on condition and originality, so do not clean or refinish them before an expert looks.",
  },
  {
    q: "What does it cost the estate to use FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO never takes possession of firearms. They go only to licensed auction firms that hold a federal firearms license.",
  },
]

export default function EstateFirearmsGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Estate Firearms and Collections"
      />
      <GuideShell
        variant="situation"
        situation="estate"
        answer="An executor can pass a firearm to an heir named in the will or entitled by inheritance, even in another state, if that heir may legally own it. Selling is where the risk is: never sell to someone you know or have reason to believe is prohibited, send out-of-state buyers through a licensed dealer, and transfer NFA items like suppressors only through ATF."
        eyebrow="Estate guide"
        title={
          <>
            Selling <span className="text-[var(--mocha)]">firearms and collections</span>{" "}
            from a Tennessee estate
          </>
        }
        standfirst={
          <>
            A gun safe, a coin collection, a garage full of militaria. These
            are often the most valuable things in an estate after the house,
            and the easiest to sell badly. Here is what federal and Tennessee
            law allow an executor to do, who can legally buy, and how
            collections get in front of the buyers who pay the most.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="First, slow down and secure everything">
          <p>
            Before anything is sold or handed out, three things protect the
            estate and the family:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Lock it up and list it.</strong>{" "}
              Keep firearms secured and write down the make, model and serial
              number of each one. For collections, photograph items where they
              sit and keep any receipts, certificates or letters that show
              where they came from.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Know who is allowed to hold a gun.</strong>{" "}
              Tennessee and federal law bar certain people from possessing
              firearms or ammunition, including people with certain felony
              convictions.
              <Cite href={src(5)} n={5} />
              <Cite href={src(1)} n={1} /> If anyone in the household falls
              into that group, the guns should not end up in their hands, even
              temporarily.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Do not clean, polish or sort.</strong>{" "}
              Cleaning coins, refinishing a stock or splitting up a set can
              cut the value sharply. Leave that judgment to the specialist.
            </li>
          </ul>
          <GuideKey>
            Authority still comes first. The executor or administrator, acting
            under letters from the court, is the person who can sell or
            distribute estate property. Our{" "}
            <Link href="/guides/selling-estate-property-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              estate property guide
            </Link>{" "}
            covers how that works.
          </GuideKey>
        </GuideSection>

        <GuideSection id="to-heirs" title="Passing guns to heirs, including heirs in other states">
          <p>
            Federal law generally prohibits a private person from transferring
            a firearm to someone who lives in another state. There is a
            specific exception for estates: a transfer made to carry out a
            bequest in a will, or to an heir by intestate succession, is
            allowed as long as the person receiving it may lawfully own that
            firearm in their home state.
            <Cite href={src(1)} n={1} />
            <Cite href={src(2)} n={2} />
          </p>
          <p>
            That means an executor can usually deliver a rifle to a nephew in
            Georgia the will names, without going through a dealer. Before
            shipping anything, check carrier rules and the laws of the
            heir&apos;s state, which can be stricter than Tennessee&apos;s.
          </p>
        </GuideSection>

        <GuideSection id="nfa" title="Suppressors, machine guns and other NFA items">
          <p>
            Items registered under the National Firearms Act, such as
            suppressors, machine guns and short-barreled rifles, follow their
            own process. The executor may possess them during probate, but no
            later than the close of probate must apply to ATF to transfer
            them.
            <Cite href={src(3)} n={3} />
          </p>
          <GuideNote label="How NFA transfers work from an estate">
            A transfer to a beneficiary named in the will or entitled by
            inheritance goes on ATF Form 5, which is tax-exempt. A transfer to
            anyone else, including a buyer, goes on ATF Form 4, which is a
            tax-paid transfer. The application includes proof of the
            executor&apos;s appointment, the death certificate and the will.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <p>
            If you find an NFA item and cannot find its registration paperwork,
            stop and talk to an attorney before doing anything with it.
          </p>
        </GuideSection>

        <GuideSection id="selling" title="Who can legally buy from the estate">
          <p>
            Selling is where executors get into trouble, usually by accident.
            The rules that matter most:
          </p>
          <GuideNote label="Private sales inside Tennessee">
            Tennessee requires licensed dealers to run a background check
            through the Tennessee Bureau of Investigation before delivering a
            firearm. That requirement does not apply to an occasional sale of
            a used firearm by someone who is not a dealer.
            <Cite href={src(4)} n={4} /> But selling a firearm to someone you
            know is prohibited from having one is a crime in Tennessee, and
            federal law also bars sales when you have reasonable cause to
            believe the buyer is prohibited. That federal rule covers
            ammunition too.
            <Cite href={src(4)} n={4} />
            <Cite href={src(1)} n={1} />
          </GuideNote>
          <GuideNote label="Buyers from other states">
            A private seller may not transfer a firearm to someone they
            believe lives in another state, outside the bequest and
            inheritance exception. A licensed dealer can sell a rifle or
            shotgun in person to a non-resident when the sale is legal in both
            states. Handguns for out-of-state buyers go through a licensed
            dealer in the buyer&apos;s state.
            <Cite href={src(1)} n={1} />
          </GuideNote>
          <GuideNote label="Antique firearms">
            Federal law defines an antique firearm to include one made in or
            before 1898, plus certain replicas and muzzleloaders, and excludes
            antiques from its definition of &quot;firearm.&quot;
            <Cite href={src(6)} n={6} /> Tennessee&apos;s dealer background check
            statute also excludes them.
            <Cite href={src(4)} n={4} /> They are often the most valuable pieces
            in a collection and the ones most damaged by well-meant cleaning.
          </GuideNote>
          <GuideKey>
            The cleanest way for an estate to sell firearms is through a
            licensed auction firm that holds a federal firearms license. Every
            buyer goes through the dealer&apos;s background check, out-of-state
            buyers receive their guns through a dealer where they live, and the
            estate gets a paper trail for every transfer. That is the only kind
            of firm FALCO routes firearms to.
          </GuideKey>
        </GuideSection>

        <GuideSection id="collections" title="Coins, art, memorabilia and other collections">
          <p>
            Tennessee lets a personal representative sell estate personal
            property at a public or private sale without a court order, unless
            the will says otherwise or an item was left to a specific person.
            A private sale to the executor, their immediate family or a
            business associate needs court approval or the written consent of
            everyone who shares in the rest of the estate.
            <Cite href={src(7)} n={7} />
          </p>
          <p>
            For collections, the selling question is mostly about the
            audience. A coin collection, a run of vintage guitars and a box of
            war medals each have a different set of serious buyers, and those
            buyers follow different auction houses. Selling everything to one
            local buyer, or one general auction, often leaves money on the
            table. FALCO&apos;s job is matching each collection to the licensed
            Tennessee firm whose bidders want it.
          </p>
          <GuideNote label="A note on sales tax">
            Tennessee does not tax occasional and isolated sales by someone who
            is not in the business of selling, although that exemption does
            not cover vehicles, boats or aircraft that must be registered.
            <Cite href={src(8)} n={8} /> When an auctioneer sells for a disclosed
            owner, the sale is treated as the owner&apos;s sale for sales tax
            purposes, rather than the auctioneer&apos;s.
            <Cite href={src(9)} n={9} /> Whether a particular estate auction is
            taxable depends on the facts, so ask the estate&apos;s CPA or
            attorney.
          </GuideNote>
        </GuideSection>

        <GuideSection title="What it costs, and what FALCO does">
          <p>
            We look at what the estate holds, tell you plainly what is worth a
            specialist auction and what is not, and route each piece to the
            licensed firm that sells it best. The executor sees the plan in
            writing before anyone signs.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. FALCO never takes
            possession of firearms or anything else.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/selling-estate-property-tennessee", label: "Selling estate and probate property" },
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, boats and equipment" },
            { href: "/situations/estate", label: "How FALCO handles estates" },
            { href: "/start?s=estate", label: "Tell us about the estate" },
          ]}
        />
      </GuideShell>
    </>
  )
}
