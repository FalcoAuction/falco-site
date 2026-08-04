import Link from "next/link"
import { COUNTIES } from "./county-list"

export const metadata = {
  title: "Tennessee Foreclosure Help by County | FALCO",
  description:
    "Facing foreclosure in Tennessee? Find how trustee sales work in your county, where notices are published, and how to sell before the sale to keep your equity. Davidson, Shelby, Knox, Hamilton, Rutherford, Williamson and more.",
  alternates: { canonical: "/foreclosure" },
}

export default function ForeclosureCountyIndex() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-[14px] font-semibold tracking-[0.3em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors">
            FALCO
          </Link>
          <Link href="/" className="text-[13px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--mocha)] transition-colors">
            Home →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 md:px-10 md:pt-24">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
          Foreclosure by county
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
        </div>
        <h1 className="mt-6 text-[44px] md:text-[68px] leading-[1.02] font-semibold text-balance">
          Foreclosure help, county by county.
        </h1>
        <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
          Tennessee foreclosure runs the same law statewide, but the details
          differ by county: where the trustee sale is held, where notices are
          published, who to contact about your money afterward. Find your county
          below.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16 md:px-10 grid sm:grid-cols-2 gap-3">
        {COUNTIES.map((c) => (
          <Link
            key={c.slug}
            href={`/foreclosure/${c.slug}`}
            className="group rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-5 py-4 hover:border-[var(--mocha)] transition-colors"
          >
            <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--ink)] leading-tight">
              {c.county} County
            </div>
            <div className="mt-0.5 text-[13px] text-[var(--ink-faint)]">{c.seat} area</div>
          </Link>
        ))}
        <Link
          href="/foreclosure/memphis"
          className="group rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-5 py-4 hover:border-[var(--mocha)] transition-colors"
        >
          <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--ink)] leading-tight">
            Memphis
          </div>
          <div className="mt-0.5 text-[13px] text-[var(--ink-faint)]">City guide (Shelby County)</div>
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        <p className="text-[14px] text-[var(--ink-faint)] leading-[1.7]">
          Not seeing your county? FALCO works statewide in Tennessee.{" "}
          <Link href="/homeowners" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
            Start with a free 15-minute call
          </Link>{" "}
          and we&apos;ll run your numbers wherever your home is.
        </p>
      </section>
    </main>
  )
}
