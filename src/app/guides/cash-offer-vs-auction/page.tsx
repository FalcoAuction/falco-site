import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
} from "../guide-chrome"

export const metadata = {
  title: "Cash Offer vs. Marketed Auction in Tennessee: The Real Math | FALCO",
  description:
    "A 'we buy houses' cash offer versus a marketed auction, side by side, with the numbers distressed Tennessee sellers rarely get to see. What each one actually nets you after the loan is paid.",
  alternates: { canonical: "/guides/cash-offer-vs-auction" },
}

export default function CashOfferVsAuctionGuide() {
  return (
    <>
      <GuideJsonLd
        slug="cash-offer-vs-auction"
        headline="Cash Offer vs. Marketed Auction in Tennessee: The Real Math"
        description="A 'we buy houses' cash offer versus a marketed auction, side by side, with the numbers distressed Tennessee sellers rarely see."
        datePublished="2026-07-12"
        dateModified="2026-07-12"
        breadcrumbName="Cash Offer vs. Auction"
      />
      <GuideShell
        eyebrow="Comparison guide"
        title={
          <>
            Cash offer vs. marketed auction:{" "}
            <span className="text-[var(--mocha)]">the math they skip</span>.
          </>
        }
        standfirst={
          <>
            When you are behind on payments, the only people calling are cash
            buyers. Their offer is fast and it feels like a lifeline. Here is
            what that speed actually costs, next to what a marketed auction can
            do with the same deadline.
          </>
        }
        updated="July 2026"
      >
        <GuideSection title="The two offers are not the same product">
          <p>
            A cash buyer, whether they call themselves a wholesaler, an
            iBuyer, or a &quot;we buy houses&quot; company, is buying your home
            at a discount to resell it. The discount is the business. A
            marketed auction does the opposite: it exposes your home to a pool
            of competing buyers and lets the highest bid set the price. Both
            can close fast enough to beat a trustee sale. They just send the
            difference in price to very different places.
          </p>
          <GuideKey>
            The cash offer sends the discount to the buyer. The auction sends
            it back to you. That is the entire comparison, in one sentence.
          </GuideKey>
        </GuideSection>

        <GuideSection id="cash-math" title="What a cash offer actually nets you">
          <p>
            Cash buyers do not pull numbers out of the air. They price
            distressed property with a published formula, the{" "}
            <strong className="text-[var(--ink)]">70% rule</strong>.
            <Cite href="https://www.investopedia.com/terms/1/70-percent-rule.asp" n={1} /> Take
            a home worth about $484,000 fixed up:
          </p>
          <MathRows
            rows={[
              ["After-repair value", "$484,000"],
              ["× 70% (the industry ceiling on what they will pay)", "$338,800"],
              ["− Estimated repairs", "− $25,000"],
              ["− Their assignment fee / resale spread", "− $10,000"],
              ["− Required investor profit", "− $40,000"],
            ]}
            total={["Cash offer to you", "≈ $263,800"]}
            tone="meh"
          />
          <p>
            Now subtract a $290,000 loan payoff. On paper the homeowner is{" "}
            <strong className="text-[var(--ink)]">underwater by about $26,000</strong>,
            so the buyer either asks you to bring cash to closing or walks. In
            practice, many sellers accept a slightly higher offer, around
            $314,000, that nets roughly{" "}
            <strong className="text-[var(--ink)]">$24,000</strong> after the loan is
            paid.
          </p>
          <GuideNote label="What you are really paying for">
            The repairs, the assignment fee, and the investor margin are not
            services done for you. They are the price of closing in seven days
            instead of forty. That is a real trade, and sometimes speed is
            worth it. But it should be a choice you make with the number in
            front of you, not the only door you knew was open.
          </GuideNote>
        </GuideSection>

        <GuideSection id="auction-math" title="What a marketed auction can net you">
          <p>Same house. Different process.</p>
          <MathRows
            rows={[
              ["Winning bid (targeting 80 to 88% of retail)", "$390,000 – $425,000"],
              ["− Loan payoff", "− $290,000"],
              ["− Closing costs", "− $5,000"],
            ]}
            total={["Net to you", "≈ $95,000 – $130,000"]}
            tone="win"
          />
          <p>
            The buyer pays a premium on top of their bid, typically 10%, which
            covers the auction firm. You do not pay it and you do not see it.
            No listing fee, no commission from your side.
          </p>
          <p className="text-[var(--ink-faint)] text-[14px]">
            A note on the range so it stays honest: courthouse-step foreclosure
            auctions, which are cash-only distress sales with no marketing,
            historically clear around 59% of a home&apos;s fixed-up value.
            <Cite href="https://www.attomdata.com/news/" n={2} /> A{" "}
            <em>properly marketed</em> sale through a licensed Tennessee auction
            firm, with photos, advertising, a 30-to-60-day campaign, and
            financed buyers welcome, clears materially higher. We model
            conservatively at 80 to 88%, below what many practitioners target.
          </p>
        </GuideSection>

        <GuideSection id="side-by-side" title="Side by side, same house, same deadline">
          <div className="overflow-x-auto rounded-xl border border-[var(--rule-strong)]">
            <table className="w-full text-[13px] md:text-[14px]">
              <thead>
                <tr className="border-b border-[var(--rule-strong)] text-[var(--ink-faint)]">
                  <th className="text-left font-medium py-3 px-4">Path</th>
                  <th className="text-right font-medium py-3 px-4">You net (after $290k loan)</th>
                  <th className="text-right font-medium py-3 px-4">Speed</th>
                </tr>
              </thead>
              <tbody className="text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4">Do nothing, trustee sale runs</td>
                  <td className="py-3 px-4 text-right text-[var(--oxblood)]/70 tabular-nums">$0</td>
                  <td className="py-3 px-4 text-right text-[var(--ink-faint)]">n/a</td>
                </tr>
                <tr className="border-b border-[var(--rule)]">
                  <td className="py-3 px-4">Cash offer</td>
                  <td className="py-3 px-4 text-right text-[var(--ink-soft)] tabular-nums">≈ $24,000</td>
                  <td className="py-3 px-4 text-right text-[var(--ink-faint)]">~7 days</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Marketed auction</td>
                  <td className="py-3 px-4 text-right text-[var(--mocha)] font-semibold tabular-nums">≈ $95k – $130k</td>
                  <td className="py-3 px-4 text-right text-[var(--ink-faint)]">30 – 45 days</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[var(--ink-faint)] text-[12px] leading-[1.6]">
            Illustration using round numbers on a $484k-value home with a $290k
            loan. Your figures depend on your home&apos;s value, your balance,
            condition, and buyer turnout. Auction outcomes are not guaranteed.
            We will run your actual numbers before you decide anything.
          </p>
        </GuideSection>

        <GuideSection title="How to use this">
          <GuideKey>
            If you have little or no equity, or the house needs heavy work, a
            cash offer may genuinely be your best move, and we will tell you so.
            If you have real equity and any time before the sale, an auction
            usually keeps far more of it in your pocket. The only wrong move is
            taking the first offer without seeing the other number.
          </GuideKey>
        </GuideSection>
      </GuideShell>

      <GuideRelated
        links={[
          { href: "/guides/wholesaler-economics", label: "The 70% formula, broken all the way down" },
          { href: "/guides/tennessee-foreclosure-process", label: "How the Tennessee foreclosure timeline works" },
          { href: "/guides/short-sale-vs-auction", label: "What if I owe more than it's worth?" },
          { href: "/homeowners", label: "See your actual numbers: free call" },
        ]}
      />
    </>
  )
}

function MathRows({
  rows,
  total,
  tone,
}: {
  rows: Array<[string, string]>
  total: [string, string]
  tone: "win" | "meh"
}) {
  const totalColor = tone === "win" ? "text-[var(--mocha)]" : "text-[var(--ink-soft)]"
  return (
    <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] overflow-hidden">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-[var(--rule)] text-[14px]"
        >
          <span className="text-[var(--ink-soft)]">{label}</span>
          <span className="tabular-nums text-[var(--ink-soft)] whitespace-nowrap">{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--paper-raised)] text-[15px] font-semibold">
        <span className="text-[var(--ink)]">{total[0]}</span>
        <span className={`tabular-nums whitespace-nowrap ${totalColor}`}>{total[1]}</span>
      </div>
    </div>
  )
}
