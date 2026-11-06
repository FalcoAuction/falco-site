// Leads: the nightly ranked list (lead_opportunities) as saved views,
// plus the commercial, land and high-value asset buckets other bots tag
// on staging rows (property_lane, aircraft). Status comes from the dialer
// workflow, so a lead worked in the dialer shows here too.

import Link from "next/link"
import {
  BUCKETS, VIEWS, bucketCounts, latestOpportunityDay, listBucket, listLeads, viewCounts,
  type BucketKey, type BucketRow, type GradeFilter, type LeadRow, type ViewKey,
} from "@/lib/crm-data"
import { Icon } from "../icons"
import { RowLink } from "../row-link"
import { Head, SalePill, StatusPill, compactMoney, money, relTime, shortDate, titleCase } from "../ui"

export const dynamic = "force-dynamic"

const COUNTIES = ["davidson", "rutherford", "williamson", "sumner", "wilson", "montgomery", "maury", "robertson", "dickson", "cheatham", "hamilton", "shelby", "knox"]
const GRADES: { key: GradeFilter; label: string }[] = [
  { key: "qualified", label: "Qualified" }, { key: "A", label: "A" }, { key: "B", label: "B" }, { key: "C", label: "C" }, { key: "all", label: "All tagged" },
]

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string; county?: string; q?: string; grade?: string }> }) {
  const sp = await searchParams
  const bucket = BUCKETS.find((b) => b.key === sp.view)?.key as BucketKey | undefined
  const view = (VIEWS.some((v) => v.key === sp.view) ? sp.view : "all") as ViewKey
  const current = bucket ?? view
  const county = sp.county && COUNTIES.includes(sp.county) ? sp.county : undefined
  const q = sp.q?.trim().slice(0, 80) || undefined
  const grade = GRADES.some((g) => g.key === sp.grade) ? (sp.grade as GradeFilter) : undefined

  const [ranked, bucketData, bCounts] = await Promise.all([
    bucket ? Promise.resolve(null) : listLeads(view, { county, q }),
    bucket ? listBucket(bucket, { grade, county, q }) : Promise.resolve(null),
    bucketCounts(),
  ])
  const day = ranked?.day ?? null
  const counts = await viewCounts(day ?? (await latestOpportunityDay()))
  const keep = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ county, q, ...extra })) if (v) p.set(k, v)
    return `/crm/leads?${p}`
  }
  const rowsShown = bucketData?.rows.length ?? ranked?.rows.length ?? 0
  const error = bucketData?.error ?? ranked?.error

  return (
    <>
      <Head title="Leads" sub={bucket ? undefined : day ? `Ranked ${shortDate(day)}` : "No ranking yet"}>
        <div className="crm-seg" role="group" aria-label="Lead type">
          <Link href={keep({ view: "all" })} aria-current={!bucket ? "page" : undefined}>
            Residential <span className="crm-faint" style={{ marginLeft: 5 }}>{counts.all ?? 0}</span>
          </Link>
          {BUCKETS.map((b) => (
            <Link key={b.key} href={keep({ view: b.key })} aria-current={b.key === bucket ? "page" : undefined}>
              {b.label} <span className="crm-faint" style={{ marginLeft: 5 }}>{bCounts[b.key]}</span>
            </Link>
          ))}
        </div>
      </Head>
      {!bucket ? (
        <nav className="crm-views" aria-label="Saved views">
          {VIEWS.map((v) => (
            <Link key={v.key} href={keep({ view: v.key })} aria-current={v.key === current ? "page" : undefined}>
              {v.label}{counts[v.key] != null ? <span className="n">{counts[v.key]}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}
      <form className="crm-toolbar" action="/crm/leads">
        <input type="hidden" name="view" value={current} />
        {grade ? <input type="hidden" name="grade" value={grade} /> : null}
        <div style={{ position: "relative" }}>
          <span className="crm-faint" style={{ position: "absolute", left: 9, top: 8 }}><Icon name="search" size={14} /></span>
          <input className="crm-input" name="q" defaultValue={q} placeholder="Address or owner" style={{ paddingLeft: 30, width: 240 }} />
        </div>
        <select className="crm-select" name="county" defaultValue={county ?? ""}>
          <option value="">All counties</option>
          {COUNTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
        </select>
        <button className="crm-btn" type="submit">Filter</button>
        {(county || q) ? <Link className="crm-btn ghost" href={`/crm/leads?view=${current}`}>Clear</Link> : null}
        {bucket && bucket !== "assets" && bucketData ? (
          <div className="crm-seg" role="group" aria-label="Grade">
            {GRADES.map((g) => (
              <Link key={g.key} href={keep({ view: bucket, grade: g.key === "qualified" ? undefined : g.key })}
                aria-current={(grade ?? "qualified") === g.key ? "page" : undefined}>
                {g.label} <span className="crm-faint" style={{ marginLeft: 4 }}>{bucketData.grades[g.key]}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <span style={{ flex: 1 }} />
        <span className="crm-faint">{rowsShown} shown</span>
      </form>
      {error ? <div className="crm-body"><div className="crm-error">{error}</div></div> : null}
      {rowsShown === 0 && !error ? <div className="crm-empty">Nothing in this view.</div>
        : bucket === "assets" ? <AssetTable rows={bucketData!.rows} />
        : bucket ? <LaneTable rows={bucketData!.rows} lane={bucket} />
        : <RankedTable rows={ranked!.rows} />}
    </>
  )
}

function RankedTable({ rows }: { rows: LeadRow[] }) {
  return (
    <table className="crm-table">
      <thead>
        <tr>
          <th>Property</th><th className="hide-sm">Situation</th><th>Status</th><th className="hide-sm">Sale</th>
          <th className="num hide-sm hide-md">Value</th><th className="num">Fee</th><th className="hide-sm hide-md">Last touch</th>
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
  )
}

const GRADE_TONE: Record<string, string> = { A: "green", B: "blue", C: "" }
const CONTACT: Record<string, string> = { phone: "Phone", email: "Email", mail: "Mail only", owner_mailing: "Mail only" }

function LaneTable({ rows, lane }: { rows: BucketRow[]; lane: "commercial" | "land" }) {
  return (
    <table className="crm-table">
      <thead>
        <tr>
          <th>Property</th><th>Grade</th><th className="hide-sm">{lane === "land" ? "Land" : "Type"}</th>
          <th className="hide-sm">Distress</th><th>Status</th><th className="num hide-sm hide-md">Value</th><th className="hide-sm hide-md">Contact</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const t = r.lane
          return (
            <RowLink key={r.staging_id} href={`/crm/leads/${r.staging_id}`}>
              <td>
                <div className="primary-cell">{r.property_address ?? "No address"}</div>
                <div className="secondary">{titleCase(r.owner_name) || "Owner unknown"} · {titleCase(r.county)}{t?.out_of_state_owner ? " · out of state" : ""}</div>
              </td>
              <td>{t?.grade ? <span className={`pill ${GRADE_TONE[t.grade]}`}>{t.grade}</span> : <span className="crm-faint" title={t?.exclude_reason ?? ""}>{t?.exclude_reason ? "Excluded" : "Ungraded"}</span>}</td>
              <td className="hide-sm crm-muted">
                {titleCase((t?.subtype ?? "").replace(/_/g, " ")) || (lane === "land" ? "Vacant land" : "Commercial")}
                {t?.acres ? ` · ${Number(t.acres).toFixed(t.acres < 10 ? 2 : 0)} ac` : ""}
                {lane === "land" && t?.land_flip?.score ? <span className="pill accent" style={{ marginLeft: 6 }}>Flip {t.land_flip.score}</span> : null}
              </td>
              <td className="hide-sm">
                <span className="crm-muted">{titleCase((r.distress_type ?? "").replace(/_/g, " "))}</span>
                {t?.stacked_distress?.length ? <span className="pill red" style={{ marginLeft: 6 }}>Stacked</span> : null}
              </td>
              <td><StatusPill status={r.status} /></td>
              <td className="num hide-sm hide-md crm-muted">{compactMoney(r.property_value)}</td>
              <td className="hide-sm hide-md crm-muted">{CONTACT[t?.contact_tier ?? ""] ?? titleCase((t?.contact_tier ?? "").replace(/_/g, " "))}</td>
            </RowLink>
          )
        })}
      </tbody>
    </table>
  )
}

function AssetTable({ rows }: { rows: BucketRow[] }) {
  return (
    <table className="crm-table">
      <thead><tr><th>Owner</th><th>Asset</th><th className="hide-sm">Value band</th><th className="hide-sm">Why they are here</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const a = r.aircraft?.[0]
          return (
            <RowLink key={r.staging_id} href={`/crm/leads/${r.staging_id}`}>
              <td>
                <div className="primary-cell">{titleCase(a?.registrant ?? r.owner_name) || "Owner unknown"}</div>
                <div className="secondary">{r.property_address ?? a?.registrant_address} · {titleCase(r.county)}</div>
              </td>
              <td>{a ? <><span>{a.aircraft}</span><div className="secondary">{a.n_number}{(r.aircraft?.length ?? 0) > 1 ? ` + ${(r.aircraft?.length ?? 1) - 1} more` : ""}</div></> : null}</td>
              <td className="hide-sm crm-muted">{a?.value_band_label}</td>
              <td className="hide-sm"><span className="crm-muted">{titleCase((r.distress_type ?? "").replace(/_/g, " "))}</span>{a?.match_type ? <div className="secondary">Matched by {a.match_type.replace(/_/g, " ")}</div> : null}</td>
              <td><StatusPill status={r.status} /></td>
            </RowLink>
          )
        })}
      </tbody>
    </table>
  )
}
