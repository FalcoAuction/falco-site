"use client"

import Link from "next/link"
import { Foot, Nav, useReveals } from "./v2-content"

/**
 * Shared frame for every sub-page, matching the homepage: the same nav
 * and footer, a quiet headline block, and roomy, rule-separated sections.
 * Server pages can wrap their content in it directly.
 */
export function SitePage({ children }: { children: React.ReactNode }) {
  useReveals()
  return (
    <>
      <Nav />
      <main id="main" className="pg">
        {children}
      </main>
      <Foot />
    </>
  )
}

export function PageHead({
  label,
  title,
  lede,
  crumbs,
  children,
}: {
  label?: string
  title: React.ReactNode
  lede?: React.ReactNode
  crumbs?: Array<{ href?: string; label: string }>
  children?: React.ReactNode
}) {
  return (
    <section className="pg-head">
      <div className="wrap" data-stagger="80">
        {crumbs && (
          <p className="crumbs r">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && " / "}
                {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
              </span>
            ))}
          </p>
        )}
        {label && <p className="lbl r">{label}</p>}
        <h1 className="d1 r">{title}</h1>
        {lede && <p className="lede r">{lede}</p>}
        {children && <div className="pg-head-cta r">{children}</div>}
      </div>
    </section>
  )
}

export function PageSec({
  label,
  title,
  note,
  narrow,
  id,
  children,
}: {
  label?: string
  title?: React.ReactNode
  note?: React.ReactNode
  narrow?: boolean
  id?: string
  children?: React.ReactNode
}) {
  return (
    <section className="pg-sec" id={id}>
      <div className={narrow ? "wrap pg-narrow" : "wrap"}>
        {(label || title) && (
          <div className="head">
            <div data-stagger="80">
              {label && <p className="lbl r">{label}</p>}
              {title && <h2 className="d2 r">{title}</h2>}
            </div>
            {note && <p className="lede note r">{note}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
