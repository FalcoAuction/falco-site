"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { DotOrbit } from "../dot-orbit"
import FaqSection from "./faq-section"
import { SectionVideoBg, HeroVideoBg } from "./section-video-bg"
import { RequestDropdown } from "./request-dropdown"

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
            <a href="#homeowners" className="hover:text-white transition-colors hidden md:inline">
              Homeowners
            </a>
            <a href="#buyers" className="hover:text-white transition-colors hidden md:inline">
              Buyers
            </a>
            <a href="#auction-partners" className="hover:text-white transition-colors hidden md:inline">
              Auction Partners
            </a>
            <RequestDropdown />
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

          <div className="pointer-events-none absolute inset-0 -z-10">
            <DotOrbit
              dotColor="rgba(16, 185, 129, 0.5)"
              lineColor="rgba(16, 185, 129, 0.06)"
              density={0.55}
              speed={0.3}
              dotSize={1.1}
              linkDistance={120}
              opacity={0.6}
            />
          </div>

          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="max-w-3xl">
              <h1 className="falco-scroll-reveal text-[44px] md:text-[96px] leading-[0.98] md:leading-[0.9] tracking-[-0.03em] md:tracking-[-0.04em] font-semibold text-white">
                <span className="block">Tennessee foreclosure?</span>
                <span className="block text-emerald-400">Run a real auction.</span>
                <span className="block text-white/45">Keep your equity.</span>
              </h1>

              <p className="falco-scroll-reveal mt-7 md:mt-9 max-w-2xl text-[16px] md:text-[21px] leading-[1.5] text-white/80">
                FALCO routes Tennessee homes through state-licensed marketed auctions —
                fast enough to beat the trustee sale, structured to clear at market.
                The buyer pays our fee.{" "}
                <span className="text-emerald-300/90 font-medium">You keep what's yours.</span>
              </p>

              {/* Primary CTA + secondary text links — sharper hierarchy on mobile,
                  stops the trio of buttons from competing visually. */}
              <div className="falco-scroll-reveal mt-7 md:mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                <a
                  href="#homeowners"
                  className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors w-fit"
                >
                  For Homeowners
                </a>
                <div className="flex items-center gap-1 text-[13px] text-white/55">
                  <a href="#buyers" className="hover:text-white transition-colors px-1 py-2">
                    For Buyers
                  </a>
                  <span className="text-white/25">·</span>
                  <a href="#auction-partners" className="hover:text-white transition-colors px-1 py-2">
                    For Auction Partners
                  </a>
                </div>
              </div>
            </div>
          </div>
        </SnapSection>

        {/* === THESIS === */}
        <SnapSection>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  Our thesis
                </div>
              </div>
              <div className="max-w-2xl">
                <p className="falco-scroll-reveal text-[22px] md:text-[32px] leading-[1.35] md:leading-[1.4] text-white font-light tracking-tight">
                  A homeowner facing foreclosure is sitting on{" "}
                  <span className="font-medium">$100K–$250K</span> of equity they're
                  about to lose. We're built so they don't.
                </p>
                <p className="falco-scroll-reveal mt-6 text-[16px] md:text-[17px] leading-[1.65] text-white/70">
                  We don't buy your house. The buyer pays our fee. The equity
                  goes home with you.
                </p>
                <p className="falco-scroll-reveal mt-6 text-[14px] leading-[1.7]">
                  <Link
                    href="/manifesto"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-[6px] decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors"
                  >
                    Read the math, county by county →
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

        {/* === FOR HOMEOWNERS === */}
        <SnapSection id="homeowners" videoSrc="/video/section-homeowners.mp4">
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  For homeowners
                </div>
              </div>
              <div className="max-w-2xl">
                <h2 className="falco-scroll-reveal text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                  Facing foreclosure in Tennessee?
                </h2>

                <p className="falco-scroll-reveal mt-6 text-[17px] leading-[1.65] text-white/85">
                  The cash buyers calling will pay you a fraction of what your home
                  actually clears at a real auction. Here's the math, three ways:
                </p>

                <div className="falco-scroll-reveal mt-7 rounded-lg border border-white/[0.12] overflow-hidden bg-black/40 backdrop-blur-sm">
                  <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/45">
                    Example: $500K home, $300K loan balance
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/60 border-t border-white/[0.06]">
                    <div>Your option</div>
                    <div>You walk away with</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06]">
                    <div className="text-[15px] text-white/85">Do nothing → trustee sale</div>
                    <div className="text-[15px] text-red-300 font-semibold tabular-nums">$0</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06]">
                    <div className="text-[15px] text-white/85">Take a fast-cash offer at 65%</div>
                    <div className="text-[15px] text-amber-200 font-semibold tabular-nums">~$25K</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 border-t border-white/[0.06] bg-emerald-400/[0.08]">
                    <div className="text-[15px] text-emerald-100 font-medium">List with us → marketed auction</div>
                    <div className="text-[15px] text-emerald-300 font-bold tabular-nums">~$130K</div>
                  </div>
                </div>

                <div className="falco-scroll-reveal mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/homeowners"
                    className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
                  >
                    Get a free 15-min call
                  </Link>
                  <div className="text-[13px] text-white/55 self-center">
                    No pitch. Real math.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SnapSection>

        {/* === FOR BUYERS === */}
        <SnapSection id="buyers" videoSrc="/video/section-buyers.mp4">
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  For buyers
                </div>
              </div>
              <div className="max-w-2xl">
                <h2 className="falco-scroll-reveal text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                  First look at TN distressed inventory.
                </h2>

                <p className="falco-scroll-reveal mt-6 text-[17px] leading-[1.65] text-white/85">
                  Equity-rich properties, sourced at the courthouse-filing layer, listed
                  through our auction pipeline. Clean title, 10% buyer's premium. Bid and close.
                </p>

                <ul className="falco-scroll-reveal mt-6 space-y-2.5 text-[15px] text-white/85">
                  <BuyerBullet text="First-look on TN inventory" />
                  <BuyerBullet text="Equity-positive only" />
                  <BuyerBullet text="Clean title, 10% buyer's premium" />
                </ul>

                <div className="falco-scroll-reveal mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/buyers"
                    className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
                  >
                    Get notified →
                  </Link>
                  <div className="text-[13px] text-white/55 self-center">
                    90 seconds. No spam.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SnapSection>

        {/* === FOR AUCTION PARTNERS === */}
        <SnapSection id="auction-partners" videoSrc="/video/section-partners.mp4">
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  For auction partners
                </div>
              </div>
              <div className="max-w-2xl">
                <h2 className="falco-scroll-reveal text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                  Run a TN auction company?
                </h2>

                <p className="falco-scroll-reveal mt-6 text-[17px] leading-[1.65] text-white/85">
                  Steady pre-qualified inventory you don't have to source. You bring the
                  licensing and execution. We bring the pipeline.
                </p>

                <ul className="falco-scroll-reveal mt-6 space-y-2.5 text-[15px] text-white/85">
                  <BuyerBullet text="Pre-qualified inventory, delivered as it surfaces" />
                  <BuyerBullet text="Sellers educated before handoff" />
                  <BuyerBullet text="No sourcing cost" />
                </ul>

                <div className="falco-scroll-reveal mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/partners"
                    className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
                  >
                    Open a conversation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SnapSection>

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
                body="Cash buyers profit on the gap between what they pay you and what the home actually clears. We don't buy your house — the open market sets the price."
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

            <div className="falco-scroll-reveal mt-12 text-[14px] text-white/55">
              Want the math behind this?{" "}
              <Link
                href="/manifesto"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-[6px] decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors font-medium"
              >
                Read the long version →
              </Link>
            </div>
          </div>
        </SnapSection>

        {/* === ABOUT === */}
        <SnapSection>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 relative">
            <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16">
              <div className="falco-scroll-reveal">
                <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85">
                  About FALCO
                </div>
              </div>
              <div className="max-w-2xl">
                <h2 className="falco-scroll-reveal text-[28px] md:text-[48px] leading-[1.05] tracking-[-0.02em] font-semibold">
                  Built in Tennessee. For Tennessee.
                </h2>

                <p className="falco-scroll-reveal mt-6 text-[17px] leading-[1.7] text-white/85">
                  Tennessee sees roughly{" "}
                  <span className="text-emerald-300 font-medium">100 trustee sale filings</span>{" "}
                  per week. We read every one and call the homeowner — usually
                  before any cash buyer does.
                </p>

                <p className="falco-scroll-reveal mt-5 text-[17px] leading-[1.65] text-white/70">
                  We don't buy houses. We don't broker mortgages. We don't run a webinar.
                  We connect distressed sellers to a marketed auction and get paid only
                  when the buyer pays the premium.
                </p>

                <p className="falco-scroll-reveal mt-5 text-[14px] leading-[1.7] text-white/55">
                  Sources for our claims live on the{" "}
                  <Link
                    href="/manifesto#sources"
                    className="text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
                  >
                    manifesto page
                  </Link>
                  .
                </p>

                <p className="falco-scroll-reveal mt-5 text-[14px] leading-[1.7] text-white/55">
                  Questions, press, or partnership outside the three core forms?{" "}
                  <Link
                    href="/inquiry"
                    className="text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
                  >
                    Drop us a note
                  </Link>
                  .
                </p>
              </div>
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
                  Press, partnership, or anything else — drop us a note and we'll come
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

            <div className="mt-10 pt-6 border-t border-white/[0.06]">
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

function BuyerBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 inline-block h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
      <span>{text}</span>
    </li>
  )
}
