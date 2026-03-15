import Link from "next/link"
import { getHomeMetrics } from "@/lib/home-metrics"

export const dynamic = "force-dynamic"

const workflow = [
  {
    step: "01",
    title: "Detect",
    body: "FALCO watches targeted distress sources and catches files before they are obvious to the broader market.",
  },
  {
    step: "02",
    title: "Assemble",
    body: "Each file is cleaned up and enriched with ownership, debt, timing, and contact context so the record reads clearly.",
  },
  {
    step: "03",
    title: "Review",
    body: "The strongest files are packaged into review briefs and routed into a controlled partner path for real-world validation.",
  },
]

const partnerTypes = [
  "Auction companies",
  "Brokerage partners",
  "Capital partners",
  "Distress operators",
]

const proofPoints = [
  {
    label: "What It Is",
    title: "Private review flow",
    body: "A screened partner surface for distressed-property files, not a public listing marketplace.",
  },
  {
    label: "What It Is Not",
    title: "Not seller-facing",
    body: "The vault is not a seller proposal, and it does not pretend every file is ready to execute.",
  },
  {
    label: "Why It Matters",
    title: "Cleaner starting point",
    body: "Operators get a clearer file than raw notice scraping, with timing, debt, and contact context assembled upfront.",
  },
]

const vaultPreview = [
  {
    stage: "Pre-Foreclosure Review",
    county: "Hamilton County",
    detail: "Owner and debt context assembled. Early enough for operator review.",
  },
  {
    stage: "Foreclosure",
    county: "Rutherford County",
    detail: "Sale timing, record history, and packet materials in one restricted listing.",
  },
  {
    stage: "Partner Feedback",
    county: "Controlled Access",
    detail: "Approved partners can rate and comment directly inside the listing workflow.",
  },
]

const updateFeed = [
  "Early-stage pre-foreclosure files enrich automatically before partner review.",
  "Sale timing updates in the vault when the live sale date changes.",
  "Partner feedback now lives inside each vault listing instead of the operator desk.",
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

        @keyframes falcoFlow {
          0% { transform: translateX(-14px); opacity: 0.35; }
          50% { opacity: 1; }
          100% { transform: translateX(14px); opacity: 0.35; }
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
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.08]" />

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
          <div className="grid items-end gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div
                className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/62 shadow-[0_12px_40px_rgba(255,255,255,0.04)]"
                style={{ animation: "falcoDrift 5.5s ease-in-out infinite" }}
              >
                Private Distress Review System
              </div>

              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-white md:text-7xl">
                Find distress sooner.
                <br />
                Underwrite faster.
                <br />
                Route cleaner deals.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-8 text-white/72 md:text-xl">
                FALCO finds distressed-property files early, cleans them up,
                and turns the strongest ones into review briefs for approved
                auction, broker, and execution partners.
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">
                It is not a public listing feed and it is not a seller proposal.
                Approved partners get access to a restricted vault and per-listing
                packet materials after NDA and non-circumvention acceptance.
              </p>

              <div className="mt-8 inline-flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/65 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                  Live Now
                </span>
                <span>{metrics.trackedLeads} tracked files</span>
                <span className="text-white/22">•</span>
                <span>{metrics.packetsInVault} live vault packets</span>
                <span className="text-white/22">•</span>
                <span>{metrics.approvedPartners} approved partners</span>
              </div>

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
              className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              style={{ animation: "falcoFloat 7s ease-in-out infinite" }}
            >
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Live System Canvas
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      Signal to Vault
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    Live System
                  </div>
                </div>

                <div className="relative mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-black/55 p-5">
                  <div className="absolute inset-x-10 top-[70px] hidden h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent lg:block" />
                  <div
                    className="absolute left-[18%] right-[18%] top-[64px] hidden h-3 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.55),transparent_62%)] blur-md lg:block"
                    style={{ animation: "falcoFlow 4.6s linear infinite" }}
                  />

                  <div className="grid gap-4 lg:grid-cols-4">
                    {[
                      { label: "Detect", value: String(metrics.trackedLeads), note: "Tracked files" },
                      { label: "Screen", value: String(metrics.activeCounties), note: "Active counties" },
                      { label: "Brief", value: String(metrics.packetsInVault), note: "Vault packets" },
                      { label: "Route", value: String(metrics.approvedPartners), note: "Approved partners" },
                    ].map((item, index) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 transition duration-300 hover:border-emerald-400/25 hover:bg-white/[0.055]"
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs text-emerald-300"
                          style={{ animation: `falcoPulse ${2 + index * 0.35}s ease-in-out infinite` }}
                        >
                          0{index + 1}
                        </div>
                        <div className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/40">
                          {item.label}
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                        <div className="mt-1 text-sm text-white/55">{item.note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {updateFeed.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/62"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Review Surface
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      A controlled partner vault, not open deal circulation.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                      File Standard
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      Property, debt, timing, and contact context assembled before review.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Decision Point
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      Final execution fit still belongs to licensed operators and partners.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {proofPoints.map((item, index) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
                style={{ animation: `falcoFloat ${6 + index * 0.35}s ease-in-out infinite` }}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                  {item.label}
                </div>
                <div className="mt-3 text-xl font-semibold text-white">{item.title}</div>
                <p className="mt-3 text-sm leading-7 text-white/65">{item.body}</p>
              </div>
            ))}
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
                  className="rounded-2xl border border-white/10 bg-black/40 px-4 py-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-[0_0_35px_rgba(16,185,129,0.10)]"
                  style={{ animation: `falcoFloat ${5 + index * 0.4}s ease-in-out infinite` }}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {metric.label}
                  </div>
                  <div
                    className="mt-3 text-2xl font-semibold text-white"
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

          <div className="grid gap-6 lg:grid-cols-3">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.48)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/25"
                style={{ animation: `falcoFloat ${6.5 + index * 0.45}s ease-in-out infinite` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                  {item.step}
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">
                  {item.title}
                </div>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {item.body}
                </p>
                <div className="mt-8 h-1.5 rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white to-emerald-300"
                    style={{ width: `${(index + 1) * 33}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
          <div className="grid gap-10 rounded-[32px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] lg:grid-cols-[0.88fr_1.12fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                Private Vault Surface
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Designed to feel like a private market workflow, not a public listing board.
              </h2>
              <p className="mt-5 max-w-xl text-white/68 leading-7">
                The vault is where screened files, packet materials, and partner
                feedback come together. It is intentionally controlled, gated,
                and built for decision-making rather than browsing.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Per-listing NDA and non-circumvention gate",
                  "Packet delivery inside a restricted vault flow",
                  "Partner feedback captured on the listing itself",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/72"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {vaultPreview.map((item, index) => (
                <div
                  key={`${item.stage}-${item.county}`}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
                  style={{ animation: `falcoFloat ${6.8 + index * 0.4}s ease-in-out infinite` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/85">
                        {item.stage}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white/95">{item.county}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                      Restricted
                    </div>
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/63">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
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
              <div className="mt-8 rounded-[22px] border border-white/10 bg-black/30 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                  Operator Fit
                </div>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  Best fit is a partner who wants earlier visibility, cleaner files,
                  and a private review path before deciding whether a file is truly workable.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {partnerTypes.map((partner, index) => (
                <div
                  key={partner}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm text-white/78 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/25 hover:bg-white/[0.055]"
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
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] md:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Next Step
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                  Enter the review flow through the path that fits.
                </h3>
                <p className="mt-5 max-w-xl text-white/68 leading-7">
                  FALCO is built for approved partners, not open distribution.
                  Use the path that matches your role and we will keep the review
                  flow controlled from there.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/partner-login"
                  className="rounded-[24px] border border-white/10 bg-black/35 p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Existing Partner
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">Vault Login</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Enter the restricted vault and review screened files already in flow.
                  </p>
                </Link>

                <Link
                  href="/request-access"
                  className="rounded-[24px] border border-white/10 bg-white p-6 text-black transition hover:-translate-y-1 hover:bg-white/92 shadow-[0_18px_60px_rgba(255,255,255,0.12)]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                    New Partner
                  </div>
                  <div className="mt-3 text-2xl font-semibold">Request Access</div>
                  <p className="mt-3 text-sm leading-7 text-black/68">
                    Apply for access if you want screened early-stage distress files and packets.
                  </p>
                </Link>

                <Link
                  href="/submit-opportunity"
                  className="rounded-[24px] border border-white/10 bg-black/35 p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Send A File
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">Submit Opportunity</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Route a file into the system if it belongs in the review pipeline.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
