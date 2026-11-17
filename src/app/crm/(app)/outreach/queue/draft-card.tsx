"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export type DraftView = {
  id: string; signal: string; staging_id: string; recipient_name: string; recipient_firm: string | null
  recipient_address: string | null; to_email: string | null; subject: string; body_text: string
  facts: { decedent?: string; county?: string; docket?: string; address?: string; value?: number } | null
  status: string; created_at: string
}

const money = (n?: number) => (n ? "$" + Math.round(n).toLocaleString("en-US") : "")

export function DraftCard({ d }: { d: DraftView }) {
  const router = useRouter()
  const [subject, setSubject] = useState(d.subject)
  const [bodyText, setBodyText] = useState(d.body_text)
  const [email, setEmail] = useState(d.to_email ?? "")
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const dirty = subject !== d.subject || bodyText !== d.body_text
  const locked = d.status === "sent"

  async function patch(extra: Record<string, unknown>, label: string) {
    setBusy(label); setNote(null)
    const res = await fetch(`/api/crm/outreach/drafts/${d.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(dirty ? { subject, body_text: bodyText } : {}), ...extra }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setNote({ ok: false, text: j.error || "Save failed." }); return }
    router.refresh()
  }

  async function send() {
    setBusy("send"); setNote(null)
    if (dirty) await patch({}, "send")
    const res = await fetch(`/api/crm/outreach/drafts/${d.id}/send`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dry_run: false }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (j.sent) { router.refresh(); return }
    setNote({ ok: false, text: (j.reasons?.length ? j.reasons.join(" ") : j.error) || "Not sent." })
  }

  const f = d.facts ?? {}
  return (
    <section className="crm-card">
      <div className="crm-card-head" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>{d.recipient_name}{d.recipient_firm ? <span className="crm-faint"> · {d.recipient_firm}</span> : null}</h2>
          <div className="crm-muted" style={{ fontSize: 12.5 }}>
            Estate of {f.decedent} · {f.county ? `${f.county[0].toUpperCase()}${f.county.slice(1)} County` : ""}{f.docket ? ` ${f.docket}` : ""} · {f.address} · {money(f.value)}
          </div>
          {d.recipient_address ? <div className="crm-faint" style={{ fontSize: 12 }}>Office on the notice: {d.recipient_address}</div> : null}
        </div>
        <Link className="crm-btn ghost" href={`/crm/leads/${d.staging_id}`}>Lead</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="crm-faint" style={{ width: 52, fontSize: 12.5 }}>To</span>
          <input className="crm-input" style={{ width: 280 }} placeholder="attorney@firm.com" value={email} disabled={locked}
            onChange={(e) => setEmail(e.target.value)} />
          {email.trim() && email.trim().toLowerCase() !== (d.to_email ?? "") ? (
            <button className="crm-btn" type="button" disabled={!!busy} onClick={() => patch({ to_email: email }, "email")}>
              {busy === "email" ? "Saving" : "Save email"}
            </button>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="crm-faint" style={{ width: 52, fontSize: 12.5 }}>Subject</span>
          <input className="crm-input" style={{ flex: 1 }} value={subject} disabled={locked} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <textarea className="crm-input" rows={13} value={bodyText} disabled={locked} onChange={(e) => setBodyText(e.target.value)}
          style={{ fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", height: "auto", minHeight: 260, padding: 10 }} />
        {!locked ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {d.status !== "approved" ? (
              <button className="crm-btn primary" type="button" disabled={!!busy || !(d.to_email || email.trim())}
                onClick={() => patch({ status: "approved", ...(email.trim() && email.trim().toLowerCase() !== (d.to_email ?? "") ? { to_email: email } : {}) }, "approve")}>
                {busy === "approve" ? "Approving" : "Approve"}
              </button>
            ) : (
              <button className="crm-btn primary" type="button" disabled={!!busy} onClick={send}>{busy === "send" ? "Sending" : "Send"}</button>
            )}
            {dirty ? <button className="crm-btn" type="button" disabled={!!busy} onClick={() => patch({}, "save")}>{busy === "save" ? "Saving" : "Save edits"}</button> : null}
            {d.status !== "skipped" ? (
              <button className="crm-btn ghost" type="button" disabled={!!busy} onClick={() => patch({ status: "skipped" }, "skip")}>Skip</button>
            ) : (
              <button className="crm-btn ghost" type="button" disabled={!!busy} onClick={() => patch({ status: "draft" }, "restore")}>Restore</button>
            )}
            {note ? <span style={{ fontSize: 12.5, color: note.ok ? "var(--green)" : "var(--red)" }}>{note.text}</span> : null}
          </div>
        ) : <div className="crm-faint" style={{ fontSize: 12.5 }}>Sent.</div>}
      </div>
    </section>
  )
}
