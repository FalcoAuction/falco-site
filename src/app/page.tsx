import Image from "next/image"
import Link from "next/link"

const stats = [
  { label: "Primary Focus", value: "Distress Asset Origination" },
  { label: "Current Output", value: "Acquisition Dossiers" },
  { label: "Execution Path", value: "Auction + Brokerage Routing" },
]

const workflow = [
  {
    step: "01",
    title: "Detect",
    body: "FALCO monitors upstream distress signals across targeted markets before most opportunities become widely visible.",
  },
  {
    step: "02",
    title: "Underwrite",
    body: "Each lead is enriched, pressure-tested, scored, and converted into a structured acquisition dossier built for decision speed.",
  },
  {
    step: "03",
    title: "Route",
    body: "Qualified opportunities are directed into the right auction, brokerage, and partner channels for monetization and execution.",
  },
]

const partnerTypes = [
  "Auction companies",
  "Brokerage partners",
  "Capital partners",
  "Distress operators",
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative isolate overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-30 bg-black" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.06),transparent_18%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(255,255,255,0.08)]">
                <Image
                  src="/falco-logo.jpg"
                  alt="Falco logo"
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                  priority
                />
              </div>

              <div>
                <div className="text-sm font-semibold tracking-[0.28em] text-white">
                  FALCO
                </div>
                <div className="text-xs text-white/45">
                  Fast Acquisition Lead Conversion Overlay
                </div>
              </div>
            </div>

            <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <Link href="#what-it-is" className="transition hover:text-white">
                What It Is
              </Link>
              <Link href="#how-it-works" className="transition hover:text-white">
                How It Works
              </Link>
              <Link href="#partners" className="transition hover:text-white">
                Partners
              </Link>
              <Link href="#request-access" className="transition hover:text-white">
                Request Access
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28">
          <div className="grid items-end gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/60 shadow-[0_12px_40px_rgba(255,255,255,0.05)]">
                Distress Asset Intelligence Engine
              </div>

              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white md:text-7xl">
                Find distress sooner.
                <br />
                Underwrite faster.
                <br />
                Route cleaner deals.
              </h1>

              <p className="mt-8 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                FALCO is a black-box origination layer built to detect upstream
                distress signals, structure acquisition-ready opportunities, and
                move qualified deals into execution channels with speed,
                discipline, and leverage.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/request-access"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 shadow-[0_18px_55px_rgba(255,255,255,0.16)]"
                >
                  Request Access
                </Link>

                <Link
                  href="/submit-opportunity"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/8"
                >
                  Submit Opportunity
                </Link>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Partner%20Inquiry"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
                >
                  Partner With FALCO
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="rounded-[24px] border border-white/10 bg-black/70 p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Signal Flow
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      Origination Pipeline
                    </div>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                    Live System
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  {[
                    "Upstream distress detection",
                    "Scoring and underwriting layer",
                    "Acquisition dossier generation",
                    "Auction and partner routing",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-white/60">
                        0{index + 1}
                      </div>
                      <div className="text-sm text-white/78">{item}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Positioning
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    FALCO sits upstream of execution, converting fragmented
                    distress signals into cleaner, monetizable deal flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10" id="what-it-is">
          <div className="grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_25px_90px_rgba(0,0,0,0.45)]"
              >
                <div className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {stat.value}
                </div>
                <div className="mt-3 text-sm text-white/55">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* What It Is */}
        <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
          <div className="grid gap-10 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.9fr_1.1fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                What It Is
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                A disciplined intelligence and conversion layer for distressed opportunities.
              </h2>
            </div>

            <div className="space-y-5 text-white/68">
              <p className="leading-7">
                FALCO is designed to identify distress before it becomes crowded,
                convert noisy lead data into structured acquisition intelligence,
                and route execution-ready opportunities into aligned channels.
              </p>
              <p className="leading-7">
                The system is not a listing portal. It is an origination overlay
                built for speed, signal quality, and clean downstream execution.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-6 pb-24 md:px-10"
        >
          <div className="mb-10">
            <div className="text-xs uppercase tracking-[0.26em] text-white/45">
              How It Works
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Structured for clean execution.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="rounded-[26px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.48)]"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                  {item.step}
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">
                  {item.title}
                </div>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Partners */}
        <section
          id="partners"
          className="mx-auto max-w-7xl px-6 pb-24 md:px-10"
        >
          <div className="grid gap-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.95fr_1.05fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                Partners
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Built for serious operators, not broad distribution.
              </h2>
              <p className="mt-5 max-w-xl text-white/68 leading-7">
                FALCO is designed for aligned execution partners who value cleaner
                upstream opportunities, tighter underwriting, and faster deal
                movement.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {partnerTypes.map((partner) => (
                <div
                  key={partner}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm text-white/78"
                >
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          id="request-access"
          className="mx-auto max-w-7xl px-6 pb-32 md:px-10"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] md:p-10">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Request Access
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                Enter the pipeline.
              </h3>
              <p className="mt-4 max-w-lg text-white/68 leading-7">
                Access is limited to qualified operators, investors, and execution
                partners who want direct exposure to structured opportunity flow.
              </p>
              <div className="mt-8">
                <Link
                  href="/request-access"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Request Access
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] md:p-10">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Direct Paths
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                Route the right inquiry fast.
              </h3>

              <div className="mt-6 space-y-4">
                <Link
                  href="/submit-opportunity"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Submit Opportunity</span>
                  <span className="text-white/40">→</span>
                </Link>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Partner%20Inquiry"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Partner Inquiry</span>
                  <span className="text-white/40">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}