"use client"

// ContactLayer — rich contact panel for the dialer.
//
// Renders the FULL skip-trace pull from BatchData, layered with Twilio
// validation (line type, carrier, caller name match, line status) and
// NeverBounce email deliverability. Each phone gets a composite
// confidence score (0-100) so Chris knows what to dial first.
//
// Cross-lead bad-phone filter: phones marked bad anywhere (or appearing
// on 3+ unrelated leads = junk fallback) are excluded by default.
//
// Mark-as-bad button feeds back into the system — Chris's daily
// feedback compounds, the system gets smarter.

import { useState, useMemo } from "react"
import { usePathname } from "next/navigation"

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
    valid?: boolean
    line_type?: string
    carrier?: string | null
    caller_name?: string | null
    caller_type?: string | null
    name_match_score?: number | null
    line_status?: string | null
    line_status_checked_at?: string
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
    result: string
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

function normalizeNumber(n: string): string {
  return n.replace(/\D/g, "").slice(-10)
}

// ─── Composite confidence score (0-100) ─────────────────────────────────
// Combines all signals into a single number Chris can scan-and-trust.
function computePhoneScore(p: SkiptracePhone, isBad: boolean): number {
  if (isBad) return 0
  let s = 0
  // Line type (mobile = max signal, landline = weak)
  const lt = p.twilio?.line_type
  if (lt === "mobile") s += 35
  else if (lt === "fixedVoip") s += 18
  else if (lt === "voip" || lt === "nonFixedVoip") s += 10
  else if (lt === "landline") s += 5
  // Validity (Twilio recognized the number)
  if (p.twilio?.valid !== false && lt) s += 10
  // Caller-name match (the line registers to the homeowner's name)
  const nm = p.twilio?.name_match_score
  if (typeof nm === "number") {
    if (nm >= 0.7) s += 25
    else if (nm >= 0.4) s += 12
    else if (nm > 0) s += 3
  }
  // Line status (Twilio confirmed currently in service)
  const ls = p.twilio?.line_status
  if (ls === "in-service" || ls === "active") s += 15
  else if (ls === "out-of-service" || ls === "no-longer-in-service" || ls === "inactive") s -= 30
  // BatchData metadata
  if (p.reachable) s += 5
  if (p.tested) s += 3
  if (p.score) s += Math.min(7, Math.round((p.score / 100) * 7))
  // Penalties
  if (p.dnc) s -= 50
  return Math.max(0, Math.min(100, s))
}

function scoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: "bg-emerald-500/20", text: "text-emerald-200", label: "VERIFIED" }
  if (score >= 55) return { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "GOOD" }
  if (score >= 35) return { bg: "bg-amber-500/15", text: "text-amber-200", label: "OK" }
  if (score >= 15) return { bg: "bg-orange-500/15", text: "text-orange-200", label: "WEAK" }
  return { bg: "bg-red-500/15", text: "text-red-200", label: "BAD" }
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

function PhoneRow({
  phone,
  score,
  badPhonesSet,
  slug,
  onMarkBad,
}: {
  phone: SkiptracePhone
  score: number
  badPhonesSet: Set<string>
  slug: string
  onMarkBad: (number: string, reason: string) => void
}) {
  const lt = phone.twilio?.line_type
  const tel = `tel:+1${normalizeNumber(phone.number)}`
  const sms = `sms:+1${normalizeNumber(phone.number)}`
  const isBad = badPhonesSet.has(normalizeNumber(phone.number))
  const sc = scoreColor(score)
  const [showActions, setShowActions] = useState(false)
  void slug

  // Type badge
  let typeBadge = "—"
  let typeColor = "bg-white/8 text-white/45"
  if (lt === "mobile") {
    typeBadge = "MOBILE"
    typeColor = "bg-emerald-500/20 text-emerald-200"
  } else if (lt === "landline") {
    typeBadge = "LANDLINE"
    typeColor = "bg-amber-500/20 text-amber-200"
  } else if (lt === "voip" || lt === "fixedVoip" || lt === "nonFixedVoip") {
    typeBadge = "VOIP"
    typeColor = "bg-blue-500/20 text-blue-200"
  } else if (phone.twilio?.valid === false) {
    typeBadge = "INVALID"
    typeColor = "bg-red-500/20 text-red-200"
  }

  const lineStatus = phone.twilio?.line_status
  const isDisconnected =
    lineStatus === "out-of-service" || lineStatus === "no-longer-in-service" || lineStatus === "inactive"
  const isInService = lineStatus === "in-service" || lineStatus === "active"

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-colors ${
        isBad
          ? "border-red-400/15 bg-red-500/5 opacity-50"
          : score >= 75
          ? "border-emerald-400/30 bg-emerald-500/5"
          : score >= 55
          ? "border-emerald-400/15 bg-emerald-500/[0.03]"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Score */}
        <span
          className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${sc.bg} ${sc.text}`}
          title={`Composite confidence: ${score}/100`}
        >
          {score}
        </span>
        {/* Number */}
        <a
          href={tel}
          className="font-mono text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
        >
          {fmtPhone(phone.number)}
        </a>
        {/* Type badge */}
        <span
          className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${typeColor}`}
        >
          {typeBadge}
        </span>
        {/* DNC / disconnected / bad markers */}
        {phone.dnc && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-red-500/30 text-red-100">
            DNC
          </span>
        )}
        {isDisconnected && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-red-500/30 text-red-100">
            DISCONNECTED
          </span>
        )}
        {isInService && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/25 text-emerald-100">
            IN SERVICE
          </span>
        )}
        {isBad && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-red-500/40 text-red-100">
            FLAGGED
          </span>
        )}
        {/* Carrier */}
        {phone.twilio?.carrier && (
          <span className="text-[11px] text-white/45 truncate max-w-[140px]">
            {phone.twilio.carrier}
          </span>
        )}
        {/* Recency */}
        {phone.date_last_seen && (
          <span className="text-[10px] text-white/35 ml-auto">{timeAgo(phone.date_last_seen)}</span>
        )}
        {/* Text shortcut */}
        {!isBad && !phone.dnc && (
          <a
            href={sms}
            className="text-[11px] text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            title="SMS this number from your phone"
          >
            text
          </a>
        )}
        {/* Mark-bad toggle */}
        <button
          type="button"
          onClick={() => setShowActions((v) => !v)}
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
          title="Mark this number"
        >
          ⋯
        </button>
      </div>
      {/* Caller-name line — only shows when present */}
      {phone.twilio?.caller_name && (
        <div className="mt-1 ml-12 text-[11px] text-white/55">
          Registered to: <span className="text-white/85">{phone.twilio.caller_name}</span>
          {typeof phone.twilio.name_match_score === "number" && (
            <span
              className={`ml-2 text-[10px] uppercase tracking-wider ${
                phone.twilio.name_match_score >= 0.5
                  ? "text-emerald-300"
                  : phone.twilio.name_match_score > 0
                  ? "text-amber-300"
                  : "text-red-300/80"
              }`}
            >
              {phone.twilio.name_match_score >= 0.5
                ? "✓ matches owner"
                : phone.twilio.name_match_score > 0
                ? "partial match"
                : "different name"}
            </span>
          )}
        </div>
      )}
      {/* Mark-bad action menu */}
      {showActions && (
        <div className="mt-2 ml-12 flex flex-wrap gap-1.5">
          {(["disconnected", "wrong_person", "voicemail_only", "do_not_call"] as const).map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => {
                onMarkBad(phone.number, reason)
                setShowActions(false)
              }}
              className="text-[10px] uppercase tracking-wider rounded px-2 py-1 border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition-colors"
            >
              {reason.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
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
      <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${badgeColor}`}>
        {badgeLabel}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {email.score !== null && <span className="text-[10px] text-white/35">{email.score}</span>}
        {email.date_last_seen && <span className="text-[10px] text-white/35">{timeAgo(email.date_last_seen)}</span>}
      </span>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────

export default function ContactLayer({
  data,
  badPhones = [],
}: {
  data: SkiptraceData | null
  badPhones?: string[]
}) {
  const pathname = usePathname()
  const slug = pathname?.split("/").pop() || ""
  const badSetInitial = useMemo(() => new Set(badPhones.map((n) => normalizeNumber(n))), [badPhones])
  const [badSet, setBadSet] = useState<Set<string>>(badSetInitial)
  const [showAll, setShowAll] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function markBad(number: string, reason: string) {
    const norm = normalizeNumber(number)
    setBadSet((prev) => new Set([...prev, norm]))
    setFeedback(`Marking ${fmtPhone(number)} as ${reason.replace(/_/g, " ")}…`)
    try {
      const res = await fetch(`/api/dialer/${slug}/bad-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: number, reason }),
      })
      if (res.ok) {
        setFeedback(`✓ ${fmtPhone(number)} flagged — won't surface anywhere again`)
        setTimeout(() => setFeedback(null), 4000)
      } else {
        const j = await res.json().catch(() => ({}))
        setFeedback(`✗ Flag failed: ${j.error || res.status}`)
      }
    } catch (err) {
      setFeedback(`✗ Network error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (!data || !data.persons || data.persons.length === 0) {
    return (
      <section className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-4">
        <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
          Contact data
        </div>
        <p className="mt-2 text-sm text-amber-100/75">
          No skip-trace data on file yet. Run BatchData enrichment via{" "}
          <code className="font-mono text-amber-200">scripts/enrich-full-skiptrace.mjs</code>{" "}
          or wait for the next daily cron.
        </p>
      </section>
    )
  }

  // Aggregate across persons
  const allPhones: SkiptracePhone[] = []
  const allEmails: SkiptraceEmail[] = []
  const allRelatives: { name: string; age: number | null; relationship: string | null }[] = []
  const personSummaries: { full: string; age: number | null }[] = []
  for (const person of data.persons) {
    if (person.name?.full) personSummaries.push({ full: person.name.full, age: person.age })
    for (const ph of person.phones) allPhones.push(ph)
    for (const em of person.emails) allEmails.push(em)
    for (const rel of person.relatives) allRelatives.push(rel)
  }

  // Dedupe phones by number, keep first
  const phoneMap = new Map<string, SkiptracePhone>()
  for (const p of allPhones) {
    if (!phoneMap.has(p.number)) phoneMap.set(p.number, p)
  }
  // Compute composite scores (uses live badSet so toggles re-rank)
  const phonesWithScore = Array.from(phoneMap.values()).map((p) => ({
    p,
    score: computePhoneScore(p, badSet.has(normalizeNumber(p.number))),
  }))
  phonesWithScore.sort((a, b) => b.score - a.score)

  // Dedupe emails
  const emailMap = new Map<string, SkiptraceEmail>()
  for (const e of allEmails) {
    const k = e.email.toLowerCase()
    if (!emailMap.has(k)) emailMap.set(k, e)
  }
  const emails = Array.from(emailMap.values()).sort((a, b) => emailRank(b) - emailRank(a))

  // Split: best (score >= 35) vs fallback (score < 35)
  const goodPhones = phonesWithScore.filter((x) => x.score >= 35)
  const fallbackPhones = phonesWithScore.filter((x) => x.score < 35)
  const goodEmails = emails.filter(
    (e) => e.neverbounce?.result === "valid" || e.neverbounce?.result === "catchall"
  )
  const fallbackEmails = emails.filter((e) => !goodEmails.includes(e))

  // Counts for the header chips
  const verifiedCount = phonesWithScore.filter((x) => x.score >= 75).length
  const goodCount = phonesWithScore.filter((x) => x.score >= 55 && x.score < 75).length
  const totalUsable = phonesWithScore.filter((x) => x.score >= 35).length

  return (
    <section className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/85 font-semibold">
            Contact data · {data.provider}
          </div>
          <div className="text-[11px] text-white/45 mt-0.5">
            {personSummaries.map((p) => `${p.full}${p.age ? ` (${p.age})` : ""}`).join(", ") || "—"}
            {data.fetched_at && (
              <span className="ml-2 text-white/30">· enriched {timeAgo(data.fetched_at)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {verifiedCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/25 text-emerald-100">
              {verifiedCount} verified
            </span>
          )}
          {goodCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300">
              {goodCount} good
            </span>
          )}
          {goodEmails.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500/15 text-emerald-200">
              {goodEmails.length} email
            </span>
          )}
          {totalUsable === 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-200">
              no usable phones
            </span>
          )}
        </div>
      </div>

      {/* Best phones — score >= 35 */}
      {goodPhones.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mt-2 mb-1">
            Best phones (ranked by composite score)
          </div>
          {goodPhones.map((x) => (
            <PhoneRow
              key={`g-${x.p.number}`}
              phone={x.p}
              score={x.score}
              badPhonesSet={badSet}
              slug={slug}
              onMarkBad={markBad}
            />
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

      {/* Inline feedback */}
      {feedback && (
        <div className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[12px] text-emerald-100">
          {feedback}
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
                Fallback phones (low confidence — try only if better options fail)
              </div>
              {fallbackPhones.map((x) => (
                <PhoneRow
                  key={`f-${x.p.number}`}
                  phone={x.p}
                  score={x.score}
                  badPhonesSet={badSet}
                  slug={slug}
                  onMarkBad={markBad}
                />
              ))}
            </div>
          )}
          {fallbackEmails.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Fallback emails
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
