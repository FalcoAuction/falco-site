"use client"

import { PageHead, SitePage } from "../v2/site-page"

/** Shell for the homeowner, partner and inquiry forms: the site's nav and
 *  footer, a quiet headline, and the form in one white card. */
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
  return (
    <SitePage>
      <PageHead label={eyebrow} title={title} lede={intro} />
      <section className="pg-sec" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="wrap">
          <div className="pg-form r">{children}</div>
        </div>
      </section>
    </SitePage>
  )
}

// ============================================================================
// Shared form primitives — same look across all three pages
// ============================================================================

export const inputCls = "pg-in"

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
      <label className="pg-label">
        {label}
        {required && <em>*</em>}
      </label>
      {children}
      {hint && <div className="pg-hint">{hint}</div>}
    </div>
  )
}

export function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div className="warn">{msg}</div>
}

export function FormSuccess({ msg }: { msg: string }) {
  return (
    <div className="pg-done">
      <h3>{msg}</h3>
      <p>We&apos;ll reach out from falco@falco.llc.</p>
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
    <button type="submit" disabled={pending} className="pill dark">
      {pending ? "Sending..." : children} <sub>→</sub>
    </button>
  )
}
