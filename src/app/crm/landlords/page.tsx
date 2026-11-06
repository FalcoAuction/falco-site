// Landlords: owners with 2 to 40 rentals and a distress signal, or aging
// out-of-state owners (landlord_portfolios, rebuilt by the bots nightly).
// Contacting them to sell is listing solicitation, so this is research
// until licensed; outreach to them stays locked in Campaigns.

import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Head, compactMoney, money, titleCase } from "../ui"

export const dynamic = "force-dynamic"

type Portfolio = {
  owner_name: string; county: string; residential_count: number; residential_value: number; owned_since: string | null
  owner_mailing: string | null; out_of_area: boolean; is_company: boolean; tired_score: number; expected_fee: number
  signals: Record<string, number> | null; passive: boolean
  parcels: { address: string | null; value: number | null; land_use: string | null }[]
}
const SIGNAL: Record<string, string> = { probate: "Owner died", foreclosure: "Foreclosure", court_sale: "Court sale", tax: "Tax", bankruptcy: "Bankruptcy", code_housing: "Housing code" }
const COUNTIES = ["davidson", "rutherford", "montgomery", "wilson", "williamson", "maury", "robertson", "cheatham"]

export default async function LandlordsPage({ searchParams }: { searchParams: Promise<{ county?: string; kind?: string }> }) {
  const sp = await searchParams
  const county = sp.county && COUNTIES.includes(sp.county) ? sp.county : null
  const kind = sp.kind === "passive" || sp.kind === "signals" ? sp.kind : null
  let rows: Portfolio[] = []
  const counts = new Map<string, number>()
  if (supabaseAdmin) {
    let q = supabaseAdmin.from("landlord_portfolios")
      .select("owner_name,county,residential_count,residential_value,owned_since,owner_mailing,out_of_area,is_company,tired_score,expected_fee,signals,passive,parcels")
      .order("tired_score", { ascending: false }).limit(150)
    if (county) q = q.eq("county", county)
    if (kind) q = q.eq("passive", kind === "passive")
    const [r, all] = await Promise.all([q, supabaseAdmin.from("landlord_portfolios").select("county").limit(20000)])
    rows = (r.data ?? []) as Portfolio[]
    for (const x of (all.data ?? []) as { county: string }[]) counts.set(x.county, (counts.get(x.county) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const href = (c: string | null, k: string | null = kind) => `/crm/landlords?${new URLSearchParams({ ...(c ? { county: c } : {}), ...(k ? { kind: k } : {}) })}`
  return (
    <>
      <Head title="Landlords" sub="Research only until licensed">
        <div className="crm-seg" role="group" aria-label="Kind">
          {[[null, "All"], ["signals", "Distress signal"], ["passive", "Passive owner"]].map(([k, l]) => (
            <Link key={l} href={href(county, k)} aria-current={kind === k ? "page" : undefined}>{l}</Link>
          ))}
        </div>
      </Head>
      <nav className="crm-views" aria-label="Counties">
        <Link href={href(null)} aria-current={!county ? "page" : undefined}>All<span className="n">{total}</span></Link>
        {COUNTIES.filter((c) => counts.get(c)).map((c) => (
          <Link key={c} href={href(c)} aria-current={county === c ? "page" : undefined}>{titleCase(c)}<span className="n">{counts.get(c)}</span></Link>
        ))}
      </nav>
      {rows.length === 0 ? <div className="crm-empty">No portfolios in this view.</div> : (
        <table className="crm-table">
          <thead><tr><th>Owner</th><th>Signals</th><th className="num">Homes</th><th className="num hide-sm">Value</th><th className="num">Fee</th><th className="hide-sm">Mails from</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.county + p.owner_name} style={{ cursor: "default" }}>
                <td>
                  <details>
                    <summary style={{ cursor: "pointer", listStyle: "none" }}>
                      <span className="primary-cell">{titleCase(p.owner_name)}</span>
                      <div className="secondary">{titleCase(p.county)}{p.owned_since ? ` · since ${p.owned_since.slice(0, 4)}` : ""}{p.is_company ? " · company" : ""}</div>
                    </summary>
                    <ul className="crm-muted" style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5 }}>
                      {(p.parcels ?? []).slice(0, 40).map((x, i) => <li key={i}>{x.address ?? "No address"}{x.value ? ` · ${compactMoney(x.value)}` : ""}</li>)}
                    </ul>
                  </details>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(p.signals ?? {}).map(([k, n]) => <span key={k} className={`pill ${k === "probate" || k === "foreclosure" ? "red" : "amber"}`}>{SIGNAL[k] ?? k}{n > 1 ? ` x${n}` : ""}</span>)}
                    {p.passive ? <span className="pill blue">Passive</span> : null}
                  </div>
                </td>
                <td className="num">{p.residential_count}</td>
                <td className="num hide-sm crm-muted">{compactMoney(p.residential_value)}</td>
                <td className="num">{money(p.expected_fee)}</td>
                <td className="hide-sm crm-muted" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner_mailing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
