// Leads: the nightly ranked list (lead_opportunities) as saved views.
// Rank = expected FALCO fee x auction fit. Status comes from the dialer
// workflow, so a lead worked in the dialer shows here too.

import Link from "next/link"
import { listLeads, viewCounts, VIEWS, type ViewKey } from "@/lib/crm-data"
import { Icon } from "../icons"
import { RowLink } from "../row-link"
import { Head, SalePill, StatusPill, compactMoney, money, relTime, shortDate, titleCase } from "../ui"

export const dynamic = "force-dynamic"

const COUNTIES = ["davidson", "rutherford", "williamson", "sumner", "wilson", "montgomery", "maury", "robertson", "dickson", "cheatham", "hamilton", "shelby", "knox"]

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string; county?: string; q?: string }> }) {
  const sp = await searchParams
  const view = (VIEWS.some((v) => v.key === sp.view) ? sp.view : "all") as ViewKey
  const county = sp.county && COUNTIES.includes(sp.county) ? sp.county : undefined
  const q = sp.q?.trim().slice(0, 80) || undefined
  const { day, rows, error } = await listLeads(view, { county, q })
  const counts = await viewCounts(day)
  const href = (v: ViewKey) => `/crm/leads?view=${v}${county ? `&county=${county}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`
  return (
    <>
      <Head title="Leads" sub={day ? `Ranked ${shortDate(day)}` : "No ranking yet"} />
      <nav className="crm-views" aria-label="Saved views">
        {VIEWS.map((v) => (
          <Link key={v.key} href={href(v.key)} aria-current={v.key === view ? "page" : undefined}>
            {v.label}{counts[v.key] != null ? <span className="n">{counts[v.key]}</span> : null}
          </Link>
        ))}
      </nav>
      <form className="crm-toolbar" action="/crm/leads">
        <input type="hidden" name="view" value={view} />
        <div style={{ position: "relative" }}>
          <span className="crm-faint" style={{ position: "absolute", left: 9, top: 8 }}><Icon name="search" size={14} /></span>
          <input className="crm-input" name="q" defaultValue={q} placeholder="Address or owner" style={{ paddingLeft: 30, width: 240 }} />
        </div>
        <select className="crm-select" name="county" defaultValue={county ?? ""}>
          <option value="">All counties</option>
          {COUNTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
        </select>
        <button className="crm-btn" type="submit">Filter</button>
        {(county || q) ? <Link className="crm-btn ghost" href={`/crm/leads?view=${view}`}>Clear</Link> : null}
        <span style={{ flex: 1 }} />
        <span className="crm-faint">{rows.length} shown</span>
      </form>
      {error ? <div className="crm-body"><div className="crm-error">{error}</div></div> : null}
      {rows.length === 0 && !error ? <div className="crm-empty">Nothing in this view.</div> : (
        <table className="crm-table">
          <thead>
            <tr>
              <th>Property</th>
              <th className="hide-sm">Situation</th>
              <th>Status</th>
              <th className="hide-sm">Sale</th>
              <th className="num hide-sm hide-md">Value</th>
              <th className="num">Fee</th>
              <th className="hide-sm hide-md">Last touch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <RowLink key={r.staging_id} href={`/crm/leads/${r.staging_id}`}>
                <td>
                  <div className="primary-cell">{r.property_address}</div>
                  <div className="secondary">{titleCase(r.owner_name) || "Owner unknown"} · {titleCase(r.county)}</div>
                </td>
                <td className="hide-sm"><span className="crm-muted">{r.fit_label}</span></td>
                <td><StatusPill status={r.status} /></td>
                <td className="hide-sm"><SalePill date={r.sale_date} /></td>
                <td className="num hide-sm hide-md crm-muted">{compactMoney(r.property_value)}</td>
                <td className="num">{money(r.expected_fee)}</td>
                <td className="hide-sm hide-md crm-faint">{relTime(r.last_contact_at) || ""}</td>
              </RowLink>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
