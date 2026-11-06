// Estate attorneys: who files the most estates with property in our
// counties (estate_attorneys_daily, rebuilt nightly). A business contact,
// not an owner, so outreach here is data services and allowed now.

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Head, shortDate, titleCase } from "@/app/crm/ui"

export const dynamic = "force-dynamic"

type Attorney = { attorney_name: string; county: string; estates: number; valued_estates: number; office_address: string | null; latest_docket: string | null; last_seen: string | null }

export default async function AttorneysPage() {
  let rows: Attorney[] = []
  let day: string | null = null
  if (supabaseAdmin) {
    const latest = await supabaseAdmin.from("estate_attorneys_daily").select("captured_on").order("captured_on", { ascending: false }).limit(1)
    day = (latest.data?.[0] as { captured_on: string } | undefined)?.captured_on ?? null
    if (day) {
      const r = await supabaseAdmin.from("estate_attorneys_daily").select("attorney_name,county,estates,valued_estates,office_address,latest_docket,last_seen")
        .eq("captured_on", day).order("estates", { ascending: false }).limit(200)
      rows = (r.data ?? []) as Attorney[]
    }
  }
  return (
    <>
      <Head title="Estate attorneys" sub={day ? `Updated ${shortDate(day)}` : undefined} />
      {rows.length === 0 ? <div className="crm-empty">No attorney list yet.</div> : (
        <table className="crm-table">
          <thead><tr><th>Attorney</th><th>County</th><th className="num">Estates</th><th className="num hide-sm">With value</th><th className="hide-sm">Office</th><th className="hide-sm">Last seen</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.attorney_name + a.county} style={{ cursor: "default" }}>
                <td><div className="primary-cell">{titleCase(a.attorney_name)}</div>{a.latest_docket ? <div className="secondary">Latest {a.latest_docket}</div> : null}</td>
                <td className="crm-muted">{titleCase(a.county)}</td>
                <td className="num">{a.estates}</td>
                <td className="num hide-sm crm-muted">{a.valued_estates}</td>
                <td className="hide-sm crm-muted" style={{ maxWidth: 320 }}>{a.office_address}</td>
                <td className="hide-sm crm-faint">{shortDate(a.last_seen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
