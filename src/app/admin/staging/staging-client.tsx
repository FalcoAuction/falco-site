"use client"

import { useState, useTransition } from "react"

type StagingRow = {
  id: string
  bot_source: string
  scraper_run_id: string | null
  staged_at: string
  staging_status: string
  pipeline_lead_key: string | null
  property_address: string | null
  county: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  property_value: number | null
  trustee_sale_date: string | null
  distress_type: string | null
  admin_notes: string | null
  source_url: string | null
}

type HealthRow = {
  bot_source: string
  status: string
  fetched_count: number
  staged_count: number
  started_at: string
}

type Counts = Record<string, { pending: number; verified: number; rejected: number }>

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const h = Math.floor(ms / (60 * 60 * 1000))
  if (h < 1) return `${Math.floor(ms / (60 * 1000))}m`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function StagingClient({
  initial,
}: {
  initial: { rows: StagingRow[]; counts: Counts; health: HealthRow[] }
}) {
  const [rows, setRows] = useState<StagingRow[]>(initial.rows)
  const [counts, setCounts] = useState<Counts>(initial.counts)
  const [filter, setFilter] = useState<string | null>(null) // bot_source filter
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const visibleRows = filter ? rows.filter((r) => r.bot_source === filter) : rows

  async function refresh() {
    const url = filter
      ? `/api/admin/staging?bot_source=${encodeURIComponent(filter)}&status=pending`
      : `/api/admin/staging?status=pending`
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      setRows(json.rows || [])
      setCounts(json.counts || {})
    }
  }

  async function action(body: object, msg: string) {
    setFeedback(msg)
    startTransition(async () => {
      const res = await fetch("/api/admin/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setFeedback(`✓ ${msg} — ${JSON.stringify(json.result || {})}`)
        await refresh()
      } else {
        setFeedback(`✗ failed: ${json.error || res.status}`)
      }
      setTimeout(() => setFeedback(null), 5000)
    })
  }

  function promoteOne(id: string) {
    action({ id, action: "promote" }, "promoting…")
  }
  function rejectOne(id: string) {
    const reason = window.prompt("Why reject? (optional)")
    if (reason === null) return // cancelled
    action({ id, action: "reject", reason: reason || "junk" }, "rejecting…")
  }
  function promoteBatch(botSource: string) {
    if (!window.confirm(`Promote ALL pending leads from "${botSource}" to live?`)) return
    action({ bot_source: botSource, action: "promote" }, `promoting ${botSource} batch…`)
  }

  return (
    <>
      {/* Bot-source counts + batch promote buttons */}
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/85 font-semibold mb-2">
          Sources
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(counts).map(([source, c]) => (
            <div
              key={source}
              className={`rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                filter === source
                  ? "border-emerald-400/50 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.025] hover:bg-white/[0.04]"
              }`}
              onClick={() => setFilter(filter === source ? null : source)}
            >
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-sm font-semibold text-white">{source}</div>
                <div className="text-[10px] text-white/40">tap to filter</div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-amber-300">{c.pending} pending</span>
                <span className="text-emerald-300/70">{c.verified} verified</span>
                <span className="text-white/40">{c.rejected} rejected</span>
              </div>
              {c.pending > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    promoteBatch(source)
                  }}
                  disabled={pending}
                  className="mt-2 text-[11px] rounded-md border border-emerald-400/40 bg-emerald-400/15 hover:bg-emerald-400/25 px-2 py-1 text-emerald-100 font-semibold transition-colors disabled:opacity-40"
                >
                  Promote all {c.pending} →
                </button>
              )}
            </div>
          ))}
          {Object.keys(counts).length === 0 && (
            <div className="text-sm text-white/45">
              No staged leads yet. Run a scraper to populate.
            </div>
          )}
        </div>
      </section>

      {/* Bot health */}
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/85 font-semibold mb-2">
          Recent runs
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Fetched</th>
                <th className="px-3 py-2 text-right">Staged</th>
                <th className="px-3 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {initial.health.map((h, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-white/80">{h.bot_source}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
                        h.status === "ok"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : h.status === "zero_yield"
                          ? "bg-amber-500/20 text-amber-200"
                          : h.status === "failed"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-white/10 text-white/55"
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-white/65">{h.fetched_count}</td>
                  <td className="px-3 py-2 text-right text-white/65">{h.staged_count}</td>
                  <td className="px-3 py-2 text-right text-[11px] text-white/45">
                    {timeAgo(h.started_at)} ago
                  </td>
                </tr>
              ))}
              {initial.health.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-white/45">
                    No bot runs reported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feedback */}
      {feedback && (
        <div className="mb-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {feedback}
        </div>
      )}

      {/* Pending rows */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/85 font-semibold mb-2">
          Pending leads {filter && `· ${filter}`} ({visibleRows.length})
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
          {visibleRows.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/45 text-center">
              No pending leads {filter && `from ${filter}`}.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {visibleRows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {r.property_address || "(no address)"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                        <span className="font-mono text-white/45">{r.bot_source}</span>
                        {r.distress_type && (
                          <span className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-white/8 text-white/65">
                            {r.distress_type}
                          </span>
                        )}
                        {r.county && <span>{r.county}</span>}
                        {r.full_name && <span>{r.full_name}</span>}
                        {r.email && <span className="text-white/40">{r.email}</span>}
                        {r.phone && <span className="font-mono">{r.phone}</span>}
                        <span className="text-white/30">· {timeAgo(r.staged_at)} ago</span>
                      </div>
                      {r.admin_notes && (
                        <div className="mt-1 text-[11px] text-white/45 truncate">
                          {r.admin_notes}
                        </div>
                      )}
                      {r.source_url && (
                        <div className="mt-1">
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline truncate inline-block max-w-full"
                          >
                            {r.source_url}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => promoteOne(r.id)}
                        disabled={pending}
                        className="text-[11px] rounded-md border border-emerald-400/40 bg-emerald-400/15 hover:bg-emerald-400/25 px-3 py-1.5 text-emerald-100 font-semibold transition-colors disabled:opacity-40"
                      >
                        Promote →
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectOne(r.id)}
                        disabled={pending}
                        className="text-[11px] rounded-md border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-red-200 font-semibold transition-colors disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
