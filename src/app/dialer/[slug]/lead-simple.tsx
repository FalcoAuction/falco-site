"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { DialerLeadView } from "@/lib/dialer-types"

/**
 * Call-first lead screen.
 *
 * The original detail view stacks eight panels in ~2,700 lines, so making
 * one call means scrolling past the pitch, the math sheet, the partner
 * brief, the AI composer and the property record. This screen answers the
 * only three questions that matter while the phone is ringing:
 *   who am I calling, what is this house worth to them, what happened.
 * Everything else stays one tap away at ?full=1.
 *
 * Logging is a single tap. The old form made you pick a channel and an
 * outcome separately, which is why 73 activities are recorded as
 * channel=text / outcome=voicemail_left — two fields that disagree. Each
 * button here sets both, correctly.
 */

type Props = {
  lead: DialerLeadView
  caller: string
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? null : "$" + Math.round(n).toLocaleString("en-US")

/** County arrives from the pipeline lowercased ("hamilton"). */
const titleCase = (v: string) =>
  v.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

const OUTCOMES = [
  { key: "connected", label: "Connected", channel: "call", outcome: "connected", status: "rpc_made" },
  { key: "no_answer", label: "No answer", channel: "call", outcome: "no_answer", status: null },
  { key: "voicemail", label: "Left voicemail", channel: "voicemail", outcome: "voicemail_left", status: null },
  { key: "bad", label: "Bad number", channel: "call", outcome: "wrong_number", status: null },
] as const

export default function LeadSimple({ lead, caller }: Props) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [logged, setLogged] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const days = daysUntil(lead.currentSaleDate)

  // One equity number, derived once, instead of three AVM columns.
  const equity = useMemo(() => {
    const v = lead.avmMid ?? lead.avmLow ?? lead.avmHigh ?? null
    const owed = lead.mortgageAmount ?? null
    if (v === null || owed === null) return null
    return v - owed
  }, [lead.avmMid, lead.avmLow, lead.avmHigh, lead.mortgageAmount])

  const value = lead.avmMid ?? lead.avmLow ?? lead.avmHigh ?? null

  // Primary first, then any other paid-for numbers that aren't flagged.
  const phones = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ number: string; label?: string; dnc?: boolean }> = []
    const push = (num?: string, label?: string, dnc?: boolean) => {
      const d = (num ?? "").replace(/\D/g, "").slice(-10)
      if (d.length !== 10 || seen.has(d)) return
      seen.add(d)
      out.push({ number: d, label, dnc })
    }
    push(lead.ownerPhonePrimary, "primary", lead.ownerPhoneDncStatus === "dnc")
    push(lead.ownerPhoneSecondary, "secondary")
    for (const p of lead.alternatePhones ?? []) push(p.number, p.lineType, p.dnc)
    return out
  }, [lead])

  const fmtPhone = (d: string) =>
    `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`

  async function log(o: (typeof OUTCOMES)[number]) {
    setSaving(o.key)
    setErr(null)
    try {
      const res = await fetch("/api/dialer/activity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingSlug: lead.slug,
          channel: o.channel,
          outcome: o.outcome,
          notes: note.trim(),
          createdBy: caller,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to log.")
      if (o.status) {
        await fetch("/api/dialer/workflow", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ listingSlug: lead.slug, status: o.status }),
        }).catch(() => {})
      }
      setLogged(o.label)
      setNote("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to log.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto max-w-xl pb-24">
      {/* WHO + WHERE ------------------------------------------------ */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[22px] font-semibold leading-tight text-white">
          {lead.ownerName || "Owner unknown"}
        </div>
        <div className="mt-1 text-[14px] text-white/60">
          {lead.address || lead.title}
          {lead.county
            ? ` · ${titleCase(lead.county)} County`
            : ""}
        </div>

        {/* Urgency is the reason to call today, so it reads first. */}
        {days !== null && (
          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${
              days < 0
                ? "bg-white/10 text-white/60"
                : days <= 21
                  ? "bg-red-500/15 text-red-200"
                  : days <= 45
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-white/10 text-white/70"
            }`}
          >
            {days < 0
              ? "Sale date passed"
              : days === 0
                ? "Sale is TODAY"
                : `${days} days to sale`}
          </div>
        )}
      </div>

      {/* THE NUMBER ------------------------------------------------- */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
          Their equity
        </div>
        <div
          className={`mt-1 text-[34px] font-bold leading-none tabular-nums ${
            equity !== null && equity > 0 ? "text-emerald-300" : "text-white/50"
          }`}
        >
          {equity !== null ? money(equity) : "Unknown"}
        </div>
        <div className="mt-2 text-[13px] text-white/55 tabular-nums">
          {value !== null ? `Worth ${money(value)}` : "Value unknown"}
          {lead.mortgageAmount ? ` · Owes ${money(lead.mortgageAmount)}` : ""}
        </div>
      </div>

      {/* CALL ------------------------------------------------------- */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {phones.length === 0 ? (
          <div className="text-[14px] text-white/50">No phone number on this lead.</div>
        ) : (
          <>
            <a
              href={`tel:${phones[0].number}`}
              className={`flex items-center justify-center gap-3 rounded-xl px-5 py-4 text-[19px] font-bold tabular-nums transition-colors ${
                phones[0].dnc
                  ? "bg-red-500/20 text-red-100 hover:bg-red-500/25"
                  : "bg-emerald-400 text-black hover:bg-emerald-300"
              }`}
            >
              {fmtPhone(phones[0].number)}
            </a>
            {phones[0].dnc && (
              <div className="mt-2 text-center text-[12px] font-semibold text-red-300">
                On the DNC list. Do not call.
              </div>
            )}
            {phones.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {phones.slice(1, 5).map((p) => (
                  <a
                    key={p.number}
                    href={`tel:${p.number}`}
                    className={`rounded-lg border px-3 py-2 text-[13px] tabular-nums transition-colors ${
                      p.dnc
                        ? "border-red-400/30 text-red-300"
                        : "border-white/15 text-white/75 hover:border-white/35 hover:text-white"
                    }`}
                  >
                    {fmtPhone(p.number)}
                    {p.label ? (
                      <span className="ml-1.5 text-white/40">{p.label}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* LOG IT ----------------------------------------------------- */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
          What happened?
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              type="button"
              disabled={saving !== null}
              onClick={() => log(o)}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3.5 text-[14px] font-semibold text-white/85 hover:border-white/35 hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
            >
              {saving === o.key ? "Saving..." : o.label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          rows={2}
          className="mt-3 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none focus:border-white/35"
        />
        {logged && (
          <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-200">
            Logged: {logged}
          </div>
        )}
        {err && (
          <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {err}
          </div>
        )}
      </div>

      {/* Recent history, short. */}
      {lead.recentActivities?.length > 0 && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
            Last few touches
          </div>
          <ul className="mt-3 space-y-2">
            {lead.recentActivities.slice(0, 4).map((a, i) => (
              <li key={i} className="flex justify-between gap-3 text-[13px]">
                <span className="text-white/70">
                  {a.outcome?.replace(/_/g, " ") || a.channel}
                </span>
                <span className="text-white/35">
                  {a.occurredAt ? new Date(a.occurredAt).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Everything else, deliberately out of the way. */}
      <Link
        href={`/dialer/${lead.slug}?full=1`}
        className="mt-4 block rounded-xl border border-white/12 px-4 py-3 text-center text-[14px] text-white/60 hover:border-white/30 hover:text-white/90 transition-colors"
      >
        Full record: pitch, math sheet, property, notice, share →
      </Link>
    </div>
  )
}
