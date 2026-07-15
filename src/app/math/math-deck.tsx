"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

/**
 * The equity story as a stepped scroll narrative: one line, one number
 * per beat. Pinned-stage pattern (tall wrapper + sticky viewport stage),
 * NOT wheel hijacking — native scroll drives the beat index, so touch,
 * keyboard, and momentum scrolling all behave, and there is nothing to
 * fight on iOS. Beats cross-fade as scroll progress crosses thresholds.
 *
 * All beat text is server-rendered in the DOM (opacity toggles only),
 * so crawlers and screen readers see the full story. Users with
 * prefers-reduced-motion get a flat stacked version instead of the rig.
 *
 * The example numbers deliberately match the homepage three-exits table
 * ($500K home / $300K loan / $0 / ~$25K / ~$130K) so the site tells one
 * consistent story.
 */

type Tone = "white" | "dim" | "emerald" | "red" | "amber"

type Beat = {
  overline?: string
  line: string
  isTitle?: boolean
  num?: { value: number; tone: Tone; approx?: boolean }
  sub?: string
}

const BEATS: Beat[] = [
  {
    overline: "The math",
    line: "One Tennessee house. Three ways out.",
    isTitle: true,
    sub: "Scroll. One number at a time.",
  },
  {
    line: "Say your house is worth",
    num: { value: 500_000, tone: "white" },
  },
  {
    line: "You still owe the bank",
    num: { value: 300_000, tone: "dim" },
  },
  {
    line: "The difference is your equity.",
    num: { value: 200_000, tone: "emerald" },
    sub: "Yours. On paper, anyway.",
  },
  {
    overline: "Exit one · Do nothing",
    line: "The trustee sale takes about 60 seconds on the courthouse steps.",
    sub: "The house typically goes for what's owed on it.",
  },
  {
    line: "What you walk away with:",
    num: { value: 0, tone: "red" },
    sub: "Occasionally a surplus exists. Most people get nothing.",
  },
  {
    overline: "Exit two · The cash buyer",
    line: "The investor calling you will offer around 65 cents on the dollar.",
    num: { value: 325_000, tone: "amber", approx: true },
    sub: "That's the offer, not what you keep.",
  },
  {
    line: "After your loan pays off, you keep about",
    num: { value: 25_000, tone: "amber", approx: true },
  },
  {
    overline: "Exit three · A marketed auction",
    line: "A licensed, advertised auction typically clears 85 to 95 percent of retail.",
    num: { value: 445_000, tone: "white", approx: true },
    sub: "Run before the trustee sale date, not after.",
  },
  {
    line: "After payoff and costs, what goes home with you:",
    num: { value: 130_000, tone: "emerald", approx: true },
    sub: "Same house. Same debt. Different exit.",
  },
]

const TONE_CLASS: Record<Tone, string> = {
  white: "text-white",
  dim: "text-white/70",
  emerald: "text-emerald-300",
  red: "text-red-300",
  amber: "text-amber-200",
}

/** Count from 0 to target while `go` is true; snaps to target when motion
 *  is off. Resets when the beat deactivates so re-entry replays. */
function useCountUp(target: number, go: boolean, animate: boolean, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!go) {
      setV(0)
      return
    }
    if (!animate || target === 0) {
      setV(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [go, animate, target, ms])
  return go && !animate ? target : v
}

function BeatNumber({
  num,
  active,
  animate,
}: {
  num: NonNullable<Beat["num"]>
  active: boolean
  animate: boolean
}) {
  const v = useCountUp(num.value, active, animate)
  return (
    <div
      className={`mt-6 font-mono tabular-nums tracking-tight text-[56px] md:text-[110px] leading-none font-semibold ${TONE_CLASS[num.tone]}`}
    >
      {num.approx ? "~" : ""}${v.toLocaleString("en-US")}
    </div>
  )
}

function BeatBody({ beat }: { beat: Beat }) {
  return beat.isTitle ? (
    <h1 className="text-[34px] md:text-[56px] leading-[1.05] font-semibold text-white">
      {beat.line}
    </h1>
  ) : (
    <p className="[font-family:var(--font-display),Georgia,serif] text-[24px] md:text-[36px] leading-[1.25] text-white/90">
      {beat.line}
    </p>
  )
}

export default function MathDeck() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLElement>(null)
  const N = BEATS.length

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight
        const scrollable = rect.height - vh
        if (scrollable <= 0) return
        const p = Math.min(1, Math.max(0, -rect.top / scrollable))
        setProgress(p)
        setActive(Math.min(N - 1, Math.floor(p * N)))
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reducedMotion, N])

  return (
    <main className="bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {reducedMotion ? (
        /* Flat version: same story, plain document flow, no rig. */
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-10 space-y-20">
          {BEATS.map((b, i) => (
            <section key={i} className="text-center">
              {b.overline && (
                <div className="falco-overline-accent mb-3">{b.overline}</div>
              )}
              <BeatBody beat={b} />
              {b.num && <BeatNumber num={b.num} active animate={false} />}
              {b.sub && (
                <p className="mt-4 text-[13px] md:text-[15px] text-white/55">{b.sub}</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div ref={wrapRef} style={{ height: `${(N + 1) * 100}svh` }} className="relative">
          <div className="sticky top-0 h-svh overflow-hidden">
            {/* Static backdrop — no video here on purpose. The page is
                about focus: dark room, one line, one number. */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.05),transparent_55%)]" />

            {/* Progress hairline + counter */}
            <div
              className="absolute top-0 left-0 h-px bg-emerald-400/70 transition-[width] duration-200 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
            <Link
              href="/"
              className="absolute top-6 left-6 z-10 text-[13px] font-semibold tracking-[0.28em] text-white/90 hover:text-emerald-300 transition-colors"
            >
              FALCO
            </Link>
            <div className="absolute top-6 right-6 z-10 font-mono text-[12px] tabular-nums text-white/40">
              {active + 1} / {N}
            </div>

            {/* Beats — all in the DOM, active one visible */}
            {BEATS.map((b, i) => (
              <section
                key={i}
                aria-hidden={i !== active}
                className={`absolute inset-0 grid place-items-center px-6 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                  i === active
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-5 pointer-events-none"
                }`}
              >
                <div className="max-w-3xl text-center">
                  {b.overline && (
                    <div className="falco-overline-accent mb-4">{b.overline}</div>
                  )}
                  <BeatBody beat={b} />
                  {b.num && <BeatNumber num={b.num} active={i === active} animate />}
                  {b.sub && (
                    <p className="mt-5 text-[13px] md:text-[15px] text-white/55">{b.sub}</p>
                  )}
                </div>
              </section>
            ))}

            {/* Escape hatch — no one is forced through the pitch. */}
            {active < N - 1 && (
              <button
                type="button"
                onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-[12px] text-white/45 hover:text-white/80 transition-colors px-3 py-2"
              >
                Skip to your numbers ↓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Landing — normal flow after the deck unpins. */}
      <section
        ref={endRef}
        id="your-numbers"
        className="mx-auto max-w-3xl px-6 md:px-10 py-24 md:py-32 text-center"
      >
        <h2 className="text-[28px] md:text-[44px] leading-[1.1] font-semibold">
          Want these numbers for your house?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] md:text-[16px] leading-[1.65] text-white/70">
          Free 15-minute call. We pull your home's likely auction range, your
          payoff, and your sale date, and walk you through all three exits side
          by side. No cost, no pressure, no obligation to sell.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/homeowners"
            className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-7 py-3.5 transition-colors"
          >
            Get your numbers →
          </Link>
          <Link
            href="/manifesto"
            className="text-[13px] text-white/55 hover:text-white underline underline-offset-4 decoration-white/25 transition-colors"
          >
            Prefer the long version? Read the manifesto
          </Link>
        </div>

        <p className="mx-auto mt-14 max-w-xl text-[12px] leading-[1.65] text-white/45">
          The figures above are an illustrative example, not a quote or a
          promise. Auction results vary by property, condition, county, and
          timeline. FALCO is not a law firm and this is not legal advice. If
          you're facing foreclosure, deadlines move fast; talk to a licensed
          Tennessee attorney about your specific situation.
        </p>

        <div className="mt-14 pt-6 border-t border-white/[0.06] flex items-center justify-between text-[12px] tracking-[0.18em] text-white/40">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/guides" className="hover:text-white transition-colors">
              Guides
            </Link>
            <a href="mailto:falco@falco.llc" className="hover:text-white transition-colors">
              falco@falco.llc
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
