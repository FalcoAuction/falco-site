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
]

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

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
            ← Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 md:px-10 md:pt-24">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          Guides
        </div>
        <h1 className="mt-6 text-[38px] md:text-[58px] leading-[1.02] tracking-[-0.03em] font-semibold">
          Tennessee foreclosure, in plain English.
        </h1>
        <p className="mt-7 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          If you&apos;re facing foreclosure in Tennessee, you have more options
          than the cash buyers calling you would like you to think. These
          guides lay out how the process actually works and what each path is
          worth, written by a licensed Tennessee auctioneer.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 grid gap-4">
        {GUIDES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-7 hover:border-emerald-400/30 transition-colors"
          >
            <h2 className="text-[20px] md:text-[24px] leading-tight tracking-tight font-semibold text-white group-hover:text-emerald-100">
              {g.title}
            </h2>
            <p className="mt-2 text-[14px] md:text-[15px] leading-[1.6] text-white/55">
              {g.blurb}
            </p>
            <span className="mt-3 inline-block text-[13px] text-emerald-300/85">
              Read the guide →
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
