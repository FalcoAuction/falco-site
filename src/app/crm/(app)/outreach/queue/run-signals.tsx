"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function RunSignals() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  async function run() {
    setBusy(true); setMsg(null)
    const res = await fetch("/api/cron/outreach-signals", { method: "POST" })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? `${j.created} new draft${j.created === 1 ? "" : "s"}` : j.error || "Failed")
    router.refresh()
  }
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {msg ? <span className="crm-faint" style={{ fontSize: 12.5 }}>{msg}</span> : null}
      <button className="crm-btn" type="button" disabled={busy} onClick={run}>{busy ? "Finding" : "Find new"}</button>
    </span>
  )
}
