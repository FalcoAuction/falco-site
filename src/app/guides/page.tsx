import Link from "next/link"
import { GUIDE_GROUPS } from "./guide-index"
import GuideSearch from "./guide-search"

export const metadata = {
  title: "Tennessee Guides for Estates, Business Closings, Liens and Foreclosure | FALCO",
  description:
    "Plain-English Tennessee guides for every distressed sale: estates and probate, closing a business, bankruptcy and receivership, lien sales, tax-delinquent property, land that won't sell, and foreclosure.",
  alternates: { canonical: "/guides" },
}

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

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
          Guides
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
        </div>
        <h1 className="mt-6 text-[44px] md:text-[68px] leading-[1.02] font-semibold text-balance">
          Selling in a hard moment, in plain English.
        </h1>
        <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
          An estate to settle, a business to close, a lien to collect, taxes
          behind, a foreclosure date on the calendar. Each one has its own
          Tennessee rules about who can sell, who has to be told, and how
          long it takes. These guides lay them out with the statutes cited,
          written by a licensed Tennessee auctioneer.
        </p>
        <nav aria-label="Situations" className="mt-8 flex flex-wrap gap-2">
          {GUIDE_GROUPS.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-full border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-3.5 py-1.5 text-[13px] text-[var(--ink-soft)] hover:border-[var(--mocha)] hover:text-[var(--ink)] transition-colors"
            >
              {g.label}
            </a>
          ))}
        </nav>
      </section>

      <GuideSearch groups={GUIDE_GROUPS} />

      <div className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        <section className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
          <h2 className="text-[28px] md:text-[38px] leading-[1.12] font-semibold text-[var(--paper)]">
            Not sure which one fits?
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] leading-[1.65] text-[color-mix(in_oklab,var(--paper)_74%,transparent)]">
            Tell us what happened. We come back within one business day with
            what is worth auctioning and which licensed Tennessee firm sells
            it best. No cost to you. The buyer pays a 10% premium on top of
            the winning bid.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/start"
              className="inline-flex items-center justify-center rounded-md bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] text-white font-semibold text-[15px] px-6 py-3 transition-colors"
            >
              Tell us what happened →
            </Link>
            <Link
              href="/#ask"
              className="text-[14px] text-[var(--paper)] underline underline-offset-4 decoration-[color-mix(in_oklab,var(--paper)_35%,transparent)]"
            >
              Or ask a quick question
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
