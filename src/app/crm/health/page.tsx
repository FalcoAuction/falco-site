// Data health: how many staged leads meet the launch-ready standard per
// source, and what blocks the rest (lead_quality_daily, refreshed nightly
// at 03:30 UTC by pg_cron).

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Head, shortDate } from "../ui"

export const dynamic = "force-dynamic"

type Row = { bot_source: string; total: number; launch_ready: number; reasons: Record<string, number> }
const REASONS: Record<string, string> = {
  outside_focus: "Outside the 10 Middle TN counties", no_property: "No property address", owner_unmatched: "Decedent not matched to a parcel",
  no_value: "No property value", below_fee_floor: "Value under $50k", entity_owner: "Owner is an LLC, church or government",
  no_contact_path: "Estate with no executor or attorney address", sale_passed: "Sale date already passed",
  estate_over_6mo: "Estate notice over 6 months old", duplicate: "Same address as an earlier lead",
  above_scope: "Value over $5M", weak_signal: "Not a reason to sell",
}

export default async function HealthPage() {
  let day: string | null = null
  let rows: Row[] = []
  const prev = new Map<string, number>()
  if (supabaseAdmin) {
    const latest = await supabaseAdmin.from("lead_quality_daily").select("captured_on").order("captured_on", { ascending: false }).limit(1)
    day = (latest.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
    if (day) {
      const week = new Date(`${day}T00:00:00Z`); week.setUTCDate(week.getUTCDate() - 7)
      const [now, before] = await Promise.all([
        supabaseAdmin.from("lead_quality_daily").select("bot_source,total,launch_ready,reasons").eq("captured_on", day),
        supabaseAdmin.from("lead_quality_daily").select("bot_source,launch_ready").eq("captured_on", week.toISOString().slice(0, 10)),
      ])
      rows = ((now.data ?? []) as Row[]).sort((a, b) => b.launch_ready - a.launch_ready || b.total - a.total)
      for (const r of (before.data ?? []) as { bot_source: string; launch_ready: number }[]) prev.set(r.bot_source, r.launch_ready)
    }
  }
  const total = rows.reduce((s, r) => s + r.total, 0)
  const ready = rows.reduce((s, r) => s + r.launch_ready, 0)
  const blockers = new Map<string, number>()
  for (const r of rows) for (const [k, v] of Object.entries(r.reasons ?? {})) blockers.set(k, (blockers.get(k) ?? 0) + Number(v))
  const top = [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = top[0]?.[1] ?? 1
  return (
    <>
      <Head title="Data health" sub={day ? `Snapshot ${shortDate(day)}` : "No snapshot yet"} />
      <div className="crm-body crm-narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="crm-grid stats">
          <div className="crm-card crm-stat"><div className="label">Staged leads</div><div className="value">{total.toLocaleString("en-US")}</div></div>
          <div className="crm-card crm-stat"><div className="label">Launch-ready</div><div className="value">{ready.toLocaleString("en-US")}</div><div className="hint">{total ? Math.round((ready / total) * 100) : 0}% of staged</div></div>
          <div className="crm-card crm-stat"><div className="label">Sources</div><div className="value">{rows.length}</div></div>
        </div>
        <section className="crm-card">
          <div className="crm-card-head"><h2>What blocks the rest</h2></div>
          <div className="crm-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {top.map(([k, v]) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span>{REASONS[k] ?? k}</span><span className="crm-muted">{v.toLocaleString("en-US")}</span></div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--hover)", marginTop: 4 }}><div style={{ width: `${(v / max) * 100}%`, height: "100%", borderRadius: 3, background: "var(--accent)" }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="crm-card">
          <table className="crm-table">
            <thead><tr><th>Source</th><th className="num">Staged</th><th className="num">Ready</th><th className="num">Week change</th><th className="hide-sm">Top blocker</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const change = prev.has(r.bot_source) ? r.launch_ready - (prev.get(r.bot_source) ?? 0) : null
                const blocker = Object.entries(r.reasons ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
                return (
                  <tr key={r.bot_source} style={{ cursor: "default" }}>
                    <td className="primary-cell">{r.bot_source}</td>
                    <td className="num crm-muted">{r.total.toLocaleString("en-US")}</td>
                    <td className="num">{r.launch_ready.toLocaleString("en-US")}</td>
                    <td className="num">{change == null ? <span className="crm-faint">new</span> : change === 0 ? <span className="crm-faint">0</span> : <span style={{ color: change > 0 ? "var(--green)" : "var(--red)" }}>{change > 0 ? "+" : ""}{change}</span>}</td>
                    <td className="hide-sm crm-muted">{blocker ? `${REASONS[blocker[0]] ?? blocker[0]} (${blocker[1]})` : ""}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
