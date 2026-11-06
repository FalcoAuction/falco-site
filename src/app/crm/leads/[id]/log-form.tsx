"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OUTCOME_LABELS, STATUS_LABELS, type DialerOutcome, type DialerStatus } from "@/lib/dialer-types"

const CHANNELS = [
  { key: "call", label: "Call" }, { key: "voicemail", label: "Voicemail" }, { key: "text", label: "Text" },
  { key: "email", label: "Email" }, { key: "door_knock", label: "Door" }, { key: "note", label: "Note" },
] as const
const OUTCOMES_FOR: Record<string, DialerOutcome[]> = {
  call: ["connected", "no_answer", "callback_requested", "booked", "not_interested", "wrong_number", "hung_up", "do_not_call"],
  voicemail: ["voicemail_left"],
  text: ["note_only", "connected", "not_interested", "do_not_call"],
  email: ["note_only", "connected", "not_interested"],
  door_knock: ["connected", "no_answer", "not_interested"],
  note: ["note_only"],
}

export function LogForm({ slug, status }: { slug: string; status: DialerStatus }) {
  const router = useRouter()
  const [channel, setChannel] = useState<string>("call")
  const [outcome, setOutcome] = useState<DialerOutcome>("connected")
  const [notes, setNotes] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function post(body: Record<string, unknown>) {
    setBusy(true); setErr(null)
    try {
      const res = await fetch("/api/crm/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...body }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Save failed.")
      setNotes(""); setFollowUp("")
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.")
    } finally {
      setBusy(false)
    }
  }

  function pickChannel(c: string) {
    setChannel(c)
    setOutcome(OUTCOMES_FOR[c][0])
  }

  return (
    <section className="crm-card">
      <div className="crm-card-head">
        <h2>Log activity</h2>
        <span className="spacer" />
        <label className="crm-muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}>
          Status
          <select className="crm-select" value={status} disabled={busy} onChange={(e) => post({ status: e.target.value })}>
            {(Object.keys(STATUS_LABELS) as DialerStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
      <div className="crm-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div className="crm-seg" role="group" aria-label="Channel">
            {CHANNELS.map((c) => (
              <button key={c.key} type="button" aria-pressed={channel === c.key} onClick={() => pickChannel(c.key)}>{c.label}</button>
            ))}
          </div>
          {OUTCOMES_FOR[channel].length > 1 ? (
            <select className="crm-select" value={outcome} onChange={(e) => setOutcome(e.target.value as DialerOutcome)} aria-label="Outcome">
              {OUTCOMES_FOR[channel].map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
            </select>
          ) : null}
        </div>
        <textarea className="crm-textarea" placeholder="What happened?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="crm-muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}>
            Follow up
            <input className="crm-input" type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </label>
          <span style={{ flex: 1 }} />
          {err ? <span style={{ color: "var(--red)", fontSize: 12.5 }}>{err}</span> : null}
          <button className="crm-btn primary" type="button" disabled={busy || (channel === "note" && !notes.trim())}
            onClick={() => post({ channel, outcome, notes, nextAction: followUp ? (channel === "text" ? "text" : "call") : null,
              nextActionAt: followUp ? new Date(followUp).toISOString() : null })}>
            {busy ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </section>
  )
}
