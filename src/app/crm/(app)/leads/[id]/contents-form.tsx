"use client"

// Contents checklist for estate and owner calls: what is in the house worth
// its own auction. Saved to raw_payload.operator_contents via /api/crm/contents.

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { OperatorContents } from "@/lib/crm-data"

const FIELDS: { key: "vehicles" | "boats_rvs" | "coins_jewelry_art" | "tractors_equipment" | "other"; label: string; hint: string }[] = [
  { key: "vehicles", label: "Vehicles", hint: "Year, make, model. Classics, trucks, motorcycles" },
  { key: "boats_rvs", label: "Boats / RVs", hint: "Length, make, where it is kept" },
  { key: "coins_jewelry_art", label: "Coins, jewelry, art", hint: "Collections, appraisals on file" },
  { key: "tractors_equipment", label: "Tractors, equipment", hint: "Farm, shop, construction" },
  { key: "other", label: "Other", hint: "Anything else worth selling" },
]

export function ContentsForm({ id, initial }: { id: string; initial: OperatorContents | null }) {
  const router = useRouter()
  const [v, setV] = useState({
    vehicles: initial?.vehicles ?? "", boats_rvs: initial?.boats_rvs ?? "", coins_jewelry_art: initial?.coins_jewelry_art ?? "",
    tractors_equipment: initial?.tractors_equipment ?? "", other: initial?.other ?? "",
    firearms_count: initial?.firearms_count != null ? String(initial.firearms_count) : "",
    firearms_collection: initial?.firearms_collection ?? false,
    est_value: initial?.est_value != null ? String(initial.est_value) : "",
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof v, val: string | boolean) => { setV((s) => ({ ...s, [k]: val })); setSaved(false) }

  async function save() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch("/api/crm/contents", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...v }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Save failed.")
      setSaved(true)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="crm-card">
      <div className="crm-card-head">
        <h2>Contents checklist</h2>
        <span className="spacer" />
        {initial?.updated_at ? <span className="crm-faint" style={{ fontSize: 12.5 }}>Saved {new Date(initial.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> : null}
      </div>
      <div className="crm-card-body" style={{ display: "grid", gap: 10 }}>
        <div className="crm-muted" style={{ fontSize: 12.5 }}>Ask what is in the house worth its own sale. Skip household goods.</div>
        {FIELDS.map((f) => (
          <label key={f.key} style={{ display: "grid", gap: 4 }}>
            <span className="crm-muted" style={{ fontSize: 12.5 }}>{f.label}</span>
            <input className="crm-input" style={{ width: "100%" }} placeholder={f.hint} value={v[f.key]} maxLength={1000} onChange={(e) => set(f.key, e.target.value)} />
          </label>
        ))}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="crm-muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}>
            Firearms
            <input className="crm-input" style={{ width: 80 }} inputMode="numeric" placeholder="Count" value={v.firearms_count} onChange={(e) => set("firearms_count", e.target.value)} />
          </label>
          <label className="crm-muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}>
            <input type="checkbox" checked={v.firearms_collection} onChange={(e) => set("firearms_collection", e.target.checked)} />
            It is a collection
          </label>
          <label className="crm-muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}>
            Est. value
            <input className="crm-input" style={{ width: 120 }} inputMode="numeric" placeholder="$" value={v.est_value} onChange={(e) => set("est_value", e.target.value)} />
          </label>
          <span style={{ flex: 1 }} />
          {err ? <span style={{ color: "var(--red)", fontSize: 12.5 }}>{err}</span> : saved ? <span className="crm-faint" style={{ fontSize: 12.5 }}>Saved</span> : null}
          <button className="crm-btn primary" type="button" disabled={busy} onClick={save}>{busy ? "Saving" : "Save checklist"}</button>
        </div>
      </div>
    </section>
  )
}
