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

    const interval = setInterval(() => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt.current
      const t = Math.min(elapsed / 2600, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress((p) => Math.max(p, Math.round(eased * 92)))
      if (t >= 1) clearInterval(interval)
    }, 60)

    const finish = () => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt.current
      const wait = Math.max(0, 1800 - elapsed)
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

    if (document.readyState === "complete") {
      finish()
    } else {
      window.addEventListener("load", finish, { once: true })
    }

    const cap = setTimeout(finish, 6500)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener("load", finish)
      clearTimeout(cap)
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
