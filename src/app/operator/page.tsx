'use client'

import Link from "next/link"
import { useMemo, useState } from "react"

type ReportRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  falco_score_internal?: number | null
  auction_readiness?: string | null
  equity_band?: string | null
  dts_days?: number | null
  uw_ready?: number
  latest_packet_at?: string | null
  created_at?: string | null
  run_id?: string
  bytes?: number
  vaultLive: boolean
  vaultSlug: string | null
}

type OperatorReport = {
  generatedAt: string
  dbPath: string
  sourceMode: "full" | "site_fallback"
  sourceNote: string
  overview: {
    totalLeads: number
    greenReady: number
    uwReady: number
    packeted: number
    contactReady: number
    vaultLive: number
    pendingApprovals: number
  }
  recentLeads: ReportRow[]
  topCandidates: ReportRow[]
  recentPackets: ReportRow[]
}

function badgeClasses(value?: string | null) {
  if ((value || "").toUpperCase() === "GREEN") {
    return "border-white/18 bg-white text-black"
  }

  if ((value || "").toUpperCase() === "YELLOW") {
    return "border-white/14 bg-white/10 text-white/82"
  }

  return "border-white/10 bg-white/[0.05] text-white/65"
}

function liveClasses(isLive: boolean) {
  return isLive
    ? "border-white/18 bg-white text-black"
    : "border-white/10 bg-white/[0.05] text-white/60"
}

export default function OperatorPage() {
  const [secret, setSecret] = useState("")
  const [report, setReport] = useState<OperatorReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cards = useMemo(() => {
    if (!report) return []
    return [
      ["Tracked Leads", report.overview.totalLeads],
      ["Green Ready", report.overview.greenReady],
      ["Underwritten", report.overview.uwReady],
      ["Packeted", report.overview.packeted],
      ["Contact Ready", report.overview.contactReady],
      ["Vault Live", report.overview.vaultLive],
      ["Pending Approvals", report.overview.pendingApprovals],
    ]
  }, [report])

  async function loadReport() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/operator/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to load operator report.")
        return
      }

      setReport(data.report)
    } catch {
      setError("Unable to load operator report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
            Operator Console
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
                See what the bots are finding.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                This internal page shows upstream lead activity, top green candidates,
                packet generation, and live vault status in one operator-facing view.
              </p>

              {report ? (
                <div className="mt-6 text-sm text-white/45">
                  Generated: {report.generatedAt}
                  <br />
                  Source DB: {report.dbPath}
                  <br />
                  Mode: {report.sourceMode === "full" ? "Full upstream + vault" : "Site fallback"}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/40 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                Operator Access
              </div>

              <div className="mt-5 grid gap-4">
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

              <div className="mt-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={loadReport}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Loading..." : "Load Operator Report"}
                  </button>
                  <Link
                    href="/outreach"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                  >
                    Outreach Queue
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {report ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white/68">
              {report.sourceNote}
            </div>

            <div className="mt-8 grid gap-8">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Top Candidates
                </div>
                <div className="mt-6 grid gap-4">
                  {report.topCandidates.map((row) => (
                    <div
                      key={row.lead_key}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold tracking-[-0.03em] text-white">
                            {row.address || row.lead_key}
                          </div>
                          <div className="mt-2 text-sm text-white/55">
                            {row.county || "Unknown county"} • {row.distress_type || "Unknown type"}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                          <span className={`rounded-full border px-3 py-1 ${badgeClasses(row.auction_readiness)}`}>
                            {row.auction_readiness || "Unknown"}
                          </span>
                          <span className={`rounded-full border px-3 py-1 ${liveClasses(row.vaultLive)}`}>
                            {row.vaultLive ? "Vault Live" : "Not Live"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-5">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Score</div>
                          <div className="mt-2 text-sm text-white/82">{row.falco_score_internal ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Equity</div>
                          <div className="mt-2 text-sm text-white/82">{row.equity_band || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Days to Sale</div>
                          <div className="mt-2 text-sm text-white/82">{row.dts_days ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">UW</div>
                          <div className="mt-2 text-sm text-white/82">{row.uw_ready ? "READY" : "PENDING"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Vault Slug</div>
                          <div className="mt-2 break-all text-sm text-white/82">{row.vaultSlug || "—"}</div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {row.vaultSlug ? (
                          <>
                            <Link
                              href={`/vault/${row.vaultSlug}`}
                              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                            >
                              Open Listing
                            </Link>
                            <Link
                              href={`/api/vault/packet?slug=${row.vaultSlug}`}
                              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                            >
                              Open Packet
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Recent Packets
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm text-white/76">
                    <thead className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <tr>
                        <th className="pb-3">Lead</th>
                        <th className="pb-3">County</th>
                        <th className="pb-3">Readiness</th>
                        <th className="pb-3">DTS</th>
                        <th className="pb-3">Run</th>
                        <th className="pb-3">Created</th>
                        <th className="pb-3">Vault</th>
                        <th className="pb-3">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.recentPackets.map((row) => (
                        <tr key={`${row.lead_key}-${row.run_id}`} className="border-t border-white/8">
                          <td className="py-3">{row.address || row.lead_key}</td>
                          <td className="py-3">{row.county || "—"}</td>
                          <td className="py-3">{row.auction_readiness || "—"}</td>
                          <td className="py-3">{row.dts_days ?? "—"}</td>
                          <td className="py-3">{row.run_id || "—"}</td>
                          <td className="py-3">{row.created_at || "—"}</td>
                          <td className="py-3">{row.vaultLive ? "LIVE" : "NOT LIVE"}</td>
                          <td className="py-3">
                            {row.vaultSlug ? (
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/vault/${row.vaultSlug}`}
                                  className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                                >
                                  Listing
                                </Link>
                                <Link
                                  href={`/api/vault/packet?slug=${row.vaultSlug}`}
                                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                                >
                                  Packet
                                </Link>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Recent Leads
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm text-white/76">
                    <thead className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <tr>
                        <th className="pb-3">Lead</th>
                        <th className="pb-3">County</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Readiness</th>
                        <th className="pb-3">DTS</th>
                        <th className="pb-3">Vault</th>
                        <th className="pb-3">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.recentLeads.map((row) => (
                        <tr key={row.lead_key} className="border-t border-white/8">
                          <td className="py-3">{row.address || row.lead_key}</td>
                          <td className="py-3">{row.county || "—"}</td>
                          <td className="py-3">{row.distress_type || "—"}</td>
                          <td className="py-3">{row.falco_score_internal ?? "—"}</td>
                          <td className="py-3">{row.auction_readiness || "—"}</td>
                          <td className="py-3">{row.dts_days ?? "—"}</td>
                          <td className="py-3">{row.vaultLive ? "LIVE" : "NOT LIVE"}</td>
                          <td className="py-3">
                            {row.vaultSlug ? (
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/vault/${row.vaultSlug}`}
                                  className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                                >
                                  Listing
                                </Link>
                                <Link
                                  href={`/api/vault/packet?slug=${row.vaultSlug}`}
                                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
                                >
                                  Packet
                                </Link>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}
