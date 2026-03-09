'use client'

import { useState } from "react"

type VaultPursuitRecord = {
  requestId: string
  listingSlug: string
  email: string
  fullName: string
  message: string
  status: "pursuit_requested" | "pursuit_reserved" | "pursuit_declined" | "pursuit_released"
  submittedAt: string
  actedBy: string
}

type VaultRoutingListing = {
  listingSlug: string
  requests: VaultPursuitRecord[]
}

function statusCopy(status: VaultPursuitRecord["status"]) {
  if (status === "pursuit_reserved") return "Reserved"
  if (status === "pursuit_declined") return "Declined"
  if (status === "pursuit_released") return "Released"
  return "Requested"
}

export default function VaultRoutingPage() {
  const [secret, setSecret] = useState("")
  const [actedBy, setActedBy] = useState("Patrick Armour")
  const [listings, setListings] = useState<VaultRoutingListing[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState("")
  const [error, setError] = useState("")

  const loadQueue = async (currentSecret?: string) => {
    const secretToUse = (currentSecret ?? secret).trim()
    if (!secretToUse) {
      setError("Approval secret is required.")
      return
    }

    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/vault/pursuit/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretToUse,
          action: "queue",
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to load routing queue.")
        return
      }

      setListings(data.listings || [])
    } catch {
      setError("Unable to load routing queue.")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    requestId: string,
    action: "reserve" | "decline" | "release"
  ) => {
    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    try {
      setProcessingId(requestId)
      setError("")

      const res = await fetch("/api/vault/pursuit/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          actedBy,
          requestId,
          action,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to update routing state.")
        return
      }

      setListings(data.listings || [])
    } catch {
      setError("Unable to update routing state.")
    } finally {
      setProcessingId("")
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
            Vault Routing
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
            Manage controlled pursuit.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
            Reserve a listing for one partner, decline competing requests, or release a reservation
            back into open routing.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">Acted By</label>
              <input
                value={actedBy}
                onChange={(e) => setActedBy(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Approval Secret</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            <button
              onClick={() => loadQueue(secret)}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/82 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load Routing Queue"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {!secret.trim() ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
              Enter the approval secret, then load the routing queue.
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
              No active pursuit requests.
            </div>
          ) : (
            listings.map((listing) => (
              <div
                key={listing.listingSlug}
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Listing</div>
                <div className="mt-2 text-2xl font-semibold text-white">{listing.listingSlug}</div>

                <div className="mt-6 grid gap-4">
                  {listing.requests.map((request) => (
                    <div
                      key={request.requestId}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-lg font-semibold text-white">{request.fullName || request.email}</div>
                          <div className="mt-1 text-sm text-white/55">{request.email}</div>
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/70">
                          {statusCopy(request.status)}
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-7 text-white/68">
                        {request.message || "No pursuit note provided."}
                      </div>

                      <div className="mt-4 text-xs text-white/40">
                        Submitted: {request.submittedAt}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        {request.status === "pursuit_requested" ? (
                          <>
                            <button
                              onClick={() => handleAction(request.requestId, "reserve")}
                              disabled={processingId === request.requestId}
                              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === request.requestId ? "Processing..." : "Reserve Listing"}
                            </button>

                            <button
                              onClick={() => handleAction(request.requestId, "decline")}
                              disabled={processingId === request.requestId}
                              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === request.requestId ? "Processing..." : "Decline"}
                            </button>
                          </>
                        ) : null}

                        {request.status === "pursuit_reserved" ? (
                          <button
                            onClick={() => handleAction(request.requestId, "release")}
                            disabled={processingId === request.requestId}
                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingId === request.requestId ? "Processing..." : "Release Reservation"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
