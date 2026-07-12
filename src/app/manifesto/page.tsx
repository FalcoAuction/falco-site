import Link from "next/link"

export const metadata = {
  title: "Why FALCO exists — Manifesto",
  description:
    "Tennessee homeowners lose six figures of equity to foreclosure every week. Most of it doesn't have to. The math, the three paths, and the one that keeps the money in the homeowner's pocket.",
  alternates: { canonical: "/manifesto" },
}

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/"
            className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 md:px-10 md:pt-32 md:pb-20">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          Manifesto
        </div>
        <h1 className="mt-6 text-[42px] md:text-[68px] leading-[1.0] tracking-[-0.03em] font-semibold">
          Tennessee homeowners lose{" "}
          <span className="text-emerald-400">six figures of equity</span>{" "}
          to foreclosure every week. Most of it doesn't have to.
        </h1>
        <p className="mt-8 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          When a home heads toward the courthouse, the equity disappears in
          one of three ways. FALCO is built to make sure none of them is
          the default. The math, the paths, the alternative — with sources,
          in Tennessee.
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32 space-y-20 md:space-y-28">

        {/* 01 — Where the equity goes */}
        <Block n="01" title="Where the equity goes">
          <p>
            A Tennessee homeowner falls behind on their mortgage. Divorce,
            job loss, medical bills — pick one.
          </p>
          <p>
            Within 120 days, the lender files a notice of substitution of
            trustee. That filing is public record. The clock starts.
          </p>
          <p>
            Over the next 6–12 weeks, the equity in their home walks out
            the door one of three ways:
          </p>
          <ul className="space-y-2.5 text-[15px] md:text-[17px] text-white/72 mt-3 list-disc pl-5 marker:text-emerald-400/60">
            <li>The bank takes it at the trustee sale. Equity = $0.</li>
            <li>A fast-cash buyer takes most of it under deadline pressure. Equity walks with the buyer.</li>
            <li>No one shows up. The trustee sale runs by default. See path one.</li>
          </ul>
          <p>
            Two of those three are the default. The third — keeping the
            equity intact while still hitting the lender's deadline — only
            happens if someone builds the machinery for it.
          </p>
        </Block>

        <PullQuote>The equity loss isn't a side effect of the foreclosure process. It's how the process is engineered to work.</PullQuote>

        {/* 02 — THE MATH */}
        <Block n="02" title="The math">
          <p>
            Take a Davidson County home worth <Hl>$484,000</Hl> — the
            December 2025 Nashville-area median per Redfin
            <Sup>1</Sup> — carrying a <Hl>$290,000</Hl> mortgage balance
            (60% LTV is typical). Trustee sale is six weeks out.
          </p>
          <p className="text-white/55">Three paths. Three very different numbers.</p>
        </Block>

        {/* Stat trio */}
        <div className="grid md:grid-cols-3 gap-4 -mt-10 md:-mt-16">
          <StatCard
            label="If the trustee sale closes"
            value="$0"
            sub="Bank takes the property for the loan balance. Equity vaporized."
            tone="loss"
          />
          <StatCard
            label="Fast-cash offer (typical)"
            value="~$24,000"
            sub="Cash, fast, no questions. Built on the wholesale-industry 70% rule that most cash buyers use to price distressed property."
            tone="meh"
          />
          <StatCard
            label="Marketed auction"
            value="~$95,000–$120,000"
            sub="Open competitive bidding through a state-licensed TN auction firm."
            tone="win"
          />
        </div>

        {/* How the cash offer gets to ~$24K */}
        <Block n="02a" title="How a fast-cash offer arrives at $24,000">
          <p className="text-white/55 text-[14px]">
            It's not arbitrary. The cash-buyer market — wholesalers, iBuyers,
            "we buy houses" operators — prices distressed property using a
            published formula called the 70% rule
            <Sup>2</Sup>:
          </p>
          <MathTable
            rows={[
              { label: "After-repair value (ARV)", value: "$484,000" },
              { label: "× 70% (industry-standard MAO ceiling)", value: "$338,800" },
              { label: "− Estimated repairs (assumed)", value: "− $25,000" },
              { label: "− Assignment fee / buyer spread", value: "− $10,000" },
              { label: "− Required investor profit margin", value: "− $40,000" },
            ]}
            total={{ label: "Cash offer to seller", value: "$263,800" }}
            totalTone="meh"
          />
          <p>
            Subtract the $290,000 loan payoff and the homeowner is{" "}
            <Hl>−$26,200 underwater</Hl>. To make the cash offer "work,"
            the buyer asks the homeowner to bring cash to closing — or
            walks. Most homeowners take a slightly higher offer (around{" "}
            <Hl>$314,000</Hl>) that nets them <Hl>~$24,000</Hl> after the
            loan is paid.
          </p>
          <p>
            That's the trade. Speed in exchange for a discount. The
            discount is real — repairs, assignment fee, investor margin
            aren't services rendered. They're the price of closing in
            seven days instead of forty.
          </p>
        </Block>

        {/* How marketed auction gets to ~$95-120K */}
        <Block n="02b" title="How a marketed auction arrives at $95,000–$120,000">
          <p className="text-white/55 text-[14px]">Same house. Different process.</p>
          <MathTable
            rows={[
              { label: "Final winning bid (80–88% of retail target)", value: "$390,000–$425,000" },
              { label: "− Loan payoff", value: "− $290,000" },
              { label: "− Closing costs (title, recording, etc.)", value: "− $5,000" },
            ]}
            total={{ label: "Net to homeowner", value: "$95,000–$130,000" }}
            totalTone="win"
          />
          <p>
            The buyer pays a 10% premium on top of their bid. That covers
            the auction firm + FALCO. The homeowner doesn't see it and
            doesn't pay it.
          </p>
          <p className="text-white/55 text-[13px]">
            Note on the range: ATTOM data puts foreclosure-auction winning
            bids at ~59.5% of after-repair value
            <Sup>3</Sup> — those are courthouse-step distress sales with
            cash investor buyers. A properly marketed sale through a
            state-licensed auction firm (photos, advertising, 30–60 day
            campaign, financed buyers welcome) clears materially higher.
            Industry practitioners typically target 80–95%; we model
            conservatively at 80–88%.
          </p>
        </Block>

        <PullQuote>
          The spread between a fast-cash offer and a marketed auction —{" "}
          <Hl>$70,000 to $100,000</Hl> on this house — isn't a service
          fee. It's the price of speed pricing, paid out of the
          homeowner's equity instead of by the buyer.
        </PullQuote>

        {/* 02c — Same shape at every price point */}
        <Block n="02c" title="Same shape at every price point">
          <p>
            We picked $500K because Davidson County's in the headlines.
            The ratios don't change much.
          </p>
        </Block>

        <ExampleGrid />

        {/* 02d — Now multiply */}
        <Block n="02d" title="Now multiply">
          <p>
            Tennessee has roughly <Hl>1 million</Hl> owner-occupied homes
            with an active mortgage<Sup>4</Sup>. About <Hl>1.3%</Hl> of
            those borrowers became seriously delinquent in 2025
            <Sup>5</Sup> — call it ~13,000 households a year statewide.
          </p>
          <p>
            Roughly 35–45% of serious delinquencies escalate to a trustee
            sale filing. That's <Hl>~100 filings per week</Hl>, statewide.
            If even half of those families take a fast-cash offer instead
            of a marketed sale, the conservative weekly equity transfer
            looks like this:
          </p>
        </Block>

        <div className="grid md:grid-cols-2 gap-4 -mt-10 md:-mt-16">
          <BigStat label="Per week" value="~$1.5M" sub="of TN homeowner equity extracted via speed-pricing on distressed property" />
          <BigStat label="Per year" value="~$78M" sub="paid out of homeowner pockets to close the speed-vs-market gap nobody told them existed." />
        </div>

        <Block n="02e" title="What that means per family">
          <p>
            A difference of <Hl>$70,000 to $130,000</Hl> they take into
            the next chapter of their life. Or don't.
          </p>
          <p>
            The gap between recovering in twelve months versus ten years.
            Sometimes never.
          </p>
        </Block>

        {/* 02f — The machinery */}
        <Block n="02f" title="The extraction machinery is well-oiled">
          <p>
            Nationally, an estimated <Hl>50,000 to 150,000</Hl> wholesale
            assignments happen each year. At an average <Hl>$10,000</Hl>{" "}
            assignment fee per deal<Sup>6</Sup>, that's roughly{" "}
            <Hl>$0.5–1.5 billion</Hl> in assignment fees alone — separate
            from the much larger spread end-buyers capture on the
            distressed-to-retail flip.
          </p>
          <p>
            That market funds an entire ecosystem of mailers, cold-call
            scripts, courthouse-record subscriptions, and YouTube
            "real estate guru" courses teaching the next wave of operators
            how to buy distress at a discount. The pitch is always the
            same: <em className="text-white/85">no money down, no license
            required, just send a thousand mailers a week and wait for
            someone desperate to call.</em>
          </p>
          <p>
            The machinery works. It just works against the homeowner's
            equity, and nobody on the buying side has any reason to
            point that out.
          </p>
        </Block>

        {/* 03 — Why this works at all */}
        <Block n="03" title="Why the extraction model works at all">
          <p>It depends on three things.</p>
          <ThreeReasons />
          <p>FALCO breaks all three.</p>
          <ul className="space-y-2.5 text-[14px] md:text-[15px] text-white/65 mt-4 list-disc pl-5 marker:text-emerald-400/60">
            <li>We monitor public records every day. We reach the homeowner before the equity decision gets locked in.</li>
            <li>We show all three numbers in writing, on the first call — trustee sale, fast-cash offer, marketed auction.</li>
            <li>
              We route the home to a state-licensed Tennessee auction firm
              that runs a real marketed sale on the lender's timeline.
            </li>
          </ul>
        </Block>

        {/* 04 */}
        <Block n="04" title="Why we don't buy the house ourselves">
          <p>
            If we bought your house, our incentives would line up against
            yours. Every dollar we'd profit on the spread is a dollar
            that should have gone with the equity, into your pocket.
          </p>
          <p>
            FALCO is paid the way auction houses have been paid for two
            hundred years: a buyer's premium added to the winning bid.
            The homeowner pays nothing.
          </p>
          <p>
            We have no incentive to push the sale price down. We have
            every incentive to push it up. Our paycheck is a percentage
            of yours.
          </p>
        </Block>

        {/* 05 */}
        <Block n="05" title="What we're not">
          <p>
            We're not going to call you the day after the notice files
            offering to buy your house. We're not going to mail you a
            letter with a handwritten font claiming we're a local family.
          </p>
          <p>
            We're not the courthouse foreclosure auction. That's the
            mechanism that takes the equity. We're built around the
            opposite outcome.
          </p>
          <p>
            We're a Tennessee company that believes the equity in your
            home is yours — and we built the machinery to keep it that
            way when foreclosure is coming.
          </p>
        </Block>

        {/* 06 */}
        <Block n="06" title="If you're a homeowner reading this">
          <p>
            Get the math before you sign anything. Even if it's not us.
          </p>
          <p>
            The thirty minutes it takes to check what your house would
            actually clear is the highest-paying half-hour you'll ever
            work.
          </p>
          <p>
            We'll do that math for free. No pitch, no pressure, no
            obligation. If the auction route doesn't fit, we'll tell you
            plainly.
          </p>
        </Block>

        {/* Sources */}
        <div id="sources" className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 scroll-mt-20">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/85 font-semibold mb-4">
            Sources
          </div>
          <ol className="space-y-3 text-[13px] leading-[1.65] text-white/65 list-decimal pl-5 marker:text-emerald-400/60">
            <li>
              County median home values, December 2025.{" "}
              <a
                href="https://www.redfin.com/county/2563/TN/Davidson-County/housing-market"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4 break-words"
              >
                Redfin · Davidson County housing market
              </a>
              ;{" "}
              <a
                href="https://www.redfin.com/county/2591/TN/Knox-County/housing-market"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Knox
              </a>
              ;{" "}
              <a
                href="https://www.zillow.com/home-values/1388/shelby-county-tn/"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Shelby (Zillow)
              </a>
              .
            </li>
            <li>
              The 70% rule and Maximum Allowable Offer (MAO) formula —
              standard wholesale-industry math.{" "}
              <a
                href="https://www.realestateskills.com/blog/wholesale-formula"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Real Estate Skills · Wholesale formula guide
              </a>
              ;{" "}
              <a
                href="https://www.limaone.com/70-rule-real-estate/"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Lima One Capital · 70% rule
              </a>
              .
            </li>
            <li>
              Marketed-auction net assumptions are FALCO's modeled range
              based on industry-standard 80–95% retail-clearance targets
              for properly marketed real estate auctions through
              state-licensed firms. Not a guarantee — every property is
              different. We'll quote your specific situation honestly when
              you call.
            </li>
            <li>
              Tennessee owner-occupied housing units, mortgaged share. U.S.
              Census Bureau, American Community Survey, latest 5-year
              estimates.{" "}
              <a
                href="https://thda.org/research-and-reports/"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Tennessee Housing Development Agency · Research & Reports
              </a>
              .
            </li>
            <li>
              2025 serious-delinquency rates (90+ days past due) for
              residential mortgages.{" "}
              <a
                href="https://www.atlantafed.org/center-for-housing-and-policy/data-and-tools/mortgage-analytics-and-performance-dashboard.aspx"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Federal Reserve Bank of Atlanta · Mortgage Analytics &
                Performance Dashboard
              </a>
              ; cross-referenced against{" "}
              <a
                href="https://www.mba.org/news-and-research/research-and-economics/single-family-research/national-delinquency-survey"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                MBA National Delinquency Survey
              </a>
              .
            </li>
            <li>
              Average wholesale assignment fee per deal ($5K–$20K, ~$10K
              median).{" "}
              <a
                href="https://batchleads.io/blog/wholesaling-real-estate-salary-potential-in-2024"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                BatchLeads · Wholesaling income data
              </a>
              . Annual deal-volume range is FALCO's estimate based on
              industry surveys; precise totals aren't publicly tracked
              because most wholesale assignments don't show up in MLS
              data.
            </li>
          </ol>
          <p className="mt-5 text-[12px] text-white/35 leading-[1.6]">
            Spot a number that looks wrong or has a better source? Email{" "}
            <a
              href="mailto:falco@falco.llc"
              className="text-emerald-300/85 hover:text-emerald-200"
            >
              falco@falco.llc
            </a>{" "}
            and we'll update it.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-8 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 mb-3 font-semibold">
            Talk to us
          </div>
          <h3 className="text-[26px] md:text-[34px] leading-tight tracking-tight font-semibold">
            Free 15-minute call. Real numbers for your specific situation.
          </h3>
          <p className="mt-3 text-[14px] md:text-[16px] text-white/65 leading-[1.65]">
            Within one business day we'll come back to you with what your
            home would clear at a marketed auction vs. what you'd lose at
            the trustee sale.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 items-center">
            <Link
              href="/homeowners"
              className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
            >
              Start with the form →
            </Link>
            <span className="text-[12px] text-white/45">
              Or email{" "}
              <a
                href="mailto:falco@falco.llc"
                className="text-emerald-300 hover:text-emerald-200"
              >
                falco@falco.llc
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <Link href="/homeowners" className="hover:text-white/70 transition-colors">Homeowners</Link>
            <Link href="/inquiry" className="hover:text-white/70 transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

// ============================================================================
// Section primitives
// ============================================================================

function Block({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid md:grid-cols-[80px_1fr] gap-3 md:gap-10">
      <div className="text-emerald-400/85 text-[12px] font-semibold tracking-[0.18em] tabular-nums pt-1">
        {n}
      </div>
      <div>
        <h2 className="text-[26px] md:text-[36px] tracking-tight font-semibold text-white leading-[1.1]">
          {title}
        </h2>
        <div className="mt-6 space-y-4 text-[16px] md:text-[18px] leading-[1.7] text-white/72">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Inline highlight — emerald number/keyword to draw the eye. */
function Hl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-emerald-300 font-medium tabular-nums">{children}</span>
  )
}

/** Footnote marker that links down to #sources. */
function Sup({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#sources"
      className="text-emerald-400/85 hover:text-emerald-300 text-[10px] font-semibold align-super ml-0.5 no-underline"
      aria-label={`Source ${children}`}
    >
      [{children}]
    </a>
  )
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-[120px] py-4 md:py-6">
      <blockquote className="border-l-2 border-emerald-400/60 pl-5 md:pl-7 text-[20px] md:text-[26px] leading-[1.4] tracking-tight font-medium text-white/85">
        {children}
      </blockquote>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: "loss" | "meh" | "win"
}) {
  const accent =
    tone === "win"
      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
      : tone === "loss"
      ? "border-red-400/25 bg-red-400/[0.04]"
      : "border-white/[0.08] bg-white/[0.02]"
  const valueColor =
    tone === "win" ? "text-emerald-300" : tone === "loss" ? "text-red-300/85" : "text-white/85"
  return (
    <div className={`rounded-xl border ${accent} p-5 md:p-6`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-semibold">
        {label}
      </div>
      <div className={`mt-3 text-[36px] md:text-[42px] font-semibold tracking-tight tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="mt-3 text-[13px] leading-[1.55] text-white/55">{sub}</div>
    </div>
  )
}

function BigStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-6 md:p-8">
      <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/85 font-semibold">
        {label}
      </div>
      <div className="mt-3 text-[48px] md:text-[60px] font-semibold tabular-nums tracking-tight text-emerald-300 leading-none">
        {value}
      </div>
      <div className="mt-3 text-[14px] leading-[1.55] text-white/65">{sub}</div>
    </div>
  )
}

function MathTable({
  rows,
  total,
  totalTone,
}: {
  rows: Array<{ label: string; value: string }>
  total: { label: string; value: string }
  totalTone: "win" | "meh"
}) {
  const totalColor = totalTone === "win" ? "text-emerald-300" : "text-white/85"
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <table className="w-full text-[14px] md:text-[15px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-white/[0.04]">
              <td className="py-3 px-4 text-white/65">{r.label}</td>
              <td className="py-3 px-4 text-right text-white/75 tabular-nums whitespace-nowrap">
                {r.value}
              </td>
            </tr>
          ))}
          <tr className="bg-white/[0.03]">
            <td className="py-4 px-4 text-[13px] uppercase tracking-[0.18em] font-semibold text-white/65">
              {total.label}
            </td>
            <td
              className={`py-4 px-4 text-right text-[20px] md:text-[24px] font-semibold tabular-nums ${totalColor}`}
            >
              {total.value}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ExampleGrid() {
  // Median home values pulled from Redfin (Dec 2025) and Zillow (Q4 2025).
  // Loan balances assume a 60% LTV — conservative midpoint for TN
  // homeowners 5–10 years into a 30-year mortgage.
  const examples = [
    {
      home: "Shelby County",
      sub: "$222K Memphis median · ~$133K loan",
      trustee: "$0",
      whole: "~$11K",
      auction: "~$45K–$59K",
    },
    {
      home: "Knox County",
      sub: "$391K Knoxville median · ~$235K loan",
      trustee: "$0",
      whole: "~$19K",
      auction: "~$78K–$103K",
    },
    {
      home: "Davidson County",
      sub: "$484K Nashville median · ~$290K loan",
      trustee: "$0",
      whole: "~$24K",
      auction: "~$95K–$130K",
    },
  ]
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden -mt-10 md:-mt-16">
      <table className="w-full text-[13px] md:text-[14px]">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="py-3 px-4 text-left text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold">
              Property
            </th>
            <th className="py-3 px-3 text-right text-[11px] uppercase tracking-[0.18em] text-red-300/65 font-semibold">
              Trustee sale
            </th>
            <th className="py-3 px-3 text-right text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold">
              Fast-cash offer
            </th>
            <th className="py-3 px-4 text-right text-[11px] uppercase tracking-[0.18em] text-emerald-300/85 font-semibold">
              Marketed auction
            </th>
          </tr>
        </thead>
        <tbody>
          {examples.map((e, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-b-0">
              <td className="py-3 px-4 text-white/85">
                <div className="font-medium">{e.home}</div>
                <div className="text-[12px] text-white/45 mt-0.5">{e.sub}</div>
              </td>
              <td className="py-3 px-3 text-right text-red-300/65 tabular-nums whitespace-nowrap">{e.trustee}</td>
              <td className="py-3 px-3 text-right text-white/55 tabular-nums whitespace-nowrap">{e.whole}</td>
              <td className="py-3 px-4 text-right text-emerald-300 tabular-nums font-semibold whitespace-nowrap">
                {e.auction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-[11px] text-white/40 leading-[1.5] border-t border-white/[0.06]">
        County medians from Redfin (Dec 2025)<Sup>1</Sup>. Fast-cash offer net derived
        from the 70% rule formula<Sup>2</Sup> the cash-buyer market uses to price
        distressed property; marketed auction net assumes 80–88% of retail less loan
        + closing.
      </div>
    </div>
  )
}

function ThreeReasons() {
  const items = [
    {
      h: "Information asymmetry",
      b: "The homeowner doesn't know what their house would actually clear at market. The cash buyer does — that's the job. The gap between those two numbers is the homeowner's equity.",
    },
    {
      h: "Time pressure",
      b: "The trustee sale date is real. Once it passes, the equity is gone. A fast cash offer feels like the only option even when a marketed sale could run on the same deadline.",
    },
    {
      h: "Missing alternative",
      b: "The only people calling are cash buyers. Realtors don't proactively chase distress. Auction firms don't market to homeowners. Lenders certainly don't.",
    },
  ]
  return (
    <div className="grid md:grid-cols-3 gap-3 mt-2">
      {items.map((it) => (
        <div
          key={it.h}
          className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"
        >
          <div className="text-[12px] uppercase tracking-[0.16em] text-emerald-300/85 font-semibold">
            {it.h}
          </div>
          <div className="mt-2 text-[13px] leading-[1.6] text-white/65">{it.b}</div>
        </div>
      ))}
    </div>
  )
}
