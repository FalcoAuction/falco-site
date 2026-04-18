"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string
  initialError: string | null
}) {
  const router = useRouter()
  const [callerName, setCallerName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(initialError)
  const [pending, start] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await fetch("/api/dialer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller: callerName, email, password }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok) {
        // First-time sign-in routes to the agreement page; subsequent logins
        // go straight through to the redirect target (or /dialer).
        const next: string = body?.requiresAgreement
          ? `/dialer/agreement?next=${encodeURIComponent(redirectTo || "/dialer")}`
          : (redirectTo || "/dialer")
        router.push(next)
        router.refresh()
        return
      }
      setError(body?.error ?? "Login failed.")
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]"
    >
      <label className="block text-xs uppercase tracking-wider text-white/55 mb-2">
        Your name
      </label>
      <input
        type="text"
        autoComplete="name"
        autoFocus
        required
        value={callerName}
        onChange={(e) => setCallerName(e.target.value)}
        className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40"
        placeholder="First name"
      />
      <label className="block text-xs uppercase tracking-wider text-white/55 mt-4 mb-2">
        Email
      </label>
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40"
        placeholder="you@example.com"
      />
      <p className="mt-1 text-[10px] text-white/35">
        Used for the one-time NDA on first login.
      </p>
      <label className="block text-xs uppercase tracking-wider text-white/55 mt-4 mb-2">
        Dialer password
      </label>
      <input
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40"
        placeholder="••••••••"
      />
      {error && (
        <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm py-2.5 transition-colors"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="mt-4 text-[11px] text-white/40 text-center">
        Caller-only access. For operator login, use{" "}
        <a href="/operator" className="text-emerald-400 hover:underline">
          /operator
        </a>
        .
      </p>
    </form>
  )
}
