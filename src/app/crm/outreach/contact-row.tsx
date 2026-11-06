"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export type ContactView = {
  id: string; kind: string; org_name: string | null; person_name: string | null; title: string | null
  email: string | null; phone: string | null; mail_city: string | null; county: string | null; suppressed: boolean
}

export function ContactRow({ c }: { c: ContactView }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ person_name: c.person_name ?? "", title: c.title ?? "", email: c.email ?? "", phone: c.phone ?? "" })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true); setErr(null)
    const res = await fetch("/api/crm/contact", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, ...form }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(j.error || "Save failed."); return }
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <tr style={{ cursor: "default" }}>
        <td colSpan={4}>
          <div className="primary-cell" style={{ marginBottom: 8 }}>{c.org_name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["person_name", "title", "email", "phone"] as const).map((k) => (
              <input key={k} className="crm-input" placeholder={{ person_name: "Name", title: "Title", email: "Email", phone: "Phone" }[k]}
                value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: k === "email" ? 220 : 160 }} />
            ))}
            <button className="crm-btn primary" type="button" disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
            <button className="crm-btn ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            {err ? <span style={{ color: "var(--red)", fontSize: 12.5, alignSelf: "center" }}>{err}</span> : null}
          </div>
        </td>
      </tr>
    )
  }
  return (
    <tr onClick={() => setEditing(true)} title="Click to edit">
      <td>
        <div className="primary-cell">{c.org_name ?? c.person_name ?? "Unnamed"}</div>
        <div className="secondary">{[c.mail_city, c.county].filter(Boolean).join(" · ")}</div>
      </td>
      <td>{c.person_name ? <>{c.person_name}{c.title ? <div className="secondary">{c.title}</div> : null}</> : <span className="crm-faint">Add decision-maker</span>}</td>
      <td className="hide-sm">{c.email ? <span>{c.email}{c.suppressed ? <span className="pill red" style={{ marginLeft: 6 }}>Unsubscribed</span> : null}</span> : <span className="crm-faint">No email</span>}</td>
      <td className="hide-sm crm-muted">{c.phone}</td>
    </tr>
  )
}
