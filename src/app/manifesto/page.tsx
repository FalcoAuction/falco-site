import Link from "next/link"

export const metadata = {
  title: "Why FALCO exists — Manifesto",
  description:
    "Why we built FALCO instead of becoming another wholesaler. The math, the harm, the alternative.",
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
          a week to people who do nothing for it.
        </h1>
        <p className="mt-8 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          That's why FALCO exists. The harm, the math, the alternative.
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32 space-y-20 md:space-y-28">

        {/* 01 — The setup */}
        <Block n="01" title="The setup nobody talks about">
          <p>
            A Tennessee homeowner falls behind on their mortgage. Divorce,
            job loss, medical bills — pick one.
          </p>
          <p>
            Within 120 days the lender files a notice of substitution of
            trustee. That filing is public record. By the next afternoon,
            the homeowner's phone is ringing.
          </p>
          <p>
            Every caller has the same offer.{" "}
            <em className="text-white/85">
              "We buy houses cash, as-is, close in seven days."
            </em>
          </p>
          <p>
            None of them are telling the homeowner what their house is
            actually worth.
          </p>
        </Block>

        <PullQuote>The discount isn't a side effect. The discount IS the business model.</PullQuote>

        {/* 02 — THE MATH */}
        <Block n="02" title="The math">
          <p>
            Take a Davidson County home worth <Hl>$500,000</Hl> with a{" "}
            <Hl>$300,000</Hl> loan balance. Trustee sale is six weeks out.
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
            label="Wholesaler offer (typical)"
            value="~$25,000"
            sub="Cash, fast, no questions. Roughly 12% of the equity in the home."
            tone="meh"
          />
          <StatCard
            label="Marketed auction"
            value="~$130,000"
            sub="Open competitive bidding through a state-licensed TN auction firm."
            tone="win"
          />
        </div>

        {/* How the wholesaler gets to $25K */}
        <Block n="02a" title="How a wholesaler arrives at $25,000">
          <p className="text-white/55 text-[14px]">
            They're not pulling it out of a hat. There's a formula:
          </p>
          <MathTable
            rows={[
              { label: "After-repair value (ARV)", value: "$500,000" },
              { label: "× 70% (the wholesaler rule of thumb)", value: "$350,000" },
              { label: "− Estimated repairs they assume", value: "− $25,000" },
              { label: "− Wholesaler assignment fee", value: "− $10,000" },
              { label: "− Buyer's expected profit margin", value: "− $40,000" },
              { label: "− Loan payoff", value: "− $300,000" },
            ]}
            total={{ label: "Net to homeowner", value: "$25,000" }}
            totalTone="meh"
          />
          <p>
            Three of those line items — repairs, assignment fee, buyer
            margin — aren't services. They're discounts taken before the
            homeowner sees a dollar.
          </p>
        </Block>

        {/* How marketed auction gets to $130K */}
        <Block n="02b" title="How a marketed auction arrives at $130,000">
          <p className="text-white/55 text-[14px]">Same house. Different process.</p>
          <MathTable
            rows={[
              { label: "Final winning bid (≈86% of retail)", value: "$430,000" },
              { label: "− Loan payoff", value: "− $300,000" },
              { label: "− Closing costs (title, recording, etc.)", value: "− $5,000" },
            ]}
            total={{ label: "Net to homeowner", value: "$125,000+" }}
            totalTone="win"
          />
          <p>
            The buyer pays an 8% premium on top of their bid. That covers
            the auction firm + FALCO. The homeowner doesn't see it and
            doesn't pay it.
          </p>
        </Block>

        <PullQuote>
          The wholesaler's <Hl>$105,000 spread</Hl> isn't earned. It's the
          gap between what they paid and what the home was always worth.
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
            Tennessee's twelve largest counties produce roughly{" "}
            <Hl>30 to 50</Hl> qualifying distress filings per week. If even
            half of those homeowners take a wholesaler offer:
          </p>
        </Block>

        <div className="grid md:grid-cols-2 gap-4 -mt-10 md:-mt-16">
          <BigStat label="Per week" value="~$1.5M" sub="lost to wholesaler discounts" />
          <BigStat label="Per year" value="~$78M" sub="of Tennessee homeowner equity" />
        </div>

        <Block n="02e" title="What that means per family">
          <p>
            A difference of <Hl>$80,000 to $200,000</Hl> they take into the
            next chapter of their life. Or don't.
          </p>
          <p>
            The gap between recovering in twelve months versus ten years.
            Sometimes never.
          </p>
        </Block>

        {/* 03 — Why this works at all */}
        <Block n="03" title="Why the wholesaler model works at all">
          <p>It depends on three things.</p>
          <ThreeReasons />
          <p>FALCO breaks all three.</p>
          <ul className="space-y-2.5 text-[14px] md:text-[15px] text-white/65 mt-4 list-disc pl-5 marker:text-emerald-400/60">
            <li>We monitor the public records every day. We know before the wholesaler call.</li>
            <li>We show the homeowner the math, in writing, on the first call.</li>
            <li>
              We route the home to a state-licensed Tennessee auction firm
              that runs a real marketed sale.
            </li>
          </ul>
        </Block>

        {/* 04 */}
        <Block n="04" title="Why we don't buy the house ourselves">
          <p>
            Becoming another buyer would make us part of the problem.
            Every dollar we'd profit on the spread is a dollar that should
            have gone to the homeowner.
          </p>
          <p>
            FALCO is paid the way auction houses have been paid for two
            hundred years: a buyer's premium added to the winning bid.
            The homeowner pays nothing.
          </p>
          <p>
            We have no incentive to push the sale price down. We have
            every incentive to push it up.
          </p>
        </Block>

        {/* 05 */}
        <Block n="05" title="What we're not">
          <p>
            We're not going to call you the day after the notice files
            offering you cash. We're not going to mail you a letter with
            a handwritten font claiming we're a local family.
          </p>
          <p>
            We're not the courthouse foreclosure auction — that's the
            thing we're trying to prevent.
          </p>
          <p>
            We're a Tennessee company that thinks an honest auction is
            better than a predatory cash offer, and we built the machinery
            to deliver one.
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
  const examples = [
    { home: "$300K home", balance: "$180K loan", trustee: "$0", whole: "~$15K", auction: "~$75K" },
    { home: "$500K home", balance: "$300K loan", trustee: "$0", whole: "~$25K", auction: "~$130K" },
    { home: "$750K home", balance: "$450K loan", trustee: "$0", whole: "~$40K", auction: "~$200K" },
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
              Wholesaler
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
                <div className="text-[12px] text-white/45 mt-0.5">{e.balance}</div>
              </td>
              <td className="py-3 px-3 text-right text-red-300/65 tabular-nums">{e.trustee}</td>
              <td className="py-3 px-3 text-right text-white/55 tabular-nums">{e.whole}</td>
              <td className="py-3 px-4 text-right text-emerald-300 tabular-nums font-semibold">
                {e.auction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ThreeReasons() {
  const items = [
    {
      h: "Information asymmetry",
      b: "The homeowner doesn't know what their house would clear. The wholesaler does — that's the job.",
    },
    {
      h: "Time pressure",
      b: "The trustee sale date is real. Once it passes, the equity is gone. A fast cash offer feels like the only option even when better ones exist.",
    },
    {
      h: "Missing alternative",
      b: "The only people calling are wholesalers. Realtors don't proactively chase distress. Auction firms don't market to homeowners. Lenders certainly don't.",
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
