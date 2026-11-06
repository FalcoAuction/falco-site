// Today: what needs action now (Close's inbox idea). Callbacks due, sales
// closing in, recent activity, and the health of the data behind it.

import Link from "next/link"
import { getToday } from "@/lib/crm-data"
import { CHANNEL_LABELS, OUTCOME_LABELS, NEXT_ACTION_LABELS, type DialerNextAction } from "@/lib/dialer-types"
import { Icon } from "@/app/crm/icons"
import { Head, SalePill, StatusPill, compactMoney, relTime, shortDate, titleCase } from "@/app/crm/ui"

export const dynamic = "force-dynamic"

export default async function TodayPage() {
  const t = await getToday()
  const readyPct = t.quality.total ? Math.round((t.quality.ready / t.quality.total) * 100) : 0
  const greeting = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  return (
    <>
      <Head title="Today" sub={greeting}>
        <Link className="crm-btn primary" href="/crm/leads?view=soon">Work sales in 14 days</Link>
      </Head>
      <div className="crm-body crm-narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="crm-grid stats">
          <Stat label="Follow-ups due" value={t.due.length} hint={t.due.length ? "callbacks and next actions" : "nothing due"} />
          <Stat label="Sales in 14 days" value={t.sales.length} hint="ranked leads with a sale date" />
          <Stat label="In progress" value={t.counts.working} hint="leads with an open workflow" />
          <Stat label="Launch-ready" value={t.quality.ready.toLocaleString("en-US")} hint={`${readyPct}% of ${t.quality.total.toLocaleString("en-US")} staged`} />
        </div>

        <div className="crm-grid two">
          <section className="crm-card">
            <div className="crm-card-head"><h2>Follow-ups due</h2><span className="spacer" /><span className="crm-faint">{t.due.length}</span></div>
            {t.due.length === 0 ? <div className="crm-empty">No callbacks due. Start on the sales closing in.</div> : (
              <ul className="crm-list">
                {t.due.map((d) => (
                  <li key={d.slug}>
                    <Link href={d.staging_id ? `/crm/leads/${d.staging_id}` : `/crm/l/${d.slug}`}>
                      <div className="grow">
                        <div className="title">{d.address ?? d.slug}</div>
                        <div className="meta">{NEXT_ACTION_LABELS[d.next_action as DialerNextAction] ?? d.next_action}{d.summary_notes ? ` · ${d.summary_notes}` : ""}</div>
                      </div>
                      <StatusPill status={d.status} />
                      <span className="crm-faint" style={{ fontSize: 12 }}>{shortDate(d.next_action_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="crm-card">
            <div className="crm-card-head"><h2>Sales closing in</h2><span className="spacer" /><Link className="crm-btn ghost" href="/crm/leads?view=soon">All</Link></div>
            {t.sales.length === 0 ? <div className="crm-empty">No ranked lead has a sale in the next 14 days.</div> : (
              <ul className="crm-list">
                {t.sales.map((s) => (
                  <li key={s.staging_id}>
                    <Link href={`/crm/leads/${s.staging_id}`}>
                      <div className="grow">
                        <div className="title">{s.property_address}</div>
                        <div className="meta">{titleCase(s.owner_name)} · {titleCase(s.county)} · {s.fit_label}</div>
                      </div>
                      <span className="crm-muted" style={{ fontSize: 12.5 }}>{compactMoney(s.property_value)}</span>
                      <SalePill date={s.sale_date} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="crm-grid two">
          <section className="crm-card">
            <div className="crm-card-head"><h2>Recent activity</h2></div>
            {t.recent.length === 0 ? <div className="crm-empty">No calls or notes logged yet.</div> : (
              <ul className="crm-list">
                {t.recent.map((a) => (
                  <li key={a.id}>
                    <Link href={a.staging_id ? `/crm/leads/${a.staging_id}` : `/crm/l/${a.listingSlug}`}>
                      <span className="crm-muted"><Icon name={a.channel === "call" || a.channel === "voicemail" ? "calls" : a.channel === "text" ? "text" : a.channel === "email" ? "mail" : "note"} size={15} /></span>
                      <div className="grow">
                        <div className="title">{CHANNEL_LABELS[a.channel] ?? a.channel}: {OUTCOME_LABELS[a.outcome] ?? a.outcome}</div>
                        <div className="meta">{a.address ?? a.listingSlug}{a.notes ? ` · ${a.notes}` : ""}</div>
                      </div>
                      <span className="crm-faint" style={{ fontSize: 12 }}>{relTime(a.occurredAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="crm-card">
            <div className="crm-card-head"><h2>Pipeline</h2></div>
            <ul className="crm-list">
              <Row href="/crm/leads" label="Ranked leads" value={t.counts.leads.toLocaleString("en-US")} />
              <Row href="/crm/landlords" label="Landlord portfolios" value={t.counts.landlords.toLocaleString("en-US")} />
              <Row href="/crm/outreach" label="Outreach contacts" value={t.outreach.contacts.toLocaleString("en-US")} />
              <Row href="/crm/outreach" label="Emails sent today" value={String(t.outreach.sentToday)} />
              <Row href="/crm/health" label="Data snapshot" value={t.quality.day ? shortDate(t.quality.day) : "none"} />
            </ul>
          </section>
        </div>
        <p className="crm-faint" style={{ margin: 0 }}>Expected fee is property value x 10% buyer premium x FALCO&apos;s 20% share.</p>
      </div>
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="crm-card crm-stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

function Row({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <li><Link href={href}><div className="grow"><div className="title" style={{ fontWeight: 400 }}>{label}</div></div><span className="crm-muted">{value}</span></Link></li>
  )
}
