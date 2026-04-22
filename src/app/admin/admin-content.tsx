"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Lead, LeadKind, LeadsBundle } from "@/lib/admin-leads"

const TABS: Array<{ key: LeadKind; label: string; emoji: string }> = [
  { key: "homeowner", label: "Homeowners", emoji: "🏠" },
  { key: "buyer", label: "Buyers", emoji: "🆕" },
  { key: "partner", label: "Partners", emoji: "🤝" },
  { key: "inquiry", label: "Inquiries", emoji: "📨" },
]

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const diff = Date.now() - t
  const min = Math.round(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function replySubject(lead: Lead): string {
  switch (lead.kind) {
    case "homeowner":
      return `Re: your FALCO request${lead.summary ? ` — ${lead.summary.split(" · ")[0]}` : ""}`
    case "buyer":
      return "Re: your FALCO buyer registration"
    case "partner":
      return "Re: your FALCO partnership inquiry"
    case "inquiry":
      return "Re: your FALCO inquiry"
  }
}

export default function AdminContent({ bundle }: { bundle: LeadsBundle }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LeadKind>("homeowner")
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const leadsByTab: Record<LeadKind, Lead[]> = {
    homeowner: bundle.homeowners,
    buyer: bundle.buyers,
    partner: bundle.partners,
    inquiry: bundle.inquiries,
  }

  const filtered = useMemo(() => {
    const all = leadsByTab[activeTab]
    if (!query.trim()) return all
    const q = query.toLowerCase()
    return all.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.details.some((d) => d.value.toLowerCase().includes(q))
    )
  }, [activeTab, query, leadsByTab])

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.04),transparent_45%)]" />

      <header className="border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[12px] font-semibold tracking-[0.28em] text-white">FALCO</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">Admin · Lead Inbox</div>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <button
              onClick={() => router.refresh()}
              className="text-white/55 hover:text-white transition-colors"
              title="Pull the latest"
            >
              ↻ Refresh
            </button>
            <button onClick={logout} className="text-white/55 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-6">
        {/* Stats banner */}
        {bundle.unavailable ? (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
            Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Stat label="Total leads" value={bundle.totals.total} accent />
            <Stat label="Last 24h" value={bundle.last24h.total} accent />
            <Stat label="Homeowners" value={bundle.totals.homeowners} sub={bundle.last24h.homeowners} />
            <Stat label="Buyers" value={bundle.totals.buyers} sub={bundle.last24h.buyers} />
            <Stat label="Partners + Inq." value={bundle.totals.partners + bundle.totals.inquiries} sub={bundle.last24h.partners + bundle.last24h.inquiries} />
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
            {TABS.map((t) => {
              const count = leadsByTab[t.key].length
              const isActive = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key)
                    setOpenId(null)
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium tracking-wide transition-colors ${
                    isActive
                      ? "bg-emerald-400 text-black"
                      : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="mr-1.5">{t.emoji}</span>
                  {t.label}
                  <span
                    className={`ml-2 text-[11px] tabular-nums ${
                      isActive ? "text-black/65" : "text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, details…"
            className="md:w-72 rounded-md bg-black/40 border border-white/12 px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-emerald-400/60"
          />
        </div>

        {/* Lead list */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-14 text-center text-[13px] text-white/40">
              No {activeTab === "homeowner" ? "homeowner requests" : `${activeTab}s`} yet
              {query.trim() ? " matching that search" : ""}.
            </div>
          ) : (
            filtered.map((lead, i) => {
              const isOpen = openId === lead.id
              return (
                <div
                  key={lead.id}
                  className={`border-t border-white/[0.06] ${i === 0 ? "border-t-0" : ""}`}
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : lead.id)}
                    className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium text-white truncate">{lead.name || "(no name)"}</div>
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[12px] text-emerald-300/85 hover:text-emerald-200 hover:underline underline-offset-4 truncate"
                          >
                            {lead.email}
                          </a>
                        </div>
                        <div className="mt-1 text-[12px] text-white/55 truncate">{lead.summary}</div>
                      </div>
                      <div className="text-[11px] text-white/40 tabular-nums whitespace-nowrap">
                        {fmtRelative(lead.submittedAt)}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 -mt-1">
                      <div className="rounded-md border border-white/[0.06] bg-white/[0.02]">
                        <table className="w-full text-[13px]">
                          <tbody>
                            {lead.details.map((d) => (
                              <tr
                                key={d.label}
                                className="border-t border-white/[0.04] first:border-t-0"
                              >
                                <td className="px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/45 align-top w-[140px]">
                                  {d.label}
                                </td>
                                <td className="px-4 py-2 text-white/85 whitespace-pre-wrap">
                                  {d.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(replySubject(lead))}`}
                          className="rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold px-3 py-1.5 transition-colors"
                        >
                          Reply
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          className="rounded-md border border-white/15 hover:border-white/30 px-3 py-1.5 text-white/70 hover:text-white transition-colors"
                        >
                          New email
                        </a>
                        <span className="text-[11px] text-white/35 ml-auto">
                          ID: {lead.id.slice(0, 8)} · {new Date(lead.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-[11px] text-white/30 leading-relaxed">
          Sessions expire after 12 hours. Data refreshes on page load and when you click ↻ Refresh.
          Replies open in your default mail client and route through falco@falco.llc.
        </div>
      </section>
    </main>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub?: number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        accent
          ? "border-emerald-400/25 bg-emerald-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-[22px] font-semibold tabular-nums ${accent ? "text-emerald-300" : "text-white"}`}>
          {value}
        </div>
        {sub !== undefined && sub > 0 && (
          <div className="text-[11px] text-emerald-300/85 tabular-nums">+{sub} 24h</div>
        )}
      </div>
    </div>
  )
}
