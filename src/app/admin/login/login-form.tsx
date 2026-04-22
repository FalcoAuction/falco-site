"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Login failed.")
        return
      }
      router.replace("/admin")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40"
      />
      {error && (
        <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending || !password}
        className="w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-[13px] tracking-wide px-6 py-2.5 transition-colors"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
