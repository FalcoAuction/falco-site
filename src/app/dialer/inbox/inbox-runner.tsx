"use client"

/**
 * Inbox runner — one card at a time, auto-advance.
 *
 * Patrick blows through 100 leads in 30-40 min:
 *   - Card shows lead context + AI draft (lazy-loaded)
 *   - Edit the draft if needed
 *   - Send via Twilio (auto-logs + auto-advances)
 *   - Send via iMessage (opens sms: URL + auto-advances)
 *   - Skip (no send, just advance)
 *
 * Twilio sends have a 30-second cooldown — button locks for 30s after
 * each send to keep the unregistered Twilio number out of carrier
 * blast-detection territory.
 *
 * Mode auto-select:
 *   - If lead has an unread inbound message → 'reply' (with the
 *     inbound pre-filled into the brain's context)
 *   - Else if lead has prior outbound → 'followup' (brain picks a
 *     different angle than what's been tried)
 *   - Else → 'opener'
 *
 * Keyboard shortcuts:
 *   S = Send via Twilio (if available + cooldown elapsed)
 *   M = Send via iMessage
 *   K = Skip
 *   E = focus the draft for editing
 *   N = next (alias for Skip)
 *   ← = previous
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { InboxLead } from "./page"

type DraftState = {
  loading: boolean
  draft: string
  angle: string | null
  confidence: number
  rationale: string
  suggestedAction: string
  error: string | null
}

const TWILIO_COOLDOWN_SECONDS = 30

export function InboxRunner({
  leads,
  caller,
}: {
  leads: InboxLead[]
  caller: string
}) {
  const [idx, setIdx] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, DraftState>>({})
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [sentVia, setSentVia] = useState<Record<number, "twilio" | "imessage" | "skipped">>({})
  const [twilioCooldown, setTwilioCooldown] = useState(0)
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null)

  const lead = leads[idx]
  const total = leads.length

  // Decrement cooldown each second
  useEffect(() => {
    if (twilioCooldown <= 0) return
    const t = setInterval(() => {
      setTwilioCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [twilioCooldown])

  // Auto-fetch draft when card changes (if not already loaded)
  useEffect(() => {
    if (!lead) return
    if (drafts[idx]) return // already loaded or loading
    setDrafts((d) => ({
      ...d,
      [idx]: {
        loading: true,
        draft: "",
        angle: null,
        confidence: 0,
        rationale: "",
        suggestedAction: "",
        error: null,
      },
    }))
    const body: { mode: string; inbound_message?: string } = {
      mode: lead.suggestedMode,
    }
    if (lead.suggestedMode === "reply" && lead.lastInboundBody) {
      body.inbound_message = lead.lastInboundBody
    }
    fetch(`/api/dialer/${lead.slug}/ai-compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((j) => {
        setDrafts((d) => ({
          ...d,
          [idx]: {
            loading: false,
            draft: (j.draft as string) || "",
            angle: (j.angle_used as string | null) ?? null,
            confidence: (j.confidence as number) ?? 0,
            rationale: (j.rationale as string) || "",
            suggestedAction: (j.suggested_action as string) || "",
            error: j.error ?? null,
          },
        }))
        setEdits((e) => ({ ...e, [idx]: (j.draft as string) || "" }))
      })
      .catch((e) => {
        setDrafts((d) => ({
          ...d,
          [idx]: {
            loading: false,
            draft: "",
            angle: null,
            confidence: 0,
            rationale: "",
            suggestedAction: "",
            error: (e as Error).message,
          },
        }))
      })
    // Also prefetch the NEXT card's draft so the queue feels instant
    const nextLead = leads[idx + 1]
    if (nextLead && !drafts[idx + 1]) {
      const nextBody: { mode: string; inbound_message?: string } = {
        mode: nextLead.suggestedMode,
      }
      if (nextLead.suggestedMode === "reply" && nextLead.lastInboundBody) {
        nextBody.inbound_message = nextLead.lastInboundBody
      }
      fetch(`/api/dialer/${nextLead.slug}/ai-compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextBody),
      })
        .then((r) => r.json())
        .then((j) => {
          setDrafts((d) => ({
            ...d,
            [idx + 1]: {
              loading: false,
              draft: (j.draft as string) || "",
              angle: (j.angle_used as string | null) ?? null,
              confidence: (j.confidence as number) ?? 0,
              rationale: (j.rationale as string) || "",
              suggestedAction: (j.suggested_action as string) || "",
              error: j.error ?? null,
            },
          }))
          setEdits((e) => ({ ...e, [idx + 1]: (j.draft as string) || "" }))
        })
        .catch(() => {})
    }
  }, [idx, lead, drafts, leads])

  const advance = useCallback(() => {
    if (idx < total - 1) setIdx((i) => i + 1)
  }, [idx, total])

  const goBack = useCallback(() => {
    if (idx > 0) setIdx((i) => i - 1)
  }, [idx])

  const handleSkip = useCallback(() => {
    setSentVia((s) => ({ ...s, [idx]: "skipped" }))
    advance()
  }, [idx, advance])

  async function sendViaTwilio() {
    if (twilioCooldown > 0) return
    const draftText = edits[idx] || drafts[idx]?.draft || ""
    if (!draftText.trim() || !lead) return
    const phone = normalizeE164(lead.primaryPhone)
    if (!phone) return
    const res = await fetch(`/api/sms/twilio-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: lead.slug,
        to_phone: phone,
        body: draftText.trim(),
        angle: drafts[idx]?.angle ?? null,
      }),
    })
    const json = (await res.json()) as { error?: string; sid?: string }
    if (!res.ok) {
      setDrafts((d) => ({
        ...d,
        [idx]: { ...(d[idx] as DraftState), error: json.error || "Send failed" },
      }))
      return
    }
    setSentVia((s) => ({ ...s, [idx]: "twilio" }))
    setTwilioCooldown(TWILIO_COOLDOWN_SECONDS)
    advance()
  }

  function sendViaImessage() {
    const draftText = edits[idx] || drafts[idx]?.draft || ""
    if (!draftText.trim() || !lead) return
    const phone = normalizeE164(lead.primaryPhone)
    if (!phone) return
    // Log the send first (best-effort, fire-and-forget) so the brain
    // sees it in conversation history next time.
    fetch(`/api/dialer/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingSlug: lead.slug,
        channel: "text",
        outcome: "note_only",
        notes: `[OUT][AI angle: ${drafts[idx]?.angle ?? "manual"}] ${draftText.trim()}`,
        createdBy: caller,
      }),
    }).catch(() => {})
    const href = `sms:${phone}?&body=${encodeURIComponent(draftText.trim())}`
    setSentVia((s) => ({ ...s, [idx]: "imessage" }))
    window.location.href = href
    // Auto-advance after a tick (so iMessage gets the URL before we advance)
    setTimeout(advance, 500)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        sendViaTwilio()
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        sendViaImessage()
      } else if (e.key === "k" || e.key === "K" || e.key === "n" || e.key === "N") {
        e.preventDefault()
        handleSkip()
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault()
        draftTextareaRef.current?.focus()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, leads, drafts, edits, twilioCooldown])

  if (!lead) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center">
        <div className="text-[22px] font-semibold mb-2">Queue empty</div>
        <div className="text-white/60 text-[14px]">
          No active foreclosure-family leads match the inbox filter.
        </div>
        <a
          href="/dialer"
          className="inline-block mt-6 rounded-md bg-emerald-400 text-black font-semibold px-5 py-2"
        >
          Back to dialer
        </a>
      </div>
    )
  }

  if (idx >= total) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center">
        <div className="text-[22px] font-semibold mb-2">Inbox cleared</div>
        <div className="text-white/60 text-[14px]">
          Processed all {total} leads. Come back tomorrow for the next batch.
        </div>
        <a
          href="/dialer"
          className="inline-block mt-6 rounded-md bg-emerald-400 text-black font-semibold px-5 py-2"
        >
          Back to dialer
        </a>
      </div>
    )
  }

  const draftState = drafts[idx]
  const editText = edits[idx] ?? draftState?.draft ?? ""
  const status = sentVia[idx]
  const progressPct = ((idx + 1) / total) * 100

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-5 py-5 space-y-4">
      {/* Progress + nav */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12px] text-white/55 tabular-nums">
          <span>
            Lead {idx + 1} of {total}
          </span>
          <span>
            ←/→ navigate · S send · M iMsg · K skip · E edit
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-1 bg-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Lead context card */}
      <section className="rounded-xl border border-white/12 bg-white/[0.03] p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <div>
            <div className="text-[18px] md:text-[20px] font-semibold text-white">
              {lead.ownerName}
            </div>
            <div className="text-[13px] text-white/65 mt-0.5">{lead.address}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-semibold">
              {lead.distressType.replace(/_/g, " ")}
            </div>
            {lead.daysToSale !== null && (
              <div
                className={`text-[14px] font-semibold mt-0.5 tabular-nums ${
                  lead.daysToSale <= 7
                    ? "text-red-300"
                    : lead.daysToSale <= 21
                    ? "text-amber-200"
                    : "text-white/70"
                }`}
              >
                {lead.daysToSale}d to sale
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[12px] mt-3">
          <Stat label="Equity" value={fmtCurrencyShort(lead.equity)} tone="emerald" />
          <Stat label="ARV" value={fmtCurrencyShort(lead.arv)} tone="neutral" />
          <Stat
            label="Prior touches"
            value={String(lead.priorOutboundCount)}
            tone={lead.priorOutboundCount > 0 ? "amber" : "neutral"}
          />
        </div>

        <div className="flex items-center gap-2 mt-3 text-[12px] text-white/60">
          <span className="font-mono">{fmtPhone(lead.primaryPhone)}</span>
          {lead.lineType && (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                lead.lineType === "mobile"
                  ? "border-emerald-400/40 text-emerald-200"
                  : "border-blue-400/40 text-blue-200"
              }`}
            >
              {lead.lineType}
            </span>
          )}
          {lead.altCount > 0 && (
            <span className="text-white/40">+{lead.altCount} alts</span>
          )}
        </div>

        {lead.hasInboundReply && lead.lastInboundBody && (
          <div className="mt-3 rounded-md border border-amber-400/35 bg-amber-400/10 p-2.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200 font-semibold">
              Inbound reply (drafting response)
            </div>
            <div className="text-[13px] text-amber-50 mt-1 leading-snug">
              "{lead.lastInboundBody}"
            </div>
          </div>
        )}
      </section>

      {/* Draft card */}
      <section className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/85 font-semibold">
            ✦ AI draft · {lead.suggestedMode}
          </div>
          {draftState && !draftState.loading && draftState.angle && (
            <div className="text-[10px] text-white/55">
              angle: {draftState.angle} · conf {(draftState.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>

        {draftState?.loading || !draftState ? (
          <div className="rounded-md bg-white/[0.04] p-3 text-[13px] text-white/50 animate-pulse">
            Drafting...
          </div>
        ) : draftState.error ? (
          <div className="rounded-md border border-red-400/35 bg-red-400/10 p-2.5 text-[13px] text-red-200">
            {draftState.error}
          </div>
        ) : (
          <>
            <textarea
              ref={draftTextareaRef}
              value={editText}
              onChange={(e) => setEdits((x) => ({ ...x, [idx]: e.target.value }))}
              rows={5}
              className="w-full rounded-md bg-black/30 border border-emerald-400/25 px-3 py-2 text-[14px] text-white leading-snug focus:outline-none focus:border-emerald-400/55"
            />
            <div className="flex items-baseline justify-between mt-1.5 text-[11px] text-white/45">
              <span className="leading-snug">{draftState.rationale}</span>
              <span className="tabular-nums shrink-0 ml-3">{editText.length} chars</span>
            </div>
          </>
        )}
      </section>

      {/* Status badge if already actioned */}
      {status && (
        <div className="rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-[12px] text-white/65 text-center">
          {status === "twilio"
            ? "✓ Sent via Twilio"
            : status === "imessage"
            ? "✓ Sent via iMessage"
            : "○ Skipped"}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={sendViaTwilio}
          disabled={
            !draftState ||
            draftState.loading ||
            !editText.trim() ||
            !!status ||
            twilioCooldown > 0
          }
          className="w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-black font-semibold text-[15px] py-3 transition-colors"
        >
          {twilioCooldown > 0
            ? `⚡ Send via Twilio (wait ${twilioCooldown}s)`
            : "⚡ Send via Twilio (S)"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={sendViaImessage}
            disabled={!draftState || draftState.loading || !editText.trim() || !!status}
            className="rounded-md border border-white/22 hover:bg-white/[0.06] disabled:opacity-40 text-white text-[13px] py-2.5"
          >
            📲 iMessage (M)
          </button>
          <button
            onClick={handleSkip}
            className="rounded-md border border-white/22 hover:bg-white/[0.06] text-white/75 text-[13px] py-2.5"
          >
            ↪ Skip (K)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={goBack}
            disabled={idx === 0}
            className="rounded-md border border-white/12 hover:bg-white/[0.04] disabled:opacity-30 text-white/55 text-[11px] py-1.5"
          >
            ← previous
          </button>
          <button
            onClick={advance}
            disabled={idx >= total - 1}
            className="rounded-md border border-white/12 hover:bg-white/[0.04] disabled:opacity-30 text-white/55 text-[11px] py-1.5"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "emerald" | "amber" | "neutral"
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
      ? "text-amber-200"
      : "text-white/80"
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/8 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.16em] text-white/45">{label}</div>
      <div className={`text-[14px] font-semibold tabular-nums mt-0.5 ${color}`}>{value}</div>
    </div>
  )
}

function fmtCurrencyShort(n?: number | null): string {
  if (n === null || n === undefined) return "—"
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toFixed(0)}`
}

function fmtPhone(raw: string): string {
  if (!raw) return ""
  const d = raw.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith("1"))
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

function normalizeE164(raw: string): string {
  if (!raw) return ""
  const d = raw.replace(/\D/g, "")
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith("1")) return `+${d}`
  if (raw.startsWith("+")) return raw
  return ""
}
