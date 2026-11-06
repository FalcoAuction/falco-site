"use client"

import { useState } from "react"

export function LoginForm({ dest }: { dest: string }) {
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const res = await fetch("/api/crm/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j.error || "Sign-in failed.")
      window.location.href = dest
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="crm-section-label" htmlFor="crm-password" style={{ display: "block" }}>Password</label>
      <input id="crm-password" className="crm-input" type="password" autoComplete="current-password" autoFocus
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {err ? <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{err}</div> : null}
      <button className="crm-btn primary" type="submit" disabled={busy || !password}>{busy ? "Signing in" : "Sign in"}</button>
    </form>
  )
}
