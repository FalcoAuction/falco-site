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
      <section className="gd-srch">
        <div className="gd-in">
          <label htmlFor="guide-search" className="lbl" style={{ display: "block" }}>
            Search the guides
          </label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Probate, storage auction, tax sale, boat title..."
            autoComplete="off"
            className="gd-search"
          />
          <p aria-live="polite" className="gd-count">
            {filtering && matchCount > 0
              ? `${matchCount} ${matchCount === 1 ? "guide matches" : "guides match"}`
              : ""}
          </p>

          {filtering && matchCount === 0 && (
            <div className="gd-none">
              <h2 className="d3">No guide matches that yet.</h2>
              <p>
                Ask us directly. Tell us what you are dealing with and we will
                point you to the right answer, or the right licensed Tennessee
                firm.
              </p>
              <Link className="pill dark" href="/#ask">
                Ask FALCO <sub>→</sub>
              </Link>
            </div>
          )}
        </div>
      </section>

      {groups.map((group, gi) => (
        <section
          key={group.id}
          id={group.id}
          hidden={filtering && !visible[gi].some(Boolean)}
          className="gd-sec gd-grp"
        >
          <div className="gd-in">
            <p className="lbl r">{String(gi + 1).padStart(2, "0")}</p>
            <h2 className="d2 r">{group.label}</h2>
            <p className="lede r">{group.intro}</p>
            <div className="gd-rows r">
              {group.guides.map((g, i) => (
                <Link
                  key={g.href}
                  href={g.href}
                  hidden={filtering && !visible[gi][i]}
                  className="gd-row"
                >
                  <div>
                    <h3>{g.title}</h3>
                    <p>{g.blurb}</p>
                  </div>
                  <span className="arr" aria-hidden>→</span>
                </Link>
              ))}
            </div>
            {group.situationHref && (
              <Link href={group.situationHref} className="gd-more r">
                How FALCO handles this
              </Link>
            )}
          </div>
        </section>
      ))}
    </>
  )
}
