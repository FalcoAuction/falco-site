"use client"

// ContactLayer — the rich contact panel for the dialer. Renders the
// FULL skip-trace pull (all phones with type/carrier/validation, all
// emails with deliverability, relatives, age/DOB) so Chris has every
// possible avenue to reach the homeowner.
//
// Data shape mirrors what scripts/enrich-full-skiptrace.mjs writes
// into homeowner_requests.skiptrace_data (JSONB).

import { useState } from "react"

// ─── Types ──────────────────────────────────────────────────────────────

export type SkiptracePhone = {
  number: string
  type: string | null
  score: number | null
  dnc: boolean
  reachable: boolean
  tested: boolean
  date_last_seen: string | null
  twilio?: {
    valid: boolean
    line_type?: string
    carrier?: string | null
    country_code?: string | null
    checked_at?: string
    reason?: string
  } | null
}

export type SkiptraceEmail = {
  email: string
  score: number | null
  date_last_seen: string | null
  neverbounce?: {
    result: string // "valid" | "invalid" | "disposable" | "catchall" | "unknown" | "error"
    flags: string[]
    suggested_correction: string | null
    checked_at: string
  } | null
}

export type SkiptracePerson = {
  name: { first: string; middle?: string; last: string; full: string }
  age: number | null
  dob: string | null
  phones: SkiptracePhone[]
  emails: SkiptraceEmail[]
  addresses: { street: string; city: string; state: string; zip: string; type: string }[]
  relatives: { name: string; age: number | null; relationship: string | null }[]
}

export type SkiptraceData = {
  provider: string
  fetched_at: string
  persons: SkiptracePerson[]
}

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(d)) return ""
  const days = Math.floor(d / (24 * 60 * 60 * 1000))
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

/** Compute a sortable "freshness + reachability" rank for a phone. */
function phoneRank(p: SkiptracePhone): number {
  const lt = p.twilio?.line_type
  let s = 0
  if (lt === "mobile") s += 1000
  else if (lt === "voip" || lt === "fixedVoip" || lt === "nonFixedVoip") s += 500
  else if (lt === "landline") s += 100
  if (p.dnc) s -= 2000
  if (p.twilio?.valid === false) s -= 1500
  if (p.reachable) s += 50
  if (p.tested) s += 25
  s += p.score || 0
  return s
}

function emailRank(e: SkiptraceEmail): number {
  let s = 0
  const r = e.neverbounce?.result
  if (r === "valid") s += 1000
  else if (r === "catchall") s += 500
  else if (r === "unknown") s += 250
  else if (r === "disposable") s -= 1000
  else if (r === "invalid") s -= 2000
  s += e.score || 0
  return s
}

// ─── Phone row ──────────────────────────────────────────────────────────

function PhoneRow({ phone }: { phone: SkiptracePhone }) {
  const lt = phone.twilio?.line_type
  const isMobile = lt === "mobile"
  const isLandline = lt === "landline"
  const isVoip = lt === "voip" || lt === "fixedVoip" || lt === "nonFixedVoip"
  const isInvalid = phone.twilio?.valid === false
  const dnc = phone.dnc

  let badgeColor = "bg-white/10 text-white/55"
  let badgeLabel = lt || "?"
  if (isMobile) {
    badgeColor = "bg-emerald-500/20 text-emerald-200"
    badgeLabel = "MOBILE"
  } else if (isLandline) {
    badgeColor = "bg-amber-500/20 text-amber-200"
    badgeLabel = "LANDLINE"
  } else if (isVoip) {
    badgeColor = "bg-blue-500/20 text-blue-200"
    badgeLabel = lt === "fixedVoip" ? "VOIP·FIXED" : lt === "nonFixedVoip" ? "VOIP·VIRTUAL" : "VOIP"
  } else if (isInvalid) {
    badgeColor = "bg-red-500/20 text-red-200"
    badgeLabel = "INVALID"
  }

  const tel = `tel:+1${phone.number.replace(/\D/g, "").slice(-10)}`
  const sms = `sms:+1${phone.number.replace(/\D/g, "").slice(-10)}`

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        dnc || isInvalid
          ? "border-red-400/15 bg-red-500/5 opacity-60"
          : isMobile
          ? "border-emerald-400/25 bg-emerald-500/5"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <a
        href={tel}
        className="font-mono text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
      >
        {fmtPhone(phone.number)}
      </a>
      <span
        className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${badgeColor}`}
      >
        {badgeLabel}
      </span>
      {dnc && (
        <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-red-500/30 text-red-100">
          DNC
        </span>
      )}
      {phone.twilio?.carrier && (
        <span className="text-[11px] text-white/45 truncate max-w-[140px]">
          {phone.twilio.carrier}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {phone.score !== null && (
          <span className="text-[10px] text-white/35">{phone.score}</span>
        )}
        {phone.date_last_seen && (
          <span className="text-[10px] text-white/35">{timeAgo(phone.date_last_seen)}</span>
        )}
        {!dnc && !isInvalid && (
          <a
            href={sms}
            className="text-[11px] text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            title="SMS this number from your phone"
          >
            text
          </a>
        )}
      </span>
    </div>
  )
}

// ─── Email row ──────────────────────────────────────────────────────────

function EmailRow({ email }: { email: SkiptraceEmail }) {
  const r = email.neverbounce?.result
  const isValid = r === "valid"
  const isCatchall = r === "catchall"
  const isInvalid = r === "invalid" || r === "disposable"

  let badgeColor = "bg-white/10 text-white/55"
  let badgeLabel = (r || "unchecked").toUpperCase()
  if (isValid) {
    badgeColor = "bg-emerald-500/20 text-emerald-200"
    badgeLabel = "DELIVERABLE"
  } else if (isCatchall) {
    badgeColor = "bg-amber-500/20 text-amber-200"
    badgeLabel = "CATCHALL"
  } else if (isInvalid) {
    badgeColor = "bg-red-500/20 text-red-200"
    badgeLabel = r === "disposable" ? "DISPOSABLE" : "INVALID"
  } else if (r === "unknown") {
    badgeColor = "bg-white/12 text-white/55"
    badgeLabel = "UNKNOWN"
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        isInvalid
          ? "border-red-400/15 bg-red-500/5 opacity-60"
          : isValid
          ? "border-emerald-400/25 bg-emerald-500/5"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <a
        href={`mailto:${email.email}`}
        className="text-sm font-medium text-white hover:text-emerald-300 transition-colors truncate"
      >
        {email.email}
      </a>
      <span
        className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${badgeColor}`}
      >
        {badgeLabel}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {email.score !== null && (
          <span className="text-[10px] text-white/35">{email.score}</span>
        )}
        {email.date_last_seen && (
          <span className="text-[10px] text-white/35">{timeAgo(email.date_last_seen)}</span>
        )}
      </span>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────

export default function ContactLayer({ data }: { data: SkiptraceData | null }) {
  const [showAll, setShowAll] = useState(false)

  if (!data || !data.persons || data.persons.length === 0) {
    return (
      <section className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-4">
        <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
          Contact data
        </div>
        <p className="mt-2 text-sm text-amber-100/75">
          No skip-trace data on file yet. Run BatchData enrichment via{" "}
          <code className="font-mono text-amber-200">
            scripts/enrich-full-skiptrace.mjs
          </code>{" "}
          or wait for the next daily cron.
        </p>
      </section>
    )
  }

  // Aggregate across all persons returned (BatchData often returns 1, sometimes 2-3)
  const allPhones: SkiptracePhone[] = []
  const allEmails: SkiptraceEmail[] = []
  const allRelatives: { name: string; age: number | null; relationship: string | null }[] = []
  const personSummaries: { full: string; age: number | null }[] = []
  for (const person of data.persons) {
    if (person.name?.full) {
      personSummaries.push({ full: person.name.full, age: person.age })
    }
    for (const ph of person.phones) allPhones.push(ph)
    for (const em of person.emails) allEmails.push(em)
    for (const rel of person.relatives) allRelatives.push(rel)
  }

  // Dedupe phones by number, keep best
  const phoneMap = new Map<string, SkiptracePhone>()
  for (const p of allPhones) {
    const k = p.number
    const existing = phoneMap.get(k)
    if (!existing || phoneRank(p) > phoneRank(existing)) phoneMap.set(k, p)
  }
  const phones = Array.from(phoneMap.values()).sort((a, b) => phoneRank(b) - phoneRank(a))

  // Dedupe emails by address, keep best
  const emailMap = new Map<string, SkiptraceEmail>()
  for (const e of allEmails) {
    const k = e.email.toLowerCase()
    const existing = emailMap.get(k)
    if (!existing || emailRank(e) > emailRank(existing)) emailMap.set(k, e)
  }
  const emails = Array.from(emailMap.values()).sort((a, b) => emailRank(b) - emailRank(a))

  // Split phones into "best" (mobile + valid) and "fallback" (everything else)
  const goodPhones = phones.filter(
    (p) => p.twilio?.line_type === "mobile" && !p.dnc && p.twilio?.valid !== false
  )
  const fallbackPhones = phones.filter((p) => !goodPhones.includes(p))

  // Split emails into "good" (deliverable + catchall) and "fallback"
  const goodEmails = emails.filter(
    (e) => e.neverbounce?.result === "valid" || e.neverbounce?.result === "catchall"
  )
  const fallbackEmails = emails.filter((e) => !goodEmails.includes(e))

  const totalGoodPhones = goodPhones.length
  const totalFallbackPhones = fallbackPhones.length
  const totalGoodEmails = goodEmails.length
  const totalFallbackEmails = fallbackEmails.length

  return (
    <section className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/85 font-semibold">
            Contact data · {data.provider}
          </div>
          <div className="text-[11px] text-white/45 mt-0.5">
            {personSummaries
              .map((p) => `${p.full}${p.age ? ` (${p.age})` : ""}`)
              .join(", ") || "—"}
            {data.fetched_at && (
              <span className="ml-2 text-white/30">· enriched {timeAgo(data.fetched_at)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {totalGoodPhones > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-200">
              {totalGoodPhones} mobile
            </span>
          )}
          {totalGoodEmails > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-200">
              {totalGoodEmails} deliverable
            </span>
          )}
          {(totalFallbackPhones > 0 || totalFallbackEmails > 0) && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-white/8 text-white/55">
              +{totalFallbackPhones + totalFallbackEmails} fallback
            </span>
          )}
        </div>
      </div>

      {/* Best phones */}
      {goodPhones.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mt-2 mb-1">
            Best phones (mobile + validated)
          </div>
          {goodPhones.map((p) => (
            <PhoneRow key={`g-${p.number}`} phone={p} />
          ))}
        </div>
      )}

      {/* Best emails */}
      {goodEmails.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mt-3 mb-1">
            Best emails (deliverable)
          </div>
          {goodEmails.map((e) => (
            <EmailRow key={`g-${e.email}`} email={e} />
          ))}
        </div>
      )}

      {/* Fallback toggle */}
      {(fallbackPhones.length > 0 || fallbackEmails.length > 0 || allRelatives.length > 0) && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[11px] text-white/55 hover:text-white/85 underline-offset-2 hover:underline"
        >
          {showAll ? "Hide" : "Show"} fallback contacts
          {fallbackPhones.length > 0 && ` · ${fallbackPhones.length} ph`}
          {fallbackEmails.length > 0 && ` · ${fallbackEmails.length} em`}
          {allRelatives.length > 0 && ` · ${allRelatives.length} rel`}
        </button>
      )}

      {showAll && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          {fallbackPhones.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Fallback phones (landline / voip / dnc / invalid)
              </div>
              {fallbackPhones.map((p) => (
                <PhoneRow key={`f-${p.number}`} phone={p} />
              ))}
            </div>
          )}
          {fallbackEmails.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Fallback emails (unknown / invalid)
              </div>
              {fallbackEmails.map((e) => (
                <EmailRow key={`f-${e.email}`} email={e} />
              ))}
            </div>
          )}
          {allRelatives.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Relatives ({allRelatives.length})
              </div>
              <ul className="space-y-1 text-[12px] text-white/65">
                {allRelatives.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center gap-2">
                    <span className="text-white/85">{r.name}</span>
                    {r.age && <span className="text-white/35">({r.age})</span>}
                    {r.relationship && (
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        {r.relationship}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
