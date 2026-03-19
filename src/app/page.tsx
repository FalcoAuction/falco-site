import Link from "next/link"
import { getHomeMetrics } from "@/lib/home-metrics"

export const dynamic = "force-dynamic"

const workflow = [
  {
    step: "01",
    title: "Detect",
    body: "FALCO watches targeted distress sources and catches opportunities before they are obvious to the broader market.",
  },
  {
    step: "02",
    title: "Assemble",
    body: "Each opportunity record is assembled with ownership, debt, timing, and contact context so the record reads clearly.",
  },
  {
    step: "03",
    title: "Route",
    body: "The strongest opportunities are packaged into Review Briefs and moved into partner review for real-world validation.",
  },
]

const partnerTypes = [
  "Auction companies",
  "Brokerage partners",
  "Capital partners",
  "Distress operators",
]

const vaultPreview = [
  {
    stage: "Pre-Foreclosure Review",
    county: "Hamilton County",
    detail: "Early distress visibility with the key record assembled for fast partner review.",
  },
  {
    stage: "Foreclosure",
    county: "Rutherford County",
    detail: "Sale timing, record history, and review materials held together in one controlled listing.",
  },
  {
    stage: "Partner Feedback",
    county: "Controlled Access",
    detail: "Approved partners can comment directly inside the listing path without opening anything publicly.",
  },
]

export default async function HomePage() {
  const metrics = await getHomeMetrics()

  const liveMetrics = [
    {
      label: "Sourced Counties",
      value: String(metrics.activeCounties),
      note: "Targeted coverage",
    },
    {
      label: "Tracked Leads",
      value: String(metrics.trackedLeads),
      note: "Current review universe",
    },
    {
      label: "Packets in Vault",
      value: String(metrics.packetsInVault),
      note: "Restricted live packets",
    },
    {
      label: "Approved Partners",
      value: String(metrics.approvedPartners),
      note: "Access-cleared operators",
    },
  ]

  return (
    <main className="falco-mobile-calm min-h-screen bg-black text-white">
      <style>{`
        @keyframes falcoPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        @keyframes falcoReveal {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes falcoSignal {
          0%, 100% { transform: translateX(0); opacity: 0.3; }
          50% { transform: translateX(24px); opacity: 0.75; }
        }

        @keyframes falcoTrace {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.7; }
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

        @media (max-width: 767px) {
          .falco-mobile-calm * {
            animation: none !important;
            transition-duration: 0ms !important;
          }
        }
      `}</style>

      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-black" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.06),transparent_18%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.05]" />

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
                className="mb-6 inline-flex items-center rounded-full border border-emerald-400/16 bg-emerald-400/[0.07] px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-100/78 shadow-[0_12px_40px_rgba(16,185,129,0.08)]"
                style={{ animation: "falcoDrift 5.5s ease-in-out infinite" }}
              >
                Private Distress Intelligence for Serious Operators
              </div>

              <h1
                className="max-w-5xl text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-white md:text-7xl"
                style={{ animation: "falcoReveal 700ms ease-out both" }}
              >
                See distress earlier.
                <br />
                Assess it more clearly.
                <br />
                Decide faster.
              </h1>

              <p
                className="mt-7 max-w-3xl text-lg leading-8 text-white/72 md:text-xl"
                style={{ animation: "falcoReveal 820ms ease-out both" }}
              >
                FALCO helps serious operators see distressed-property opportunities
                earlier, assemble the key record faster, and review stronger
                opportunities inside a controlled partner path.
              </p>

              <div
                className="mt-10 flex flex-col gap-4 sm:flex-row"
                style={{ animation: "falcoReveal 940ms ease-out both" }}
              >
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
              className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              style={{ animation: "falcoReveal 900ms ease-out both" }}
            >
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Live System
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      Signal to Vault
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    Active
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-white/56">
                  Three steps from early signal to partner review.
                </p>

                <div className="mt-4 rounded-full bg-white/8 p-[1px]">
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-black/35">
                    <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-emerald-300/0 via-emerald-300 to-emerald-300/0" style={{ animation: "falcoSignal 3.8s ease-in-out infinite" }} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      step: "01",
                      title: "Detect early distress",
                      body: "Targeted sources are watched before opportunities become obvious.",
                    },
                    {
                      step: "02",
                      title: "Assemble the record",
                      body: "Property, debt, timing, and contact context are assembled.",
                    },
                    {
                      step: "03",
                      title: "Route to partners",
                      body: "The strongest opportunities move into partner review for judgment.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 rounded-2xl border border-white/10 bg-black/32 px-4 py-4"
                      style={{ animation: `falcoReveal ${1050 + Number(item.step) * 90}ms ease-out both` }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs text-emerald-300">
                        {item.step}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <div className="mt-1 text-sm leading-6 text-white/56">{item.body}</div>
                      </div>
                    </div>
                  ))}
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
            Current Pipeline Snapshot
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] tracking-[0.18em] text-white/40">
              Updated Recently
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 md:px-10">
          <div
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-5"
          >
            <div className="grid gap-4 md:grid-cols-4">
              {liveMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-black/38 px-5 py-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-[0_0_35px_rgba(16,185,129,0.10)]"
                  style={{ animation: "falcoReveal 650ms ease-out both" }}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {metric.label}
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                      style={{ animation: "falcoPulse 1.8s ease-in-out infinite" }}
                    />
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
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/38">
                    {metric.note}
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
          <div className="grid gap-10 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.9fr_1.1fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">What FALCO Actually Is</div>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                A private operator-facing distress intelligence platform.
              </h2>
            </div>

            <div className="max-w-2xl space-y-5 text-white/68">
              <p className="leading-7">
                FALCO is not a public listing feed and it is not a seller-facing
                auction proposal.
              </p>
              <p className="leading-7">
                It is built to identify distress early, assemble the property,
                debt, timing, and contact picture, and package stronger
                opportunities into structured Review Briefs that approved
                partners can assess quickly.
              </p>
              <p className="leading-7">
                The goal is simple: give serious operators a cleaner starting
                point, better triage, and less noise than raw courthouse
                fragments.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
          <div className="grid gap-10 rounded-[30px] border border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:grid-cols-[0.9fr_1.1fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-emerald-300/80">
                Why Operators Use FALCO
              </div>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                A cleaner starting point for real-world judgment.
              </h2>
            </div>

            <div className="max-w-2xl space-y-5 text-white/68">
              <p className="leading-7">
                Raw distress data is fragmented, late, and noisy.
              </p>
              <p className="leading-7">
                FALCO assembles the key picture earlier, packages it more
                clearly, and helps partners decide faster whether an
                opportunity is worth real attention.
              </p>
              <p className="leading-7">
                That does not mean every opportunity is workable. It means
                stronger opportunities arrive with less noise and a clearer
                path to review.
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
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              FALCO handles the early signal detection and record assembly
              first, then routes the strongest Review Briefs into a controlled
              partner path for final real-world judgment.
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-3">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-0 hidden h-px bg-gradient-to-r from-transparent via-emerald-300/28 to-transparent lg:block" style={{ animation: "falcoTrace 4.2s ease-in-out infinite" }} />
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.48)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/25"
                style={{ animation: `falcoReveal ${720 + index * 120}ms ease-out both` }}
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
          <div className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-white/40">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/14 to-transparent" />
            Restricted View
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/14 to-transparent" />
          </div>

          <div className="grid gap-10 rounded-[32px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] lg:grid-cols-[0.88fr_1.12fr] md:p-12">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-white/45">
                Private Vault Surface
              </div>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                The private review layer behind FALCO.
              </h2>
              <p className="mt-5 max-w-lg text-white/68 leading-7">
                The vault is where screened opportunities, Review Briefs, and
                partner input come together. It is intentionally gated and built
                for serious review, not casual browsing.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Per-listing NDA and non-circumvention gate",
                  "Structured listing feedback inside the access path",
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
              {vaultPreview.map((item) => (
                <div
                  key={`${item.stage}-${item.county}`}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
                  style={{ animation: "falcoReveal 700ms ease-out both" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/85">
                        {item.stage}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white/95">{item.county}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Private
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
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
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Built for aligned operators.
              </h2>
              <p className="mt-5 max-w-xl text-white/68 leading-7">
                FALCO is built for serious partners who want earlier distress
                visibility, cleaner review materials, and a controlled path to
                evaluate whether something is truly workable.
              </p>
              <div className="mt-8 rounded-[22px] border border-white/10 bg-black/30 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                  Operator Fit
                </div>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  This is not open deal circulation. It is a controlled review
                  path for partners who know how to judge, act, and execute.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {partnerTypes.map((partner) => (
                <div
                  key={partner}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm text-white/78 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/25 hover:bg-white/[0.055]"
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
                <h3 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                  Use the path that fits your role.
                </h3>
                <p className="mt-5 max-w-lg text-white/68 leading-7">
                  FALCO is built for approved partners and controlled access.
                  Enter through the path that matches your role and the review
                  flow stays structured from there.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.95fr_1.2fr_0.95fr]">
                <Link
                  href="/partner-login"
                  className="rounded-[24px] border border-white/10 bg-black/35 p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Existing Partner
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">Vault Login</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Enter the restricted vault and review screened opportunities already in flow.
                  </p>
                </Link>

                <Link
                  href="/request-access"
                  className="rounded-[24px] border border-white/10 bg-white p-7 text-black transition hover:-translate-y-1 hover:bg-white/92 shadow-[0_22px_70px_rgba(255,255,255,0.16)]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                    New Partner
                  </div>
                  <div className="mt-3 text-2xl font-semibold">Request Access</div>
                  <p className="mt-3 text-sm leading-7 text-black/68">
                    Apply for access if you want screened early-stage distress opportunities and Review Briefs.
                  </p>
                </Link>

                <Link
                  href="/submit-opportunity"
                  className="rounded-[24px] border border-white/10 bg-black/35 p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Send An Opportunity
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">Submit Opportunity</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Route an opportunity into the system if it belongs in the review pipeline.
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
