"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import FaqSection from "./faq-section"

/**
 * Homepage — minimal. One idea per section, one line of support at most.
 * No stock footage anywhere: the drone aerials were generic clips that
 * read as specific Tennessee cities when labelled that way, which is a
 * credibility problem on a foreclosure page. Type and space carry it.
 */

function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(".reveal, .reveal-line")
    if (!targets.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible")
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    )
    for (const t of targets) io.observe(t)
    return () => io.disconnect()
  }, [])
}

function useCountUp(target: number, ms = 1000) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(target)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setVal(0)
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / ms)
          setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, ms])
  return { ref, val }
}

export default function V2Content() {
  useScrollReveal()
  return (
    <div className="bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">
      <SiteHeader />
      <Hero />
      <Lanes />
      <Math3 />
      <Counties />
      <HomeFaq />
      <ClosingCta />
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="group leading-none">
          <span className="block text-[15px] font-semibold tracking-[0.32em] group-hover:text-[var(--mocha)] transition-colors">
            FALCO
          </span>
          <span className="mt-1 block text-[10px] tracking-[0.08em] text-[var(--ink-faint)]">
            by Patrick Armour · TN Auctioneer #7622
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-[14px] text-[var(--ink-soft)]">
          <Link href="/homeowners" className="hidden sm:inline hover:text-[var(--mocha)] transition-colors">
            Homeowners
          </Link>
          <Link href="/buyers" className="hidden sm:inline hover:text-[var(--mocha)] transition-colors">
            Buyers
          </Link>
          <Link href="/partners" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Partners
          </Link>
          <Link href="/guides" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Guides
          </Link>
          <Link
            href="/homeowners"
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:bg-[var(--mocha)] transition-colors"
          >
            Get your numbers
          </Link>
        </nav>
      </div>
    </header>
  )
}

/* Hero: headline, one line, two actions. Nothing else. */
function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 md:px-8 pt-24 pb-20 md:pt-36 md:pb-28">
      <div className="hero-in hero-in-1 text-[12px] uppercase tracking-[0.24em] text-[var(--mocha)] font-semibold">
        Tennessee foreclosure
      </div>
      <h1 className="hero-in hero-in-2 mt-6 font-[family-name:var(--font-display)] text-[54px] md:text-[88px] leading-[0.98] font-semibold text-balance">
        Keep your equity.
      </h1>
      <p className="hero-in hero-in-3 mt-6 max-w-xl text-[18px] md:text-[21px] leading-[1.5] text-[var(--ink-soft)]">
        We sell your home through a licensed auction before the trustee sale.
        The buyer pays our fee.
      </p>
      <div className="hero-in hero-in-4 mt-9 flex flex-wrap items-center gap-4">
        <Link
          href="/homeowners"
          className="rounded-md bg-[var(--mocha)] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[var(--mocha-deep)] transition-colors"
        >
          Get your numbers
        </Link>
        <Link
          href="/math"
          className="text-[15px] font-medium text-[var(--ink-soft)] underline underline-offset-[6px] decoration-[var(--rule-strong)] hover:text-[var(--mocha)] transition-colors"
        >
          See the math
        </Link>
      </div>

      {/* Three facts, no prose. */}
      <dl className="stagger mt-16 grid grid-cols-3 gap-6 border-t border-[var(--rule)] pt-8">
        <Fact n={32} label="Counties covered" />
        <Fact value="$0" label="Cost to you" accent />
        <Fact n={10} suffix="%" label="Buyer's premium" />
      </dl>
    </section>
  )
}

function Fact({
  n,
  value,
  suffix = "",
  label,
  accent = false,
}: {
  n?: number
  value?: string
  suffix?: string
  label: string
  accent?: boolean
}) {
  const { ref, val } = useCountUp(n ?? 0)
  return (
    <div className="reveal">
      <dd
        className={`font-[family-name:var(--font-display)] text-[38px] md:text-[52px] leading-none font-semibold tabular-nums ${
          accent ? "text-[var(--mocha)]" : "text-[var(--ink)]"
        }`}
      >
        {value ?? (
          <>
            <span ref={ref}>{val}</span>
            {suffix}
          </>
        )}
      </dd>
      <dt className="mt-2 text-[13px] text-[var(--ink-faint)]">{label}</dt>
    </div>
  )
}

/* Three ways in — one line each. */
function Lanes() {
  const lanes = [
    { href: "/homeowners", title: "Homeowners", body: "There's a sale date on your house.", cta: "Get your numbers" },
    { href: "/buyers", title: "Buyers", body: "Equity-positive homes, clean title.", cta: "Register" },
    { href: "/partners", title: "Auction firms", body: "Qualified sellers, real deadlines.", cta: "Partner with us" },
  ]
  return (
    <section id="how" className="border-y border-[var(--rule)] bg-[var(--paper-raised)]">
      <div className="mx-auto max-w-5xl px-6 md:px-8 py-16 md:py-20">
        <div className="stagger grid gap-px sm:grid-cols-3 bg-[var(--rule)] rounded-xl overflow-hidden">
          {lanes.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="reveal group bg-[var(--paper-raised)] p-7 md:p-8 hover:bg-[var(--mocha-wash)] transition-colors"
            >
              <h2 className="font-[family-name:var(--font-display)] text-[26px] font-semibold">
                {l.title}
              </h2>
              <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ink-faint)]">
                {l.body}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mocha)] group-hover:gap-2.5 transition-all">
                {l.cta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* The math — the one section worth real estate. */
function Math3() {
  return (
    <section className="mx-auto max-w-5xl px-6 md:px-8 py-16 md:py-24">
      <h2 className="reveal-line font-[family-name:var(--font-display)] text-[34px] md:text-[46px] leading-[1.05] font-semibold text-balance">
        One house. Three exits.
      </h2>
      <p className="reveal mt-4 text-[15px] text-[var(--ink-faint)]">
        $500,000 home, $300,000 owed. What you walk away with:
      </p>

      <div className="reveal mt-8 overflow-hidden rounded-xl border border-[var(--rule-strong)]">
        <Row label="Trustee sale" value="$0" tone="oxblood" />
        <Row label="Fast-cash offer" value="~$25,000" tone="gold" />
        <Row label="Marketed auction" value="~$130,000" tone="accent" highlight />
      </div>

      <Link
        href="/math"
        className="reveal mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
      >
        Walk through it, one number at a time <span aria-hidden="true">→</span>
      </Link>
      <p className="reveal mt-6 text-[12px] leading-[1.6] text-[var(--ink-faint)] max-w-[60ch]">
        Illustrative example, not a quote or a promise. Results vary by
        property, condition, county, and timeline. FALCO is not a law firm and
        this is not legal advice.
      </p>
    </section>
  )
}

function Row({
  label,
  value,
  tone,
  highlight = false,
}: {
  label: string
  value: string
  tone: "oxblood" | "gold" | "accent"
  highlight?: boolean
}) {
  const color =
    tone === "oxblood"
      ? "text-[var(--oxblood)]"
      : tone === "gold"
        ? "text-[var(--gold)]"
        : "text-[var(--mocha)]"
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-5 border-b border-[var(--rule)] last:border-b-0 ${
        highlight ? "bg-[var(--mocha-wash)]" : "bg-[var(--paper-raised)]"
      }`}
    >
      <span className="text-[15px] md:text-[16px] text-[var(--ink-soft)]">{label}</span>
      <span
        className={`font-[family-name:var(--font-display)] text-[28px] md:text-[34px] font-semibold tabular-nums ${color}`}
      >
        {value}
      </span>
    </div>
  )
}

/* Counties — a plain list. No stock imagery pretending to be a place. */
function Counties() {
  const featured = [
    { slug: "davidson-county", name: "Davidson", seat: "Nashville" },
    { slug: "shelby-county", name: "Shelby", seat: "Memphis" },
    { slug: "knox-county", name: "Knox", seat: "Knoxville" },
    { slug: "hamilton-county", name: "Hamilton", seat: "Chattanooga" },
    { slug: "rutherford-county", name: "Rutherford", seat: "Murfreesboro" },
    { slug: "williamson-county", name: "Williamson", seat: "Franklin" },
  ]
  return (
    <section className="border-y border-[var(--rule)] bg-[var(--paper-raised)]">
      <div className="mx-auto max-w-5xl px-6 md:px-8 py-16 md:py-20">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h2 className="reveal-line font-[family-name:var(--font-display)] text-[34px] md:text-[46px] leading-[1.05] font-semibold">
            How it works where you live.
          </h2>
          <Link
            href="/foreclosure"
            className="reveal text-[14px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
          >
            All 32 counties →
          </Link>
        </div>
        <div className="stagger mt-10 grid gap-x-8 gap-y-px sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <Link
              key={c.slug}
              href={`/foreclosure/${c.slug}`}
              className="reveal group flex items-baseline justify-between gap-3 border-b border-[var(--rule)] py-4 hover:border-[var(--mocha)] transition-colors"
            >
              <span className="text-[17px] font-medium text-[var(--ink)] group-hover:text-[var(--mocha)] transition-colors">
                {c.name} County
              </span>
              <span className="text-[13px] text-[var(--ink-faint)]">{c.seat}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomeFaq() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-8 py-16 md:py-24">
      <h2 className="reveal-line font-[family-name:var(--font-display)] text-[34px] md:text-[46px] leading-[1.05] font-semibold">
        Straight answers.
      </h2>
      <div className="reveal mt-8">
        <FaqSection />
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="mx-auto max-w-5xl px-6 md:px-8 pb-20">
      <div className="rounded-2xl bg-[var(--ink)] px-8 py-14 md:px-14 md:py-16 text-center">
        <h2 className="mx-auto max-w-xl font-[family-name:var(--font-display)] text-[32px] md:text-[46px] leading-[1.08] font-semibold text-[var(--paper)] text-balance">
          Get the math before you sign anything.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.6] text-[color-mix(in_oklab,var(--paper)_70%,transparent)]">
          Free 15-minute call. No cost, no obligation to sell.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/homeowners"
            className="rounded-md bg-[var(--mocha)] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[color-mix(in_oklab,var(--mocha)_85%,white)] transition-colors"
          >
            Get your numbers
          </Link>
          <a
            href="mailto:falco@falco.llc"
            className="text-[14px] text-[color-mix(in_oklab,var(--paper)_70%,transparent)] hover:text-[var(--paper)]"
          >
            falco@falco.llc
          </a>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  const links = [
    { href: "/homeowners", label: "Homeowners" },
    { href: "/buyers", label: "Buyers" },
    { href: "/partners", label: "Partners" },
    { href: "/guides", label: "Guides" },
    { href: "/foreclosure", label: "Counties" },
    { href: "/math", label: "The math" },
    { href: "/manifesto", label: "Manifesto" },
    { href: "/inquiry", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/sms-consent", label: "Text opt-in" },
  ]
  return (
    <footer className="border-t border-[var(--rule)]">
      <div className="mx-auto max-w-5xl px-6 md:px-8 py-12">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--mocha)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-6 font-[family-name:var(--font-mono)] text-[12px] text-[var(--ink-faint)]">
          <span>FALCO · Patrick Armour, TN Auctioneer License #7622</span>
          <a href="mailto:falco@falco.llc" className="hover:text-[var(--mocha)]">
            falco@falco.llc
          </a>
        </div>
      </div>
    </footer>
  )
}
