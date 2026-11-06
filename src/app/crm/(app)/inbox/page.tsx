// Inbox: people who came to us through the site's forms (homeowner
// requests, buyer signups, partner and general inquiries). Moved here
// from the old /admin lead inbox; status and notes save through
// /api/crm/inbox/[kind]/[id].

import Link from "next/link"
import { fetchAllLeads } from "@/lib/admin-leads"
import type { Lead } from "@/lib/admin-lead-types"
import { Head } from "@/app/crm/ui"
import { InboxItem } from "./inbox-item"

export const dynamic = "force-dynamic"

const TABS = [
  { key: "homeowners", label: "Homeowners" },
  { key: "buyers", label: "Buyers" },
  { key: "partners", label: "Partners" },
  { key: "inquiries", label: "Inquiries" },
] as const
type TabKey = (typeof TABS)[number]["key"]

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string; show?: string }> }) {
  const sp = await searchParams
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "homeowners") as TabKey
  const showClosed = sp.show === "all"
  const bundle = await fetchAllLeads(200)
  const all = bundle[tab] as Lead[]
  const open = all.filter((l) => l.status !== "closed" && l.status !== "lost")
  const rows = showClosed ? all : open
  // Form submissions only; bot pipeline leads live in Leads.
  const fresh = bundle.last24h.homeowners + bundle.last24h.buyers + bundle.last24h.partners + bundle.last24h.inquiries
  return (
    <>
      <Head title="Inbox" sub={fresh ? `${fresh} new in the last 24 hours` : "From the site's forms"}>
        <Link className="crm-btn ghost" href={`/crm/inbox?tab=${tab}${showClosed ? "" : "&show=all"}`}>{showClosed ? "Hide closed" : "Show closed"}</Link>
      </Head>
      <nav className="crm-views" aria-label="Inbox">
        {TABS.map((t) => (
          <Link key={t.key} href={`/crm/inbox?tab=${t.key}`} aria-current={t.key === tab ? "page" : undefined}>
            {t.label}<span className="n">{(bundle[t.key] as Lead[]).filter((l) => l.status !== "closed" && l.status !== "lost").length}</span>
          </Link>
        ))}
      </nav>
      <div className="crm-body crm-narrow">
        {bundle.unavailable ? <div className="crm-error">Database not configured.</div> : null}
        <section className="crm-card">
          {rows.length === 0 ? <div className="crm-empty">Nothing here.</div> : (
            <ul className="crm-list">{rows.map((l) => <InboxItem key={`${l.kind}-${l.id}`} lead={l} />)}</ul>
          )}
        </section>
      </div>
    </>
  )
}
