"use client"

import { useEffect, useRef, useState } from "react"

const FALCON_FACTS = [
  "The peregrine falcon dives at over 240 mph, making it the fastest animal on Earth.",
  "A falcon's vision is roughly eight times sharper than a human's.",
  "Falcons have three eyelids — the third is transparent and shields the eye during a dive.",
  "Some falcons spot prey from more than a mile away.",
  "A peregrine falcon's heart can hit 600 beats per minute during a dive.",
  "Falcons have been working with humans in falconry for over 4,000 years.",
  "Female falcons are typically about 30% larger than males.",
  "Peregrine falcons mate for life and return to the same nesting site each year.",
  "The American Kestrel — the smallest falcon — is roughly the size of a robin.",
  "A falcon's nostrils have a small bony cone that lets it breathe at top speed.",
]

const SKIP_KEY = "falco_loaded_session"

function pickFact(): string {
  const idx = Math.floor(Math.random() * FALCON_FACTS.length)
  return FALCON_FACTS[idx]
}

export default function LoadingScreen() {
  // Defer mount decision to avoid hydration mismatch on the random fact.
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fact] = useState(() => pickFact())
  const startedAt = useRef(0)

  useEffect(() => {
    // Skip if we've already shown this session
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

    // Synthetic eased progress to ~92% over 2.6s
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
      // Ensure minimum visibility of 1.6s so the fact can be read
      const elapsed = Date.now() - startedAt.current
      const wait = Math.max(0, 1600 - elapsed)
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

    // Hard cap — never block more than 6.5s, even if a stray asset hangs
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ease-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Logo — black on white */}
      <img
        src="/falco-logo.png"
        alt=""
        width={104}
        height={104}
        className="block"
        style={{
          filter:
            "invert(1) drop-shadow(0 0 24px rgba(0,0,0,0.10)) drop-shadow(0 0 48px rgba(0,0,0,0.05))",
          animation: "falcoLogoBreathe 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />

      {/* Status copy */}
      <div className="mt-7 text-center">
        <div className="text-[10px] uppercase tracking-[0.32em] text-black/45">
          Loading the FALCO experience
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 w-56 h-[3px] bg-black/[0.07] rounded-full overflow-hidden">
        <div
          className="h-full bg-black/85 transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-[10px] tracking-[0.3em] text-black/35 tabular-nums uppercase">
        {progress}%
      </div>

      {/* Falcon fact */}
      <div className="mt-12 max-w-md px-8 text-center">
        <div className="text-[9px] uppercase tracking-[0.32em] text-black/30 mb-2">
          Did you know
        </div>
        <div className="text-[12px] leading-[1.65] text-black/65 italic">
          {fact}
        </div>
      </div>

      <style>{`
        @keyframes falcoLogoBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
