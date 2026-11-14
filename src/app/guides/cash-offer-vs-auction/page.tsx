import Link from "next/link"
import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
  GuideSources,
} from "../guide-chrome"
import { ogMeta } from "@/lib/og"

const META_TITLE = "Cash Offer vs. Marketed Auction in Tennessee: The Real Math | FALCO"
const META_DESCRIPTION =
  "A 'we buy houses' cash offer versus a marketed auction, side by side: how cash buyers price a house, what each path can net you after the loan is paid, and how to choose."

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: "/guides/cash-offer-vs-auction" },
  ...ogMeta({
    key: "guide-cash-offer-vs-auction",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: "/guides/cash-offer-vs-auction",
  }),
}

const SOURCES = [
  { n: 1, label: "BiggerPockets, The 70% Rule in Real Estate Investing", href: "https://www.biggerpockets.com/blog/70-percent-rule" },
  { n: 2, label: "HousingWire, Q2 2026 foreclosure auction data from Auction.com", href: "https://www.housingwire.com/articles/q2-2026-foreclosure-auctions-fha/" },
  { n: 3, label: "Tenn. Code Ann. § 35-5-101 (trustee sale notice)", href: "https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-101/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "Most cash buyers start from an investor rule of thumb: about 70% of the home's fixed-up value, minus repairs. That trades a large discount for speed. A marketed auction puts the home in front of competing buyers on a set date, which can leave more of your equity with you if there is time before the sale. The right choice depends on your equity, the home's condition and your deadline."

export default function CashOfferVsAuctionGuide() {
  return (
    <>
      <GuideJsonLd
        slug="cash-offer-vs-auction"
        headline="Cash Offer vs. Marketed Auction in Tennessee: The Real Math"
        description="A 'we buy houses' cash offer versus a marketed auction, side by side: how cash buyers price a house and what each path can net you."
        datePublished="2026-07-12"
        dateModified="2026-11-14"
        breadcrumbName="Cash Offer vs. Auction"
      />
      <GuideShell
        answer={ANSWER}
        eyebrow="Comparison guide"
        title="Cash offer vs. marketed auction: the math they skip"
        standfirst={
          <>
            When you are behind on payments, the people calling are usually
            cash buyers. Their offer is fast and it feels like a lifeline. Here
            is how that offer is built, and what a marketed auction can do with
            the same house and the same deadline.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The two offers are not the same product">
          <p>
            A cash buyer, whether they call themselves a wholesaler, an
            investor, or a &quot;we buy houses&quot; company, is buying your home
            at a discount so they can resell it. The discount is the business.
            A marketed auction works the other way: it puts your home in front
            of competing buyers and lets the highest bid set the price. Both can
            be fast enough to beat a trustee sale if you start early. They send
            the difference in price to different places.
          </p>
          <GuideKey>
            The cash offer keeps the discount with the buyer. A competitive
            auction gives buyers a reason to bid it away. That is the whole
            comparison.
          </GuideKey>
        </GuideSection>

        <GuideSection id="cash-math" title="How a cash offer is built">
          <p>
            Many investors screen deals with the <strong>70% rule</strong>, a
            rule of thumb rather than a law or industry standard: pay no more
            than 70% of the home&apos;s after-repair value, minus the cost of
            repairs. The 30% left over is meant to cover the investor&apos;s
            profit, holding costs and resale costs.
            <Cite href={src(1)} n={1} /> Take a home worth about $484,000 fixed
            up, needing $25,000 of work:
          </p>
          <MathRows
            rows={[
              ["After-repair value", "$484,000"],
              ["x 70%", "$338,800"],
              ["Minus estimated repairs", "- $25,000"],
            ]}
            total={["Most a 70%-rule buyer offers", "$313,800"]}
          />
          <p>
            If a wholesaler sits in the middle, their assignment fee usually
            comes out of that number too. With a $10,000 fee, the offer to you
            drops to about $303,800.
          </p>
          <p>
            Now subtract a $290,000 loan payoff and about $5,000 of closing
            costs. The cash offer nets you roughly{" "}
            <strong>$9,000 to $19,000</strong>.
          </p>
          <GuideNote label="What you are paying for">
            The gap between $484,000 and $313,800 is about $170,000. Repairs are
            $25,000 of it. The rest is the investor&apos;s margin for risk,
            holding and resale, which is the price of a fast, certain close.
            Sometimes that trade is worth it. It should be a choice you make
            with the number in front of you.
          </GuideNote>
        </GuideSection>

        <GuideSection id="auction-math" title="What a marketed auction can net you">
          <p>
            Same house. A licensed Tennessee real estate and auction firm
            markets it with photos and advertising to a set sale date, and
            financed buyers can bid along with cash buyers.
          </p>
          <MathRows
            rows={[
              ["Winning bid, at FALCO's planning range of 80 to 88% of value", "$390,000 to $425,000"],
              ["Minus loan payoff", "- $290,000"],
              ["Minus closing costs", "- $5,000"],
            ]}
            total={["Net to you", "about $95,000 to $130,000"]}
          />
          <p>
            That 80 to 88% range is FALCO&apos;s planning assumption for a
            properly marketed sale. It is not a published industry statistic
            and not a promise. Results depend on the house, the market and how
            many buyers show up.
          </p>
          <p>
            On the auctions FALCO routes, the buyer pays a 10% premium on top
            of the winning bid, set in the auction terms. Bidders factor it
            into what they bid. You pay no listing fee and no commission.
          </p>
          <GuideNote label="For comparison: the courthouse sale">
            Foreclosure auctions, which sell as-is with little marketing, are a
            different event. Auction.com reported that buyers at foreclosure
            auctions paid about two thirds of estimated retail value on average
            in the second quarter of 2026.
            <Cite href={src(2)} n={2} /> When nobody outbids the lender, the
            property goes back to the lender.
          </GuideNote>
        </GuideSection>

        <GuideSection id="side-by-side" title="Side by side, same house, same deadline">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="text-left font-medium py-3 pr-4">Path</th>
                  <th className="text-right font-medium py-3 px-4">You net (after $290k loan)</th>
                  <th className="text-right font-medium py-3 pl-4">Speed</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--line-2)]">
                  <td className="py-3 pr-4">Do nothing, trustee sale runs</td>
                  <td className="py-3 px-4 text-right tabular-nums">Usually $0; any surplus must be claimed</td>
                  <td className="py-3 pl-4 text-right text-[var(--muted)]">Sale date</td>
                </tr>
                <tr className="border-b border-[var(--line-2)]">
                  <td className="py-3 pr-4">Cash offer</td>
                  <td className="py-3 px-4 text-right tabular-nums">about $9k to $19k</td>
                  <td className="py-3 pl-4 text-right text-[var(--muted)]">As fast as funds and title allow</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Marketed auction</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-[var(--ink)]">about $95k to $130k</td>
                  <td className="py-3 pl-4 text-right text-[var(--muted)]">Weeks: marketing, sale day, closing</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            An illustration with round numbers on a $484,000 home with a
            $290,000 loan. Your figures depend on value, balance, condition and
            buyer turnout. Auction outcomes are not guaranteed. In Tennessee the
            first trustee sale notice runs at least 20 days before the sale, so
            the earlier you start, the more options you have.
            <Cite href={src(3)} n={3} />
          </p>
        </GuideSection>

        <GuideSection title="How to use this">
          <GuideKey>
            If you have little or no equity, or the house needs heavy work, a
            cash offer may be your best move, and we will tell you so. If you
            have real equity and time before the sale, a marketed auction
            usually keeps more of it with you. The only wrong move is taking
            the first offer without seeing the other number.
          </GuideKey>
          <p>
            The full breakdown of how wholesalers price a house is in{" "}
            <Link href="/guides/wholesaler-economics">how wholesalers make money</Link>
            .
          </p>
        </GuideSection>

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/wholesaler-economics", label: "The 70% rule, broken all the way down" },
            { href: "/guides/tennessee-foreclosure-process", label: "How the Tennessee foreclosure timeline works" },
            { href: "/guides/short-sale-vs-auction", label: "What if I owe more than it's worth?" },
            { href: "/homeowners", label: "See your actual numbers: free call" },
          ]}
        />
      </GuideShell>
    </>
  )
}

function MathRows({
  rows,
  total,
}: {
  rows: Array<[string, string]>
  total: [string, string]
}) {
  return (
    <div className="gd-rows">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-3 border-t border-[var(--line-2)] text-[15px]">
          <span>{label}</span>
          <span className="tabular-nums whitespace-nowrap">{value}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 py-3 border-y border-[var(--line)] text-[16px] font-medium text-[var(--ink)]">
        <span>{total[0]}</span>
        <span className="tabular-nums whitespace-nowrap">{total[1]}</span>
      </div>
    </div>
  )
}
