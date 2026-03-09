'use client'

import { useEffect, useMemo, useState } from "react"

type AccessRequestRecord = {
  requestId: string
  fullName: string
  email: string
  company: string
  role: string
  marketFocus: string
  accessType: string
  executionCapacity: string
  notes: string
  submittedAt: string
  ipAddress: string
  userAgent: string
  status: "pending" | "approved" | "rejected"
}

function statusClasses(status: AccessRequestRecord["status"]) {
  if (status === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
  }

  if (status === "rejected") {
    return "border-red-500/20 bg-red-500/10 text-red-200"
  }

  return "border-white/10 bg-white/5 text-white/65"
}

export default function ApproveAccessPage() {
  const [requests, setRequests] = useState<AccessRequestRecord[]>([])
  const [secret, setSecret] = useState("")
  const [approvedBy, setApprovedBy] = useState("Patrick Armour")
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState("")
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")

  const loadQueue = async (queueSecret?: string) => {
    const secretToUse = (queueSecret ?? secret).trim()

    if (!secretToUse) {
      setError("Approval secret is required.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/access/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ secret: secretToUse }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to load access queue.")
        return
      }

      setRequests(data.requests || [])
    } catch {
      setError("Unable to load access queue.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setRequests([])
    setLoading(false)
  }, [])

  const handleAction = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    setError("")
    setResult("")

    if (!secret.trim()) {
      setError("Approval secret is required.")
      return
    }

    try {
      setProcessingId(requestId)

      const res = await fetch("/api/access/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          approvedBy,
          secret,
          action,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to process request.")
        return
      }

      if (action === "approve") {
        setResult(`Approved ${data.email} | Token: ${data.approvalToken}`)
      } else {
        setResult(`Rejected ${data.email}`)
      }

      await loadQueue(secret)
    } catch {
      setError("Unable to process request.")
    } finally {
      setProcessingId("")
    }
  }

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests
    return requests.filter((r) => r.status === filter)
  }, [requests, filter])

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }
  }, [requests])

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
            Admin Approval Queue
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
                Review vault access requests.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                Approve aligned operators, reject poor fits, and manage access to
                the restricted FALCO vault from one clean internal queue.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Total
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {counts.all}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Pending
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {counts.pending}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Approved
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {counts.approved}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Rejected
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {counts.rejected}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/40 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                Operator Controls
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Approved By
                  </label>
                  <input
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="FALCO Admin"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Approval Secret
                  </label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Admin secret"
                  />
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {result ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80 break-all">
                  {result}
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  onClick={() => loadQueue(secret)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/82 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Load Queue"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {[
            ["pending", `Pending (${counts.pending})`],
            ["approved", `Approved (${counts.approved})`],
            ["rejected", `Rejected (${counts.rejected})`],
            ["all", `All (${counts.all})`],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setFilter(value as "all" | "pending" | "approved" | "rejected")
              }
              className={`rounded-full border px-4 py-2 text-sm transition ${
                filter === value
                  ? "border-white/20 bg-white text-black"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6">
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
              Loading access queue...
            </div>
          ) : !secret.trim() ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
              Enter the approval secret, then load the queue.
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
              No requests in this queue.
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.requestId}
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-3xl font-semibold tracking-[-0.03em] text-white">
                      {request.fullName}
                    </div>
                    <div className="mt-2 text-sm text-white/55">
                      {request.email}
                    </div>
                  </div>

                  <div
                    className={`inline-flex self-start rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${statusClasses(
                      request.status
                    )}`}
                  >
                    {request.status}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Company
                    </div>
                    <div className="mt-2 text-sm text-white/82">
                      {request.company || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Role
                    </div>
                    <div className="mt-2 text-sm text-white/82">
                      {request.role || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Market Focus
                    </div>
                    <div className="mt-2 text-sm text-white/82">
                      {request.marketFocus || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Access Type
                    </div>
                    <div className="mt-2 text-sm text-white/82">
                      {request.accessType || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Execution Capacity
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/76">
                      {request.executionCapacity || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Notes
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/76">
                      {request.notes || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-xs text-white/40 md:grid-cols-3">
                  <div>Request ID: {request.requestId}</div>
                  <div>Submitted: {request.submittedAt}</div>
                  <div>IP: {request.ipAddress}</div>
                </div>

                {request.status === "pending" ? (
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <button
                      onClick={() => handleAction(request.requestId, "approve")}
                      disabled={processingId === request.requestId}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingId === request.requestId ? "Processing..." : "Approve Access"}
                    </button>

                    <button
                      onClick={() => handleAction(request.requestId, "reject")}
                      disabled={processingId === request.requestId}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingId === request.requestId ? "Processing..." : "Reject"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
