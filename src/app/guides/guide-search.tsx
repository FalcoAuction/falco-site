"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { GuideGroup } from "./guide-index"

// Hub list with a type-to-filter box. Every group and guide link is in the
// server-rendered HTML (query starts empty); filtering only toggles the
// `hidden` attribute in the browser, so crawlers see the full list.

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export default function GuideSearch({ groups }: { groups: GuideGroup[] }) {
  const [query, setQuery] = useState("")
  const terms = useMemo(() => normalize(query).split(" ").filter(Boolean), [query])

  // Haystack per guide: its title, short label, description, and the
  // situation it sits under.
  const index = useMemo(
    () =>
      groups.map((g) =>
        g.guides.map((guide) =>
          normalize([guide.title, guide.short, guide.blurb, g.label].join(" ")),
        ),
      ),
    [groups],
  )

  const visible = groups.map((g, gi) =>
    g.guides.map((_, i) => terms.every((t) => index[gi][i].includes(t))),
  )
  const matchCount = visible.flat().filter(Boolean).length
  const filtering = terms.length > 0

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 md:px-10 pb-10">
        <label htmlFor="guide-search" className="sr-only">
          Search the guides
        </label>
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guides: probate, storage auction, tax sale, boat title..."
          autoComplete="off"
          className="w-full rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-4 py-3.5 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--mocha)] transition-colors"
        />
        <p aria-live="polite" className="mt-2 min-h-[1.25em] text-[13px] text-[var(--ink-faint)]">
          {filtering && matchCount > 0
            ? `${matchCount} ${matchCount === 1 ? "guide matches" : "guides match"}`
            : ""}
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-16 md:px-10 space-y-16">
        {filtering && matchCount === 0 && (
          <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-6 md:p-7">
            <h2 className="text-[24px] md:text-[30px] leading-tight font-semibold text-[var(--ink)]">
              No guide matches that yet.
            </h2>
            <p className="mt-2 text-[14px] md:text-[15px] leading-[1.6] text-[var(--ink-faint)]">
              Ask us directly. Tell us what you are dealing with and we will
              point you to the right answer, or the right licensed Tennessee
              firm.
            </p>
            <Link
              href="/#ask"
              className="mt-3 inline-block text-[13px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
            >
              Ask your question →
            </Link>
          </div>
        )}

        {groups.map((group, gi) => (
          <section
            key={group.id}
            id={group.id}
            hidden={filtering && !visible[gi].some(Boolean)}
            className="scroll-mt-24"
          >
            <div className="border-t border-[var(--rule-strong)] pt-6">
              <h2 className="text-[30px] md:text-[40px] leading-[1.08] font-semibold text-[var(--ink)] text-balance">
                {group.label}
              </h2>
              <p className="mt-3 text-[15px] md:text-[16px] leading-[1.6] text-[var(--ink-soft)] max-w-[62ch]">
                {group.intro}
              </p>
              {group.situationHref && (
                <Link
                  href={group.situationHref}
                  className="mt-3 inline-block text-[13px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)]"
                >
                  How FALCO handles this →
                </Link>
              )}
            </div>
            <div className="mt-6 grid gap-4">
              {group.guides.map((g, i) => (
                <Link
                  key={g.href}
                  href={g.href}
                  hidden={filtering && !visible[gi][i]}
                  className="group rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-6 md:p-7 hover:border-[var(--mocha)] transition-colors"
                >
                  <h3 className="text-[24px] md:text-[30px] leading-tight font-semibold text-[var(--ink)]">
                    {g.title}
                  </h3>
                  <p className="mt-2 text-[14px] md:text-[15px] leading-[1.6] text-[var(--ink-faint)]">
                    {g.blurb}
                  </p>
                  <span className="mt-3 inline-block text-[13px] font-semibold text-[var(--mocha)]">
                    Read the guide →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
