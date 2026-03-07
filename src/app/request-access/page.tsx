'use client'

import Link from "next/link"
import { useState } from "react"

const accessTypes = [
  "Investor access",
  "Auction partner access",
  "Brokerage / operator access",
  "Strategic partnership inquiry",
]

export default function RequestAccessPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [marketFocus, setMarketFocus] = useState("")
  const [accessType, setAccessType] = useState(accessTypes[0])
  const [executionCapacity, setExecutionCapacity] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [requestId, setRequestId] = useState("")

  const handleSubmit = async () => {
    setError("")
    setSuccess("")

    if (!fullName.trim() || !email.trim() || !role.trim() || !accessType.trim()) {
      setError("Full name, email, role, and access type are required.")
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch("/api/access/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          company,
          role,
          marketFocus,
          accessType,
          executionCapacity,
          notes,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to submit access request.")
        return
      }

      setRequestId(data.requestId || "")
      setSuccess("Access request submitted successfully.")
    } catch {
      setError("Unable to submit access request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_26%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_18%,transparent_80%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>

          <Link
            href="/"
            className="text-sm text-white/65 transition hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Request Access
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
              Apply for restricted FALCO access.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/68 md:text-lg">
              Access is limited to qualified capital, execution partners, and
              aligned operators seeking structured exposure to upstream distress
              opportunity flow.
            </p>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                Approval Flow
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <div>1. Submit your access request.</div>
                <div>2. FALCO reviews your role, capacity, and fit.</div>
                <div>3. Approved users receive access to restricted vault listings.</div>
                <div>4. Individual listings remain gated behind NDA and non-circumvention acceptance.</div>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              {accessTypes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-8">
            <div className="rounded-[24px] border border-white/10 bg-black/70 p-6 md:p-8">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Access Request Form
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                Submit your approval request.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-7 text-white/68">
                Complete the fields below. Approved users are routed into the
                restricted FALCO vault and gated at the listing level by NDA and
                non-circumvention acceptance.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Full Name *</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Email *</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="you@firm.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Company</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Company / firm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Role *</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Investor, auctioneer, broker, operator..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Market Focus</label>
                  <input
                    value={marketFocus}
                    onChange={(e) => setMarketFocus(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Target counties / markets"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Access Type *</label>
                  <select
                    value={accessType}
                    onChange={(e) => setAccessType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  >
                    {accessTypes.map((item) => (
                      <option key={item} value={item} className="bg-black text-white">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Execution Capacity</label>
                  <textarea
                    value={executionCapacity}
                    onChange={(e) => setExecutionCapacity(e.target.value)}
                    className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Describe your buying, auction, brokerage, or operating capacity."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Anything else FALCO should know."
                  />
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                  {success}
                  {requestId ? (
                    <div className="mt-2 text-xs text-white/45">Request ID: {requestId}</div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Access Request"}
                </button>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Partner%20Inquiry"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                >
                  Partner Inquiry
                </a>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Restricted Vault
                </div>

                <p className="mt-4 text-sm leading-7 text-white/68">
                  Vault access is not public-facing. Approved users are routed into
                  restricted listings where address-level details, packets, and deal
                  paths are controlled and gated by agreement acceptance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}