"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { DotOrbit } from "../dot-orbit"
import FaqSection from "./faq-section"

/** Reveal each .falco-scroll-reveal child as it enters the viewport. */
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
    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [])
  return ref
}

export default function V2Content() {
  const scrollRef = useScrollReveal()

  return (
    <main
      ref={scrollRef}
      className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white"
    >
      {/* === HEADER === */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <nav className="flex items-center gap-4 text-[12px] tracking-wide text-white/60">
            <a href="#homeowners" className="hover:text-white transition-colors hidden md:inline">
              Homeowners
            </a>
            <a href="#buyers" className="hover:text-white transition-colors hidden md:inline">
              Buyers
            </a>
            <a href="#auction-partners" className="hover:text-white transition-colors hidden md:inline">
              Auction Partners
            </a>
            <Link
              href="/partner-login"
              className="falco-orbit-right falco-accent-button-secondary inline-flex items-center justify-center rounded-xl px-4 py-2 text-[12px] font-semibold transition"
            >
              Partner Login
            </Link>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative isolate overflow-hidden">
        {/* Background layers — subtle radial wash + dotted grid + animated dot orbit */}
        <div className="absolute inset-0 -z-30 bg-[#060606]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.45]" />

        {/* Orbiting dot canvas — turned up vs original (denser, slightly brighter) */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <DotOrbit
            dotColor="rgba(16, 185, 129, 0.6)"
            lineColor="rgba(16, 185, 129, 0.09)"
            density={0.95}
            speed={0.4}
            dotSize={1.4}
            linkDistance={130}
            opacity={0.85}
          />
        </div>

        <div className="mx-auto max-w-5xl px-6 pt-28 pb-28 md:px-10 md:pt-40 md:pb-40">
          <div className="max-w-3xl">
            <h1 className="falco-scroll-reveal text-[44px] md:text-[72px] leading-[0.96] tracking-[-0.035em] font-semibold text-white">
              We route distressed Tennessee homes{" "}
              <span className="text-emerald-400">to auction</span>
              <span className="text-white/40">. Not to wholesalers.</span>
            </h1>

            <p className="falco-scroll-reveal mt-8 max-w-2xl text-[16px] md:text-[18px] leading-[1.65] text-white/65">
              We find homeowners facing foreclosure across Tennessee. We show them what
              their home is actually worth. Then we list it through our auction pipeline
              so they walk away with their equity intact, instead of losing it to a
              wholesaler or the courthouse.
            </p>

            <div className="falco-scroll-reveal mt-10 flex flex-wrap items-center gap-3">
              <a
                href="#homeowners"
                className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                For Homeowners
              </a>
              <a
                href="#buyers"
                className="falco-orbit-left falco-accent-button-secondary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[13px] font-semibold transition"
              >
                For Buyers
              </a>
              <a
                href="#auction-partners"
                className="text-[12px] text-white/45 hover:text-white/85 underline-offset-4 hover:underline transition-colors px-2 py-2"
              >
                For Auction Partners →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* === THESIS === */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16">
          <div className="falco-scroll-reveal">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
              Our thesis
            </div>
          </div>
          <div className="max-w-2xl">
            <p className="falco-scroll-reveal text-[20px] md:text-[26px] leading-[1.5] text-white/90 font-light tracking-tight">
              A Tennessee homeowner facing foreclosure is typically sitting on{" "}
              <span className="text-white font-medium">$100,000 to $250,000</span> of
              equity they're about to lose. Most of them never hear about the option
              that keeps it in their pocket.
            </p>
            <p className="falco-scroll-reveal mt-6 text-[15px] leading-[1.75] text-white/55">
              We get to them first. We show them what their home is actually worth at
              auction. Then we list it through our auction pipeline so the sale price
              gets set by the market, not by a flipper's margin.
            </p>
            <p className="falco-scroll-reveal mt-6 text-[15px] leading-[1.75] text-white/55">
              We don't buy your house. We don't take a commission. The buyer pays a
              standard auction premium and you keep the equity that's yours.
            </p>
          </div>
        </div>
      </section>

      <Divider />

      {/* === HOW IT WORKS === */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="falco-scroll-reveal mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75 mb-3">
            How it works
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Three steps. No middlemen.
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          <Step
            num="01"
            title="We find the file"
            body="Daily scrapes of trustee notices, lis pendens filings, tax records, and probate courts across all 95 Tennessee counties. Every actionable property comes with owner contact, valuation, and timing."
          />
          <Step
            num="02"
            title="We make the call"
            body="Our team reaches the homeowner directly. Not with a lowball cash offer. With the actual math on what they'd walk away with through a marketed sale. For most homeowners, it's the first time anyone has told them the option exists."
          />
          <Step
            num="03"
            title="We list with auction"
            body="Property goes to marketed auction with one of our Tennessee auction partners. Buyers compete. Property sells at market value. Seller pays zero. Buyer pays a standard premium. Everyone knows the terms up front."
          />
        </div>
      </section>

      <Divider />

      {/* === FOR HOMEOWNERS === */}
      <section id="homeowners" className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
          <div className="falco-scroll-reveal">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
              For homeowners
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="falco-scroll-reveal text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
              Facing foreclosure in Tennessee? Read this.
            </h2>

            <div className="falco-scroll-reveal mt-8 space-y-6 text-[15px] leading-[1.75] text-white/60">
              <p>
                You'll get a lot of calls. Wholesalers offering 60–70% of your home's
                value, in cash, fast. Most homeowners take those offers because nobody
                told them there was a third path besides letting the trustee sale happen.
              </p>
              <p className="text-white/85">
                There is one. And it's built around what you keep — not what someone
                else takes.
              </p>
            </div>

            {/* Three-paths table */}
            <div className="falco-scroll-reveal mt-10 rounded-lg border border-white/[0.08] overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/45">
                <div>Your option</div>
                <div>You walk away with</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06]">
                <div className="text-[14px] text-white/70">Do nothing → trustee sale</div>
                <div className="text-[14px] text-red-300 font-medium tabular-nums">$0</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06]">
                <div className="text-[14px] text-white/70">Sell to a wholesaler at 60–70%</div>
                <div className="text-[14px] text-amber-200 font-medium tabular-nums">$25K – $50K</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06] bg-emerald-400/[0.05]">
                <div className="text-[14px] text-emerald-100 font-medium">List with us → marketed auction</div>
                <div className="text-[14px] text-emerald-300 font-semibold tabular-nums">$100K+</div>
              </div>
            </div>

            <div className="falco-scroll-reveal mt-8 space-y-4 text-[15px] leading-[1.75] text-white/60">
              <p>
                We don't buy your house. We don't charge you anything. Our auction
                partners sell it for you, the buyer pays a standard premium on top of
                the bid, and you keep the rest after your mortgage is paid off.
              </p>
              <p className="text-white/85">
                Most sellers we work with walk away with $100K–$250K they otherwise
                would have lost.
              </p>
            </div>

            <div className="falco-scroll-reveal mt-10 flex flex-wrap gap-3">
              <Link
                href="/homeowners"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Get a free 15-min call
              </Link>
              <div className="text-[12px] text-white/40 self-center">
                No pitch. Real math. We can either help you or we can't.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* === FOR BUYERS === */}
      <section id="buyers" className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
          <div className="falco-scroll-reveal">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
              For buyers
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="falco-scroll-reveal text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
              Buy distressed Tennessee real estate? Get first look.
            </h2>

            <div className="falco-scroll-reveal mt-8 space-y-6 text-[15px] leading-[1.75] text-white/60">
              <p>
                We surface equity-rich Tennessee distressed properties before they hit
                MLS, before they propagate to PropStream and BatchLeads, before the
                wholesaler swarm shows up. Then we list them through our auction
                pipeline — clean title, pre-verified, standard 8% buyer's premium.
              </p>
              <p className="text-white/85">
                No underwater junk. No buried fees. You bid the number you want to pay.
                If you win, you close.
              </p>
            </div>

            <ul className="falco-scroll-reveal mt-8 space-y-3 text-[14px] text-white/75">
              <BuyerBullet text="First-look notifications on Tennessee inventory before public listing" />
              <BuyerBullet text="Equity-positive deals only — we filter the underwater ones out" />
              <BuyerBullet text="Standard 8% buyer's premium, no surprises, no junk fees" />
              <BuyerBullet text="Clean title delivered at close by our auction partners" />
              <BuyerBullet text="Priority on properties matching your registered buy box" />
            </ul>

            <div className="falco-scroll-reveal mt-10 flex flex-wrap gap-3">
              <Link
                href="/buyers"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Register for buyer access →
              </Link>
              <div className="text-[12px] text-white/40 self-center">
                90 seconds. No spam. Unsubscribe anytime.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* === FOR AUCTION PARTNERS === */}
      <section id="auction-partners" className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
          <div className="falco-scroll-reveal">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
              For auction partners
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="falco-scroll-reveal text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
              Run a Tennessee auction company? Let's talk.
            </h2>

            <div className="falco-scroll-reveal mt-8 space-y-6 text-[15px] leading-[1.75] text-white/60">
              <p>
                We bring you a steady flow of Tennessee distressed inventory you don't
                have to source. Sellers we hand off are already qualified and already
                understand the auction option — the homework is done before you make
                the listing call.
              </p>
              <p className="text-white/85">
                You bring the licensing, marketing, and execution. We bring the
                pipeline. The result is a partnership where your team focuses on
                what auction companies do best — not on cold-calling for inventory.
              </p>
            </div>

            <ul className="falco-scroll-reveal mt-8 space-y-3 text-[14px] text-white/75">
              <BuyerBullet text="Pre-qualified, equity-positive Tennessee inventory delivered weekly" />
              <BuyerBullet text="Sellers educated on the auction-first option before handoff" />
              <BuyerBullet text="No sourcing cost — your team sees only ready listings" />
              <BuyerBullet text="Long-term partnership, not one-off referrals" />
              <BuyerBullet text="Co-marketing on the seller side as the pipeline scales" />
            </ul>

            <div className="falco-scroll-reveal mt-10 flex flex-wrap gap-3">
              <Link
                href="/partners"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Open a partnership conversation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* === WHY DIFFERENT === */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="falco-scroll-reveal mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75 mb-3">
            What makes us different
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Not wholesalers. Not MLS. Not Auction.com.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Diff
            label="vs. wholesalers"
            body="They profit when you sell at a discount. We profit only when you sell at market. Our incentives line up with yours; theirs line up against."
          />
          <Diff
            label="vs. traditional MLS"
            body="90 days, 6% commission, staging, showings, surprise inspections. We run 45–75 days, seller pays zero, auction day is the close."
          />
          <Diff
            label="vs. national auction sites"
            body="Auction.com is buyer-side and post-foreclosure. Hubzu is bank-side. We work with the homeowner before the foreclosure hits, so they keep the equity instead of the lender keeping it."
          />
        </div>
      </section>

      <Divider />

      {/* === FAQ === */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="falco-scroll-reveal mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75 mb-3">
            Common questions
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Straight answers.
          </h2>
        </div>

        <div className="falco-scroll-reveal">
          <FaqSection />
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="mx-auto max-w-5xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/buyers" className="hover:text-white/70 transition-colors">
              Buyers
            </Link>
            <Link href="/partner-login" className="hover:text-white/70 transition-colors">
              Partner login
            </Link>
            <span className="text-white/15">falco.llc</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Divider() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10">
      <div className="h-px bg-white/[0.06]" />
    </div>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="falco-scroll-reveal">
      <div className="text-[11px] text-emerald-400/85 font-semibold tracking-[0.18em] tabular-nums">
        {num}
      </div>
      <div className="mt-3 text-[18px] font-semibold text-white">{title}</div>
      <p className="mt-3 text-[14px] leading-[1.7] text-white/55">{body}</p>
    </div>
  )
}

function Diff({ label, body }: { label: string; body: string }) {
  return (
    <div className="falco-scroll-reveal">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
        {label}
      </div>
      <p className="mt-3 text-[14px] leading-[1.7] text-white/75">{body}</p>
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
