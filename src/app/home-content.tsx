"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { HomeMetrics } from "@/lib/home-metrics"

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets = el.querySelectorAll(".falco-scroll-reveal")
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("falco-visible")
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )

    for (const target of targets) {
      observer.observe(target)
    }

    return () => observer.disconnect()
  }, [])

  return ref
}

function CountUp({ target, duration = 1400 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()

          function tick(now: number) {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{value}</span>
}

export function HomeContent({ metrics }: { metrics: HomeMetrics }) {
  const scrollRef = useScrollReveal()

  return (
    <main className="falco-mobile-calm min-h-screen bg-black text-white" ref={scrollRef}>
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-black" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.06),transparent_18%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />

        {/* Ambient glow orbs */}
        <div className="falco-ambient pointer-events-none absolute -left-32 top-20 -z-10 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="falco-ambient pointer-events-none absolute -right-32 top-60 -z-10 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_70%)]" style={{ animationDelay: "-4s" }} />
        <div
          className="falco-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_52%)]"
        />

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
              <span className="text-sm font-semibold tracking-[0.28em] text-white">
                FALCO
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-sm">
              <Link href="/request-access" className="hidden text-white/70 transition hover:text-white md:block">
                Request Access
              </Link>
              <Link
                href="/partner-login"
                className="falco-accent-button inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition"
              >
                Partner Login
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 md:px-10 md:pt-28">
          <h1 className="falco-reveal-1 max-w-4xl text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-white md:text-7xl">
            FALCO finds the file.
            <br />
            You control the deal.
          </h1>

          <p className="falco-reveal-2 mt-8 max-w-2xl text-lg leading-8 text-white/68 md:text-xl">
            FALCO is a distress-asset sourcing engine that watches 56 Tennessee counties
            for foreclosure and pre-foreclosure opportunities. It enriches every lead with
            owner data, debt, valuation, and contact info, then surfaces the ones that are
            realistically controllable.
          </p>
        </section>

        {/* 3-player model */}
        <section className="mx-auto max-w-5xl px-6 pb-24 md:px-10">
          <div className="falco-scroll-reveal rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
            <div className="text-xs uppercase tracking-[0.26em] text-white/45">The Model</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Three players. One pipeline.
            </h2>

            {/* Connector line across the 3 cards */}
            <div className="relative mt-8">
              <div className="falco-flow-line pointer-events-none absolute left-[16%] right-[16%] top-12 z-0 hidden lg:block" />

              <div className="falco-scroll-stagger relative z-10 grid gap-6 lg:grid-cols-3">
                <div className="falco-scroll-reveal falco-glow-border rounded-[24px] border border-emerald-400/14 bg-emerald-400/[0.04] p-6 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80">01</div>
                  <div className="mt-3 text-xl font-semibold text-white">FALCO</div>
                  <div className="mt-1 text-sm font-medium text-emerald-200/70">Source + Screen + Route</div>
                  <p className="mt-4 text-sm leading-7 text-white/60">
                    Watches distress signals daily across 56 counties. Enriches with owner data, debt, valuation,
                    contact info. Scores and packages the strongest files into the vault with a suggested execution lane.
                  </p>
                </div>

                <div className="falco-scroll-reveal falco-glow-border rounded-[24px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">02</div>
                  <div className="mt-3 text-xl font-semibold text-white">Investor</div>
                  <div className="mt-1 text-sm font-medium text-white/60">Control + Outreach + Decide</div>
                  <p className="mt-4 text-sm leading-7 text-white/60">
                    Reviews vault listings. Picks files that fit their model. Calls the owner. Negotiates
                    sub-to, arrears cure, short sale, or direct purchase. Gains control of the asset.
                  </p>
                </div>

                <div className="falco-scroll-reveal falco-glow-border rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">03</div>
                  <div className="mt-3 text-xl font-semibold text-white">Auction Co.</div>
                  <div className="mt-1 text-sm font-medium text-white/60">Execute + Dispose + Exit</div>
                  <p className="mt-4 text-sm leading-7 text-white/60">
                    When the investor needs a fast exit, controlled assets route to an auction partner
                    for disposition. Marketed sale, auction event, or direct buyer placement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live pipeline numbers */}
        <section className="mx-auto max-w-5xl px-6 pb-6 md:px-10">
          <div className="falco-scroll-reveal mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
            <span className="falco-pulse inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)]" />
            Live Pipeline
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24 md:px-10">
          <div className="falco-scroll-reveal rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="falco-scroll-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Counties Sourced", value: metrics.activeCounties, note: "Active coverage" },
                { label: "Leads Tracked", value: metrics.trackedLeads, note: "In pipeline now" },
                { label: "Vault Listings", value: metrics.packetsInVault, note: "Packeted and live" },
                { label: "Auction Ready", value: metrics.greenReady, note: "Fully qualified" },
              ].map((m) => (
                <div key={m.label} className="falco-scroll-reveal falco-glow-border rounded-2xl border border-white/10 bg-black/38 px-5 py-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(16,185,129,0.10)]">
                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {m.label}
                    <span className="falco-pulse inline-block h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div className="falco-shimmer-text mt-3 text-2xl font-semibold">
                    <CountUp target={m.value} />
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/38">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What each listing contains */}
        <section className="mx-auto max-w-5xl px-6 pb-24 md:px-10">
          <div className="falco-scroll-reveal rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
            <div className="text-xs uppercase tracking-[0.26em] text-white/45">What You Get</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Every file in the vault includes:
            </h2>

            <div className="falco-scroll-stagger mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { title: "Owner Contact", detail: "Name, mailing address, skip-traced phone numbers, DNC status" },
                { title: "Debt Record", detail: "Lender, original amount, mortgage date, notice holder, confidence level" },
                { title: "Valuation Range", detail: "AVM low/mid/high with spread and confidence classification" },
                { title: "Suggested Play", detail: "Execution lane (borrower side, auction, mixed) with confidence and reasoning" },
                { title: "Execution Assessment", detail: "Control party, owner agency, intervention window, lender control, workability" },
                { title: "Property Details", detail: "Beds, baths, sqft, year built, parcel ID, last transfer" },
                { title: "Timeline", detail: "Sale date, days to sale, recorded date, notice verification status" },
                { title: "PDF Packet", detail: "5-page review brief with everything assembled for a yes/no decision" },
              ].map((item) => (
                <div key={item.title} className="falco-scroll-reveal falco-glow-border rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/55">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-32 md:px-10">
          <div className="falco-scroll-reveal falco-glow-border rounded-[32px] border border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              See what the pipeline is surfacing right now.
            </h2>
            <p className="mt-5 max-w-2xl text-white/68 leading-7">
              The vault currently holds {metrics.packetsInVault} live listings across Tennessee.
              Every file has owner contact, debt data, valuation, and a suggested execution lane.
              Access is gated and controlled.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/partner-login"
                className="falco-accent-button inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition"
              >
                Enter the Vault
              </Link>
              <Link
                href="/request-access"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
              >
                Request Access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
