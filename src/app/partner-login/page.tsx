"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loadingSession, setLoadingSession] = useState(true)
  const [approved, setApproved] = useState(false)
  const [approvedEmail, setApprovedEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/access/session", { cache: "no-store" })
        const data = await res.json()

        if (res.ok && data?.ok && data?.approved) {
          const currentEmail = String(data.email || "").trim()
          setApproved(true)
          setApprovedEmail(currentEmail)
          setEmail(currentEmail)
        }
      } finally {
        setLoadingSession(false)
      }
    }

    void loadSession()
  }, [])

  useEffect(() => {
    const errorValue = String(new URLSearchParams(window.location.search).get("error") ?? "").trim()
    if (errorValue === "expired-link") {
      setError("That login link has expired. Request a new one below.")
      return
    }
    if (errorValue === "approval-invalid" || errorValue === "missing-link") {
      setError("Unable to verify that login link. Request a new one below.")
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/access/logout", { method: "POST" })
    } finally {
      window.location.reload()
    }
  }

  const handleLogin = async () => {
    setError("")
    setSuccess("")

    if (!email.trim()) {
      setError("Approved email is required.")
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch("/api/access/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to send vault login link.")
        return
      }

      if (data?.approved) {
        router.push("/vault")
        router.refresh()
        return
      }

      if (!data?.sent) {
        setError(data?.error || "Unable to send vault login link.")
        return
      }

      setSuccess(data?.message || "If that email is approved for vault access, a secure login link has been sent.")
    } catch {
      setError("Unable to send vault login link.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>

          <Link href="/request-access" className="text-sm text-white/65 transition hover:text-white">
            Request Access
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
          <div className="falco-accent-pill inline-flex rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em]">
            Partner Login
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
            Enter the restricted vault.
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
            Approved partners can verify their email here and move directly into the
            FALCO review vault. Listing packets remain subject to listing-specific
            NDA and non-circumvention acceptance.
          </p>

          {loadingSession ? (
            <div className="falco-accent-surface mt-8 rounded-xl border px-4 py-3 text-sm">
              Checking current session...
            </div>
          ) : approved ? (
            <div className="mt-8 rounded-[24px] border border-emerald-400/18 bg-emerald-400/[0.06] p-6">
              <div className="text-sm text-white/68">
                Verified as <span className="text-white">{approvedEmail}</span>
              </div>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/vault"
                  className="falco-accent-button inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition"
                >
                  Continue to Vault
                </Link>
                <Link
                  href="/request-access"
                  className="falco-accent-button-secondary inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition"
                >
                  Request Access for Another Email
                </Link>
                <button
                  onClick={handleLogout}
                  className="falco-accent-button-secondary inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Approved Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="you@firm.com"
                  />
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="falco-accent-surface mt-6 rounded-xl border px-4 py-3 text-sm">
                  {success}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={handleLogin}
                  disabled={submitting}
                  className="falco-accent-button inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Email Login Link"}
                </button>

                <Link
                  href="/request-access"
                  className="falco-accent-button-secondary inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition"
                >
                  Request Access
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
