"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * The equity story as a gesture-jacked scroll story (the Kestrel
 * mechanic): a FIXED stage that never scrolls. There is no native
 * scrollbar — body scroll is locked and wheel/touch/keys are captured.
 * Exactly ONE line lives in the DOM at a time; advancing REPLACES it.
 * One gesture = one beat, hard-locked while the line animates, so the
 * pacing is authored, not scrubbed.
 *
 * Feel: words of the incoming line build in one at a time (rise +
 * unblur, ~45ms stagger), the line idle-floats while it holds, then the
 * whole line lifts and blurs away in the direction of travel.
 *
 * SEO/a11y: crawlers and screen readers get the entire story as real
 * paragraphs in a visually-hidden section (server-rendered), plus
 * aria-live on the stage. prefers-reduced-motion keeps the mechanic but
 * swaps transforms/blur for plain fades.
 *
 * The numbers deliberately match the homepage ledger: one consistent
 * story. The trustee-sale beats are deliberately not a flat "$0" —
 * roughly half of foreclosure auctions sell to a third party rather than
 * reverting to the lender, and where the owner has equity that bid often
 * clears the debt and leaves claimable surplus. Saying "you get nothing"
 * is the kind of overstatement this company exists to argue against.
 */

type Tone = "white" | "dim" | "emerald" | "red" | "amber"

type Beat = {
  overline?: string
  line: string
  num?: { value: number; tone: Tone; approx?: boolean }
  sub?: string
  /** Subtle backdrop tint for scene mood (spec: per-beat stage swap). */
  tint?: "emerald" | "red"
  /** Final beat renders the CTA scene instead of a story line. */
  cta?: boolean
}

const SCRIPT: Beat[] = [
  {
    overline: "The math",
    line: "One Tennessee house. Three ways out.",
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
    tint: "emerald",
  },
  {
    overline: "Exit one · Do nothing",
    line: "The trustee sale takes about 60 seconds on the courthouse steps.",
    sub: "About half the time nobody outbids the bank, and it takes the house for the loan balance.",
  },
  {
    line: "Then you walk away with:",
    num: { value: 0, tone: "red" },
    sub: "That is the outcome roughly half of these sales end in.",
    tint: "red",
  },
  {
    line: "The other half, a bidder shows up and clears your debt.",
    sub: "In Q2 2026 buyers at foreclosure auction paid about 67.6% of value, so on this house that is a bid near $338,000.",
  },
  {
    line: "Whatever is left after the debt is surplus. It is yours.",
    num: { value: 38_000, tone: "amber", approx: true },
    sub: "But only after junior liens, only if you file a claim, and usually months later. Most people never claim it.",
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
    tint: "emerald",
  },
  {
    line: "Want these numbers for your house?",
    cta: true,
    tint: "emerald",
  },
]

const TONE_CLASS: Record<Tone, string> = {
  white: "text-white",
  dim: "text-white/70",
  emerald: "text-emerald-300",
  red: "text-red-300",
  amber: "text-amber-200",
}

const TINT_BG: Record<NonNullable<Beat["tint"]> | "none", string> = {
  none: "radial-gradient(circle at 50% 20%, rgba(16,185,129,0.05), transparent 55%)",
  emerald: "radial-gradient(circle at 50% 30%, rgba(16,185,129,0.13), transparent 62%)",
  red: "radial-gradient(circle at 50% 30%, rgba(239,68,68,0.11), transparent 62%)",
}

const EXIT_MS = 300
const WORD_STAGGER_MS = 45
const WORD_ANIM_MS = 450
const WHEEL_THRESHOLD = 80
const WHEEL_COOLDOWN_MS = 280
const TOUCH_THRESHOLD = 45

/** Time-based count-up (rAF-driven but computed from elapsed time, so
 *  dropped frames only cost smoothness, never the final value). */
function useCountUp(target: number, animate: boolean, delayMs: number, ms = 750) {
  const [v, setV] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate || target === 0) {
      setV(target)
      return
    }
    let raf = 0
    let started = false
    const t0 = performance.now() + delayMs
    const tick = (t: number) => {
      if (t < t0) {
        raf = requestAnimationFrame(tick)
        return
      }
      started = true
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Belt-and-braces: if rAF is starved (hidden tab), settle the value.
    const settle = setTimeout(() => {
      if (!started) setV(target)
    }, delayMs + ms + 600)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [animate, target, delayMs, ms])
  return v
}

function BeatNumber({
  num,
  entered,
  delayMs,
  reduced,
}: {
  num: NonNullable<Beat["num"]>
  entered: boolean
  delayMs: number
  reduced: boolean
}) {
  const v = useCountUp(num.value, entered && !reduced, delayMs)
  return (
    <div
      className={`md-late mt-6 font-mono tabular-nums tracking-tight text-[52px] md:text-[110px] leading-none font-semibold ${TONE_CLASS[num.tone]} ${entered ? "in" : ""}`}
      style={{ transitionDelay: entered ? `${delayMs}ms` : "0ms" }}
    >
      {num.approx ? "~" : ""}${(entered && !reduced ? v : num.value).toLocaleString("en-US")}
    </div>
  )
}

/** The CTA scene — the story's last beat. Scrollable within itself on
 *  short viewports (data-scrollable opts it out of gesture capture). */
function CtaScene({ entered }: { entered: boolean }) {
  return (
    <div
      data-scrollable
      className={`md-late max-h-full overflow-y-auto px-2 ${entered ? "in" : ""}`}
      style={{ transitionDelay: entered ? "200ms" : "0ms" }}
    >
      <p className="mx-auto max-w-md text-[14px] md:text-[16px] leading-[1.65] text-white/70">
        Free 15-minute call. We pull your home's likely auction range, your
        payoff, and your sale date, and walk you through all three exits side
        by side. No cost, no pressure, no obligation to sell.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
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
      <p className="mx-auto mt-10 max-w-md text-[11px] leading-[1.6] text-white/40">
        These figures are an illustrative example, not a quote or a promise.
        Results vary by property, condition, county, and timeline. FALCO is
        not a law firm and this is not legal advice. Foreclosure deadlines
        move fast; talk to a licensed Tennessee attorney about your
        situation.
      </p>
      <div className="mt-8 flex items-center justify-center gap-5 text-[12px] tracking-[0.16em] text-white/40">
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
  )
}

export default function MathDeck() {
  const N = SCRIPT.length
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<"in" | "out-fwd" | "out-back">("in")
  const [entered, setEntered] = useState(false)
  const [reduced, setReduced] = useState(false)

  const idxRef = useRef(0)
  const busyRef = useRef(false)
  const wheelAccRef = useRef(0)
  const wheelDirRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const touchYRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])

  const beat = SCRIPT[idx]
  const words = beat.line.split(/\s+/)
  const wordsDoneMs = words.length * WORD_STAGGER_MS + WORD_ANIM_MS

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e)
    function setReducedMotion(e: MediaQueryListEvent) {
      setReduced(e.matches)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Lock the document: no native scroll anywhere on this page.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyTouch: body.style.touchAction,
    }
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.height = "100dvh"
    body.style.touchAction = "none"
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.height = prev.bodyHeight
      body.style.touchAction = prev.bodyTouch
    }
  }, [])

  // Entrance for the current line (also runs for the first beat on load).
  useEffect(() => {
    setEntered(false)
    const t = window.setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [idx])

  const advance = useCallback(
    (dir: 1 | -1) => {
      if (busyRef.current) return
      const next = idxRef.current + dir
      if (next < 0 || next >= N) return
      busyRef.current = true
      setPhase(dir === 1 ? "out-fwd" : "out-back")

      const nextWords = SCRIPT[next].line.split(/\s+/).length
      const settleMs =
        EXIT_MS + nextWords * WORD_STAGGER_MS + WORD_ANIM_MS + 120

      timersRef.current.push(
        window.setTimeout(() => {
          idxRef.current = next
          setIdx(next)
          setPhase("in")
        }, EXIT_MS),
        window.setTimeout(() => {
          busyRef.current = false
        }, settleMs)
      )
    },
    [N]
  )

  const jumpToEnd = useCallback(() => {
    if (busyRef.current || idxRef.current === N - 1) return
    busyRef.current = true
    setPhase("out-fwd")
    timersRef.current.push(
      window.setTimeout(() => {
        idxRef.current = N - 1
        setIdx(N - 1)
        setPhase("in")
      }, EXIT_MS),
      window.setTimeout(() => {
        busyRef.current = false
      }, EXIT_MS + 700)
    )
  }, [N])

  // Gesture capture: wheel (accumulated + normalized), touch, keyboard.
  useEffect(() => {
    const inScrollable = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("[data-scrollable]")

    const onWheel = (e: WheelEvent) => {
      if (inScrollable(e.target)) return
      e.preventDefault()
      const now = performance.now()
      if (busyRef.current || now < cooldownUntilRef.current) return
      // Normalize deltaMode: 0=pixels, 1=lines, 2=pages (Firefox).
      const scale = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1
      const dy = e.deltaY * scale
      const dir = dy > 0 ? 1 : -1
      if (dir !== wheelDirRef.current) {
        wheelAccRef.current = 0
        wheelDirRef.current = dir
      }
      wheelAccRef.current += dy
      if (Math.abs(wheelAccRef.current) >= WHEEL_THRESHOLD) {
        wheelAccRef.current = 0
        cooldownUntilRef.current = now + WHEEL_COOLDOWN_MS
        advance(dir as 1 | -1)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      // Multitouch guard: a second finger voids the gesture.
      touchYRef.current = e.touches.length > 1 ? null : e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (inScrollable(e.target)) return
      e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchYRef.current === null) return
      const dy = touchYRef.current - e.changedTouches[0].clientY
      touchYRef.current = null
      if (Math.abs(dy) > TOUCH_THRESHOLD) advance(dy > 0 ? 1 : -1)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("a, button, input, textarea")) return
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault()
        advance(1)
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault()
        advance(-1)
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("keydown", onKey)
    const timers = timersRef.current
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("keydown", onKey)
      timers.forEach(clearTimeout)
    }
  }, [advance])

  const numDelayMs = words.length * WORD_STAGGER_MS + 120
  const subDelayMs = wordsDoneMs + (beat.num ? 320 : 60)

  return (
    <main className="fixed inset-0 h-dvh overflow-hidden bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* Component-scoped animation rules for the word/line choreography. */}
      <style>{`
        .md-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(0.5em);
          filter: blur(5px);
          transition:
            opacity ${WORD_ANIM_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
            transform ${WORD_ANIM_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
            filter ${WORD_ANIM_MS}ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .md-line.in .md-word { opacity: 1; transform: none; filter: blur(0); }
        .md-line {
          transition:
            opacity ${EXIT_MS}ms ease,
            transform ${EXIT_MS}ms ease,
            filter ${EXIT_MS}ms ease;
        }
        .md-line.out-fwd { opacity: 0; transform: translateY(-46px); filter: blur(6px); }
        .md-line.out-back { opacity: 0; transform: translateY(46px); filter: blur(6px); }
        .md-late {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 500ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .md-late.in { opacity: 1; transform: none; }
        .md-float { animation: mdIdle 7s ease-in-out infinite; }
        @keyframes mdIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .md-word { transform: none; filter: none; transition: opacity 250ms ease; }
          .md-line { transition: opacity 250ms ease; }
          .md-line.out-fwd, .md-line.out-back { transform: none; filter: none; }
          .md-late { transform: none; transition: opacity 250ms ease; }
          .md-float { animation: none; }
        }
      `}</style>

      {/* Full story for crawlers + screen readers (the stage performs it). */}
      <section className="sr-only">
        <h1>The math on a Tennessee foreclosure: trustee sale vs cash offer vs marketed auction</h1>
        {SCRIPT.map((b, i) => (
          <p key={i}>
            {b.overline ? `${b.overline}. ` : ""}
            {b.line}
            {b.num ? ` ${b.num.approx ? "About " : ""}$${b.num.value.toLocaleString("en-US")}.` : ""}
            {b.sub ? ` ${b.sub}` : ""}
          </p>
        ))}
        <p>
          Free 15-minute call. We pull your home's likely auction range, your
          payoff, and your sale date, and walk you through all three exits
          side by side. No cost, no pressure, no obligation to sell.
        </p>
      </section>

      {/* Scene tint — cross-fades per beat. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: TINT_BG[beat.tint ?? "none"] }}
      />

      {/* Chrome */}
      <div
        className="absolute top-0 left-0 h-px bg-emerald-400/70 transition-[width] duration-300 ease-out"
        style={{ width: `${((idx + 1) / N) * 100}%` }}
      />
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-[13px] font-semibold tracking-[0.28em] text-white/90 hover:text-emerald-300 transition-colors"
      >
        FALCO
      </Link>
      <div className="absolute top-6 right-6 z-20 font-mono text-[12px] tabular-nums text-white/40">
        {idx + 1} / {N}
      </div>

      {/* The stage — one beat, replaced in place. */}
      <div className="absolute inset-0 grid place-items-center px-6">
        <div
          key={idx}
          aria-live="polite"
          className={`md-line max-w-3xl w-full text-center ${
            phase !== "in" ? phase : entered ? "in" : ""
          } ${phase === "in" && entered && !reduced && !beat.cta ? "md-float" : ""}`}
        >
          {beat.overline && (
            <div
              className={`md-late falco-overline-accent mb-5 ${entered ? "in" : ""}`}
              style={{ transitionDelay: entered ? "0ms" : "0ms" }}
            >
              {beat.overline}
            </div>
          )}

          <p className="[font-family:var(--font-display),Georgia,serif] text-[26px] md:text-[40px] leading-[1.22] text-white/95">
            {words.map((w, i) => (
              <span key={`${idx}-${i}`}>
                <span
                  className="md-word"
                  style={{ transitionDelay: `${i * WORD_STAGGER_MS}ms` }}
                >
                  {w}
                </span>{" "}
              </span>
            ))}
          </p>

          {beat.num && (
            <BeatNumber num={beat.num} entered={entered} delayMs={numDelayMs} reduced={reduced} />
          )}

          {beat.cta ? (
            <div className="mt-7">
              <CtaScene entered={entered} />
            </div>
          ) : (
            beat.sub && (
              <p
                className={`md-late mt-6 text-[13px] md:text-[15px] text-white/55 ${entered ? "in" : ""}`}
                style={{ transitionDelay: entered ? `${subDelayMs}ms` : "0ms" }}
              >
                {beat.sub}
              </p>
            )
          )}
        </div>
      </div>

      {/* Escape hatch — nobody is forced through the pitch. */}
      {idx < N - 1 && (
        <button
          type="button"
          onClick={jumpToEnd}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 text-[12px] text-white/45 hover:text-white/80 transition-colors px-3 py-2"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          Skip to your numbers ↓
        </button>
      )}

      {/* First-beat gesture hint, styled like the counter. */}
      {idx === 0 && (
        <div
          className={`md-late absolute bottom-14 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.2em] text-white/30 ${entered ? "in" : ""}`}
          style={{ transitionDelay: "1200ms" }}
        >
          SCROLL
        </div>
      )}
    </main>
  )
}
