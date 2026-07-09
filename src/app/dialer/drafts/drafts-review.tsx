"use client"

import { useState } from "react"

export type PendingDraft = {
  id: number
  slug: string
  toPhone: string
  body: string
  confidence: number | null
  rationale: string
  reason: string
  angle: string
  createdAt: string
  ownerName: string
  address: string
  county: string
  saleDate: string | null
  equity: number | null
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1000)}k`
}

function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function DraftsReview({ drafts }: { drafts: PendingDraft[] }) {
  const [items, setItems] = useState(drafts)
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function act(id: number, action: "approve" | "reject") {
    setBusy(id)
    setNotes((n) => ({ ...n, [id]: "" }))
    try {
      const res = await fetch("/api/sms/approve-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          body: edits[id] !== undefined ? edits[id] : undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        action?: string
        error?: string
      }
      if (res.ok && json.ok) {
        setItems((list) => list.filter((d) => d.id !== id))
      } else {
        setNotes((n) => ({ ...n, [id]: json.error || `HTTP ${res.status}` }))
      }
    } catch (e) {
      setNotes((n) => ({ ...n, [id]: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="text-white/70 text-[15px]">No drafts waiting.</div>
        <div className="text-white/40 text-[12px] mt-2">
          Campaign drafts and brain escalations land here for review. In dry
          mode every composed message parks here instead of sending.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((d) => {
        const draftText = edits[d.id] !== undefined ? edits[d.id] : d.body
        const isDry = d.reason === "campaign_dry_run"
        return (
          <section
            key={d.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[15px] font-semibold text-white">
                  {d.ownerName || "(owner unknown)"}
                </div>
                <div className="text-[12px] text-white/55 mt-0.5">
                  {d.address}
                  {d.county ? ` · ${d.county}` : ""}
                </div>
              </div>
              <div className="text-right text-[12px]">
                <div className="text-white/70 tabular-nums">{fmtPhone(d.toPhone)}</div>
                <div className="text-white/40 mt-0.5">
                  {d.saleDate ? `sale ${d.saleDate}` : ""}
                  {d.equity !== null ? ` · ${fmtMoney(d.equity)} equity` : ""}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 ${
                  isDry
                    ? "border-sky-400/35 bg-sky-400/10 text-sky-200"
                    : "border-amber-400/35 bg-amber-400/10 text-amber-200"
                }`}
              >
                {isDry ? "campaign dry run" : d.reason || "escalated"}
              </span>
              {d.angle && (
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-white/55">
                  {d.angle.replace(/_/g, " ")}
                </span>
              )}
              {d.confidence !== null && (
                <span className="text-white/40 normal-case tracking-normal">
                  confidence {Math.round((d.confidence || 0) * 100)}%
                </span>
              )}
            </div>

            <textarea
              value={draftText}
              onChange={(e) => setEdits((m) => ({ ...m, [d.id]: e.target.value }))}
              rows={Math.min(8, Math.max(3, Math.ceil(draftText.length / 60)))}
              className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-[14px] leading-relaxed text-emerald-50 focus:border-emerald-400/50 focus:outline-none"
            />
            {d.rationale && (
              <div className="mt-1.5 text-[11px] text-white/40">{d.rationale}</div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => act(d.id, "approve")}
                disabled={busy === d.id}
                className="rounded-xl border border-emerald-400/40 bg-emerald-400/15 hover:bg-emerald-400/25 px-4 py-2 text-[13px] font-semibold text-emerald-100 transition-colors disabled:opacity-50"
              >
                {busy === d.id ? "Working..." : "Approve + send"}
              </button>
              <button
                onClick={() => act(d.id, "reject")}
                disabled={busy === d.id}
                className="rounded-xl border border-red-400/30 bg-red-400/[0.08] hover:bg-red-400/[0.16] px-4 py-2 text-[13px] text-red-200 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              {notes[d.id] && (
                <span className="text-[12px] text-amber-300/90">{notes[d.id]}</span>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
