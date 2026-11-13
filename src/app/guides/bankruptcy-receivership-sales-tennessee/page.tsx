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

const SLUG = "bankruptcy-receivership-sales-tennessee"
const HEADLINE = "Bankruptcy and Receivership Sales in Tennessee"
const DESCRIPTION =
  "How assets are sold in a Tennessee bankruptcy or receivership: Chapter 7 trustee sales, court approval of sales and auctioneers, notice to creditors, exemptions and what debtors keep, local rules in Tennessee's three bankruptcy districts, and receiver sales under Tennessee's receivership act."

const META_TITLE = `${HEADLINE} | FALCO`
const META_DESCRIPTION =
  DESCRIPTION

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  ...ogMeta({
    key: "guide-bankruptcy-receivership-sales-tennessee",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/bankruptcy-receivership-sales-tennessee",
  }),
}

const SOURCES = [
  { n: 1, label: "11 U.S.C. § 704 (duties of a Chapter 7 trustee)", href: "https://www.law.cornell.edu/uscode/text/11/704" },
  { n: 2, label: "11 U.S.C. § 363 (use, sale or lease of property)", href: "https://www.law.cornell.edu/uscode/text/11/363" },
  { n: 3, label: "11 U.S.C. § 554 (abandonment of property)", href: "https://www.law.cornell.edu/uscode/text/11/554" },
  { n: 4, label: "Tenn. Code Ann. § 26-2-112 (Tennessee opts out of federal exemptions)", href: "https://codes.findlaw.com/tn/title-26-execution/tn-code-sect-26-2-112/" },
  { n: 5, label: "Tenn. Code Ann. § 26-2-301 (homestead exemption)", href: "https://codes.findlaw.com/tn/title-26-execution/tn-code-sect-26-2-301/" },
  { n: 6, label: "11 U.S.C. § 1107 (rights and powers of a debtor in possession)", href: "https://www.law.cornell.edu/uscode/text/11/1107" },
  { n: 7, label: "11 U.S.C. § 1303 (rights and powers of a Chapter 13 debtor)", href: "https://www.law.cornell.edu/uscode/text/11/1303" },
  { n: 8, label: "Fed. R. Bankr. P. 2002 (notices, including 21 days' notice of a proposed sale)", href: "https://www.law.cornell.edu/rules/frbp/rule_2002" },
  { n: 9, label: "Fed. R. Bankr. P. 6004 (use, sale or lease of property; report of sale)", href: "https://www.law.cornell.edu/rules/frbp/rule_6004" },
  { n: 10, label: "11 U.S.C. § 327 (employment of professional persons)", href: "https://www.law.cornell.edu/uscode/text/11/327" },
  { n: 11, label: "11 U.S.C. § 328 (limitation on compensation of professional persons)", href: "https://www.law.cornell.edu/uscode/text/11/328" },
  { n: 12, label: "11 U.S.C. § 330 (compensation of officers and professionals)", href: "https://www.law.cornell.edu/uscode/text/11/330" },
  { n: 13, label: "Fed. R. Bankr. P. 2014 (application to employ professionals)", href: "https://www.law.cornell.edu/rules/frbp/rule_2014" },
  { n: 14, label: "Fed. R. Bankr. P. 6005 (appraisers and auctioneers)", href: "https://www.law.cornell.edu/rules/frbp/rule_6005" },
  { n: 15, label: "U.S. Bankruptcy Court, Eastern District of Tennessee, Local Rules", href: "https://www.tneb.uscourts.gov/sites/tneb/files/local_rules/TNEB_Local_Rules.pdf" },
  { n: 16, label: "U.S. Bankruptcy Court, Middle District of Tennessee, Local Bankruptcy Rules (2025)", href: "https://www.tnmb.uscourts.gov/sites/tnmb/files/tfr/2025_Local%20Bankruptcy%20Rules%20Official.pdf" },
  { n: 17, label: "U.S. Bankruptcy Court, Western District of Tennessee, Local Rules (effective September 24, 2026)", href: "https://www.tnwb.uscourts.gov/PDFs/BK/LocalRules_09.24.2026.pdf" },
  { n: 18, label: "Tenn. Code Ann. § 29-40-101 (Uniform Commercial Real Estate Receivership Act)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-40-101/" },
  { n: 19, label: "Tenn. Code Ann. § 29-40-104 (scope of the receivership act)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-40-104/" },
  { n: 20, label: "Tenn. Code Ann. § 29-40-116 (receiver's sale of receivership property)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-40-116/" },
  { n: 21, label: "Tenn. R. Civ. P. 66 (receivers)", href: "https://rulesofcivilprocedure.com/tn/rule-66/" },
  { n: 22, label: "11 U.S.C. § 504 (sharing of compensation)", href: "https://www.law.cornell.edu/uscode/text/11/504" },
]
const src = (n: number) => SOURCES[n - 1].href

const FAQ = [
  {
    q: "Does a bankruptcy trustee need court approval to hire an auctioneer?",
    a: "Yes. Under the Bankruptcy Code, a trustee may employ an auctioneer only with the court's approval, and the auctioneer must be disinterested. The application discloses the auctioneer's connections to the debtor, creditors and the U.S. Trustee, and the order approving the employment must set the amount or rate of the auctioneer's compensation.",
  },
  {
    q: "How much notice do creditors get before a bankruptcy sale?",
    a: "Under the Federal Rules of Bankruptcy Procedure, creditors generally get at least 21 days' notice of a proposed sale of property outside the ordinary course of business, unless the court shortens the time. Objections are generally due no later than seven days before the sale.",
  },
  {
    q: "Will the trustee sell my house in a Tennessee Chapter 7?",
    a: "It depends on the equity. The trustee's job is to turn non-exempt property into money for creditors, but property with little value to the estate, for example because the mortgage and the debtor's exemptions would eat up the proceeds, can be abandoned back to the debtor. Tennessee's basic homestead exemption is $35,000 for an individual, or $52,500 combined for joint owners who both live there. Talk to your bankruptcy attorney about your numbers.",
  },
  {
    q: "Does a bankruptcy sale have to be an auction?",
    a: "No. The Bankruptcy Rules allow sales by public auction or private sale, as long as the required notice is given and, for sales outside the ordinary course, the court approves after notice and a hearing. Auctions are common because they show the court and creditors that the price was tested by open competition.",
  },
  {
    q: "What is a receivership sale in Tennessee?",
    a: "A receiver is a neutral person appointed by a court to take charge of property, often commercial real estate in a lender dispute. Under Tennessee's Uniform Commercial Real Estate Receivership Act, a receiver can sell receivership property outside the ordinary course only with court approval. The sale does not have to be a public auction, and liens that the sale removes attach to the proceeds.",
  },
  {
    q: "What does it cost the estate?",
    a: "Nothing up front. In a bankruptcy or receivership case, the court approves the auctioneer's employment and compensation, including any buyer's premium, before anything sells.",
  },
]

export default function BankruptcyReceivershipGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Bankruptcy and Receivership Sales"
      />
      <GuideShell
        variant="situation"
        situation="bankruptcy"
        ctaNote={
          <>
            Nothing up front. In a bankruptcy or receivership case, the court
            approves the auctioneer&apos;s employment and compensation,
            including any buyer&apos;s premium, before anything sells.
          </>
        }
        answer="In a bankruptcy, the trustee or debtor sells property outside the ordinary course only after notice to creditors and court approval, and any auctioneer must be approved by the court, which also sets the auctioneer's pay. A Tennessee receiver selling commercial real estate also needs court approval, but the sale does not have to be an auction."
        eyebrow="Bankruptcy guide"
        title={
          <>
            <span className="text-[var(--mocha)]">Bankruptcy and receivership</span>{" "}
            sales in Tennessee
          </>
        }
        standfirst={
          <>
            When a bankruptcy trustee, a debtor in possession or a
            court-appointed receiver sells assets, the court is watching every
            step: who runs the sale, how creditors are told, and what price is
            accepted. Here is how those sales work in Tennessee, for trustees
            and receivers who need a sale that holds up, and for debtors who
            want to know what to expect.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The basic idea">
          <p>
            In a{" "}
            <strong className="text-[var(--ink)]">Chapter 7</strong> case, a
            trustee is appointed to collect the property of the estate, turn it
            into money, and close the estate as quickly as is compatible with
            the best interests of the people involved.
            <Cite href={src(1)} n={1} /> Selling property outside the ordinary
            course of business requires notice and a hearing, and the court can
            approve a sale free and clear of liens when certain conditions are
            met.
            <Cite href={src(2)} n={2} />
          </p>
          <p>
            Chapter 11 and Chapter 13 debtors can sell property too. A Chapter
            11 debtor in possession generally has a trustee&apos;s powers, and a
            Chapter 13 debtor has the trustee&apos;s power to sell under the same
            section of the Code, with the same notice and approval
            requirements.
            <Cite href={src(6)} n={6} />
            <Cite href={src(7)} n={7} />
          </p>
          <GuideKey>
            A bankruptcy sale has two audiences: the buyers, who set the
            price, and the court and creditors, who need to see that the price
            was fair. Open, well-documented bidding serves both.
          </GuideKey>
        </GuideSection>

        <GuideSection id="debtors" title="For debtors: what gets sold and what you keep">
          <p>
            Filing Chapter 7 does not mean everything you own is auctioned.
            Exempt property stays with you, and the trustee can abandon
            property that is burdensome or of inconsequential value to the
            estate, often because the liens and exemptions would leave nothing
            for creditors.
            <Cite href={src(3)} n={3} />
          </p>
          <GuideNote label="Tennessee exemptions">
            Tennessee has opted out of the federal exemption list, so Tennessee
            debtors use the state&apos;s exemptions.
            <Cite href={src(4)} n={4} /> The homestead exemption for a principal
            residence is $35,000 for an individual, or $52,500 combined for
            joint owners who both use it as their principal residence.
            <Cite href={src(5)} n={5} /> Your bankruptcy attorney will apply the
            full list of exemptions to your property.
          </GuideNote>
          <p>
            If the trustee does sell something of yours, you will receive
            notice of the proposed sale along with creditors, and you can
            raise concerns through your attorney. When the trustee is
            deciding whether a vehicle or piece of equipment is worth selling,
            an honest auction estimate helps everyone see the real numbers.
          </p>
        </GuideSection>

        <GuideSection id="sale-process" title="How a bankruptcy sale is noticed and reported">
          <GuideNote label="Notice to creditors">
            Creditors generally receive at least 21 days&apos; notice of a
            proposed sale of property outside the ordinary course of business,
            unless the court shortens the time.
            <Cite href={src(8)} n={8} /> Objections are generally due no later
            than seven days before the sale.
            <Cite href={src(9)} n={9} />
          </GuideNote>
          <GuideNote label="Public auction or private sale">
            The rules allow either. After a sale, an itemized statement of the
            property sold, the buyers and the prices is filed, by the
            auctioneer if one ran the sale, and a copy goes to the U.S.
            Trustee.
            <Cite href={src(9)} n={9} />
          </GuideNote>
          <GuideNote label="Protections for buyers and the estate">
            A buyer who purchases in good faith keeps the property even if the
            approval is later reversed on appeal, unless the sale was stayed.
            And a trustee can void a sale where bidders agreed among themselves
            to control the price.
            <Cite href={src(2)} n={2} /> Those rules are part of why buyers are
            willing to bid seriously at a properly run bankruptcy auction.
          </GuideNote>
        </GuideSection>

        <GuideSection id="auctioneers" title="Employing an auctioneer: court approval comes first">
          <p>
            A trustee may employ an auctioneer only with the court&apos;s
            approval, and the auctioneer must be a disinterested person.
            <Cite href={src(10)} n={10} /> The application to employ discloses
            the auctioneer&apos;s connections with the debtor, creditors and the
            U.S. Trustee, supported by the auctioneer&apos;s verified statement.
            <Cite href={src(13)} n={13} />
          </p>
          <GuideNote label="Compensation is set by the court">
            The order approving an auctioneer&apos;s employment must fix the
            amount or rate of compensation.
            <Cite href={src(14)} n={14} /> The court can approve terms such as a
            percentage fee in advance, and awards compensation after notice and
            a hearing.
            <Cite href={src(11)} n={11} />
            <Cite href={src(12)} n={12} /> Compensation awarded in a case
            generally cannot be shared with anyone outside the professional&apos;s
            own firm.
            <Cite href={src(22)} n={22} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="districts" title="Tennessee's three bankruptcy districts">
          <p>
            Tennessee has three federal bankruptcy districts, and each has its
            own local rules on top of the federal ones. Check the current local
            rules for your district before filing anything.
          </p>
          <GuideNote label="Eastern District (Knoxville, Chattanooga, Greeneville, Winchester)">
            The local rules require a sale notice to identify the buyer, any
            connections the buyer has to the case, and the price, and require
            a report of sale after closing.
            <Cite href={src(15)} n={15} />
          </GuideNote>
          <GuideNote label="Middle District (Nashville, Columbia, Cookeville)">
            The local rules require an application to employ an auctioneer to
            describe the auctioneer&apos;s qualifications and licenses, and set
            default limits on auctioneer commissions: 10% of gross proceeds for
            real estate and for vehicles and equipment, and for other personal
            property 25% of the first $40,000 and 15% after that, unless the
            court approves more. Commission can be paid from the proceeds or
            charged to buyers as a premium, and the report of sale has
            required contents.
            <Cite href={src(16)} n={16} />
          </GuideNote>
          <GuideNote label="Western District (Memphis, Jackson)">
            The current local rules, effective September 24, 2026, do not add a
            separate rule on sales or auctioneers, so the federal rules above
            govern.
            <Cite href={src(17)} n={17} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="receivership" title="Receivership sales under Tennessee law">
          <p>
            A receiver is a neutral person a court appoints to take charge of
            property, often during a dispute between a commercial lender and a
            borrower. Tennessee has adopted the Uniform Commercial Real Estate
            Receivership Act.
            <Cite href={src(18)} n={18} /> It covers receiverships of commercial
            real property and related personal property, and generally does not
            cover one-to-four unit homes unless they are used commercially or
            rented.
            <Cite href={src(19)} n={19} />
          </p>
          <GuideNote label="How a receiver sells">
            With court approval, a receiver may sell receivership property
            outside the ordinary course of business. Unless the sale agreement
            says otherwise, the sale is free of the appointing creditor&apos;s
            lien and junior liens but subject to senior liens, and liens the
            sale removes attach to the proceeds. The sale does not have to be a
            public auction, and a creditor with a valid lien can buy by
            offsetting its secured claim against the price.
            <Cite href={src(20)} n={20} />
          </GuideNote>
          <p>
            Receiverships outside that act, for example over a business or
            personal property, are governed by Tennessee&apos;s rule on receivers
            and the court&apos;s orders in the case.
            <Cite href={src(21)} n={21} /> In every receivership, the order
            appointing the receiver is the first document to read: it sets
            what the receiver can sell and how.
          </p>
        </GuideSection>

        <GuideSection id="falco" title="Where FALCO fits">
          <p>
            Bankruptcy estates and receiverships rarely hold just one kind of
            asset. A trucking company case can include tractors, trailers,
            shop equipment, a yard and a building, and no single auction firm
            sells all of them best. FALCO helps trustees, receivers and their
            counsel identify the licensed Tennessee auction firm best suited
            to each group of assets. That firm applies to be employed and is
            compensated only as the court approves.
          </p>
          <p>
            Real estate in an estate or receivership is sold by a licensed
            real estate firm. For estates and business closings outside of
            court, see our guides to{" "}
            <Link href="/guides/selling-estate-property-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              selling estate property
            </Link>{" "}
            and{" "}
            <Link href="/guides/business-liquidation-tennessee" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              liquidating a closing business
            </Link>
            .
          </p>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/business-liquidation-tennessee", label: "Liquidating a closing business" },
            { href: "/guides/sell-vehicles-equipment-boats-aircraft-auction", label: "Vehicles, equipment, boats and aircraft" },
            { href: "/situations/bankruptcy", label: "How FALCO works with trustees and receivers" },
            { href: "/start?s=bankruptcy", label: "Tell us about the case" },
          ]}
        />
      </GuideShell>
    </>
  )
}
