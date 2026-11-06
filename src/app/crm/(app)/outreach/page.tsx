// Outreach: campaigns, the gates that hold sending, and the contact list.
// Sending itself goes through POST /api/crm/outreach/send (dry run by
// default). Owner audiences (landlords) stay locked until licensed.

import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { OWNER_AUDIENCES } from "@/lib/outreach"
import { Head, relTime, titleCase } from "@/app/crm/ui"
import { ContactRow, type ContactView } from "./contact-row"

export const dynamic = "force-dynamic"

type Campaign = { id: string; slug: string; name: string; audience_kind: string; channel: string; status: string; requires_license: boolean; daily_cap: number; subject: string | null }
const KINDS = ["bank", "attorney", "auction_firm", "broker", "investor", "landlord"]
const kindLabel = (k: string) => titleCase(k.replace("_", " ")) + "s"

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams
  const kind = KINDS.includes(sp.kind ?? "") ? sp.kind! : "bank"
  const env = process.env
  const gates = [
    { name: "Sending switched on", ok: env.OUTREACH_SEND_ENABLED?.trim() === "1", fix: "OUTREACH_SEND_ENABLED=1 in Vercel" },
    { name: "Postal address for the footer", ok: !!env.FALCO_POSTAL_ADDRESS?.trim(), fix: "FALCO_POSTAL_ADDRESS in Vercel (CAN-SPAM)" },
    { name: "Bounce and complaint webhook", ok: !!env.RESEND_WEBHOOK_SECRET?.trim(), fix: "RESEND_WEBHOOK_SECRET in Vercel" },
    { name: "Licensed for owner outreach", ok: env.FALCO_LICENSED?.trim() === "1", fix: "Locked until your license is active" },
  ]
  let campaigns: Campaign[] = []
  const stats = new Map<string, Record<string, number>>()
  const kindCounts = new Map<string, { total: number; email: number }>()
  let contacts: ContactView[] = []
  let recent: { to_email: string | null; status: string; created_at: string; campaign_id: string }[] = []
  if (supabaseAdmin) {
    const [c, s, all, list, sup, rec] = await Promise.all([
      supabaseAdmin.from("outreach_campaigns").select("id,slug,name,audience_kind,channel,status,requires_license,daily_cap,subject").order("created_at"),
      supabaseAdmin.from("outreach_sends").select("campaign_id,status").limit(50000),
      supabaseAdmin.from("outreach_contacts").select("kind,email").limit(20000),
      supabaseAdmin.from("outreach_contacts").select("id,kind,org_name,person_name,title,email,phone,mail_city,county").eq("kind", kind).order("org_name").limit(300),
      supabaseAdmin.from("outreach_suppressions").select("email").limit(20000),
      supabaseAdmin.from("outreach_sends").select("to_email,status,created_at,campaign_id").order("created_at", { ascending: false }).limit(15),
    ])
    campaigns = (c.data ?? []) as Campaign[]
    for (const r of (s.data ?? []) as { campaign_id: string; status: string }[]) {
      const a = stats.get(r.campaign_id) ?? {}; a[r.status] = (a[r.status] ?? 0) + 1; stats.set(r.campaign_id, a)
    }
    for (const r of (all.data ?? []) as { kind: string; email: string | null }[]) {
      const a = kindCounts.get(r.kind) ?? { total: 0, email: 0 }; a.total++; if (r.email) a.email++; kindCounts.set(r.kind, a)
    }
    const suppressed = new Set(((sup.data ?? []) as { email: string }[]).map((r) => r.email))
    contacts = ((list.data ?? []) as Omit<ContactView, "suppressed">[]).map((r) => ({ ...r, suppressed: !!r.email && suppressed.has(r.email.toLowerCase()) }))
    recent = (rec.data ?? []) as typeof recent
  }
  const nameOf = new Map(campaigns.map((c) => [c.id, c.name]))
  return (
    <>
      <Head title="Campaigns" sub="Business outreach now, owner outreach after licensing" />
      <div className="crm-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="crm-grid two">
          <section className="crm-card">
            <div className="crm-card-head"><h2>Campaigns</h2></div>
            {campaigns.length === 0 ? <div className="crm-empty">No campaigns yet.</div> : (
              <ul className="crm-list">
                {campaigns.map((c) => {
                  const st = stats.get(c.id) ?? {}
                  const locked = c.requires_license || OWNER_AUDIENCES.has(c.audience_kind)
                  return (
                    <li key={c.id}><div className="row">
                      <div className="grow">
                        <div className="title">{c.name}</div>
                        <div className="meta">{titleCase(c.audience_kind.replace("_", " "))} · {c.channel} · up to {c.daily_cap} a day{c.subject ? ` · "${c.subject}"` : ""}</div>
                      </div>
                      <span className="crm-muted" style={{ fontSize: 12.5 }}>{st.sent ?? 0} sent{st.failed ? ` · ${st.failed} failed` : ""}</span>
                      {locked ? <span className="pill amber">Needs license</span> : <span className={`pill ${c.status === "active" ? "green" : ""}`}>{titleCase(c.status)}</span>}
                    </div></li>
                  )
                })}
              </ul>
            )}
          </section>
          <section className="crm-card">
            <div className="crm-card-head"><h2>Before anything sends</h2></div>
            <ul className="crm-list">
              {gates.map((g) => (
                <li key={g.name}><div className="row">
                  <span className={`pill ${g.ok ? "green" : "amber"}`}><span className="dot" />{g.ok ? "Ready" : "Off"}</span>
                  <div className="grow"><div className="title" style={{ fontWeight: 400 }}>{g.name}</div>{g.ok ? null : <div className="meta">{g.fix}</div>}</div>
                </div></li>
              ))}
            </ul>
          </section>
        </div>

        <section className="crm-card">
          <div className="crm-card-head"><h2>Contacts</h2><span className="spacer" /><span className="crm-faint">Click a row to add a name or email</span></div>
          <nav className="crm-views" aria-label="Contact kinds" style={{ position: "static" }}>
            {KINDS.filter((k) => kindCounts.get(k) || k === "bank").map((k) => (
              <Link key={k} href={`/crm/outreach?kind=${k}`} aria-current={k === kind ? "page" : undefined}>
                {kindLabel(k)}<span className="n">{kindCounts.get(k)?.total ?? 0}{kindCounts.get(k)?.total ? ` · ${kindCounts.get(k)?.email ?? 0} with email` : ""}</span>
              </Link>
            ))}
          </nav>
          {contacts.length === 0 ? <div className="crm-empty">No contacts of this kind.</div> : (
            <table className="crm-table">
              <thead><tr><th>Organization</th><th>Decision-maker</th><th className="hide-sm">Email</th><th className="hide-sm">Phone</th></tr></thead>
              <tbody>{contacts.map((c) => <ContactRow key={c.id} c={c} />)}</tbody>
            </table>
          )}
        </section>

        {recent.length ? (
          <section className="crm-card">
            <div className="crm-card-head"><h2>Recent sends</h2></div>
            <ul className="crm-list">
              {recent.map((r, i) => (
                <li key={i}><div className="row">
                  <div className="grow"><div className="title" style={{ fontWeight: 400 }}>{r.to_email ?? "No email"}</div><div className="meta">{nameOf.get(r.campaign_id)}</div></div>
                  <span className={`pill ${r.status === "sent" ? "green" : r.status === "failed" || r.status === "bounced" || r.status === "complained" ? "red" : ""}`}>{titleCase(r.status)}</span>
                  <span className="crm-faint" style={{ fontSize: 12 }}>{relTime(r.created_at)}</span>
                </div></li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}
