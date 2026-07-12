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
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors">
            FALCO
          </Link>
          <Link href="/" className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors">
            ← Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 md:px-10 md:pt-24">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          Foreclosure by county
        </div>
        <h1 className="mt-6 text-[38px] md:text-[58px] leading-[1.02] tracking-[-0.03em] font-semibold">
          Foreclosure help, county by county.
        </h1>
        <p className="mt-7 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          Tennessee foreclosure runs the same law statewide, but the details
          differ by county: where the trustee sale is held, where notices are
          published, who to contact about your money afterward. Find your
          county below.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 grid sm:grid-cols-2 gap-3">
        {COUNTIES.map((c) => (
          <Link
            key={c.slug}
            href={`/foreclosure/${c.slug}`}
            className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 hover:border-emerald-400/30 transition-colors"
          >
            <div className="text-[17px] font-semibold text-white group-hover:text-emerald-100">
              {c.county} County
            </div>
            <div className="mt-0.5 text-[13px] text-white/50">{c.seat} area</div>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        <p className="text-[13px] text-white/45 leading-[1.7]">
          Not seeing your county? FALCO works statewide in Tennessee.{" "}
          <Link href="/homeowners" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4">
            Start with a free 15-minute call
          </Link>{" "}
          and we&apos;ll run your numbers wherever your home is.
        </p>
      </section>
    </main>
  )
}
