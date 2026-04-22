"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { DotOrbit } from "../dot-orbit"

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

export function FormShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: string
  children: React.ReactNode
}) {
  const scrollRef = useScrollReveal()

  return (
    <main
      ref={scrollRef}
      className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white"
    >
      {/* Background — same v2 stack */}
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.45]" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <DotOrbit
          dotColor="rgba(16, 185, 129, 0.5)"
          lineColor="rgba(16, 185, 129, 0.07)"
          density={0.65}
          speed={0.3}
          dotSize={1.2}
          linkDistance={120}
          opacity={0.7}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/"
            className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10 md:px-10 md:pt-28">
        <div className="falco-scroll-reveal">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] font-semibold">
            {title}
          </h1>
          <p className="mt-6 text-[15px] md:text-[17px] leading-[1.65] text-white/60">
            {intro}
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="falco-scroll-reveal rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-10 backdrop-blur-sm">
          {children}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white/70 transition-colors">
              Home
            </Link>
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

// ============================================================================
// Shared form primitives — same look across all three pages
// ============================================================================

export const inputCls =
  "w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40 transition-colors"

export function Field({
  label,
  children,
  required = false,
  hint,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1.5">
        {label}
        {required && <span className="text-emerald-400/70 ml-1">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-white/35">{hint}</div>}
    </div>
  )
}

export function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">
      {msg}
    </div>
  )
}

export function FormSuccess({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
      <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 mb-2">
        Received
      </div>
      <div className="text-white text-[16px] font-medium">{msg}</div>
      <div className="mt-3 text-[12px] text-emerald-100/70">
        We'll reach out from <span className="text-emerald-200">falco@falco.llc</span>.
      </div>
    </div>
  )
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-[13px] tracking-wide px-6 py-2.5 transition-colors"
    >
      {pending ? "Sending..." : children}
    </button>
  )
}
