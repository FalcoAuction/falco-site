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

const SLUG = "business-liquidation-tennessee"
const HEADLINE = "Liquidating a Closing Business in Tennessee"
const DESCRIPTION =
  "How to close and liquidate a Tennessee business: federal WARN and Tennessee layoff notices, final paychecks, secured lenders and UCC liens, the sales tax clearance buyers ask for, dissolving the entity, and selling equipment, fleet, inventory and real estate at auction."

export const metadata = {
  title: `${HEADLINE} | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "29 U.S.C. § 2101 (WARN Act definitions: employer, plant closing, mass layoff)", href: "https://www.law.cornell.edu/uscode/text/29/2101" },
  { n: 2, label: "29 U.S.C. § 2102 (WARN Act: 60 days' notice)", href: "https://www.law.cornell.edu/uscode/text/29/2102" },
  { n: 3, label: "20 C.F.R. § 639.6 (who must receive WARN notice)", href: "https://www.law.cornell.edu/cfr/text/20/639.6" },
  { n: 4, label: "Tennessee Department of Labor and Workforce Development, WARN Technical Assistance Guide (Tenn. Code Ann. §§ 50-1-601 to -604)", href: "https://www.tn.gov/content/dam/tn/workforce/documents/employers/WARN_Technical_Assistance_Guide.pdf" },
  { n: 5, label: "Tennessee Department of Labor and Workforce Development, WARN Notices", href: "https://www.tn.gov/workforce/employers/staffing-redirect/layoffs---unemployment/warn-notices.html" },
  { n: 6, label: "Tennessee Department of Labor and Workforce Development, Wages and Breaks (Tenn. Code Ann. § 50-2-103)", href: "https://www.tn.gov/workforce/employees/labor-laws/labor-laws-redirect/wages-breaks.html" },
  { n: 7, label: "Tenn. Code Ann. § 47-9-610 (disposition of collateral after default)", href: "https://codes.findlaw.com/tn/title-47-commercial-instruments-and-transactions/tn-code-sect-47-9-610/" },
  { n: 8, label: "Tenn. Code Ann. § 47-9-611 (notification before disposition)", href: "https://codes.findlaw.com/tn/title-47-commercial-instruments-and-transactions/tn-code-sect-47-9-611/" },
  { n: 9, label: "Tenn. Code Ann. § 47-9-612 (timeliness of notification)", href: "https://codes.findlaw.com/tn/title-47-commercial-instruments-and-transactions/tn-code-sect-47-9-612/" },
  { n: 10, label: "Tenn. Code Ann. § 47-9-615 (application of proceeds; surplus and deficiency)", href: "https://codes.findlaw.com/tn/title-47-commercial-instruments-and-transactions/tn-code-sect-47-9-615/" },
  { n: 11, label: "Tennessee Secretary of State, UCC search", href: "https://tnbear.tn.gov/UCC/Ecommerce/UCCSearch.aspx" },
  { n: 12, label: "Tenn. Code Ann. § 67-6-513 (sale of a business: final return; buyer withholding)", href: "https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-6-513/" },
  { n: 13, label: "Tennessee Department of Revenue, Close Your Business", href: "https://www.tn.gov/revenue/for-businesses/close-your-business.html" },
  { n: 14, label: "Tennessee Department of Revenue, Letter Ruling 00-47 (occasional and isolated sales of business equipment)", href: "https://www.tn.gov/content/dam/tn/revenue/documents/rulings/sales/00-47.pdf" },
  { n: 15, label: "Tenn. Code Ann. § 48-249-609 (LLC notice of dissolution)", href: "https://codes.findlaw.com/tn/title-48-corporations-and-associations/tn-code-sect-48-249-609/" },
  { n: 16, label: "Tenn. Code Ann. § 48-249-612 (LLC articles of termination; tax clearance)", href: "https://codes.findlaw.com/tn/title-48-corporations-and-associations/tn-code-sect-48-249-612/" },
  { n: 17, label: "Tenn. Code Ann. § 48-24-103 (corporation articles of dissolution)", href: "https://codes.findlaw.com/tn/title-48-corporations-and-associations/tn-code-sect-48-24-103/" },
  { n: 18, label: "Tenn. Code Ann. § 62-19-102 (auctions of real property require auctioneer and broker licenses)", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-102/" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Does the WARN Act apply to my Tennessee business?",
    a: "The federal WARN Act generally applies to employers with 100 or more employees, not counting part-time employees. It requires 60 days' written notice before a plant closing or mass layoff. Tennessee has its own plant closing law for employers with 50 to 99 full-time employees at a Tennessee workplace, which requires notice to the Commissioner of Labor at the same time employees are notified.",
  },
  {
    q: "When is a final paycheck due in Tennessee?",
    a: "Under Tennessee law, an employee who quits or is discharged must be paid in full no later than the next regular payday or 21 days after separation, whichever is later.",
  },
  {
    q: "Can I sell business equipment that a bank has a lien on?",
    a: "Yes, but the lender has to be paid or agree to release its lien, which is normally done from the sale proceeds. Check the Tennessee Secretary of State's UCC records to see which lenders have filed against your equipment, and talk to them before the sale. A sale the lender has agreed to usually goes better for everyone than a repossession.",
  },
  {
    q: "What happens with sales tax when a Tennessee business sells its assets?",
    a: "Under Tennessee law, a business that sells out must file a final sales tax return within 15 days, and the buyer must hold back enough of the price to cover any unpaid sales tax until the seller shows a receipt or certificate from the Department of Revenue. A buyer who does not can become personally liable. Whether the liquidation sale itself is taxable depends on what is sold, so ask your CPA.",
  },
  {
    q: "How do I dissolve an LLC in Tennessee?",
    a: "An LLC files a notice of dissolution with the Secretary of State, winds up its affairs, and then files articles of termination. The Secretary of State will not accept the articles of termination without a tax clearance from the Department of Revenue. A corporation files articles of dissolution, and then exists only to wind up its business.",
  },
  {
    q: "What does it cost to use FALCO to liquidate a business?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy or take possession of anything. Licensed Tennessee auction firms run every sale, and a licensed real estate firm handles any real estate.",
  },
]

export default function BusinessLiquidationGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Liquidating a Closing Business"
      />
      <GuideShell
        variant="situation"
        situation="business-closing"
        answer="Close in order: give any required layoff notices and pay final wages on time, find out which lenders have liens on which assets, clear the sales tax, sell the assets, then dissolve the company. Federal WARN generally applies at 100 or more employees and requires 60 days' notice; Tennessee's own law covers employers with 50 to 99."
        eyebrow="Business closing guide"
        title={
          <>
            <span className="text-[var(--mocha)]">Liquidating</span> a closing
            business in Tennessee
          </>
        }
        standfirst={
          <>
            Closing a business is a sequence, not a single event. People get
            notice and get paid, lenders get dealt with, taxes get cleared,
            assets get sold, and only then does the company itself go away.
            Here is that sequence for Tennessee, with the laws that set each
            step, and how to turn the equipment, fleet, inventory and building
            into the most money.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The order that keeps you out of trouble">
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">People.</strong> Layoff
              notices if they apply, and final paychecks on time.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Lenders and liens.</strong>{" "}
              Find out who has a claim on which assets before you sell any of
              them.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Taxes.</strong> Final
              returns and the clearance a buyer or the state will ask for.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Assets.</strong> Sell what
              you own, return what you lease, and keep a record of every sale.
            </li>
            <li>
              <strong className="text-[var(--ink)]">The entity.</strong>{" "}
              Dissolve or terminate the company with the Secretary of State.
            </li>
          </ol>
          <GuideKey>
            If the business cannot pay its debts, talk to a business or
            bankruptcy attorney before you sell anything. Selling assets while
            insolvent can raise questions later about who should have been
            paid. Our{" "}
            <Link href="/guides/bankruptcy-receivership-sales-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              bankruptcy and receivership guide
            </Link>{" "}
            explains how court-supervised sales work.
          </GuideKey>
        </GuideSection>

        <GuideSection id="warn" title="Layoff notices: federal WARN and Tennessee's law">
          <GuideNote label="Federal WARN Act">
            The federal WARN Act generally covers employers with 100 or more
            employees, not counting part-time employees.
            <Cite href={src(1)} n={1} /> A covered employer must give 60
            days&apos; written notice before a plant closing or mass layoff.
            <Cite href={src(2)} n={2} /> A plant closing generally means a
            shutdown that causes 50 or more employees at a single site to lose
            their jobs within 30 days.
            <Cite href={src(1)} n={1} /> Notice goes to each affected employee
            (or their union), the state&apos;s dislocated worker unit, and the
            chief elected official of the local government.
            <Cite href={src(3)} n={3} />
          </GuideNote>
          <GuideNote label="Selling the business instead of closing it">
            When a business is sold, the seller is responsible for WARN notice
            for layoffs up to the date of the sale, and the buyer after that.
            <Cite href={src(1)} n={1} />
          </GuideNote>
          <GuideNote label="Tennessee's plant closing law">
            Tennessee has its own law for employers with 50 to 99 full-time
            employees at a Tennessee workplace. When it applies, the employer
            notifies the Commissioner of Labor and Workforce Development at the
            same time it notifies employees of the closing or reduction.
            <Cite href={src(4)} n={4} /> Notices are filed with the
            department&apos;s Dislocated Worker Unit.
            <Cite href={src(5)} n={5} />
          </GuideNote>
          <GuideNote label="Final paychecks">
            Employees who quit or are let go must be paid in full by the next
            regular payday or 21 days after separation, whichever is later.
            <Cite href={src(6)} n={6} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="lenders" title="Lenders, liens and leased equipment">
          <p>
            Before selling anything, find out who has a claim on it. Lenders
            and equipment finance companies usually record their interest by
            filing a UCC financing statement with the Tennessee Secretary of
            State, which you can search.
            <Cite href={src(11)} n={11} /> Pull the filings against your
            company&apos;s name, match them to your loans, and note which assets
            each one covers. Leased equipment belongs to the leasing company,
            not to you, and goes back to them rather than to auction.
          </p>
          <p>
            Most lenders would rather be paid from an orderly sale than
            repossess a truck and sell it themselves. Agreeing up front on
            which assets are sold, through whom, and how the lien is released
            at closing usually gets the lender paid and leaves more for the
            owners.
          </p>
          <GuideNote label="If the lender sells the collateral itself">
            When a secured lender sells collateral after a default, Tennessee
            law requires every aspect of the sale to be commercially
            reasonable, and the sale can be public or private.
            <Cite href={src(7)} n={7} /> The lender must send notice to the
            debtor, any guarantor and, for business collateral, other secured
            parties of record.
            <Cite href={src(8)} n={8} /> For business collateral, notice sent
            at least 10 days before the sale is treated as timely.
            <Cite href={src(9)} n={9} /> If the sale brings more than the debt,
            the surplus goes to the debtor; if it brings less, the debtor
            generally owes the rest.
            <Cite href={src(10)} n={10} />
          </GuideNote>
          <p>
            That last point is the reason a well-marketed auction matters even
            when you owe the bank. Every extra dollar a piece of equipment
            brings either lowers what you still owe or comes back to you.
          </p>
        </GuideSection>

        <GuideSection id="taxes" title="Sales tax, the final return and tax clearance">
          <GuideNote label="When a business sells out">
            Tennessee requires a business that sells out or quits to file its
            final sales tax return within 15 days. The buyer of the business or
            its stock of goods must hold back enough of the purchase price to
            cover unpaid sales tax until the seller produces a receipt or
            certificate from the Department of Revenue showing the taxes are
            paid. A buyer who skips that step can become personally liable, up
            to what it paid.
            <Cite href={src(12)} n={12} /> The Department of Revenue explains
            how to close your tax accounts.
            <Cite href={src(13)} n={13} />
          </GuideNote>
          <GuideNote label="Is the liquidation sale taxable?">
            It depends on what is sold. The Department of Revenue has ruled
            that a one-time sale of used business equipment by a business that
            does not regularly sell equipment can be an exempt occasional and
            isolated sale, while inventory held for resale and vehicles, boats
            and aircraft that must be registered are treated differently.
            <Cite href={src(14)} n={14} /> Letter rulings apply only to the
            business that asked, so have your CPA confirm how your sale will be
            treated.
          </GuideNote>
        </GuideSection>

        <GuideSection id="assets" title="Selling the assets">
          <p>
            A closing business usually has several different kinds of assets,
            and each sells best to a different crowd:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong className="text-[var(--ink)]">Equipment and tools.</strong>{" "}
              Contractors, shops and dealers often buy nationally and bid
              online, so the right auction reaches far beyond your town.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Vehicles and fleet.</strong>{" "}
              Titles, odometer statements and lien releases need to be ready.
              See{" "}
              <Link href="/guides/sell-vehicles-equipment-boats-aircraft-auction" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
                selling vehicles, equipment, boats and aircraft
              </Link>
              .
            </li>
            <li>
              <strong className="text-[var(--ink)]">Inventory.</strong>{" "}
              Sometimes best sold in bulk lots to other businesses in the same
              trade, sometimes item by item. It depends on what it is.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Real estate.</strong> If
              the business owns its building or land, that sale is run by a
              licensed real estate firm. In Tennessee, conducting an auction of
              real property requires both an auctioneer license and a real
              estate broker or affiliate broker license.
              <Cite href={src(18)} n={18} />
            </li>
          </ul>
          <GuideKey>
            Selling everything to one buyer who offers to &quot;take it all&quot;
            is fast, but that buyer is pricing in their own resale margin.
            Putting each kind of asset in front of the buyers who want it,
            on a firm date, is usually how a closing business recovers the most.
          </GuideKey>
          <p>
            Keep a record of what each asset sold for. Your CPA, your lender,
            your partners and possibly a court will all want to see it.
          </p>
        </GuideSection>

        <GuideSection id="dissolve" title="Closing the company itself">
          <p>
            Once the assets are sold and the debts are dealt with, the entity
            is formally closed with the Tennessee Secretary of State:
          </p>
          <GuideNote label="LLCs">
            An LLC files a notice of dissolution, winds up its affairs, and
            then files articles of termination.
            <Cite href={src(15)} n={15} /> The Secretary of State will not
            accept articles of termination without a tax clearance from the
            Department of Revenue.
            <Cite href={src(16)} n={16} />
          </GuideNote>
          <GuideNote label="Corporations">
            A corporation files articles of dissolution, which take effect when
            filed. After that, the corporation continues only to wind up its
            business.
            <Cite href={src(17)} n={17} />
          </GuideNote>
        </GuideSection>

        <GuideSection title="What FALCO does, and what it costs">
          <p>
            We walk through what the business owns and owes, tell you plainly
            what is worth auctioning, and route each group of assets to the
            licensed Tennessee firm whose buyers want it. You see the plan in
            writing before anyone signs.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium. FALCO does not buy or
            take possession of anything.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, equipment, boats and aircraft" },
            { href: "/guides/bankruptcy-receivership-sales-tennessee", label: "Bankruptcy and receivership sales" },
            { href: "/situations/business-closing", label: "How FALCO handles business closings" },
            { href: "/start?s=business-closing", label: "Tell us about the business" },
          ]}
        />
      </GuideShell>
    </>
  )
}
