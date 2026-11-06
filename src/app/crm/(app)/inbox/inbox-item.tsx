"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/admin-lead-types"

const STATUS_TONE: Record<LeadStatus, string> = { new: "accent", contacted: "blue", qualified: "green", listed: "green", closed: "", lost: "" }
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function InboxItem({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(lead.notes)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(patch: Record<string, unknown>) {
    setBusy(true); setErr(null)
    const res = await fetch(`/api/crm/inbox/${lead.kind}/${lead.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok || j.ok === false) { setErr(j.error || "Save failed."); return }
    router.refresh()
  }

  const phone = lead.details.find((d) => /phone/i.test(d.label))?.value
  return (
    <li>
      <div className="row" style={{ cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div className="grow">
          <div className="title">{lead.name || lead.email || "No name"}</div>
          <div className="meta">{lead.summary}</div>
        </div>
        <span className={`pill ${STATUS_TONE[lead.status] ?? ""}`}>{lead.status[0].toUpperCase() + lead.status.slice(1)}</span>
        <span className="crm-faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{when(lead.submittedAt)}</span>
      </div>
      {open ? (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="crm-actions">
            {phone ? <a className="crm-btn primary" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call</a> : null}
            {lead.email ? <a className="crm-btn" href={`mailto:${lead.email}`}>Email</a> : null}
            <select className="crm-select" value={lead.status} disabled={busy} onChange={(e) => save({ status: e.target.value })} aria-label="Status">
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <dl className="crm-props">
            {lead.details.filter((d) => d.value).map((d) => (
              <div key={d.label} style={{ display: "contents" }}><dt>{d.label}</dt><dd>{d.value}</dd></div>
            ))}
          </dl>
          <textarea className="crm-textarea" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="crm-btn" type="button" disabled={busy || notes === lead.notes} onClick={() => save({ notes })}>{busy ? "Saving" : "Save notes"}</button>
            {err ? <span style={{ color: "var(--red)", fontSize: 12.5 }}>{err}</span> : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
