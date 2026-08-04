import Link from "next/link"

export const metadata = {
  title: "Tennessee Foreclosure Guides | FALCO",
  description:
    "Plain-English guides to Tennessee foreclosure: how the trustee sale process works, your options at each stage, and how selling compares to a cash offer or short sale.",
  alternates: { canonical: "/guides" },
}

// Keep this list in sync with the guide routes + sitemap.ts.
const GUIDES: Array<{ href: string; title: string; blurb: string }> = [
  {
    href: "/guides/tennessee-foreclosure-process",
    title: "The Tennessee Foreclosure Process, Start to Finish",
    blurb:
      "How a non-judicial (trustee sale) foreclosure works in Tennessee: the notice, the timeline, sale day, and the exits available at each stage.",
  },
  {
    href: "/guides/postpone-trustee-sale-tennessee",
    title: "Can You Postpone a Trustee Sale in Tennessee?",
    blurb:
      "If your sale date is close: the real ways a Tennessee trustee sale gets pushed back or stopped, who controls each one, and how to use the time.",
  },
  {
    href: "/guides/cash-offer-vs-auction",
    title: "Cash Offer vs. Marketed Auction",
    blurb:
      "What a 'we buy houses' cash offer actually nets you versus a marketed auction, with the math distressed sellers rarely get to see.",
  },
  {
    href: "/guides/short-sale-vs-auction",
    title: "Short Sale vs. Selling Before the Sale",
    blurb:
      "When a short sale makes sense, when it doesn't, and how it compares to selling your home outright before the trustee sale.",
  },
  {
    href: "/guides/wholesaler-economics",
    title: "How Wholesalers Price a Distressed House",
    blurb:
      "The 70% formula behind every cash offer, why the discount exists, and where your equity goes when you take one.",
  },
  {
    href: "/guides/tennessee-foreclosure-surplus-funds",
    title: "Foreclosure Surplus Funds: Is Money Owed to You?",
    blurb:
      "If your home sold at foreclosure for more than you owed, the surplus may be yours. How to claim it for free, and the recovery-company traps to avoid.",
  },
]

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[14px] font-semibold tracking-[0.3em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/"
            className="text-[13px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--mocha)] transition-colors"
          >
            Home →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 md:px-10 md:pt-24">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
          Guides
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
        </div>
        <h1 className="mt-6 text-[44px] md:text-[68px] leading-[1.02] font-semibold text-balance">
          Tennessee foreclosure, in plain English.
        </h1>
        <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
          If you&apos;re facing foreclosure in Tennessee, you have more options
          than the cash buyers calling you would like you to think. These guides
          lay out how the process actually works and what each path is worth,
          written by a licensed Tennessee auctioneer.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 grid gap-4">
        {GUIDES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-6 md:p-7 hover:border-[var(--mocha)] transition-colors"
          >
            <h2 className="text-[24px] md:text-[30px] leading-tight font-semibold text-[var(--ink)]">
              {g.title}
            </h2>
            <p className="mt-2 text-[14px] md:text-[15px] leading-[1.6] text-[var(--ink-faint)]">
              {g.blurb}
            </p>
            <span className="mt-3 inline-block text-[13px] font-semibold text-[var(--mocha)]">
              Read the guide →
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
