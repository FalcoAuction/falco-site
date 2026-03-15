import Link from "next/link"
import { getHomeMetrics } from "@/lib/home-metrics"

export const dynamic = "force-dynamic"

const workflow = [
  {
    step: "01",
    title: "Detect",
    body: "FALCO monitors targeted distress sources and flags files before they are obvious to the broader market.",
  },
  {
    step: "02",
    title: "Screen",
    body: "Each file is cleaned up, enriched with ownership, debt, timing, and contact context, then filtered for real operator use.",
  },
  {
    step: "03",
    title: "Route",
    body: "The strongest files are turned into operator review briefs and routed into a controlled partner review path for validation.",
  },
]

const partnerTypes = [
  "Auction companies",
  "Brokerage partners",
  "Capital partners",
  "Distress operators",
]

export default async function HomePage() {
  const metrics = await getHomeMetrics()

  const liveMetrics = [
    { label: "Active Counties", value: String(metrics.activeCounties) },
    { label: "Tracked Leads", value: String(metrics.trackedLeads) },
    { label: "Packets in Vault", value: String(metrics.packetsInVault) },
    { label: "Approved Partners", value: String(metrics.approvedPartners) },
  ]

  return (
    <main className="min-h-screen bg-black text-white">
      <style>{`
        @keyframes falcoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes falcoPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        @keyframes falcoShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes falcoGlow {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.3; }
        }

        @keyframes falcoDrift {
          0%, 100% { transform: translateY(0px); opacity: 0.72; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-black" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.06),transparent_18%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_52%)]"
          style={{ animation: "falcoGlow 6s ease-in-out infinite" }}
        />

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
              <span className="text-sm font-semibold tracking-[0.28em] text-white">
                FALCO
              </span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <Link href="#what-it-is" className="transition hover:text-white">
                What It Is
              </Link>
              <Link href="#how-it-works" className="transition hover:text-white">
                How It Works
              </Link>
              <Link href="/partner-login" className="transition hover:text-white">
                Partner Login
              </Link>
              <Link href="/request-access" className="transition hover:text-white">
                Request Access
              </Link>
            </nav>
          </div>
        </header>

        <section
          className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28"
        >
          <div className="grid items-end gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div
                className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/62 shadow-[0_12px_40px_rgba(255,255,255,0.04)]"
                style={{ animation: "falcoDrift 5.5s ease-in-out infinite" }}
              >
                Early Distress Review System
              </div>

              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white md:text-7xl">
                Find distress sooner.
                <br />
                Underwrite faster.
                <br />
                Route cleaner deals.
              </h1>

              <p className="mt-8 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                FALCO finds distressed-property files early, cleans them up,
                and turns the strongest ones into review briefs for approved
                auction, broker, and execution partners.
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">
                It is not a public listing feed and it is not a seller proposal.
                Approved partners get access to a restricted vault and per-listing
                packet materials after NDA and non-circumvention acceptance.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/partner-login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  Partner Login
                </Link>

                <Link
                  href="/request-access"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 shadow-[0_18px_55px_rgba(255,255,255,0.16)]"
                >
                  Request Access
                </Link>

                <Link
                  href="/submit-opportunity"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
                >
                  Submit Opportunity
                </Link>
              </div>
            </div>

            <div
              className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              style={{ animation: "falcoFloat 7s ease-in-out infinite" }}
            >
              <div className="rounded-[24px] border border-white/10 bg-black/70 p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Signal Flow
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      Review Pipeline
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    Live System
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  {[
                    "Targeted distress detection",
                    "Screening and underwriting",
                    "Operator brief generation",
                    "Restricted partner review",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 transition duration-300 hover:border-emerald-400/25 hover:bg-white/[0.055]"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs text-emerald-300"
                        style={{ animation: `falcoPulse ${2 + index * 0.35}s ease-in-out infinite` }}
                      >
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
                    FALCO sits upstream of execution, turning fragmented distress
                    signals into cleaner operator review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-6 md:px-10">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)]"
              style={{ animation: "falcoPulse 1.5s ease-in-out infinite" }}
            />
            Live System Snapshot
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-6 pb-10 md:px-10"
        >
          <div
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-5"
          >
            <div className="grid gap-4 md:grid-cols-4">
              {liveMetrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-[0_0_35px_rgba(16,185,129,0.10)]"
                  style={{ animation: `falcoFloat ${5 + index * 0.4}s ease-in-out infinite` }}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {metric.label}
                  </div>
                  <div
                    className="mt-2 text-lg font-semibold text-white"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(52,211,153,0.95) 50%, rgba(255,255,255,1) 100%)",
                      backgroundSize: "200% 100%",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      animation: "falcoShimmer 6s linear infinite",
                    }}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-6 pb-24 md:px-10"
          id="what-it-is"
        >
          <div
            className="grid gap-10 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.9fr_1.1fr] md:p-12"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                What It Is
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                A private system for finding and screening distressed-property files before they become crowded.
              </h2>
            </div>

            <div className="space-y-5 text-white/68">
              <p className="leading-7">
                FALCO is not a public listing feed, and it is not a seller-facing
                auction proposal. It is a private screening system built to take
                scattered distress data and turn it into a cleaner file an
                auctioneer, broker, or operator can review quickly.
              </p>
              <p className="leading-7">
                In plain terms, the system looks for distress early, pulls
                together the property, debt, timing, and contact picture, and
                filters out weaker files before stronger ones are placed in a
                restricted review vault.
              </p>
              <p className="leading-7">
                The goal is not to claim that every file is ready to move
                immediately. The goal is to give serious operators a better
                starting point than raw notice scraping and a cleaner path to
                decide whether a file is actually workable.
              </p>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-6 pb-24 md:px-10"
        >
          <div className="mb-10">
            <div className="text-xs uppercase tracking-[0.26em] text-white/45">
              How It Works
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Built to move from raw distress signal to partner review.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
              FALCO does the early sourcing and file assembly work first, then
              puts the strongest files in front of approved operators and
              partners for final real-world judgment.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className="rounded-[26px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.48)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/25"
                style={{ animation: `falcoFloat ${6.5 + index * 0.45}s ease-in-out infinite` }}
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

        <section
          id="partners"
          className="mx-auto max-w-7xl px-6 pb-24 md:px-10"
        >
          <div
            className="grid gap-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.95fr_1.05fr] md:p-12"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                Partners
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Built for serious operators, not public deal circulation.
              </h2>
              <p className="mt-5 max-w-xl text-white/68 leading-7">
                FALCO is built for aligned partners who want earlier files,
                cleaner review briefs, and a tighter review path than public
                deal circulation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {partnerTypes.map((partner, index) => (
                <div
                  key={partner}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm text-white/78 transition duration-300 hover:-translate-y-1 hover:border-white/20"
                  style={{ animation: `falcoFloat ${7 + index * 0.35}s ease-in-out infinite` }}
                >
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="request-access"
          className="mx-auto max-w-7xl px-6 pb-32 md:px-10"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] md:p-10 transition duration-300 hover:border-emerald-400/20">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Request Access
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                Enter the review flow.
              </h3>
              <p className="mt-4 max-w-lg text-white/68 leading-7">
                Access is limited to qualified operators, investors, and
                execution partners seeking screened opportunity flow.
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

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] md:p-10 transition duration-300 hover:border-white/20">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Direct Paths
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                Route the right inquiry fast.
              </h3>

              <div className="mt-6 space-y-4">
                <Link
                  href="/partner-login"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Vault Login</span>
                  <span className="text-white/40">&gt;</span>
                </Link>

                <Link
                  href="/submit-opportunity"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Submit Opportunity</span>
                  <span className="text-white/40">&gt;</span>
                </Link>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Partner%20Inquiry"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Partner Inquiry</span>
                  <span className="text-white/40">&gt;</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
