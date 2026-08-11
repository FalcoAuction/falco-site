"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

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
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="group leading-none">
            <span className="block text-[14px] font-semibold tracking-[0.3em] text-[var(--ink)] group-hover:text-[var(--mocha)] transition-colors">
              FALCO
            </span>
            <span className="mt-1 block text-[10px] tracking-[0.06em] text-[var(--ink-faint)]">
              Patrick Armour · TN Auctioneer #7622
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--mocha)] transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <div className="falco-scroll-reveal">
          <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
            {eyebrow}
            <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[38px] md:text-[58px] leading-[1.04] font-semibold text-balance">
            {title}
          </h1>
          <p className="mt-6 text-[16px] md:text-[18px] leading-[1.6] text-[var(--ink-soft)] max-w-[58ch]">
            {intro}
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-6 pb-20 md:px-10 md:pb-28">
        <div className="falco-scroll-reveal rounded-2xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-6 md:p-10 shadow-[0_20px_50px_-40px_rgba(17,17,17,0.4)]">
          {children}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 border-t border-[var(--rule)]">
        <div className="flex items-center justify-between flex-wrap gap-4 font-[family-name:var(--font-mono)] text-[12px] text-[var(--ink-faint)]">
          <div>FALCO · Patrick Armour, TN Auctioneer #7622</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-[var(--mocha)] transition-colors">
              Home
            </Link>
            <Link href="/guides" className="hover:text-[var(--mocha)] transition-colors">
              Guides
            </Link>
            <Link href="/privacy" className="hover:text-[var(--mocha)] transition-colors">
              Privacy
            </Link>
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
  "w-full rounded-md bg-[var(--paper)] border border-[var(--rule-strong)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder-[var(--ink-faint)] outline-none focus:border-[var(--mocha)] focus:ring-2 focus:ring-[var(--mocha-wash)] transition-colors"

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
      <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink-faint)] font-semibold mb-2">
        {label}
        {required && <span className="text-[var(--mocha)] ml-1">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[12px] text-[var(--ink-faint)]">{hint}</div>}
    </div>
  )
}

export function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div className="rounded-md border border-[var(--oxblood)]/30 bg-[var(--oxblood)]/[0.06] px-3.5 py-2.5 text-[13px] text-[var(--oxblood)]">
      {msg}
    </div>
  )
}

export function FormSuccess({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-[var(--mocha)]/30 bg-[var(--mocha-wash)] p-7 text-center">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold mb-2">
        Received
      </div>
      <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--ink)]">
        {msg}
      </div>
      <div className="mt-3 text-[13px] text-[var(--ink-soft)]">
        We&apos;ll reach out from{" "}
        <span className="font-medium text-[var(--mocha)]">falco@falco.llc</span>.
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
      className="w-full sm:w-auto rounded-md bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[14px] tracking-wide px-7 py-3 transition-colors"
    >
      {pending ? "Sending..." : children}
    </button>
  )
}
