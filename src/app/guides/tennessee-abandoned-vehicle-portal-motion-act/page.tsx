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

const SLUG = "tennessee-abandoned-vehicle-portal-motion-act"
const HEADLINE = "Tennessee's Abandoned Vehicle Portal and the MOTION Act"
const DESCRIPTION =
  "For Tennessee towing companies, repair shops and storage lots: the MOTION Act's ownership-check and notice deadlines, the 20-day reclaim window, storage limits, the Abandoned Vehicle Portal and the January 25, 2027 deadline, and how unclaimed vehicles are sold and titled."

const META_TITLE = "Tennessee Abandoned Vehicle Portal and MOTION Act Deadlines | FALCO"
const META_DESCRIPTION =
  DESCRIPTION

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  ...ogMeta({
    key: "guide-tennessee-abandoned-vehicle-portal-motion-act",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/tennessee-abandoned-vehicle-portal-motion-act",
  }),
}

const SOURCES = [
  { n: 1, label: "2025 Tenn. Pub. Acts ch. 457 (MOTION Act of 2025), Tenn. Code Ann. Title 55, Chapter 31", href: "https://publications.tnsosfiles.com/acts/114/pub/pc0457.pdf" },
  { n: 2, label: "Tenn. Code Ann. § 55-31-301 (custody, ownership check and notice)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/part-3/section-55-31-301/" },
  { n: 3, label: "Tenn. Code Ann. § 55-31-302 (garagekeepers: deadlines and storage charges)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/part-3/section-55-31-302/" },
  { n: 4, label: "Tenn. Code Ann. § 55-31-303 (public auction; title; surplus)", href: "https://law.justia.com/codes/tennessee/title-55/chapter-31/part-3/section-55-31-303/" },
  { n: 5, label: "Tennessee Department of Revenue, Abandoned Vehicle Portal for towing companies, law enforcement and authorized users", href: "https://www.tn.gov/revenue/title-and-registration/online-services/abandoned-vehicle-portal/towing-companies--law-enforcement---authorized-users.html" },
  { n: 6, label: "Tenn. Code Ann. § 66-19-103 (garagekeeper and towing liens)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-19/part-1/section-66-19-103/" },
  { n: 7, label: "Tenn. Code Ann. § 66-14-104 (artisan lien sale advertising)", href: "https://law.justia.com/codes/tennessee/title-66/chapter-14/section-66-14-104/" },
  { n: 8, label: "2026 Tenn. Pub. Acts ch. 661 (garagekeeper storage and repair consent)", href: "https://publications.tnsosfiles.com/acts/114/pub/pc0661.pdf" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "Under Tennessee's MOTION Act, whoever holds an unclaimed vehicle must check ownership within three business days and send notice within three more, by tracked three-day delivery. The owner and lienholders then have 20 days from receiving the notice to reclaim it. From January 25, 2027, vehicles go into the state's Abandoned Vehicle Portal and sales are advertised there, not in newspapers."

const FAQ = [
  {
    q: "When does the Tennessee Abandoned Vehicle Portal become mandatory?",
    a: "The portal went live on October 27, 2026. Starting January 25, 2027, towing companies, law enforcement and garagekeepers must use it, and sales of these vehicles are advertised on the portal instead of in newspapers.",
  },
  {
    q: "How long does an owner have to reclaim a towed vehicle in Tennessee?",
    a: "Under the MOTION Act, the owner and lienholders have 20 days after the date they receive the notice to reclaim the vehicle by paying the charges, or to appeal. Failing to reclaim it is treated as a waiver and consent to the sale.",
  },
  {
    q: "What notice does a Tennessee towing company have to send?",
    a: "The holder must verify ownership within three business days of taking custody and send notice within three business days after that, by three-day delivery, which means a national carrier with electronic tracking. The notice must be in plain language and include the vehicle's year, make, model and VIN, where it is, and the owner's right to reclaim and to appeal.",
  },
  {
    q: "What happens if a garage misses the MOTION Act notice deadlines?",
    a: "A garagekeeper that misses either the ownership-check or the notice deadline can charge no more than six days of storage.",
  },
  {
    q: "How does a buyer get a title to an abandoned vehicle sold at auction in Tennessee?",
    a: "Unclaimed vehicles are sold at public auction. The buyer takes the vehicle free and clear and is issued a title based on the sales receipt.",
  },
  {
    q: "What does it cost a towing company or garage to use FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. The licensed auction firm runs the sale. Your notices and portal entries stay your responsibility.",
  },
]

export default function MotionActGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Abandoned Vehicle Portal"
      />
      <GuideShell
        variant="situation"
        situation="lien-sale"
        answer={ANSWER}
        eyebrow="Lien sale guide"
        title="Tennessee's abandoned vehicle portal and the MOTION Act"
        standfirst={
          <>
            Tennessee rewrote the rules for towed, stored and abandoned
            vehicles in the MOTION Act of 2025, and moved the whole process
            onto a state portal. If you run a tow company, a repair shop or a
            storage lot, the deadlines are tight and the old newspaper ads
            stop counting on January 25, 2027. Here is the process, step by
            step.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The timeline, from custody to sale">
          <ol>
            <li>
              <strong>Take custody.</strong> From January 25, 2027, vehicles
              taken into custody under the Act are entered in the portal within
              one hour; garagekeepers enter the vehicles they will store for
              more than 21 days.
              <Cite href={src(2)} n={2} />
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong>Check ownership</strong> within three business days of
              taking custody.
              <Cite href={src(2)} n={2} />
            </li>
            <li>
              <strong>Send notice</strong> within three business days after
              that check, by three-day delivery: a national carrier with
              electronic tracking.
              <Cite href={src(2)} n={2} />
              <Cite href={src(1)} n={1} />
            </li>
            <li>
              <strong>Wait 20 days</strong> from the date the owner and
              lienholders receive the notice. They can reclaim the vehicle by
              paying the charges, or appeal.
              <Cite href={src(2)} n={2} />
            </li>
            <li>
              <strong>Sell at public auction</strong> if nobody reclaims it.
              <Cite href={src(4)} n={4} />
            </li>
          </ol>
          <GuideKey>
            Every step runs on a short clock, and the clock starts at custody.
            Build the portal entry, the ownership check and the tracked notice
            into your intake, not your end-of-week paperwork.
          </GuideKey>
        </GuideSection>

        <GuideSection id="notice" title="What the notice has to say">
          <p>
            The notice must be in plain language and include the
            vehicle&apos;s year, make, model and VIN, where it is being held,
            and the right to reclaim it within 20 days after receipt by paying
            the charges. It also explains the right to appeal, and that not
            reclaiming the vehicle counts as a waiver and consent to its sale.
            <Cite href={src(2)} n={2} />
          </p>
        </GuideSection>

        <GuideSection id="storage" title="Storage charges and the deadlines that cap them">
          <GuideNote label="Miss a deadline, lose storage">
            A garagekeeper that misses either the three-day ownership check or
            the three-day notice deadline can charge no more than six days of
            storage.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <GuideNote label="Long storage and rates">
            The Act also limits storage beyond 21 days without consent or
            portal notice, caps rates for non-consensual tows at the Tennessee
            Highway Patrol district maximum, and caps release fees at $100.
            <Cite href={src(1)} n={1} />
          </GuideNote>
          <GuideNote label="Repair shops holding vehicles (2026)">
            A 2026 amendment lets a garagekeeper store a vehicle without
            written authorization after a good-faith attempt to get the
            owner&apos;s consent to repairs plus notice by three-day delivery.
            The lien becomes enforceable 30 days after that notice is received.
            <Cite href={src(8)} n={8} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="portal" title="The Abandoned Vehicle Portal">
          <ul>
            <li>
              <strong>Dates:</strong> live October 27, 2026; mandatory January
              25, 2027.
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong>Who registers:</strong> towing companies, law
              enforcement, garagekeepers, and title service and salvage
              companies.
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong>Garagekeepers:</strong> enter vehicles they will charge
              storage on for more than 21 days.
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong>Advertising:</strong> from January 25, 2027, sales are
              advertised on the portal and newspaper ads no longer count. The
              same change applies to garagekeeper and artisan lien sales of
              titled vehicles.
              <Cite href={src(5)} n={5} />
              <Cite href={src(6)} n={6} />
              <Cite href={src(7)} n={7} />
            </li>
            <li>
              <strong>Fees:</strong> none at launch. The Department of Revenue
              says a per-transaction fee for non-law-enforcement users starts
              January 25, 2027. Public searches stay free.
              <Cite href={src(5)} n={5} />
            </li>
          </ul>
        </GuideSection>

        <GuideSection id="sale" title="The sale, the title and the surplus">
          <p>
            Unclaimed vehicles are sold at public auction, and a garagekeeper
            sale must be commercially reasonable. The buyer takes the vehicle
            free and clear and is issued a title based on the sales receipt.
            Any surplus is held for 60 days for the owner or lienholder, then
            goes to a special fund.
            <Cite href={src(4)} n={4} />
          </p>
          <p>
            A sale that draws real bidders protects you twice: it answers any
            question about whether the price was reasonable, and it maximizes
            the surplus owed back to the owner. FALCO routes vehicles to
            licensed Tennessee auction firms that sell them, so your yard turns
            over faster.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. Your notices and portal
            entries remain your responsibility.
          </GuideKey>
        </GuideSection>

        <GuideSection id="owners" title="If it is your vehicle that was towed">
          <p>
            Watch for a tracked notice. You have 20 days from receiving it to
            reclaim the vehicle by paying the charges, or to appeal, and not
            acting is treated as consent to the sale.
            <Cite href={src(2)} n={2} /> If a sale does happen, any surplus is
            held for 60 days for the owner or lienholder.
            <Cite href={src(4)} n={4} /> For other lien sales, including
            repair shops, marinas and storage units, see our{" "}
            <Link href="/guides/tennessee-lien-sales">lien sales guide</Link>.
          </p>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Portal fees and procedures are set by the Department of Revenue and may change. Check the portal page before January 25, 2027."
        />

        <GuideRelated
          links={[
            { href: "/guides/tennessee-lien-sales", label: "Tennessee lien sales" },
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, boats and equipment" },
            { href: "/situations/lien-sale", label: "How FALCO handles lien sales" },
            { href: "/start?s=lien-sale", label: "Tell us what you are holding" },
          ]}
        />
      </GuideShell>
    </>
  )
}
