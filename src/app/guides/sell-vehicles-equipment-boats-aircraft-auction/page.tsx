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

const SLUG = "sell-vehicles-equipment-boats-aircraft-auction"
const HEADLINE = "Selling Vehicles, Equipment, Boats and Aircraft at Auction in Tennessee"
const DESCRIPTION =
  "What you need to sell a vehicle, piece of equipment, boat or aircraft at auction in Tennessee: titles and registration, odometer rules, liens and UCC filings, FAA paperwork, sales tax, and how licensed auction firms run the sale."

export const metadata = {
  title: `${HEADLINE} | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tennessee Department of Revenue, Sales and Use Tax Guide for Motor Vehicles and Boats", href: "https://www.tn.gov/content/dam/tn/revenue/documents/taxguides/salestaxguideautoboats.pdf" },
  { n: 2, label: "49 C.F.R. § 580.17 (odometer disclosure exemptions)", href: "https://www.ecfr.gov/current/title-49/part-580/section-580.17" },
  { n: 3, label: "Tenn. Code Ann. § 55-4-118 (registration plates on transfer of ownership)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-4/part-1/section-55-4-118/" },
  { n: 4, label: "Tennessee Wildlife Resources Agency, Boating Registration", href: "https://www.tn.gov/twra/boating/boating-registration.html" },
  { n: 5, label: "Federal Aviation Administration, Register an Aircraft", href: "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/register_aircraft" },
  { n: 6, label: "Federal Aviation Administration, AC Form 8050-2 Aircraft Bill of Sale", href: "https://www.faa.gov/forms/index.cfm/go/document.information/documentid/186163" },
  { n: 7, label: "14 C.F.R. § 49.17 (recording conveyances of aircraft)", href: "https://www.ecfr.gov/current/title-14/part-49/section-49.17" },
  { n: 8, label: "Tennessee Department of Revenue, Aircraft-2: How to Register Aircraft in Tennessee", href: "https://revenue.support.tn.gov/hc/en-us/articles/360059301712-Aircraft-2-How-to-Register-Aircraft-in-Tennessee" },
  { n: 9, label: "Tennessee Department of Transportation, Aeronautics: Aircraft and Helicopter Tax and Transfer", href: "https://www.tn.gov/tdot/aeronautics/tennessee-aircraft-helicopter-tax-and-transfer-.html" },
  { n: 10, label: "Tenn. Code Ann. § 47-9-501 (where UCC financing statements are filed)", href: "https://law.justia.com/codes/tennessee/title-47/chapter-9/part-5/section-47-9-501/" },
  { n: 11, label: "Tennessee Secretary of State, UCC filings and search", href: "https://sos.tn.gov/business-services/ucc" },
  { n: 12, label: "Tenn. Comp. R. & Regs. 1320-05-01-.09 (occasional and isolated sales)", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-1320-05-01-.09" },
  { n: 13, label: "Tenn. Code Ann. § 62-19-102 (auctioneer licensing; public automobile auctioneers)", href: "https://law.justia.com/codes/tennessee/title-62/chapter-19/section-62-19-102/" },
  { n: 14, label: "Tenn. Code Ann. § 55-17-109 (motor vehicle dealer and automobile auction licensing)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-17/part-1/section-55-17-109/" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Are boats titled in Tennessee?",
    a: "No. Tennessee does not title boats. Motorized boats are registered through the Tennessee Wildlife Resources Agency, and a buyer registers a boat at the county clerk with a bill of sale that includes the hull identification number, the price and both parties' information.",
  },
  {
    q: "Do I need an odometer disclosure when I sell a vehicle at auction?",
    a: "Under federal rules, vehicles from model year 2011 and newer need an odometer disclosure until they are 20 years old. Vehicles from model year 2010 and older, vehicles over 16,000 pounds gross vehicle weight, and vehicles that are not self-propelled are exempt.",
  },
  {
    q: "Do I keep my license plate when I sell a car in Tennessee?",
    a: "Yes. Under Tennessee law, when a vehicle changes hands the registration expires and the owner removes the plate. You may be able to transfer it to another vehicle you own.",
  },
  {
    q: "How is an aircraft sale handled in Tennessee?",
    a: "Ownership is recorded federally. The buyer files an Aircraft Registration Application (AC Form 8050-1) with evidence of ownership, usually the Aircraft Bill of Sale (AC Form 8050-2), with the FAA Aircraft Registry. Tennessee does not register aircraft, but it requires an affidavit of transfer to the Department of Revenue on a sale, and sales or use tax applies.",
  },
  {
    q: "How do I find out if there is a lien on equipment I want to sell?",
    a: "Liens on equipment are usually recorded as UCC financing statements filed with the Tennessee Secretary of State, which has a public search. For titled vehicles, the lienholder is shown on the title. Any lien has to be paid off or released at the sale, which is normally done from the proceeds.",
  },
  {
    q: "What does it cost to sell through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy or take possession of anything. Licensed Tennessee auction firms run every sale.",
  },
]

export default function VehiclesEquipmentGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Vehicles, Equipment, Boats and Aircraft"
      />
      <GuideShell
        variant="situation"
        situation="business-closing"
        eyebrow="Asset guide"
        title={
          <>
            Selling <span className="text-[var(--mocha)]">vehicles, equipment, boats and aircraft</span>{" "}
            at auction in Tennessee
          </>
        }
        standfirst={
          <>
            A work truck from a closing business, a skid steer, a bass boat
            from an estate, a small plane in a hangar. Each one has its own
            paperwork, and the paperwork decides how fast it sells and how
            much buyers will pay. Here is what Tennessee and federal rules
            require for each, and how to get them in front of serious buyers.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="Before anything: who can sign, and what is owed">
          <p>
            Every one of these sales starts with two questions. First, who has
            the authority to sell? That is the owner on the title or
            registration, or someone with legal authority for them, such as an
            executor, a company officer, a bankruptcy trustee or a lienholder
            enforcing a lien. Second, is anything owed against it? A loan, a
            UCC filing or a lien has to be paid off or released at the sale,
            usually from the proceeds.
          </p>
          <GuideKey>
            Gather the title or registration, any loan payoff, the keys,
            manuals and maintenance records before the auction firm lists the
            item. Missing paperwork does not always stop a sale, but buyers
            discount anything they cannot verify.
          </GuideKey>
          <p>
            Selling for an estate? See{" "}
            <Link href="/guides/selling-estate-property-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              selling estate property
            </Link>{" "}
            for how vehicles titled to someone who died are transferred. For a
            closing business, see{" "}
            <Link href="/guides/business-liquidation-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              liquidating a closing business
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="vehicles" title="Cars, trucks and trailers">
          <p>
            Titled vehicles transfer by assigning the title from the seller to
            the buyer. The buyer then titles and registers the vehicle at the
            county clerk, which is also where Tennessee collects sales tax on a
            used vehicle bought from someone who is not a dealer.
            <Cite href={src(1)} n={1} />
          </p>
          <GuideNote label="Odometer disclosure">
            Federal rules require an odometer disclosure on transfer for
            vehicles from model year 2011 and newer, until they are 20 years
            old. Vehicles from model year 2010 and older, vehicles over 16,000
            pounds gross vehicle weight rating, and vehicles that are not
            self-propelled are exempt.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="License plates">
            When a vehicle changes owners in Tennessee, its registration
            expires and the owner removes the plate.
            <Cite href={src(3)} n={3} /> Take the plates off before the vehicle
            leaves your hands.
          </GuideNote>
          <GuideNote label="Who can auction vehicles">
            Tennessee requires anyone acting as a public automobile auctioneer
            to hold both an auctioneer license and a motor vehicle dealer
            license, and separately licenses automobile auctions through the
            Motor Vehicle Commission.
            <Cite href={src(13)} n={13} />
            <Cite href={src(14)} n={14} /> FALCO only routes vehicles to firms
            licensed for the kind of sale they run.
          </GuideNote>
        </GuideSection>

        <GuideSection id="equipment" title="Heavy equipment, farm machinery and tools">
          <p>
            Equipment buyers are often contractors, farmers and dealers who buy
            nationally and bid online, so the right auction can reach far past
            your county. The key paperwork question for equipment is liens.
          </p>
          <GuideNote label="Check for UCC filings">
            Lenders and equipment finance companies usually record their
            interest in equipment by filing a UCC financing statement with the
            Tennessee Secretary of State.
            <Cite href={src(10)} n={10} /> The Secretary of State offers a
            public UCC search.
            <Cite href={src(11)} n={11} /> If a filing covers the equipment, the
            lender needs to be paid or agree to release it at the sale.
          </GuideNote>
          <p>
            Keep serial numbers, hour meter readings, service records and a
            short note on any known problems. Honest condition information
            draws more bidders, not fewer, because buyers who trust the
            description bid closer to their real number.
          </p>
        </GuideSection>

        <GuideSection id="boats" title="Boats and personal watercraft">
          <p>
            Boats are not titled in Tennessee. Motorized boats are registered
            through the Tennessee Wildlife Resources Agency.
            <Cite href={src(4)} n={4} />
          </p>
          <GuideNote label="What a boat buyer needs from you">
            A bill of sale with the date, price, year, make, model and hull
            identification number (HIN), plus the names, addresses, phone
            numbers and signatures of both buyer and seller. The buyer takes it
            to the county clerk, which collects the tax and issues a temporary
            registration. Boats built after 1972 should carry a HIN.
            <Cite href={src(4)} n={4} />
          </GuideNote>
          <p>
            Boats also come with trailers that have their own paperwork,
            engines with their own serial numbers, and sometimes a
            marina storage bill. If a marina is owed money, that has to be
            settled before the boat can move; see our{" "}
            <Link href="/guides/tennessee-lien-sales" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              lien sales guide
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="aircraft" title="Aircraft">
          <p>
            Aircraft ownership is recorded federally, with the FAA Aircraft
            Registry. To register an aircraft, the buyer files an Aircraft
            Registration Application (AC Form 8050-1) with evidence of
            ownership and the registration fee.
            <Cite href={src(5)} n={5} /> The usual evidence of ownership is the
            FAA&apos;s Aircraft Bill of Sale, AC Form 8050-2.
            <Cite href={src(6)} n={6} />
          </p>
          <GuideNote label="Liens on aircraft">
            Mortgages, security agreements and other liens on aircraft are
            recorded with the FAA as conveyances. Whether a lien is valid is
            governed by state law.
            <Cite href={src(7)} n={7} /> A title search of the FAA records is a
            standard step before any aircraft sale.
          </GuideNote>
          <GuideNote label="The Tennessee side">
            Tennessee does not register aircraft, but on a sale it requires an
            affidavit of transfer filed with the Department of Revenue, and
            sales or use tax applies.
            <Cite href={src(8)} n={8} />
            <Cite href={src(9)} n={9} />
          </GuideNote>
          <p>
            Logbooks drive aircraft value. Keep the airframe, engine and
            propeller logs together and with the aircraft. A plane with
            complete logs and a recent annual inspection reaches a much wider
            group of buyers than one with gaps.
          </p>
        </GuideSection>

        <GuideSection id="tax" title="Sales tax: who pays it">
          <p>
            Tennessee exempts many one-time sales by people who are not in the
            business of selling, but that exemption does not cover vehicles,
            boats or aircraft that must be registered.
            <Cite href={src(12)} n={12} /> In practice, the buyer pays the tax
            when they title or register the vehicle or boat at the county
            clerk.
            <Cite href={src(1)} n={1} /> Business equipment can raise its own
            sales tax questions, so a closing business should ask its CPA.
          </p>
        </GuideSection>

        <GuideSection id="auction" title="Why the right auction firm matters">
          <p>
            A dump truck, a pontoon boat and a vintage Cessna each have their
            own buyers, and those buyers follow different auction houses. The
            best-run general auction in your county may not be where the
            serious bidders for your asset are looking. FALCO matches each
            asset to the licensed Tennessee firm whose buyers want it, and the
            firm handles the listing, the bidding and the paperwork at the end.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. FALCO never takes
            possession of anything.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Tax rates and fees change. Confirm current amounts with your county clerk, TWRA or the FAA before you sell."
        />

        <GuideRelated
          links={[
            { href: "/guides/business-liquidation-tennessee", label: "Liquidating a closing business" },
            { href: "/guides/tennessee-lien-sales", label: "Tennessee lien sales" },
            { href: "/guides/estate-firearms-collections-tennessee", label: "Estate firearms and collections" },
            { href: "/start", label: "Tell us what you have" },
          ]}
        />
      </GuideShell>
    </>
  )
}
