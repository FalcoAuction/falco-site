// /admin/lead-quality — how many staged leads meet the launch-ready
// standard, per source, and what blocks the rest. Data comes from
// lead_quality_daily, refreshed nightly at 03:30 UTC by pg_cron
// (supabase/migrations/20261106_lead_quality_scorecard.sql).

import Link from "next/link"
import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const metadata = { title: "Lead quality · FALCO", robots: "noindex, nofollow" }

type Row = { captured_on: string; bot_source: string; total: number; launch_ready: number; reasons: Record<string, number> }

const REASONS: Record<string, string> = {
  outside_focus: "Outside the 10 Middle TN counties",
  no_property: "No property address",
  owner_unmatched: "Decedent not matched to a parcel",
  no_value: "No property value",
  below_fee_floor: "Value under $50k (fee under $1,000)",
  entity_owner: "Owner is an LLC, church or government",
  no_contact_path: "Estate with no executor or attorney address",
  sale_passed: "Sale date already passed",
  estate_over_6mo: "Estate notice over 6 months old",
  duplicate: "Same address as an earlier lead",
  above_scope: "Value over $5M (institutional, not a FALCO deal)",
  weak_signal: "Not a reason to sell (demolition permit or nuisance ticket)",
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "")

async function load(): Promise<{ day: string | null; rows: Row[]; prev: Map<string, number> } | null> {
  if (!supabaseAdmin) return null
  const latest = await supabaseAdmin.from("lead_quality_daily").select("captured_on").order("captured_on", { ascending: false }).limit(1)
  if (latest.error) return null
  const day = (latest.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
  if (!day) return { day: null, rows: [], prev: new Map() }
  const week = new Date(`${day}T00:00:00Z`)
  week.setUTCDate(week.getUTCDate() - 7)
  const [now, before] = await Promise.all([
    supabaseAdmin.from("lead_quality_daily").select("*").eq("captured_on", day),
    supabaseAdmin.from("lead_quality_daily").select("bot_source,launch_ready").eq("captured_on", week.toISOString().slice(0, 10)),
  ])
  if (now.error) return null
  const prev = new Map(((before.data ?? []) as { bot_source: string; launch_ready: number }[]).map((r) => [r.bot_source, r.launch_ready]))
  const rows = ((now.data ?? []) as Row[]).sort((a, b) => b.launch_ready - a.launch_ready || b.total - a.total)
  return { day, rows, prev }
}

export default async function LeadQualityPage() {
  if (!(await readAdminSessionFromCookies())) redirect("/admin/login")
  const data = await load()
  const total = data?.rows.reduce((s, r) => s + r.total, 0) ?? 0
  const ready = data?.rows.reduce((s, r) => s + r.launch_ready, 0) ?? 0
  const blockers = new Map<string, number>()
  for (const r of data?.rows ?? []) for (const [k, v] of Object.entries(r.reasons ?? {})) blockers.set(k, (blockers.get(k) ?? 0) + Number(v))
  const topBlockers = [...blockers.entries()].sort((a, b) => b[1] - a[1])

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">FALCO · LEAD QUALITY</div>
            <h1 className="text-2xl font-bold mt-1 sm:text-3xl">
              {ready.toLocaleString()} launch-ready <span className="text-white/40 font-normal">of {total.toLocaleString()} graded</span>
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {data?.day ? `Snapshot ${data.day}, refreshed nightly.` : "No snapshot yet."} A lead is launch-ready when it is in a focus county,
              has a property, a value of $50k or more, a person or estate as owner, a way to reach the decision-maker, is current, and is not a duplicate.
            </p>
          </div>
          <div className="flex gap-3 text-xs text-white/55">
            <Link href="/admin/opportunities" className="hover:text-white">Top opportunities</Link>
            <Link href="/admin/today" className="hover:text-white">Back to today</Link>
          </div>
        </header>

        {!data ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            The scorecard could not be loaded. Check the database connection and that the lead quality migration is applied.
          </p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">What blocks the rest</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {topBlockers.map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="text-white/75">{REASONS[k] ?? k}</span>
                    <span className="font-semibold tabular-nums">{n.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-white/40">A lead can have more than one blocker.</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">By source</h2>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-white/45">
                    <tr>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2 text-right">Ready</th>
                      <th className="px-3 py-2 text-right">Graded</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">vs week</th>
                      <th className="px-3 py-2">Top blockers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.rows.map((r) => {
                      const before = data.prev.get(r.bot_source)
                      const delta = before === undefined ? null : r.launch_ready - before
                      const top = Object.entries(r.reasons ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3)
                      return (
                        <tr key={r.bot_source}>
                          <td className="px-3 py-2 font-medium">{r.bot_source}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{r.launch_ready.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/60">{r.total.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/60">{pct(r.launch_ready, r.total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/60">
                            {delta === null ? "" : delta > 0 ? `+${delta}` : String(delta)}
                          </td>
                          <td className="px-3 py-2 text-xs text-white/50">
                            {top.map(([k, n]) => `${REASONS[k] ?? k} (${Number(n).toLocaleString()})`).join(", ")}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
