// Outreach queue: drafts written from lead events (first: new probate
// notices, addressed to the estate's attorney). Review, add missing emails,
// approve, send. Nothing sends until the gates on /crm/outreach are green.

import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Head, money, relTime } from "@/app/crm/ui"
import { DraftCard, type DraftView } from "./draft-card"
import { RunSignals } from "./run-signals"

export const dynamic = "force-dynamic"

const TABS = [
  { key: "draft", label: "Ready to review" },
  { key: "needs_email", label: "Needs an email" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "skipped", label: "Skipped" },
] as const

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams
  const status = TABS.some((t) => t.key === sp.s) ? sp.s! : "draft"
  let drafts: DraftView[] = []
  const counts: Record<string, number> = {}
  const sendOn = process.env.OUTREACH_SEND_ENABLED?.trim() === "1"
  if (supabaseAdmin) {
    const [list, all] = await Promise.all([
      supabaseAdmin.from("outreach_drafts")
        .select("id,signal,staging_id,recipient_name,recipient_firm,recipient_address,to_email,subject,body_text,facts,status,created_at")
        .eq("status", status).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("outreach_drafts").select("status").limit(20000),
    ])
    drafts = (list.data ?? []) as DraftView[]
    for (const r of (all.data ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  const totalValue = drafts.reduce((a, d) => a + (Number(d.facts?.value) || 0), 0)
  return (
    <>
      <Head title="Outreach queue" sub="Drafts written from new estate filings and Chapter 7 cases with real property, addressed to the attorney or trustee">
        <RunSignals />
        <Link className="crm-btn ghost" href="/crm/outreach">Campaigns</Link>
      </Head>
      <div className="crm-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Link key={t.key} href={`/crm/outreach/queue?s=${t.key}`} className={`crm-btn ${t.key === status ? "primary" : "ghost"}`}>
              {t.label} <span className="crm-faint" style={{ marginLeft: 4 }}>{counts[t.key] ?? 0}</span>
            </Link>
          ))}
        </div>
        {!sendOn ? (
          <div className="crm-note">
            Sending is off, so Send shows a preview and the reasons it would be held. Turn it on from Campaigns once the sending domain is warmed up.
          </div>
        ) : null}
        {drafts.length === 0 ? (
          <div className="crm-empty">Nothing here. New estate filings and Chapter 7 cases are drafted every morning, or press Find new.</div>
        ) : (
          <>
            <div className="crm-muted" style={{ fontSize: 13 }}>
              {drafts.length} draft{drafts.length === 1 ? "" : "s"} · {money(totalValue)} in property · newest {relTime(drafts[0].created_at)}
            </div>
            {drafts.map((d) => <DraftCard key={d.id} d={d} />)}
          </>
        )}
      </div>
    </>
  )
}
