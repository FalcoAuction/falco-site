import Link from "next/link"
import { Head, money } from "@/app/crm/ui"
import { assessorSource, cityCsv, listChattanoogaResearch, parcelHoldLabel } from "@/lib/chattanooga-research"

export const dynamic = "force-dynamic"
const route = "/crm/leads/chattanooga"
const pageSize = 15

export default async function ChattanoogaResearchPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: input } = await searchParams
  const groups = await listChattanoogaResearch()
  const pages = Math.max(1, Math.ceil(groups.length / pageSize))
  const page = /^\d{1,6}$/.test(input ?? "") ? Math.min(pages, Math.max(1, Number(input))) : 1
  const count = groups.reduce((n,g) => n + g.cases.length, 0)
  return <>
    <Head title="Chattanooga code research">
      <Link className="crm-btn ghost" href="/crm/leads">Back to leads</Link>
    </Head>
    <section className="crm-card">
      <p>Hamilton County falls outside the regional property ranking. Each citation describes the reported location. Several cases can share one assessor parcel.</p>
      <p>An auction opportunity requires current ownership, a documented sale opportunity with a date, and evidence of who can authorize the sale.</p>
      <p>{count} distinct active serious cases · {new Set(groups.flatMap(g => g.cases.map(c => c.address))).size} reported streets · {groups.filter(g => g.assessor).length} confirmed county parcels</p>
      {!count && <p className="crm-empty">No cases currently have a confirmed active serious citation in staging.</p>}
      {groups.slice((page-1)*pageSize,page*pageSize).map(g => <article key={g.key} className="crm-card">
        <h2>{g.cases[0].address}</h2>
        {g.assessor ? <dl className="crm-props">
          <dt>County parcel</dt><dd>{g.assessor.parcel}</dd>
          <dt>Assessor-listed owner</dt><dd>{g.assessor.owner || "Unverified"}</dd>
          <dt>County appraised value</dt><dd>{g.assessor.value === null ? "Unverified" : money(g.assessor.value)}</dd>
          {g.assessor.landUse && <><dt>County land use</dt><dd>{g.assessor.landUse}</dd></>}
          <dt>County file stamp</dt><dd>{g.assessor.stamp || "Multiple versions"}</dd>
          <dt>Property source</dt><dd><a href={assessorSource} target="_blank" rel="noreferrer">Hamilton County assessor export</a></dd>
        </dl> : <p>{parcelHoldLabel(g.cases[0].parcelStatus)}</p>}
        {g.cases.map(c => <details key={c.id} open={g.cases.length === 1}>
          <summary>City case {c.caseNumber} · {c.address}</summary>
          <Link href={"/crm/leads/"+c.id}>Open case record</Link>
          <p>City source updated {c.modified} · Checked {c.checked}</p>
          {c.truncated && <p>Evidence sample from the city file. Showing {c.records.length} of {c.seriousCount} serious active citations.</p>}
          <ul>{c.records.map(r => <li key={r.id}>
            <strong>{r.description}</strong> · Record {r.id} · City status {r.status}
            {r.entered && <> · Entered {r.entered}</>}{r.cited && <> · Cited {r.cited}</>}
            {r.dangerous && " · City dangerous flag"}
            {r.detail && r.detail !== r.description && <div>{r.detail}</div>}
          </li>)}</ul>
        </details>)}
      </article>)}
      <p><a href={cityCsv} target="_blank" rel="noreferrer">City of Chattanooga violation records (CSV)</a></p>
      {pages > 1 && <nav className="crm-toolbar" aria-label="Chattanooga research pages">
        {page > 1 && <Link href={route+"?page="+(page-1)}>Previous</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link href={route+"?page="+(page+1)}>Next</Link>}
      </nav>}
    </section>
  </>
}
