"use client"

import { useEffect, useRef, useState } from "react"

const FALCON_FACTS = [
  "The peregrine falcon dives at over 240 mph, making it the fastest animal on Earth.",
  "A falcon's vision is roughly eight times sharper than a human's.",
  "Falcons have three eyelids — the third is transparent and shields the eye during a dive.",
  "Some falcons spot prey from more than a mile away.",
  "A peregrine falcon's heart can hit 600 beats per minute during a dive.",
  "Falcons have been working with humans in falconry for over 4,000 years.",
  "The American Kestrel — the smallest falcon — is roughly the size of a robin.",
  "A falcon's nostrils have a small bony cone that lets it breathe at top speed.",
]

const SKIP_KEY = "falco_loaded_session"

// Assets we want resolved before we hand the page over. The poster prevents
// a black flash before the hero video is ready; window load handles fonts
// + initial JS. Hard cap keeps us from holding the user hostage on truly
// terrible networks — the poster `preload` link in <head> means it's usually
// in cache anyway.
const HERO_POSTER_URL = "/video/hero-poster.jpg"
const HARD_CAP_MS = 12000
const MIN_VISIBLE_MS = 1800

function pickFact(): string {
  const idx = Math.floor(Math.random() * FALCON_FACTS.length)
  return FALCON_FACTS[idx]
}

export default function LoadingScreen() {
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fact] = useState(() => pickFact())
  const startedAt = useRef(0)

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SKIP_KEY) === "1") {
      setHidden(true)
      return
    }
    setMounted(true)
    startedAt.current = Date.now()
  }, [])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false

    // Track each thing we're waiting on. We finish when ALL are ready
    // (or the hard cap fires).
    const ready = {
      windowLoad: false,
      heroPoster: false,
    }

    const synthCap = () => (allReady() ? 100 : 88)
    // The hero no longer renders a video/poster, so window load is the
    // only real gate. Waiting on an image we never paint just delayed
    // first view.
    const allReady = () => ready.windowLoad

    // Synthetic progress — eased ramp to either 88 (still loading something)
    // or 100 (everything ready). Keeps the bar moving so the user doesn't
    // think we've stalled on slow connections.
    const interval = setInterval(() => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt.current
      const t = Math.min(elapsed / 2600, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress((p) => Math.max(p, Math.min(synthCap(), Math.round(eased * synthCap()))))
      if (t >= 1 && allReady()) clearInterval(interval)
    }, 60)

    const finish = () => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt.current
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
      setTimeout(() => {
        if (cancelled) return
        setProgress(100)
        setTimeout(() => {
          if (cancelled) return
          setFadingOut(true)
          setTimeout(() => {
            if (cancelled) return
            setHidden(true)
            try {
              sessionStorage.setItem(SKIP_KEY, "1")
            } catch {
              /* ignore */
            }
          }, 600)
        }, 250)
      }, wait)
    }

    const tryFinish = () => {
      if (allReady()) finish()
    }

    // 1. Window load (fonts, scripts, initial DOM)
    if (document.readyState === "complete") {
      ready.windowLoad = true
    } else {
      window.addEventListener(
        "load",
        () => {
          ready.windowLoad = true
          tryFinish()
        },
        { once: true }
      )
    }

    // 2. Hero poster image — the asset that fills the hero section behind
    //    the video. If this is loaded the user never sees a black flash
    //    even if the video itself is still buffering.
    const poster = new Image()
    const markPosterReady = () => {
      ready.heroPoster = true
      tryFinish()
    }
    poster.onload = markPosterReady
    poster.onerror = markPosterReady // never block on a missing asset
    poster.src = HERO_POSTER_URL

    // Already-cached image: onload may not fire in some browsers
    if (poster.complete) markPosterReady()

    // Initial check in case both were already ready
    tryFinish()

    // Hard cap — never hold the user hostage
    const cap = setTimeout(finish, HARD_CAP_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(cap)
      poster.onload = null
      poster.onerror = null
    }
  }, [mounted])

  if (hidden || !mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading FALCO"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white px-6 transition-opacity duration-700 ease-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Status copy */}
      <div className="text-center">
        <div className="text-[14px] md:text-[16px] uppercase tracking-[0.36em] text-black/55 font-medium">
          Loading the FALCO experience
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-[320px] md:w-[380px] h-[5px] bg-black/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 text-[14px] tracking-[0.28em] text-black/45 tabular-nums uppercase font-medium">
        {progress}%
      </div>

      {/* Falcon fact */}
      <div className="mt-16 max-w-xl px-4 text-center">
        <div className="text-[11px] uppercase tracking-[0.36em] text-black/35 mb-3 font-medium">
          Did you know
        </div>
        <div className="text-[16px] md:text-[18px] leading-[1.6] text-black/75 italic">
          {fact}
        </div>
      </div>
    </div>
  )
}
