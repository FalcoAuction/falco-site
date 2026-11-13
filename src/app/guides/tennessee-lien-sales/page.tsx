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

const SLUG = "tennessee-lien-sales"
const HEADLINE = "Lien Sales in Tennessee: Marinas, Storage, Repair Shops and Towing"
const DESCRIPTION =
  "How Tennessee lien sales work for marinas and boat storage, self-storage facilities, repair shops and towing companies: the notice and publication rules, the new Abandoned Vehicle Portal, surplus, and how the buyer gets title."

export const metadata = {
  title: "Tennessee Lien Sales: Marina, Storage, Mechanic's and Towing Liens | FALCO",
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 66-19-212 (marina and boat storage liens)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-19/part-2/section-66-19-212/" },
  { n: 2, label: "Tenn. Code Ann. § 66-14-102 (artisan lien: notice to owner)", href: "https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-14-102/" },
  { n: 3, label: "Tenn. Code Ann. § 66-14-103 (contents of the notice)", href: "https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-14-103/" },
  { n: 4, label: "Tenn. Code Ann. § 66-14-104 (sale by auction; advertisement)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-14/section-66-14-104/" },
  { n: 5, label: "Tenn. Code Ann. § 66-14-106 (surplus after sale)", href: "https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-14-106/" },
  { n: 6, label: "Tenn. Code Ann. § 66-19-101 (lien for repairs on vehicles, vessels and aircraft)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-19/part-1/section-66-19-101/" },
  { n: 7, label: "Tenn. Code Ann. § 66-19-103 (garagekeeper and towing liens)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-19/part-1/section-66-19-103/" },
  { n: 8, label: "Tennessee Department of Revenue, LIEN-12: How to Apply for a Garagekeeper's or Mechanic's Lien", href: "https://revenue.support.tn.gov/hc/en-us/articles/360060498171-LIEN-12-How-to-Apply-for-a-Garagekeeper-s-Mechanic-s-Lien" },
  { n: 9, label: "Tenn. Code Ann. § 66-31-105 (self-service storage: enforcement of the lien)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-31/section-66-31-105/" },
  { n: 10, label: "Tenn. Code Ann. Title 55, Chapter 31 (MOTION Act of 2025; unclaimed and abandoned vehicles)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/" },
  { n: 11, label: "Tenn. Code Ann. § 55-31-301 (vehicles taken into custody; notice to owners and lienholders)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/part-3/section-55-31-301/" },
  { n: 12, label: "Tenn. Code Ann. § 55-31-303 (public auction; title to buyer; surplus)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/part-3/section-55-31-303/" },
  { n: 13, label: "Tennessee Department of Revenue, Abandoned Vehicle Portal for towing companies, law enforcement and authorized users", href: "https://www.tn.gov/revenue/title-and-registration/online-services/abandoned-vehicle-portal/towing-companies--law-enforcement---authorized-users.html" },
  { n: 14, label: "Tennessee Wildlife Resources Agency, Boating Registration", href: "https://www.tn.gov/twra/boating/boating-registration.html" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "How long does a Tennessee marina have to wait before selling a boat for unpaid storage?",
    a: "Under Tennessee's marina lien statute, a marina, dock or dry storage facility can enforce its lien once its charges are three months or more past the due date in the contract. The sale then follows Tennessee's artisan lien procedure, with written notice to the owner and newspaper advertising.",
  },
  {
    q: "What notice does a Tennessee marina lien sale require?",
    a: "The statute describes three steps that together create a presumption that notice was proper: a records search (a UCC search for a personal watercraft or a U.S. Coast Guard search for a documented vessel), notice by certified mail, return receipt requested, to all known owners and interested parties, and a newspaper advertisement at least once a week for two or more consecutive weeks in the area where the sale will be held.",
  },
  {
    q: "Do self-storage auctions in Tennessee have to be advertised in the newspaper?",
    a: "No. Tennessee's self-storage law requires the sale to be advertised in a commercially reasonable manner, which is deemed met if at least three independent bidders take part. A newspaper ad once before the sale is allowed but not required, and the sale may be held online.",
  },
  {
    q: "How much time does an owner get to reclaim a towed or abandoned vehicle in Tennessee?",
    a: "Under the MOTION Act of 2025, owners and lienholders have 20 days from receiving notice to reclaim the vehicle or contest the tow. Unclaimed vehicles are then sold at public auction.",
  },
  {
    q: "How does someone who buys at a lien sale get a title?",
    a: "For vehicles, the buyer applies to the county clerk with the lien-sale paperwork, including the Department of Revenue's certification of sale form and the supporting notices and records. For vehicles sold under the abandoned vehicle law, the Department of Revenue issues title based on the sales receipt. Boats are registered, not titled, in Tennessee, through TWRA and the county clerk.",
  },
  {
    q: "What does it cost a marina, storage facility or shop to use FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. The licensed auction firm runs the sale. Your lien notices and paperwork stay your responsibility, and your attorney should confirm them.",
  },
]

export default function LienSalesGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Tennessee Lien Sales"
      />
      <GuideShell
        variant="situation"
        situation="lien-sale"
        eyebrow="Lien sale guide"
        title={
          <>
            <span className="text-[var(--mocha)]">Lien sales</span> in
            Tennessee: marinas, storage, repair shops and towing
          </>
        }
        standfirst={
          <>
            A boat nobody has paid on in a year. A storage unit gone silent.
            A truck that was repaired and never picked up. Tennessee lets the
            business holding that property sell it to recover what it is
            owed, but only if the notice rules are followed exactly. Here is
            how each kind of lien sale works, and what changed in 2025 and
            2026.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The short version">
          <p>
            A lien sale lets a business that lawfully holds someone&apos;s
            property, and is owed money for storing or working on it, sell
            that property at auction. Each type of lien has its own statute,
            and the details differ: how long you wait, how you notify the
            owner, where you advertise, and what happens to any extra money.
          </p>
          <GuideKey>
            Most lien-sale disputes are not about the debt. They are about
            notice. A sale that skips a step can be challenged, and a buyer
            who cannot get a title will not pay full price. Get the notice
            right first, then sell in front of enough bidders that nobody can
            call the price unreasonable.
          </GuideKey>
          <GuideNote label="New in 2025 and 2026">
            Tennessee&apos;s old abandoned vehicle law has been repealed and
            replaced by the MOTION Act of 2025.
            <Cite href={src(10)} n={10} /> The state&apos;s Abandoned Vehicle
            Portal went live on October 27, 2026. Starting January 25, 2027,
            towing companies, law enforcement and garagekeepers must enter
            vehicles in the portal and advertise sales there, and newspaper
            advertising of those sales ends.
            <Cite href={src(13)} n={13} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="marina" title="Marina and boat storage liens">
          <p>
            A marina, boat dock, dry dock or dry storage facility in Tennessee
            has a lien on a vessel or personal watercraft it lawfully holds,
            for its reasonable charges. It can enforce that lien once the
            charges are{" "}
            <strong className="text-[var(--ink)]">three months or more</strong>{" "}
            past the due date in the contract.
            <Cite href={src(1)} n={1} /> The statute sets no minimum dollar
            amount.
          </p>
          <GuideNote label="The three notice steps in the marina statute">
            <ol className="list-decimal ml-4 space-y-1">
              <li>
                Search the records: a UCC search for a personal watercraft, or
                a U.S. Coast Guard search for a vessel.
              </li>
              <li>
                Send notice by certified mail, return receipt requested, to
                every known owner and interested party.
              </li>
              <li>
                Advertise in a newspaper where the sale will be held, at least
                once a week for two or more consecutive weeks.
              </li>
            </ol>
            <p className="mt-2">
              Doing all three creates a presumption, which can be rebutted,
              that notice was proper.
              <Cite href={src(1)} n={1} />
            </p>
          </GuideNote>
          <p>
            The sale itself follows Tennessee&apos;s general artisan lien
            procedure, covered next.
            <Cite href={src(1)} n={1} /> Tennessee also has a separate
            court-based route for boat liens, and floating cabins have their
            own lien statute, so ask your attorney which applies before you
            start.
          </p>
        </GuideSection>

        <GuideSection id="artisan" title="The artisan lien procedure: notice, ad, auction">
          <p>
            Several Tennessee liens, including marina liens and garagekeeper
            liens, are enforced through the same artisan lien steps:
          </p>
          <GuideNote label="1. Written notice to the owner">
            Notice is delivered in person or by registered mail. For titled
            property, finding the owner includes checking the state&apos;s title
            records.
            <Cite href={src(2)} n={2} /> The notice must itemize the claim,
            describe the property, give a date to pay that is at least{" "}
            <strong className="text-[var(--ink)]">10 days</strong> after the
            notice is delivered, and state the time and place of the auction.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <GuideNote label="2. Advertising">
            The sale is advertised in a newspaper once a week for two
            consecutive weeks, and the sale must be at least{" "}
            <strong className="text-[var(--ink)]">15 days</strong> after the first
            publication. If there is no local newspaper, notices are posted in
            at least six conspicuous places at least 10 days before the sale.
            From January 25, 2027, sales of titled property are advertised on
            the state&apos;s Abandoned Vehicle Portal instead of in the newspaper.
            <Cite href={src(4)} n={4} />
          </GuideNote>
          <GuideNote label="3. Redemption and surplus">
            Anyone with an interest in the property can redeem it before the
            sale by paying the lien and the expenses. After the sale, any
            surplus is paid on demand to the person entitled to it. If no one
            claims it within 12 months, it goes to the county trustee.
            <Cite href={src(5)} n={5} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="mechanic" title="Repair shop, garagekeeper and towing liens">
          <p>
            Tennessee gives a lien for repairs and parts on any conveyance that
            travels by land, by water or through the air, which covers cars,
            trucks, boats and aircraft.
            <Cite href={src(6)} n={6} /> Garagekeepers and towing companies
            also have a lien for their charges, which can be enforced after{" "}
            <strong className="text-[var(--ink)]">30 days</strong> using the
            artisan lien procedure above. Notices and advertisements must
            include the vehicle identification number.
            <Cite href={src(7)} n={7} />
          </p>
          <GuideNote label="Two traps for shops">
            Repairs over $250 do not bind a seller or lienholder of the vehicle
            unless they authorized the work in writing, with an exception for
            licensed dealers. And there is no lien for a tow that violates the
            MOTION Act.
            <Cite href={src(7)} n={7} /> The Department of Revenue&apos;s
            garagekeeper lien instructions describe the paperwork the county
            clerk will want afterward.
            <Cite href={src(8)} n={8} /> Where its summary of advertising
            differs from the statute, follow the statute and ask your attorney.
          </GuideNote>
        </GuideSection>

        <GuideSection id="storage" title="Self-storage liens">
          <p>
            Tennessee&apos;s Self-Service Storage Facility Act gives the facility
            a lien on what is stored in a unit. The rules for selling are
            friendlier to online auctions than most liens:
            <Cite href={src(9)} n={9} />
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Default.</strong> The
              enforcement process applies once the tenant has been in default
              for 15 continuous days.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Notice.</strong> Delivered
              by hand, by verified mail or by email. It must itemize the claim,
              give at least 30 days to pay, and state that the sale will be no
              sooner than 60 days after the default.
            </li>
            <li>
              <strong className="text-[var(--ink)]">The sale.</strong> Held at
              the facility, online, or at the nearest suitable place. Advertising
              must be commercially reasonable, which the law treats as met if at
              least three independent bidders take part. A newspaper ad is
              optional.
            </li>
            <li>
              <strong className="text-[var(--ink)]">After the sale.</strong> A
              good-faith buyer takes the property free of the tenant&apos;s
              rights. Surplus is held for the tenant, and after one year goes
              to the State Treasurer as unclaimed property.
            </li>
          </ul>
          <GuideNote label="Vehicles and boats left in a unit">
            The storage law treats boats as vehicles. After 60 days unpaid, the
            facility can have the vehicle towed, or search the title or
            registration records, notify the owner and lienholders, give them
            30 days to pay, and then sell it, including at auction.
            <Cite href={src(9)} n={9} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="abandoned" title="Towed and abandoned vehicles under the MOTION Act">
          <p>
            When police or a garagekeeper take custody of an abandoned or
            unclaimed vehicle, the MOTION Act sets tight deadlines to verify
            ownership and send notice, measured in business days.
            <Cite href={src(11)} n={11} /> Owners and lienholders then have{" "}
            <strong className="text-[var(--ink)]">20 days from receiving notice</strong>{" "}
            to reclaim the vehicle or contest the tow.
            <Cite href={src(11)} n={11} />
          </p>
          <p>
            Unclaimed vehicles are sold at public auction. The buyer takes the
            vehicle free and clear of other claims and gets a title from the
            Department of Revenue based on the sales receipt. Any surplus is
            held for 60 days for the owner or lienholder.
            <Cite href={src(12)} n={12} />
          </p>
          <GuideKey>
            If you tow, store or repair vehicles, register for the Abandoned
            Vehicle Portal now. After January 25, 2027, a sale advertised the
            old way will not meet the law.
            <Cite href={src(13)} n={13} />
          </GuideKey>
        </GuideSection>

        <GuideSection id="title" title="Title after the sale">
          <p>
            A lien-sale buyer pays more when they know they can register what
            they bought. For vehicles, the buyer takes the lien-sale paperwork
            to the county clerk, including the Department of Revenue&apos;s
            certification of sale form and the notices, advertisement and
            itemized charges behind the lien.
            <Cite href={src(8)} n={8} /> Vehicles sold under the abandoned
            vehicle law are titled based on the sales receipt.
            <Cite href={src(12)} n={12} />
          </p>
          <p>
            Boats are not titled in Tennessee. They are registered through the
            Tennessee Wildlife Resources Agency, and a buyer registers through
            the county clerk with a bill of sale showing the hull
            identification number.
            <Cite href={src(14)} n={14} /> Keep a complete file of your lien
            notices so the buyer can show where the boat came from.
          </p>
        </GuideSection>

        <GuideSection id="owners" title="If your property is the one being sold">
          <p>
            If you received a lien notice, you still have options. Under the
            artisan lien procedure, anyone with an interest can redeem the
            property before the sale by paying the lien and expenses, and any
            surplus after the sale belongs to the person entitled to it.
            <Cite href={src(5)} n={5} /> Read the notice for the deadline, and
            talk to an attorney quickly if you dispute the charges.
          </p>
        </GuideSection>

        <GuideSection title="Why sell a lien asset through a licensed auction firm">
          <p>
            A lien sale only has to recover what you are owed, but a sale that
            draws real competition protects you. It answers the question of
            whether the price was reasonable, it maximizes any surplus owed
            back to the owner, and a licensed firm knows the title and
            paperwork buyers will ask for. FALCO routes boats, vehicles,
            equipment and unit contents to the licensed Tennessee auction firm
            whose buyers fit them.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. Your lien notices remain
            your responsibility, so have your attorney confirm them before the
            sale.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, boats and aircraft: titles and paperwork" },
            { href: "/guides/business-liquidation-tennessee", label: "Liquidating a closing business" },
            { href: "/situations/lien-sale", label: "How FALCO handles lien sales" },
            { href: "/start?s=lien-sale", label: "Tell us what you are holding" },
          ]}
        />
      </GuideShell>
    </>
  )
}
