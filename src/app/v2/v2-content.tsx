"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import FaqSection from "./faq-section"
import { SectionVideoBg, HeroVideoBg } from "./section-video-bg"

/**
 * Reveal each .falco-scroll-reveal child as it enters the viewport.
 * Desktop uses the snap-scroll container as root; mobile uses the actual
 * viewport (root: null) since mobile no longer uses an inner scroller.
 */
function useScrollReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches
    const root = isDesktop ? rootRef.current : null
    if (isDesktop && !root) return
    const targets = (root ?? document).querySelectorAll(".falco-scroll-reveal")
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
      { root, threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )
    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [rootRef])
}

/**
 * Lock body scroll for the snap-scroll layout — DESKTOP ONLY.
 * Mobile lets the body scroll naturally (snap-mandatory + iOS momentum
 * scrolling fight each other and the result is janky on touch devices).
 */
function useBodyScrollLock() {
  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])
}

export default function V2Content() {
  const scrollerRef = useRef<HTMLElement>(null)
  useScrollReveal(scrollerRef)
  useBodyScrollLock()

  return (
    <div className="md:h-screen md:flex md:flex-col bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* === HEADER ===
          Mobile: sticky top of viewport so it stays as user scrolls naturally.
          Desktop: shrink-0 inside the fixed-viewport flex column. */}
      <header className="sticky top-0 md:static md:shrink-0 border-b border-white/[0.06] bg-[#060606]/90 backdrop-blur-xl z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-10 md:py-5">
          <Link
            href="/"
            className="text-[14px] md:text-[16px] font-semibold tracking-[0.28em] md:tracking-[0.32em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <nav className="flex items-center gap-6 text-[14px] tracking-wide text-white/70">
            <Link href="/homeowners" className="hover:text-white transition-colors hidden md:inline">
              Homeowners
            </Link>
            <Link href="/buyers" className="hover:text-white transition-colors hidden md:inline">
              Buyers
            </Link>
            <Link href="/partners" className="hover:text-white transition-colors hidden md:inline">
              Auction Partners
            </Link>
            <Link href="/guides" className="hover:text-white transition-colors hidden md:inline">
              Guides
            </Link>
            {/* Direct contact as the header CTA — replaces the animated
                Request Access dropdown (the hero lanes now do that job).
                Email until the inbound phone line is live. */}
            <a
              href="mailto:falco@falco.llc"
              className="rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-white/85 hover:border-emerald-400/40 hover:text-white transition-colors whitespace-nowrap"
            >
              falco@falco.llc
            </a>
          </nav>
        </div>
      </header>

      {/* === MAIN ===
          Mobile: just a flow container, body scrolls naturally, no snap.
          Desktop: flex-1 scroll-snap container that owns the viewport. */}
      <main
        ref={scrollerRef}
        className="md:flex-1 md:overflow-y-scroll md:overflow-x-hidden md:snap-y md:snap-proximity md:scroll-smooth"
      >
        {/* === HERO ===
            On mobile we force min-h-[88vh] so the video has room to breathe
            even though we removed snap fit-to-viewport on small screens. */}
        <SnapSection mobileMinH="min-h-[88vh]">
          <HeroVideoBg
            src="/video/hero-loop.mp4"
            poster="/video/hero-poster.jpg"
            opacity={0.62}
          />

          <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(6,6,6,0.42)_0%,rgba(6,6,6,0.78)_72%,#060606_100%)]" />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#060606]/30 via-transparent to-[#060606]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_55%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.30]" />

          {/* Particle-constellation animation removed — it read as a
              dated 2020-era startup trope and was the heaviest thing on
              the hero. The video + layered gradients carry the depth. */}

          {/* The hero is a ROUTER, not a pitch. Three audiences hit this
              page; each gets one card straight to their page (which holds
              the full pitch + form). One CTA per lane — no duplicate
              buttons, no paragraph to read first. */}
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <h1 className="falco-hero-reveal max-w-3xl text-[40px] md:text-[72px] leading-[1.02] md:leading-[0.98] font-semibold text-white">
              <span className="block">Tennessee foreclosure?</span>
              <span className="block italic text-emerald-300">Keep your equity.</span>
            </h1>

            <div className="falco-hero-reveal mt-9 md:mt-12 grid gap-3 md:grid-cols-3 md:gap-4">
              <LaneCard
                href="/homeowners"
                label="Homeowners"
                headline="Facing a trustee sale?"
                body="We run a marketed auction before the courthouse date. No cost to you."
                cta="See your numbers"
              />
              <LaneCard
                href="/buyers"
                label="Buyers"
                headline="Want first look at inventory?"
                body="Equity-positive Tennessee properties. Clean title. Bid and close."
                cta="Get on the list"
              />
              <LaneCard
                href="/partners"
                label="Auction partners"
                headline="Run a TN auction house?"
                body="Pre-qualified sellers routed to your block. We source, you execute."
                cta="Partner with us"
              />
            </div>

            {/* One thin trust line — replaces the old checkmark chips. */}
            <div className="falco-hero-reveal mt-7 md:mt-8 text-[12px] md:text-[13px] text-white/50">
              Licensed Tennessee auctioneer · No cost to homeowners · The buyer pays our fee
            </div>
          </div>
        </SnapSection>

        {/* === THE MATH ===
            The three-exits table is the site's single most persuasive
            element (was buried in the old #homeowners section). It IS
            the thesis, so the two sections merged into one. */}
        <SnapSection>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  The math
                </div>
              </div>
              <div className="max-w-2xl">
                <h2 className="falco-scroll-reveal text-[26px] md:text-[40px] leading-[1.1] font-semibold">
                  Same house. Three ways out.
                </h2>
                <p className="falco-scroll-reveal mt-5 text-[16px] md:text-[17px] leading-[1.6] text-white/75">
                  A homeowner facing foreclosure is often sitting on six figures
                  of equity. Where it ends up depends on the exit:
                </p>

                {/* Rows land one at a time as the section scrolls into view
                    (existing stagger machinery — normal scroll, no hijack). */}
                <div className="falco-scroll-stagger mt-7 rounded-lg border border-white/[0.12] overflow-hidden bg-black/40 backdrop-blur-sm">
                  <div className="falco-scroll-reveal px-5 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/45">
                    Example: $500K home, $300K loan balance
                  </div>
                  <div className="falco-scroll-reveal grid grid-cols-[1fr_auto] gap-4 px-5 py-3 bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/60 border-t border-white/[0.06]">
                    <div>Your option</div>
                    <div>You walk away with</div>
                  </div>
                  <div className="falco-scroll-reveal grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06]">
                    <div className="text-[15px] text-white/85">Do nothing → trustee sale</div>
                    <div className="text-[15px] text-red-300 font-semibold tabular-nums">$0</div>
                  </div>
                  <div className="falco-scroll-reveal grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06]">
                    <div className="text-[15px] text-white/85">Take a fast-cash offer at 65%</div>
                    <div className="text-[15px] text-amber-200 font-semibold tabular-nums">~$25K</div>
                  </div>
                  <div className="falco-scroll-reveal grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06] bg-emerald-400/[0.08]">
                    <div className="text-[15px] text-emerald-100 font-medium">List with us → marketed auction</div>
                    <div className="text-[15px] text-emerald-300 font-bold tabular-nums">~$130K</div>
                  </div>
                </div>

                <p className="falco-scroll-reveal mt-6 text-[14px] leading-[1.7]">
                  <Link
                    href="/math"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-[6px] decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors"
                  >
                    Walk the math, one number at a time →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </SnapSection>

        {/* === HOW IT WORKS === */}
        <SnapSection id="how">
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="falco-scroll-reveal mb-14 max-w-2xl">
              <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85 mb-4">
                How it works
              </div>
              <h2 className="text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                Three steps. Your equity stays put.
              </h2>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
              <Step
                num="01"
                title="We watch the docket"
                body="Daily monitoring of every foreclosure filing across 95 TN counties."
              />
              <Step
                num="02"
                title="We show you the math"
                body="One call. Three paths side by side. Your real take-home on each."
              />
              <Step
                num="03"
                title="We run the auction"
                body="State-licensed marketed sale on the lender's deadline. Buyer pays the premium. Seller pays nothing."
              />
            </div>
          </div>
        </SnapSection>

        {/* Audience-specific pitches now live on their own pages
            (/homeowners, /buyers, /partners) — the hero routes there.
            Stacking all three here made every visitor scroll through
            two other audiences' content. */}

        {/* === WHY DIFFERENT === */}
        <SnapSection>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="falco-scroll-reveal mb-14 max-w-2xl">
              <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85 mb-4">
                What makes us different
              </div>
              <h2 className="text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                Homeowner-side, not buyer-side.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Diff
                label="vs. cash buyers"
                body="Cash buyers profit on the gap between what they pay you and what the home actually clears. We don't buy your house. The open market sets the price."
              />
              <Diff
                label="vs. traditional MLS"
                body="90 days, 6% commission, showings. We run 45–75 days, zero seller commission, defined sale day."
              />
              <Diff
                label="vs. Auction.com / Hubzu"
                body="Buyer-side, post-foreclosure. We work with the homeowner before the foreclosure hits."
              />
            </div>

            {/* The one load-bearing fact from the old About section —
                the rest of it now lives on /manifesto and the FAQ. */}
            <div className="falco-scroll-reveal mt-12 max-w-2xl text-[15px] leading-[1.7] text-white/70">
              Tennessee sees roughly{" "}
              <span className="text-emerald-300 font-medium">100 trustee sale filings</span>{" "}
              per week. We read every one and call the homeowner, usually before
              any cash buyer does.
            </div>
          </div>
        </SnapSection>

        {/* === FAQ (no snap — let the page scroll naturally to the footer) === */}
        <SnapSection videoSrc="/video/section-faq.mp4" noSnap>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="falco-scroll-reveal mb-10 max-w-2xl">
              <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85 mb-4">
                Common questions
              </div>
              <h2 className="text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                Straight answers.
              </h2>
            </div>
            <div className="falco-scroll-reveal">
              <FaqSection />
            </div>

            {/* Closing CTA — catches anyone still scrolling past the FAQ */}
            <div className="falco-scroll-reveal mt-10 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-6 md:p-7 flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="text-[15px] md:text-[16px] font-medium text-white">
                  Still have a question?
                </div>
                <div className="text-[13px] text-white/60 mt-1">
                  Press, partnership, or anything else. Drop us a note and we'll come
                  back within one business day.
                </div>
              </div>
              <Link
                href="/inquiry"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Get in touch →
              </Link>
            </div>

            {/* pb on mobile clears the sticky MobileCtaBar (~60px). */}
            <div className="mt-10 pt-6 pb-24 md:pb-0 border-t border-white/[0.06]">
              <div className="flex items-center justify-between flex-wrap gap-4 text-[12px] tracking-[0.18em] text-white/40">
                <div>FALCO · Tennessee</div>
                <div className="flex items-center gap-5">
                  <Link href="/buyers" className="hover:text-white transition-colors">
                    Buyers
                  </Link>
                  <Link href="/homeowners" className="hover:text-white transition-colors">
                    Homeowners
                  </Link>
                  <Link href="/partners" className="hover:text-white transition-colors">
                    Auction partners
                  </Link>
                  <Link href="/guides" className="hover:text-white transition-colors">
                    Guides
                  </Link>
                  {/* Crawl path: the homepage is the only page Google has
                      indexed with any weight — the county hub must be
                      reachable from it, not just from the sitemap. */}
                  <Link href="/foreclosure" className="hover:text-white transition-colors">
                    Counties
                  </Link>
                  <Link href="/inquiry" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                  <Link href="/manifesto" className="hover:text-white transition-colors">
                    Manifesto
                  </Link>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy
                  </Link>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms
                  </Link>
                  <Link href="/sms-consent" className="hover:text-white transition-colors">
                    Text opt-in
                  </Link>
                  <span className="text-white/15">falco.llc</span>
                </div>
              </div>
            </div>
          </div>
        </SnapSection>
      </main>
    </div>
  )
}

/**
 * Each snap-stop section: fits the viewport exactly (h-full = remainder of
 * scroll container after header). Content vertically centered. Optional
 * lazy-loaded video bg. allowOverflow lets long content (e.g. FAQ when items
 * are expanded) scroll within the section before snapping to next.
 */
function SnapSection({
  id,
  children,
  videoSrc,
  allowOverflow = false,
  mobileMinH,
  noSnap = false,
}: {
  id?: string
  children: React.ReactNode
  videoSrc?: string
  allowOverflow?: boolean
  mobileMinH?: string
  /** Skip the snap-start behavior so the page scrolls naturally past this
   *  section. Used on the FAQ section so the page just ends at the footer
   *  instead of trying to snap-fit a long collapsible list. */
  noSnap?: boolean
}) {
  // Mobile: natural-height sections with generous breathing room (no snap).
  // Desktop: snap-start (soft snap target). NOT snap-always — that was forcing
  // the browser to keep pulling users back to the previous snap point when
  // they tried to scroll into the FAQ section (which has no snap point).
  // snap-start + snap-proximity on the parent gives clean snap on the way
  // down without trapping anyone at the bottom.
  const snapClasses = noSnap ? "" : "snap-start"
  const desktopHeight = noSnap ? "" : allowOverflow ? "md:min-h-full" : "md:h-full"
  return (
    <section
      id={id}
      className={`relative isolate ${snapClasses} ${mobileMinH ?? ""} ${desktopHeight} grid place-items-center overflow-hidden bg-[#060606] py-16 md:py-20 px-1`}
    >
      {videoSrc && (
        <>
          <SectionVideoBg
            src={videoSrc}
            // Convention: /video/foo.mp4 has a sibling /video/foo-poster.jpg.
            // Generated via ffmpeg in public/video. Used for fast-paint and
            // as the fallback on mobile / slow connections.
            poster={videoSrc.replace(/\.mp4$/, "-poster.jpg")}
            opacity={0.32}
          />
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(6,6,6,0.55)_0%,rgba(6,6,6,0.85)_75%,#060606_100%)]" />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#060606]/30 via-transparent to-[#060606]/30" />
        </>
      )}
      <div className="w-full">{children}</div>
    </section>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="falco-scroll-reveal">
      <div className="text-[12px] text-emerald-400/90 font-semibold tracking-[0.18em] tabular-nums">
        {num}
      </div>
      <div className="mt-3 text-[20px] font-semibold text-white">{title}</div>
      <p className="mt-3 text-[15px] leading-[1.7] text-white/80">{body}</p>
    </div>
  )
}

function Diff({ label, body }: { label: string; body: string }) {
  return (
    <div className="falco-scroll-reveal">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/55 font-medium">
        {label}
      </div>
      <p className="mt-3 text-[15px] leading-[1.7] text-white/90">{body}</p>
    </div>
  )
}

/**
 * Hero router card — one per audience. The whole card is the CTA (single
 * link target per lane, no separate button), using the top-lit surface
 * treatment so the three lanes read as physical doors, not flat panels.
 */
function LaneCard({
  href,
  label,
  headline,
  body,
  cta,
}: {
  href: string
  label: string
  headline: string
  body: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="falco-surface group relative block rounded-xl border border-white/[0.08] p-5 md:p-6 transition-all duration-200 hover:border-emerald-400/35 hover:-translate-y-0.5"
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/85">
        {label}
      </div>
      <div className="mt-2.5 text-[17px] md:text-[18px] font-semibold leading-snug text-white">
        {headline}
      </div>
      <p className="mt-2 text-[13px] md:text-[14px] leading-[1.55] text-white/60">
        {body}
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
        {cta}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </Link>
  )
}
