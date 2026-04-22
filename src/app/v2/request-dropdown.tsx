"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const OPTIONS: Array<{
  href: string
  label: string
  blurb: string
}> = [
  {
    href: "/homeowners",
    label: "Homeowner",
    blurb: "I'm facing foreclosure in Tennessee.",
  },
  {
    href: "/buyers",
    label: "Buyer / Investor",
    blurb: "I want first look at distressed inventory.",
  },
  {
    href: "/partners",
    label: "Auction Company",
    blurb: "I run an auction company in Tennessee.",
  },
]

export function RequestDropdown() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`falco-orbit-right falco-accent-button-secondary inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Request Access
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        role="menu"
        className={`absolute right-0 top-full mt-2 w-[280px] rounded-xl border border-white/12 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden origin-top-right transition-all duration-200 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-emerald-300/70 border-b border-white/[0.06]">
          I am a...
        </div>
        {OPTIONS.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 hover:bg-emerald-400/[0.07] transition-colors border-b border-white/[0.04] last:border-b-0 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white group-hover:text-emerald-300 transition-colors">
                {opt.label}
              </span>
              <span className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors text-[14px]">
                →
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-white/45">{opt.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
