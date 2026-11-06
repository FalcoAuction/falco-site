// /admin/outreach: contacts, campaigns, suppressions and the send log
// (supabase/migrations/20261112_outreach.sql). Sending happens through
// POST /api/admin/outreach/send; this page shows what is ready and what
// is blocked.

import Link from "next/link"
import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { OWNER_AUDIENCES } from "@/lib/outreach"

export const dynamic = "force-dynamic"
export const metadata = { title: "Outreach · FALCO", robots: "noindex, nofollow" }

type Campaign = {
  id: string; slug: string; name: string; audience_kind: string; channel: string; status: string
  requires_license: boolean; daily_cap: number; subject: string | null
}
type Send = { campaign_id: string; to_email: string | null; status: string; error: string | null; created_at: string }

const KINDS = ["bank", "attorney", "auction_firm", "broker", "investor", "landlord", "other"]
const label = (k: string) => k.replace("_", " ")

export default async function OutreachPage() {
  if (!(await readAdminSessionFromCookies())) redirect("/admin/login")
  const env = process.env
  const gates = [
    { name: "Sending enabled (OUTREACH_SEND_ENABLED=1)", ok: env.OUTREACH_SEND_ENABLED?.trim() === "1" },
    { name: "Postal address in footer (FALCO_POSTAL_ADDRESS)", ok: !!env.FALCO_POSTAL_ADDRESS?.trim() },
    { name: "Unsubscribe signing secret", ok: !!(env.OUTREACH_UNSUBSCRIBE_SECRET?.trim() || env.FALCO_APPROVAL_SECRET?.trim()) },
    { name: "Bounce/complaint webhook secret (RESEND_WEBHOOK_SECRET)", ok: !!env.RESEND_WEBHOOK_SECRET?.trim() },
    { name: "Licensed for owner outreach (FALCO_LICENSED=1)", ok: env.FALCO_LICENSED?.trim() === "1" },
  ]

  let failed = !supabaseAdmin
  let campaigns: Campaign[] = []
  let sends: Send[] = []
  let suppressions = 0
  const byKind = new Map<string, { total: number; email: number }>()
  const perCampaign = new Map<string, Record<string, number>>()
  if (supabaseAdmin) {
    const [c, s, sup, contacts, allSends] = await Promise.all([
      supabaseAdmin.from("outreach_campaigns").select("id,slug,name,audience_kind,channel,status,requires_license,daily_cap,subject").order("created_at"),
      supabaseAdmin.from("outreach_sends").select("campaign_id,to_email,status,error,created_at").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("outreach_suppressions").select("email", { count: "exact", head: true }),
      supabaseAdmin.from("outreach_contacts").select("kind,email").limit(20000),
      supabaseAdmin.from("outreach_sends").select("campaign_id,status").limit(50000),
    ])
    failed = !!(c.error || s.error || contacts.error)
    campaigns = (c.data ?? []) as Campaign[]
    sends = (s.data ?? []) as Send[]
    suppressions = sup.count ?? 0
    for (const r of (contacts.data ?? []) as { kind: string; email: string | null }[]) {
      const a = byKind.get(r.kind) ?? { total: 0, email: 0 }
      a.total += 1
      if (r.email) a.email += 1
      byKind.set(r.kind, a)
    }
    for (const r of (allSends.data ?? []) as { campaign_id: string; status: string }[]) {
      const a = perCampaign.get(r.campaign_id) ?? {}
      a[r.status] = (a[r.status] ?? 0) + 1
      perCampaign.set(r.campaign_id, a)
    }
  }
  const slugOf = new Map(campaigns.map((c) => [c.id, c.slug]))

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">FALCO · OUTREACH</div>
            <h1 className="text-2xl font-bold mt-1 sm:text-3xl">Outreach</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">
              One contact list and one unsubscribe list for every campaign. Business outreach (banks, attorneys, auction firms) offers
              data services. Owner outreach (landlords) asks people to sell, which is listing solicitation and stays locked until licensed.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/admin/opportunities" className="rounded-md px-3 py-1.5 font-semibold text-white/55 hover:text-white">Opportunities</Link>
            <Link href="/admin/lead-quality" className="rounded-md px-3 py-1.5 font-semibold text-white/55 hover:text-white">Lead quality</Link>
          </div>
        </header>

        {failed ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Outreach could not be loaded. Check the database connection and that the outreach migration is applied.
          </p>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Send gates</h2>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {gates.map((g) => (
                  <li key={g.name} className={g.ok ? "text-emerald-300" : "text-amber-300"}>{g.ok ? "Ready" : "Not set"} · {g.name}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">
                Contacts <span className="font-normal normal-case text-white/40">· {suppressions} unsubscribed or bounced</span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {KINDS.map((k) => {
                  const a = byKind.get(k) ?? { total: 0, email: 0 }
                  return (
                    <div key={k} className="rounded-lg border border-white/10 px-4 py-3">
                      <div className="text-xs capitalize text-white/50">{label(k)}</div>
                      <div className="text-xl font-bold">{a.total.toLocaleString("en-US")}</div>
                      <div className="text-xs text-white/40">{a.email.toLocaleString("en-US")} with email</div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Campaigns</h2>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
                    <tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Audience</th><th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Cap/day</th><th className="px-3 py-2">Sent</th><th className="px-3 py-2">Failed</th>
                      <th className="px-3 py-2">Suppressed</th><th className="px-3 py-2">Bounced / complaints</th></tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr><td colSpan={8} className="px-3 py-4 text-white/40">No campaigns yet.</td></tr>
                    ) : campaigns.map((c) => {
                      const n = perCampaign.get(c.id) ?? {}
                      const locked = c.requires_license || OWNER_AUDIENCES.has(c.audience_kind)
                      return (
                        <tr key={c.id} className="border-t border-white/5">
                          <td className="px-3 py-2"><div className="font-semibold">{c.name}</div><div className="text-xs text-white/40">{c.slug} · {c.subject}</div></td>
                          <td className="px-3 py-2 capitalize">{label(c.audience_kind)} · {c.channel}{locked ? <span className="ml-1 text-xs text-amber-300">needs license</span> : null}</td>
                          <td className="px-3 py-2">{c.status}</td>
                          <td className="px-3 py-2">{c.daily_cap}</td>
                          <td className="px-3 py-2">{n.sent ?? 0}</td>
                          <td className="px-3 py-2">{n.failed ?? 0}</td>
                          <td className="px-3 py-2">{n.suppressed ?? 0}</td>
                          <td className="px-3 py-2">{(n.bounced ?? 0) + (n.complained ?? 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Last 50 sends</h2>
              {sends.length === 0 ? <p className="text-sm text-white/40">Nothing sent yet.</p> : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
                      <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Status</th></tr>
                    </thead>
                    <tbody>
                      {sends.map((s, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="px-3 py-2 text-white/60">{s.created_at.slice(0, 16).replace("T", " ")}</td>
                          <td className="px-3 py-2">{slugOf.get(s.campaign_id) ?? ""}</td>
                          <td className="px-3 py-2">{s.to_email}</td>
                          <td className="px-3 py-2">{s.status}{s.error ? <span className="ml-1 text-xs text-red-300">{s.error}</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
