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

  const handleLogin = async () => {
    setError("")

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

      if (!res.ok || !data?.ok || !data?.approved) {
        setError(data?.error || "Unable to verify vault access.")
        return
      }

      router.push("/vault")
      router.refresh()
    } catch {
      setError("Unable to verify vault access.")
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
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
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
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
              Checking current session...
            </div>
          ) : approved ? (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
              <div className="text-sm text-white/68">
                Verified as <span className="text-white">{approvedEmail}</span>
              </div>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/vault"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Continue to Vault
                </Link>
                <Link
                  href="/request-access"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                >
                  Request Access for Another Email
                </Link>
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

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={handleLogin}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Verifying..." : "Enter Vault"}
                </button>

                <Link
                  href="/request-access"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
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
