import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideFaq,
  GuideSources,
  GuideJsonLd,
} from "../guide-chrome"
import { ogMeta } from "@/lib/og"

const META_TITLE = "Why Sell at Auction? What the Research Says | FALCO"
const META_DESCRIPTION =
  "Why competitive bidding works, what a cash offer, an iBuyer or a foreclosure costs a seller, how Tennessee protects auction sellers, and when auction is the wrong call. Every claim cited."

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: "/guides/why-auction" },
  ...ogMeta({
    key: "guide-why-auction",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/why-auction",
  }),
}

// Numbers match the Cite markers in the copy. Every link was opened and
// checked against the claim on 2026-11-17.
const SOURCES = [
  { n: 1, label: "Bulow and Klemperer, \"Auctions Versus Negotiations,\" American Economic Review 86(1), 1996", href: "https://ideas.repec.org/a/aea/aecrev/v86y1996i1p180-94.html" },
  { n: 2, label: "Lusht, \"A Comparison of Prices Brought by English Auctions and Private Negotiations,\" Real Estate Economics 24(4), 1996", href: "https://econpapers.repec.org/RePEc:bla:reesec:v:24:y:1996:i:4:p:517-530" },
  { n: 3, label: "Dotzour, Moorhead and Winkler, \"The Impact of Auctions on Residential Sales Prices in New Zealand,\" Journal of Real Estate Research 16(1), 1998", href: "https://econpapers.repec.org/RePEc:taf:rjerxx:v:16:y:1998:i:1:p:57-72" },
  { n: 4, label: "Frino, Lepone, Mollica and Vassallo, \"The Impact of Auctions on Residential Sale Prices: Australian Evidence,\" Australasian Accounting, Business and Finance Journal 4(3), 2010", href: "https://www.uowoajournals.org/aabfj/article/id/923/" },
  { n: 5, label: "Chow, Hafalir and Yavas, \"Auction versus Negotiated Sale: Evidence from Real Estate Sales,\" Real Estate Economics 43(2), 2015", href: "https://econpapers.repec.org/RePEc:bla:reesec:v:43:y:2015:i:2:p:432-470" },
  { n: 6, label: "Reher and Valkanov, \"The Mortgage-Cash Premium Puzzle,\" Journal of Finance, 2024 (UC San Diego summary)", href: "https://today.ucsd.edu/story/all-cash-home-buyers-pay-10-less-than-mortgage-buyers" },
  { n: 7, label: "Buchak, Matvos, Piskorski and Seru, \"Why is Intermediating Houses so Difficult? Evidence from iBuyers,\" NBER Working Paper 28252, revised 2025", href: "https://www.nber.org/papers/w28252" },
  { n: 8, label: "Campbell, Giglio and Pathak, \"Forced Sales and House Prices,\" American Economic Review 101(5), 2011", href: "https://www.aeaweb.org/articles?id=10.1257/aer.101.5.2108" },
  { n: 9, label: "Cohen, Coughlin and Yao, \"Sales of Distressed Residential Property: What Have We Learned from Recent Research?\" Federal Reserve Bank of St. Louis Review 98(3), 2016", href: "https://fedinprint.org/item/fedlrv/25907" },
  { n: 10, label: "HousingWire on Auction.com's Auction Market Dispatch, Q3 2026", href: "https://www.housingwire.com/articles/foreclosure-auctions-up-25-in-the-past-year-hit-a-post-pandemic-peak/" },
  { n: 11, label: "ATTOM, underwater mortgages in foreclosure, Q2 2023", href: "https://www.attomdata.com/news/market-trends/figuresfriday/top-10-u-s-states-with-highest-shares-of-underwater-mortgages-in-foreclosure-in-q2-2023/" },
  { n: 12, label: "National Association of Realtors, existing-home sales for October 2026", href: "https://www.nar.realtor/newsroom/existing-home-sales-decreased-5-5-percent-october-nar-report" },
  { n: 13, label: "National Association of Realtors, Realtors Confidence Index", href: "https://www.nar.realtor/research-and-statistics/research-reports/realtors-confidence-index" },
  { n: 14, label: "National Association of Realtors, \"Auctions: The Basics and Benefits\"", href: "https://www.nar.realtor/auction/the-basics-benefits" },
  { n: 15, label: "National Association of Realtors, consumer guide to real estate auctions", href: "https://www.nar.realtor/the-facts/consumer-guide-real-estate-auctions" },
  { n: 16, label: "28 U.S.C. § 2001, sale of real property by federal courts", href: "https://www.law.cornell.edu/uscode/text/28/2001" },
  { n: 17, label: "26 U.S.C. § 6335, IRS sale of seized property", href: "https://www.law.cornell.edu/uscode/text/26/6335" },
  { n: 18, label: "U.S. Department of the Treasury, real property auctions", href: "https://www.treasury.gov/auctions/treasury/rp/index.shtml" },
  { n: 19, label: "TreasuryDirect, how Treasury auctions work", href: "https://treasurydirect.gov/auctions/how-auctions-work" },
  { n: 20, label: "Iowa State University, Center for Agricultural and Rural Development, farmland FAQ", href: "https://farmland.card.iastate.edu/faq" },
  { n: 21, label: "University of Nebraska-Lincoln, Nebraska farm real estate marketing practices, 2026", href: "https://cap.unl.edu/news/evaluating-changes-nebraska-farm-real-estate-marketing-practices-2026/" },
  { n: 22, label: "RB Global (Ritchie Bros.), fourth quarter and full-year 2025 results", href: "https://investor.rbglobal.com/news/news-details/2026/RB-Global-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx" },
  { n: 23, label: "Tenn. Code Ann. § 35-5-112, court-ordered sales by licensed auctioneers", href: "https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-112/" },
  { n: 24, label: "Tenn. Code Ann. § 62-19-102, auctioneer licensing", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-102/" },
  { n: 25, label: "Tennessee Attorney General Opinion No. 08-89", href: "https://www.tn.gov/content/dam/tn/attorneygeneral/documents/ops/2008/op08-089.pdf" },
  { n: 26, label: "Tenn. Comp. R. & Regs. 0160-01-.26, escrow and trust accounts", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0160-01-.26" },
  { n: 27, label: "Tenn. Code Ann. § 62-19-112, grounds for discipline", href: "https://codes.findlaw.com/tn/title-62-professions-businesses-and-trades/tn-code-sect-62-19-112/" },
  { n: 28, label: "Tenn. Comp. R. & Regs. 0160-01-.01, closing statements", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0160-01-.01" },
  { n: 29, label: "Tenn. Comp. R. & Regs. 0160-01-.21, buyer's premium disclosure", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0160-01-.21" },
  { n: 30, label: "Tenn. Comp. R. & Regs. 0160-01-.19, absolute and reserve auctions", href: "https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0160-01-.19" },
  { n: 31, label: "Tennessee Auctioneer Commission, Education and Recovery Account", href: "https://www.tn.gov/commerce/regboards/auctioneers/consumer/recovery.html" },
  { n: 32, label: "Tennessee Auctioneer Commission, license lookup and complaints", href: "https://www.tn.gov/commerce/section/auctioneers" },
  { n: 33, label: "Mayer, \"Assessing the Performance of Real Estate Auctions,\" Real Estate Economics 26(1), 1998", href: "https://econpapers.repec.org/RePEc:bla:reesec:v:26:y:1998:i:1:p:41-66" },
  { n: 34, label: "Cortés, Singh, Solomon and Strahan, \"How perception affects house prices: evidence from failed auctions,\" Review of Finance 30(5), 2026", href: "https://academic.oup.com/rof/article/30/5/1661/8675141" },
]

const FAQ = [
  {
    q: "Does selling at auction mean a lower price?",
    a: "Not when the sale draws real competition. Studies in active markets found auctions matched or beat negotiated sales, and auction theory shows one extra bidder is worth more than a skilled negotiator. Where demand is thin, auctions can sell at a discount, which is why the fit matters more than the format.",
  },
  {
    q: "Who pays the auction fee?",
    a: "On the sales FALCO routes, the buyer pays a 10% premium on top of the winning bid and the seller pays no commission. Tennessee rules require the premium to be disclosed in the advertising and announced before bidding starts.",
  },
  {
    q: "How long does an auction take?",
    a: "The sale date is set before marketing starts, so the seller knows the day it sells. A traditional listing spent a median of 35 days on the market in October 2026, then usually about 30 more days to close, and some of those contracts fall through.",
  },
  {
    q: "Can I set a minimum price?",
    a: "Yes. In a reserve auction the seller can reject bids below a minimum. In an absolute auction the property sells to the highest bidder and the seller cannot withdraw it once bidding opens. Tennessee rules define both and require the advertising to say which one it is.",
  },
  {
    q: "Is my money safe?",
    a: "Tennessee requires every principal auctioneer to hold sale proceeds in an escrow or trust account, give the seller a signed closing statement, and pay over funds within a reasonable time. If a licensee breaks the auctioneer law and a court judgment for your loss goes unpaid for 60 days, a state recovery fund covers it, up to set limits.",
  },
  {
    q: "What if the bids don't get high enough?",
    a: "With a reserve, the property doesn't sell and you keep it. On the sales FALCO routes, a seller who doesn't sell owes nothing. Research from Australia found homes that failed at auction later sold at about a 1.3% discount, so setting a realistic reserve matters.",
  },
]

export default function WhyAuctionGuide() {
  return (
    <>
      <GuideJsonLd
        slug="why-auction"
        headline="Why Sell at Auction? What the Research Says"
        description="Why competitive bidding works, what the alternatives cost a seller, how Tennessee protects auction sellers, and when auction is the wrong call."
        datePublished="2026-11-17"
        dateModified="2026-11-17"
        breadcrumbName="Why auction"
      />
      <GuideShell
        variant="situation"
        eyebrow="Why auction"
        title="Why sell at auction?"
        standfirst="Because competition sets the price. Here is what economists, courts and the government have found about selling to the highest bidder, what the other ways out cost, and when an auction is the wrong call."
        answer="When several buyers bid against each other on a set date, the price comes from the market, not from one buyer's offer or a forced sale. Research backs this up when the sale draws real competition. Cash offers, instant buyers and foreclosures all measurably cost sellers. Tennessee adds escrow, licensing and disclosure rules that protect the seller."
        updated="November 2026"
      >
        <GuideSection id="competition" title="One more bidder beats a better negotiator">
          <p>
            The best-known paper on this question compared an auction against
            the best possible one-on-one negotiation. Its finding: an auction
            with just one more serious bidder beats the negotiation, no matter
            how skilled the negotiator.
            <Cite href={SOURCES[0].href} n={1} />
          </p>
          <GuideKey>
            Negotiating gets you the best price one buyer will pay. An auction
            makes buyers compete for it. Competition is worth more.
          </GuideKey>
        </GuideSection>

        <GuideSection id="studies" title="What the housing studies found">
          <GuideNote label="Melbourne">
            In an active market for mid- and high-priced homes, auctions
            brought higher prices than private negotiation.
            <Cite href={SOURCES[1].href} n={2} />
          </GuideNote>
          <GuideNote label="New Zealand">
            Auctions sometimes earned a premium and never produced lower prices
            than private sales.
            <Cite href={SOURCES[2].href} n={3} />
          </GuideNote>
          <GuideNote label="Five Australian cities">
            Houses sold at auction brought higher prices in all five, even
            after accounting for which sellers choose auction.
            <Cite href={SOURCES[3].href} n={4} />
          </GuideNote>
          <GuideNote label="Singapore">
            The auction advantage was largest when demand was strong and buyers
            could compare the property easily.
            <Cite href={SOURCES[4].href} n={5} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="alternatives" title="What the other ways out cost">
          <GuideNote label="A cash offer">
            All-cash buyers paid about 10% less than mortgage buyers for
            comparable homes, across roughly 2 million US sales. Sellers accept
            less to avoid a deal falling through.
            <Cite href={SOURCES[5].href} n={6} />
          </GuideNote>
          <GuideNote label="An instant buyer">
            Companies that buy homes instantly paid about 3.1 percentage points
            below similar listed homes, then resold them at a profit.
            <Cite href={SOURCES[6].href} n={7} />
          </GuideNote>
          <GuideNote label="A foreclosure">
            Foreclosed homes in Massachusetts sold for about 27% less on
            average.
            <Cite href={SOURCES[7].href} n={8} /> A Federal Reserve review puts
            most estimates above 12%.
            <Cite href={SOURCES[8].href} n={9} /> At foreclosure auctions in
            the third quarter of 2026, winning bids averaged 65.3% of estimated
            value.
            <Cite href={SOURCES[9].href} n={10} />
          </GuideNote>
          <GuideKey>
            Most people facing foreclosure have equity to lose: about 92% in
            mid-2023.
            <Cite href={SOURCES[10].href} n={11} /> A marketed sale before the
            deadline is how they keep it.
          </GuideKey>
        </GuideSection>

        <GuideSection id="speed" title="A date, not a wait">
          <p>
            A traditional listing spent a median of 35 days on the market in
            October 2026.
            <Cite href={SOURCES[11].href} n={12} /> Contracts then took about
            30 days to close, and 7% were terminated while 14% were delayed.
            <Cite href={SOURCES[12].href} n={13} />
          </p>
          <p>
            The National Association of Realtors lists the auction advantages
            plainly: the sale is accelerated and the seller knows exactly when
            it will sell.
            <Cite href={SOURCES[13].href} n={14} /> Properties sell as-is, which
            cuts the time and money spent on repairs and carrying costs.
            <Cite href={SOURCES[14].href} n={15} />
          </p>
        </GuideSection>

        <GuideSection id="who-uses-it" title="Who already sells this way">
          <GuideNote label="Federal courts">
            Land sold under a federal court order must go at public sale. A
            private sale needs three appraisals and a two-thirds price floor.
            <Cite href={SOURCES[15].href} n={16} />
          </GuideNote>
          <GuideNote label="The IRS and Treasury">
            Seized property is sold at public auction or public sealed bid.
            <Cite href={SOURCES[16].href} n={17} /> Treasury auctions forfeited
            real estate to the public
            <Cite href={SOURCES[17].href} n={18} /> and sells the national debt
            by auction.
            <Cite href={SOURCES[18].href} n={19} />
          </GuideNote>
          <GuideNote label="Farmland">
            Public auctions account for 40% to 50% of Iowa farmland sales since
            2011.
            <Cite href={SOURCES[19].href} n={20} /> In Nebraska, auction formats
            made up 62% of sale methods reported in 2026.
            <Cite href={SOURCES[20].href} n={21} />
          </GuideNote>
          <GuideNote label="Equipment">
            Ritchie Bros. moved $16.2 billion of equipment and vehicles through
            its marketplaces in 2025.
            <Cite href={SOURCES[21].href} n={22} />
          </GuideNote>
          <GuideNote label="Tennessee courts">
            Tennessee courts can hire licensed auctioneers for court-ordered
            sales of real and personal property.
            <Cite href={SOURCES[22].href} n={23} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="protections" title="How Tennessee protects the seller">
          <GuideNote label="Two licenses">
            A real estate auction requires both an auctioneer license and a
            real estate broker license.
            <Cite href={SOURCES[23].href} n={24} />
            <Cite href={SOURCES[24].href} n={25} />
          </GuideNote>
          <GuideNote label="Escrow">
            Sale proceeds must sit in an escrow or trust account, never mixed
            with the auctioneer&apos;s own money.
            <Cite href={SOURCES[25].href} n={26} />
          </GuideNote>
          <GuideNote label="Paper first">
            No auction without a written contract with the owner, and a signed
            closing statement accounting for every dollar afterward.
            <Cite href={SOURCES[26].href} n={27} />
            <Cite href={SOURCES[27].href} n={28} />
          </GuideNote>
          <GuideNote label="No fake bids">
            Planted bidders are grounds for losing the license, and the
            buyer&apos;s premium has to be disclosed up front.
            <Cite href={SOURCES[26].href} n={27} />
            <Cite href={SOURCES[28].href} n={29} />
          </GuideNote>
          <GuideNote label="A recovery fund">
            If a licensee breaks the auctioneer law and a court judgment for
            your loss goes unpaid for 60 days, a state fund covers it, up to
            set limits. You can look up any license before you sign.
            <Cite href={SOURCES[30].href} n={31} />
            <Cite href={SOURCES[31].href} n={32} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="wrong-call" title="When auction is the wrong call">
          <p>
            Auctions win on competition. Without it, they don&apos;t. In a
            weak Dallas market, auctions sold at a 9% to 21% discount.
            <Cite href={SOURCES[32].href} n={33} /> Homes that failed at
            auction later sold for about 1.3% less.
            <Cite href={SOURCES[33].href} n={34} />
          </p>
          <GuideKey>
            Auction fits when marketing can bring several real bidders. If the
            home is worth less than the loan, a short sale may fit better. If
            nothing would clear, we say so before you sign anything.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources
          sources={SOURCES}
          note="Every link was opened and checked against the claim in November 2026. The Tennessee statutes and rules cited were checked against the General Assembly's public chapters for 2024 through 2026 and the Secretary of State's current rules (November 2025): none of the sections cited has changed. Most of the price research studies homes in Australia, New Zealand and Singapore, where auctions are common; the cash-offer, instant-buyer and foreclosure studies are from the US."
        />
      </GuideShell>
    </>
  )
}
