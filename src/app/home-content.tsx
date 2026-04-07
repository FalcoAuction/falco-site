"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { HomeMetrics } from "@/lib/home-metrics"
import { DotOrbit } from "./dot-orbit"

function useRadiusOnScroll() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets = el.querySelectorAll<HTMLElement>(".falco-radius-scroll")
    if (!targets.length) return

    function onScroll() {
      for (const target of targets) {
        const rect = target.getBoundingClientRect()
        const viewH = window.innerHeight
        // 0 = fully below viewport, 1 = fully above
        const progress = Math.min(Math.max((viewH - rect.top) / (viewH + rect.height), 0), 1)
        // Radius: starts at 40px, goes to 0 as you scroll past center
        const radius = Math.round(40 * (1 - Math.min(progress * 2, 1)))
        target.style.borderRadius = `${radius}px`
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return ref
}

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

function LiveClock() {
  const [time, setTime] = useState("")

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(
        now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        "  " +
        now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return <span>{time}</span>
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
  const radiusRef = useRadiusOnScroll()

  return (
    <main className="falco-mobile-calm min-h-screen bg-[#060606] text-white" ref={(el) => {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement | null;
      (radiusRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement | null;
    }}>
      <div className="relative isolate overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 -z-30 bg-[#060606]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%)]" />

        {/* Dotted grid (Jet-style) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.35]" />

        {/* Orbiting dot field */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <DotOrbit
            dotColor="rgba(16, 185, 129, 0.5)"
            lineColor="rgba(16, 185, 129, 0.07)"
            density={0.6}
            speed={0.3}
            dotSize={1.2}
            linkDistance={110}
            opacity={0.7}
          />
        </div>

        <header className="sticky top-0 z-40 border-b border-dashed border-white/[0.08] bg-[#060606]/80 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
            <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span className="text-[13px] font-semibold tracking-[0.32em] text-white">
                FALCO
              </span>
              <span className="hidden h-px w-6 bg-gradient-to-r from-white/20 to-transparent transition-all group-hover:w-10 md:block" />
            </Link>

            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/request-access"
                className="falco-orbit-left falco-accent-button-secondary hidden items-center justify-center rounded-xl px-5 py-2.5 text-[13px] font-semibold transition md:inline-flex"
              >
                Request Access
              </Link>
              <Link
                href="/partner-login"
                className="falco-orbit-right falco-accent-button-secondary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[13px] font-semibold transition"
              >
                Partner Login
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero — inside dashed container like Jet */}
        <section className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
          <div className="falco-radius-scroll rounded-2xl border border-dashed border-white/[0.08] px-8 pb-28 pt-20 md:px-16 md:pt-28">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="falco-reveal-1 text-5xl font-bold leading-[0.88] tracking-[-0.045em] text-white md:text-[6rem]">
                FALCO finds the file.
              </h1>
              <h1 className="falco-reveal-2 mt-2 text-5xl font-bold leading-[0.88] tracking-[-0.045em] text-white/30 md:text-[6rem]">
                <span className="falco-shimmer-accent">You</span> control the deal.
              </h1>

              <p className="falco-reveal-3 mx-auto mt-12 max-w-2xl text-[15px] uppercase leading-7 tracking-[0.15em] text-white/35 md:text-[16px] md:leading-8">
                FALCO handles the sourcing and file assembly. Investors handle the control and exit. More deals, less legwork.
              </p>
            </div>
          </div>
        </section>

        {/* Live pipeline — dashed container */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:px-10">
          <div className="falco-scroll-reveal flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              <span className="falco-pulse inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
              Live Pipeline
            </div>
            <div className="text-[11px] tabular-nums tracking-wide text-white/25">
              <LiveClock />
            </div>
          </div>

          <div className="falco-scroll-reveal falco-radius-scroll rounded-2xl border border-dashed border-white/[0.08] p-6">
            <div className="falco-scroll-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Counties Sourced", value: metrics.activeCounties, note: "Active coverage" },
                { label: "Leads Tracked", value: metrics.trackedLeads, note: "In pipeline now" },
                { label: "Vault Listings", value: metrics.packetsInVault, note: "Packeted and live" },
                { label: "Auction Ready", value: metrics.greenReady, note: "Fully qualified" },
              ].map((m) => (
                <div key={m.label} className="falco-scroll-reveal falco-glow-border rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-5 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
                    {m.label}
                    <span className="falco-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="falco-shimmer-text mt-3 text-3xl font-semibold">
                    <CountUp target={m.value} />
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/30">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3-player model — dashed container */}
        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10">
          <div className="falco-scroll-reveal falco-radius-scroll rounded-2xl border border-dashed border-white/[0.08] p-8 md:p-12">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/35">The Model</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Three players. One pipeline.
              </h2>
            </div>

            <div className="mt-10">
              <div className="falco-scroll-stagger grid gap-5 lg:grid-cols-3">
                <div className="falco-scroll-reveal falco-glow-border rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">01</div>
                  <div className="text-lg font-semibold text-white">FALCO</div>
                  <div className="mt-1 text-[12px] font-medium text-emerald-300/60">Source + Screen + Route</div>
                  <p className="mt-3 text-[13px] leading-6 text-white/45">
                    Watches distress signals daily. Enriches with owner data, debt, valuation,
                    contact info. Packages the strongest files with a suggested execution lane.
                  </p>
                </div>

                <div className="falco-scroll-reveal falco-glow-border rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-white/60">02</div>
                  <div className="text-lg font-semibold text-white">Investor</div>
                  <div className="mt-1 text-[12px] font-medium text-white/40">Control + Outreach + Decide</div>
                  <p className="mt-3 text-[13px] leading-6 text-white/45">
                    Reviews vault listings. Picks files that fit their model. Calls the owner.
                    Negotiates sub-to, arrears cure, short sale, or direct purchase.
                  </p>
                </div>

                <div className="falco-scroll-reveal falco-glow-border rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-white/60">03</div>
                  <div className="text-lg font-semibold text-white">Auction Co.</div>
                  <div className="mt-1 text-[12px] font-medium text-white/40">Execute + Dispose + Exit</div>
                  <p className="mt-3 text-[13px] leading-6 text-white/45">
                    When the investor needs a fast exit, controlled assets route to an auction
                    partner for disposition or direct buyer placement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What each listing contains — 2x4 grid inside dashed container */}
        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10">
          <div className="falco-scroll-reveal falco-radius-scroll rounded-2xl border border-dashed border-white/[0.08] p-8 md:p-12">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/35">What You Get</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Every file in the vault includes:
              </h2>
            </div>

            <div className="falco-scroll-stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Owner Contact", detail: "Name, mailing, skip-traced phones, DNC status" },
                { title: "Debt Record", detail: "Lender, amount, date, notice holder, confidence" },
                { title: "Valuation", detail: "AVM low/mid/high, spread, confidence class" },
                { title: "Suggested Play", detail: "Execution lane with confidence and reasoning" },
                { title: "Execution Read", detail: "Control party, owner agency, lender control" },
                { title: "Property", detail: "Beds, baths, sqft, year built, parcel, transfer" },
                { title: "Timeline", detail: "Sale date, DTS, recorded date, verification" },
                { title: "PDF Packet", detail: "5-page review brief for a yes/no decision" },
              ].map((item) => (
                <div key={item.title} className="falco-scroll-reveal falco-glow-border rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition duration-300 hover:-translate-y-1">
                  <div className="text-[13px] font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-[12px] leading-5 text-white/40">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
          <div className="falco-scroll-reveal falco-radius-scroll falco-glow-border rounded-2xl border border-dashed border-emerald-400/12 bg-[linear-gradient(180deg,rgba(16,185,129,0.04),rgba(16,185,129,0.01))] p-8 text-center md:p-14">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              See what the pipeline is surfacing.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/45 leading-7">
              {metrics.packetsInVault} live listings across Tennessee.
              Owner contact, debt data, valuation, and a suggested execution lane on every file.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/partner-login"
                className="falco-orbit-left falco-accent-button-secondary inline-flex items-center justify-center rounded-full px-7 py-3 text-[13px] font-semibold transition"
              >
                Enter the Vault
              </Link>
              <Link
                href="/request-access"
                className="falco-orbit-right falco-accent-button-secondary inline-flex items-center justify-center rounded-full px-7 py-3 text-[13px] font-semibold transition"
              >
                Request Access
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-dashed border-white/[0.06] px-6 py-10 md:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="text-[11px] tracking-[0.22em] text-white/20">
              FALCO
            </div>
            <div className="flex items-center gap-6 text-[11px] text-white/25">
              <Link href="/partner-login" className="transition hover:text-white/50">Vault</Link>
              <Link href="/request-access" className="transition hover:text-white/50">Access</Link>
              <span className="text-white/12">falco.llc</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
