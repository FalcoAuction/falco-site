"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import FaqSection from "./faq-section"
import { HeroVideoBg } from "./section-video-bg"

/**
 * Homepage, rebuilt to mirror the La Masion editorial real-estate layout,
 * made FALCO. Normal scrolling page (no snap), warm ivory ground to match
 * the content pages, with the cinematic dark video as the one dark moment
 * in the hero. Section rhythm mirrors the reference:
 *   hero -> stat band -> services (3 lanes) -> featured counties ->
 *   why-trust (numbered) -> the math -> FAQ -> CTA -> footer.
 */

// Reveal each .reveal element as it scrolls into view (whole page).
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

// Count 0 -> target when the element scrolls into view.
function useCountUp(target: number, ms = 1100) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target)
      return
    }
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
      <StatBand />
      <Services />
      <FeaturedCounties />
      <WhyTrust />
      <TheMath />
      <HomeFaq />
      <ClosingCta />
      <SiteFooter />
    </div>
  )
}

/* ── Sticky header: translucent ivory over the hero and the page alike ── */
function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-10">
        <Link
          href="/"
          className="text-[15px] md:text-[16px] font-semibold tracking-[0.32em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors"
        >
          FALCO
        </Link>
        <nav className="flex items-center gap-6 text-[14px] text-[var(--ink-soft)]">
          <Link href="/homeowners" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Homeowners
          </Link>
          <Link href="/buyers" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Buyers
          </Link>
          <Link href="/partners" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Auction partners
          </Link>
          <Link href="/guides" className="hidden md:inline hover:text-[var(--mocha)] transition-colors">
            Guides
          </Link>
          <a
            href="mailto:falco@falco.llc"
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:bg-[var(--mocha)] transition-colors"
          >
            Talk to us
          </a>
        </nav>
      </div>
    </header>
  )
}

/* ── Hero: cinematic dark video, giant serif headline, two actions ── */
function Hero() {
  return (
    <section className="relative isolate flex min-h-[86vh] items-center overflow-hidden bg-[#17110a]">
      {/* The drone footage is monochrome at the source, so we warm it with a
          mocha wash (multiply) instead of leaving it flat gray, and keep the
          overlays light + warm so the footage actually reads. */}
      {/* Footage is monochrome at the source, so it gets a warm sepia
          treatment plus a very slow ambient drift so the frame is alive. */}
      <div className="hero-media absolute inset-0 -z-30 [filter:sepia(0.6)_saturate(1.6)_contrast(1.03)_brightness(1.05)]">
        <HeroVideoBg src="/video/hero-loop.mp4" poster="/video/hero-poster.jpg" opacity={1} />
      </div>
      <div className="hero-veil absolute inset-0 -z-20 bg-gradient-to-b from-[#17110a]/55 via-[#17110a]/20 to-[#120d08]/85" />
      <div className="hero-veil absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(18,13,8,0.5)_100%)]" />

      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 py-24 md:py-28">
        <div className="max-w-3xl">
          <div className="hero-in hero-in-1 text-[12px] uppercase tracking-[0.28em] text-[#d8c3a5] font-medium">
            Tennessee · Distressed property, handled
          </div>
          <h1 className="hero-in hero-in-2 mt-6 font-[family-name:var(--font-display)] text-[52px] md:text-[92px] leading-[0.98] font-semibold text-white text-balance">
            Foreclosure?{" "}
            <span className="italic text-[#e6d5bd]">Keep your equity.</span>
          </h1>
          <p className="hero-in hero-in-3 mt-7 max-w-xl text-[17px] md:text-[19px] leading-[1.55] text-white/80">
            From the first notice to sale day, we help Tennessee homeowners sell
            through a licensed marketed auction before the trustee sale, and keep
            the equity that auction would otherwise erase.
          </p>
          <div className="hero-in hero-in-4 mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/homeowners"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--paper)] px-7 py-3.5 text-[15px] font-semibold text-[var(--ink)] hover:bg-white hover:-translate-y-0.5 transition-all duration-300"
            >
              See your numbers →
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-7 py-3.5 text-[15px] font-medium text-white hover:border-white/70 hover:-translate-y-0.5 transition-all duration-300"
            >
              How it works
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Stat band: thesis + count-up figures + established line ── */
function StatBand() {
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
        <p className="reveal max-w-4xl font-[family-name:var(--font-display)] text-[28px] md:text-[44px] leading-[1.2] font-medium text-[var(--ink)] text-balance">
          We read every trustee sale filing in Tennessee and call the homeowner,
          usually before any cash buyer does.
        </p>
        <div className="stagger mt-14 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6 border-t border-[var(--rule)] pt-12">
          <div className="reveal">
            <Stat n={100} suffix="+" label="Trustee filings read every week" />
          </div>
          <div className="reveal">
            <Stat n={32} label="Tennessee counties covered" />
          </div>
          <div className="reveal">
            <StatStatic value="$0" label="Cost to the homeowner" />
          </div>
          <div className="reveal">
            <Stat n={10} suffix="%" label="Buyer's premium, they pay, not you" />
          </div>
        </div>
        <div className="reveal mt-10 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.06em] text-[var(--ink-faint)]">
          Built in Tennessee · Licensed auctioneer · Est. 2026
        </div>
      </div>
    </section>
  )
}

function Stat({ n, label, suffix = "" }: { n: number; label: string; suffix?: string }) {
  const { ref, val } = useCountUp(n)
  return (
    <div>
      <div className="font-[family-name:var(--font-display)] text-[52px] md:text-[68px] leading-none font-semibold text-[var(--ink)] tabular-nums">
        <span ref={ref}>{val}</span>
        {suffix}
      </div>
      <div className="mt-3 text-[13px] md:text-[14px] leading-[1.4] text-[var(--ink-faint)] max-w-[22ch]">
        {label}
      </div>
    </div>
  )
}

function StatStatic({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-display)] text-[52px] md:text-[68px] leading-none font-semibold text-[var(--mocha)] tabular-nums">
        {value}
      </div>
      <div className="mt-3 text-[13px] md:text-[14px] leading-[1.4] text-[var(--ink-faint)] max-w-[22ch]">
        {label}
      </div>
    </div>
  )
}

/* ── Services: one team, three ways in (mirrors Buy / Sell / Rental) ── */
function Services() {
  const lanes = [
    {
      href: "/homeowners",
      kicker: "For homeowners",
      title: "Sell before the sale",
      body: "Facing a trustee sale? We run a licensed marketed auction before the courthouse date so the open market sets your price. No cost to you.",
      cta: "See your numbers",
    },
    {
      href: "/buyers",
      kicker: "For buyers",
      title: "First look at inventory",
      body: "Equity-positive Tennessee properties, sourced at the courthouse-filing layer. Clean title, 10% buyer's premium. Bid and close.",
      cta: "Get on the list",
    },
    {
      href: "/partners",
      kicker: "For auction partners",
      title: "Inventory, delivered",
      body: "Pre-qualified sellers routed to your block. You bring the license and execution. We bring the pipeline and educate the seller first.",
      cta: "Partner with us",
    },
  ]
  return (
    <section id="how" className="scroll-mt-20 border-b border-[var(--rule)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
        <SectionHead eyebrow="What we do" title="One team, three ways in." />
        <div className="stagger mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {lanes.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="reveal group flex flex-col rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-7 md:p-8 transition-all duration-300 hover:border-[var(--mocha)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-30px_rgba(17,17,17,0.4)]"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--mocha)] font-semibold">
                {l.kicker}
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-[28px] md:text-[32px] leading-tight font-semibold text-[var(--ink)]">
                {l.title}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                {l.body}
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--mocha)] group-hover:gap-2.5 transition-all">
                {l.cta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Featured counties (mirrors "Featured properties": image-topped cards) ── */
function FeaturedCounties() {
  // Drone-footage stills are monochrome at the source, so each card image
  // gets the same warm sepia treatment as the hero to read as intentional
  // editorial photography rather than flat gray.
  const counties = [
    { slug: "davidson-county", name: "Davidson County", seat: "Nashville", img: "/video/hero-poster.jpg" },
    { slug: "shelby-county", name: "Shelby County", seat: "Memphis", img: "/video/section-homeowners-poster.jpg" },
    { slug: "knox-county", name: "Knox County", seat: "Knoxville", img: "/video/section-buyers-poster.jpg" },
    { slug: "hamilton-county", name: "Hamilton County", seat: "Chattanooga", img: "/video/section-partners-poster.jpg" },
    { slug: "rutherford-county", name: "Rutherford County", seat: "Murfreesboro", img: "/video/section-faq-poster.jpg" },
    { slug: "williamson-county", name: "Williamson County", seat: "Franklin", img: "/video/hero-poster.jpg" },
  ]
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <SectionHead
            eyebrow="Where we work"
            title="Foreclosure help, county by county."
          />
          <Link
            href="/foreclosure"
            className="reveal shrink-0 text-[14px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
          >
            All 32 counties →
          </Link>
        </div>
        <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {counties.map((c) => (
            <Link
              key={c.slug + c.img}
              href={`/foreclosure/${c.slug}`}
              className="reveal reveal-img group overflow-hidden rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] transition-all duration-300 hover:border-[var(--mocha)] hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-28px_rgba(17,17,17,0.42)]"
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.img}
                  alt={`Aerial view over ${c.seat}, ${c.name}, Tennessee`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover group-hover:scale-[1.06] [filter:sepia(0.55)_saturate(1.5)_contrast(1.02)]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17110a]/45 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mocha)] backdrop-blur-sm">
                  {c.seat}
                </div>
              </div>
              <div className="p-5">
                <div className="font-[family-name:var(--font-display)] text-[25px] leading-tight font-semibold text-[var(--ink)]">
                  {c.name}
                </div>
                <div className="mt-1 text-[13px] text-[var(--ink-faint)]">
                  Trustee sale location, notices, and your options
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mocha)] group-hover:gap-2.5 transition-all">
                  View county guide <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Why trust: numbered value props (mirrors "Why Thousands Trust") ── */
function WhyTrust() {
  const points = [
    {
      n: "01",
      title: "Homeowner-side, not buyer-side",
      body: "We don't buy your house. Cash buyers profit on the gap between what they pay you and what the home clears. We let the open market set the price.",
    },
    {
      n: "02",
      title: "The buyer pays our fee",
      body: "Zero dollars out of pocket for you. No listing fee, no commission from your side. The auction is funded by a standard buyer's premium.",
    },
    {
      n: "03",
      title: "A licensed Tennessee auctioneer",
      body: "A real, regulated marketed sale run by a state-licensed auction firm. Photos, advertising, a defined sale day, buyers competing on price.",
    },
    {
      n: "04",
      title: "We read every filing",
      body: "Roughly 100 trustee sale notices are filed across Tennessee every week. We read them and reach the homeowner, often before any cash buyer.",
    },
  ]
  return (
    <section className="border-b border-[var(--rule)] bg-[var(--paper-raised)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
        <SectionHead eyebrow="Why us" title="Why homeowners work with FALCO." />
        <div className="stagger mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {points.map((p) => (
            <div key={p.n} className="reveal flex gap-6">
              <div className="font-[family-name:var(--font-display)] text-[30px] leading-none font-semibold text-[var(--mocha)] tabular-nums pt-1">
                {p.n}
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-[24px] md:text-[27px] leading-tight font-semibold text-[var(--ink)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.65] text-[var(--ink-soft)] max-w-[46ch]">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── The math (real, verifiable transparency in place of testimonials) ── */
function TheMath() {
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 items-center">
          <div>
            <SectionHead eyebrow="The math" title="Same house. Three ways out." />
            <p className="reveal mt-6 text-[16px] md:text-[17px] leading-[1.6] text-[var(--ink-soft)] max-w-[46ch]">
              A homeowner facing foreclosure is often sitting on six figures of
              equity. Where it ends up depends only on the exit they choose.
            </p>
            <Link
              href="/math"
              className="reveal mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
            >
              Walk the math, one number at a time →
            </Link>
          </div>

          <div className="reveal rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] overflow-hidden">
            <div className="px-6 pt-4 pb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Example: $500K home, $300K loan balance
            </div>
            <Row label="Do nothing → trustee sale" value="$0" tone="oxblood" />
            <Row label="Take a fast-cash offer at 65%" value="~$25K" tone="amber" />
            <Row label="List with us → marketed auction" value="~$130K" tone="mocha" highlight />
          </div>
        </div>
      </div>
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
  tone: "oxblood" | "amber" | "mocha"
  highlight?: boolean
}) {
  const color =
    tone === "oxblood"
      ? "text-[var(--oxblood)]"
      : tone === "amber"
        ? "text-[#8a6d1f]"
        : "text-[var(--mocha)]"
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-4 border-t border-[var(--rule)] ${
        highlight ? "bg-[var(--mocha-wash)]" : ""
      }`}
    >
      <span className="text-[15px] text-[var(--ink-soft)]">{label}</span>
      <span className={`font-[family-name:var(--font-display)] text-[28px] md:text-[32px] font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  )
}

/* ── FAQ — kept so the FAQPage schema mirrors visible content ── */
function HomeFaq() {
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="mx-auto max-w-3xl px-6 md:px-10 py-16 md:py-24">
        <SectionHead eyebrow="Common questions" title="Straight answers." />
        <div className="reveal mt-10">
          <FaqSection />
        </div>
      </div>
    </section>
  )
}

/* ── Closing CTA band ── */
function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
      <div className="rounded-2xl bg-[var(--ink)] px-8 py-14 md:px-16 md:py-20 text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#c9a98a] font-semibold">
          Facing a sale date?
        </div>
        <h2 className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-display)] text-[34px] md:text-[52px] leading-[1.08] font-semibold text-[var(--paper)] text-balance">
          Get your numbers before you take any cash offer.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] md:text-[16px] leading-[1.6] text-[color-mix(in_oklab,var(--paper)_72%,transparent)]">
          Free 15-minute call. We show you what your home would likely clear at a
          marketed auction versus the trustee sale. No cost, no pressure, no
          obligation to sell.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/homeowners"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--mocha)] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[var(--mocha-deep)] transition-colors"
          >
            See your numbers →
          </Link>
          <a
            href="mailto:falco@falco.llc"
            className="text-[14px] text-[color-mix(in_oklab,var(--paper)_70%,transparent)] hover:text-[var(--paper)]"
          >
            or email falco@falco.llc
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ── */
function SiteFooter() {
  const cols: Array<{ head: string; links: Array<{ href: string; label: string }> }> = [
    {
      head: "Start here",
      links: [
        { href: "/homeowners", label: "Homeowners" },
        { href: "/buyers", label: "Buyers" },
        { href: "/partners", label: "Auction partners" },
      ],
    },
    {
      head: "Learn",
      links: [
        { href: "/guides", label: "Guides" },
        { href: "/foreclosure", label: "Foreclosure by county" },
        { href: "/math", label: "The math" },
        { href: "/manifesto", label: "Manifesto" },
      ],
    },
    {
      head: "Company",
      links: [
        { href: "/inquiry", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/sms-consent", label: "Text opt-in" },
      ],
    },
  ]
  return (
    <footer className="border-t border-[var(--rule)] bg-[var(--paper-raised)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="text-[16px] font-semibold tracking-[0.32em] text-[var(--ink)]">
              FALCO
            </div>
            <p className="mt-4 max-w-[30ch] text-[14px] leading-[1.6] text-[var(--ink-faint)]">
              Tennessee distressed-property intelligence and auction routing. We
              help homeowners keep the equity a foreclosure would take.
            </p>
            <a
              href="mailto:falco@falco.llc"
              className="mt-4 inline-block text-[14px] font-medium text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
            >
              falco@falco.llc
            </a>
          </div>
          {cols.map((col) => (
            <div key={col.head}>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)] font-semibold">
                {col.head}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-[var(--ink-soft)] hover:text-[var(--mocha)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-[var(--rule)] pt-6 flex flex-wrap items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-[12px] text-[var(--ink-faint)]">
          <span>FALCO · Tennessee · Licensed auctioneer</span>
          <span>© 2026 FALCO</span>
        </div>
      </div>
    </footer>
  )
}

/* ── Shared section header ── */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <div className="reveal flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
        {eyebrow}
        <span className="h-px w-12 bg-[var(--rule-strong)]" />
      </div>
      <h2 className="reveal-line mt-5 font-[family-name:var(--font-display)] text-[36px] md:text-[54px] leading-[1.04] font-semibold text-[var(--ink)] text-balance">
        {title}
      </h2>
    </div>
  )
}
