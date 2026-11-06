// /admin/opportunities — launch-ready leads ranked by expected FALCO fee x
// auction fit, plus the estate attorney call list. Both tables are rebuilt
// nightly by refresh_lead_quality (supabase/migrations/20261108_lead_opportunities.sql).

import Link from "next/link"
import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const metadata = { title: "Opportunities · FALCO", robots: "noindex, nofollow" }

type Opp = {
  rank: number; fit_label: string; county: string | null; property_address: string | null; owner_name: string | null
  property_value: number; expected_fee: number; score: number; sale_date: string | null; contact: string | null; bot_source: string
}
type Attorney = { attorney_name: string; county: string; estates: number; valued_estates: number; office_address: string | null; latest_docket: string | null }

const money = (n: number) => "$" + Math.round(Number(n)).toLocaleString("en-US")
const titleCounty = (c: string | null) => (c ? c.replace(/\b[a-z]/g, (m) => m.toUpperCase()) : "")

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ lane?: string; view?: string }> }) {
  if (!(await readAdminSessionFromCookies())) redirect("/admin/login")
  const { lane, view } = await searchParams
  const showAttorneys = view === "attorneys"

  let day: string | null = null
  let opps: Opp[] = []
  let lanes: { label: string; n: number; fee: number }[] = []
  let attorneys: Attorney[] = []
  let failed = !supabaseAdmin
  if (supabaseAdmin) {
    const latest = await supabaseAdmin.from("lead_opportunities").select("captured_on").order("captured_on", { ascending: false }).limit(1)
    failed = !!latest.error
    day = (latest.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
    if (day && !failed) {
      const all = await supabaseAdmin.from("lead_opportunities").select("fit_label,expected_fee").eq("captured_on", day)
      const agg = new Map<string, { n: number; fee: number }>()
      for (const r of (all.data ?? []) as { fit_label: string; expected_fee: number }[]) {
        const a = agg.get(r.fit_label) ?? { n: 0, fee: 0 }
        a.n += 1
        a.fee += Number(r.expected_fee)
        agg.set(r.fit_label, a)
      }
      lanes = [...agg.entries()].map(([label, a]) => ({ label, ...a })).sort((a, b) => b.fee - a.fee)
      let q = supabaseAdmin.from("lead_opportunities")
        .select("rank,fit_label,county,property_address,owner_name,property_value,expected_fee,score,sale_date,contact,bot_source")
        .eq("captured_on", day).order("rank").limit(200)
      if (lane) q = q.eq("fit_label", lane)
      const res = await q
      failed = !!res.error
      opps = (res.data ?? []) as Opp[]
      const att = await supabaseAdmin.from("estate_attorneys_daily").select("attorney_name,county,estates,valued_estates,office_address,latest_docket")
        .eq("captured_on", day).order("estates", { ascending: false }).order("valued_estates", { ascending: false }).limit(100)
      attorneys = (att.data ?? []) as Attorney[]
    }
  }
  const totalFee = lanes.reduce((s, l) => s + l.fee, 0)
  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold ${active ? "bg-emerald-500/20 text-emerald-200" : "text-white/55 hover:text-white"}`

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">FALCO · OPPORTUNITIES</div>
            <h1 className="text-2xl font-bold mt-1 sm:text-3xl">
              Top auction opportunities <span className="text-white/40 font-normal">{day ? `as of ${day}` : ""}</span>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">
              Launch-ready leads only, ranked by expected FALCO fee (value x 10% buyer&apos;s premium x 20% share) times auction fit.
              The top 1,000 carry {money(totalFee)} in expected fees if every one closed. Values are county appraisals, not market value.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/opportunities" className={tab(!showAttorneys)}>Opportunities</Link>
            <Link href="/admin/opportunities?view=attorneys" className={tab(showAttorneys)}>Estate attorneys</Link>
            <Link href="/admin/lead-quality" className={tab(false)}>Lead quality</Link>
          </div>
        </header>

        {failed ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Opportunities could not be loaded. Check the database connection and that the opportunities migration is applied.
          </p>
        ) : showAttorneys ? (
          <section>
            <p className="mb-3 text-sm text-white/50">Attorneys named on probate notices in the 10 focus counties. One attorney who sends estates is worth more than a stack of letters.</p>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-white/45">
                  <tr><th className="px-3 py-2">Attorney</th><th className="px-3 py-2">County</th><th className="px-3 py-2 text-right">Estates</th>
                    <th className="px-3 py-2 text-right">With valued property</th><th className="px-3 py-2">Office</th><th className="px-3 py-2">Latest docket</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attorneys.map((a) => (
                    <tr key={`${a.attorney_name}|${a.county}`}>
                      <td className="px-3 py-2 font-medium">{a.attorney_name}</td>
                      <td className="px-3 py-2 text-white/60">{titleCounty(a.county)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{a.estates}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-white/60">{a.valued_estates}</td>
                      <td className="px-3 py-2 text-xs text-white/60">{a.office_address}</td>
                      <td className="px-3 py-2 text-xs text-white/45">{a.latest_docket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-6 flex flex-wrap gap-2">
              <Link href="/admin/opportunities" className={tab(!lane)}>All lanes</Link>
              {lanes.map((l) => (
                <Link key={l.label} href={`/admin/opportunities?lane=${encodeURIComponent(l.label)}`} className={tab(lane === l.label)}>
                  {l.label} · {l.n} · {money(l.fee)}
                </Link>
              ))}
            </section>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-white/45">
                  <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Lane</th><th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">Expected fee</th><th className="px-3 py-2">Contact</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {opps.map((o) => (
                    <tr key={o.rank}>
                      <td className="px-3 py-2 tabular-nums text-white/45">{o.rank}</td>
                      <td className="px-3 py-2 text-xs">{o.fit_label}{o.sale_date ? <div className="text-white/45">Sale {o.sale_date}</div> : null}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{o.property_address}</div>
                        <div className="text-xs text-white/45">{[o.owner_name, titleCounty(o.county)].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(o.property_value)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{money(o.expected_fee)}</td>
                      <td className="px-3 py-2 text-xs text-white/60">{o.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-white/40">Showing up to 200. Fit weights are a starting judgment, to be tuned once real conversions exist.</p>
          </>
        )}
      </div>
    </main>
  )
}
