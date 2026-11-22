import Link from "next/link"
import { Head } from "@/app/crm/ui"
import { listMemphisResearch } from "@/lib/memphis-research"

export const dynamic = "force-dynamic"
const route = "/crm/leads/memphis"

export default async function MemphisResearchPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams
  const { rows, next } = await listMemphisResearch(after)
  return <>
    <Head title="Memphis 311 research"><Link href="/crm/leads">Back to leads</Link></Head>
    <section className="crm-card">
      <p>Active structural service requests checked within three UTC calendar days. A 311 complaint records a reported condition. An auction opportunity requires independent property, ownership and sale evidence.</p>
      {!rows.length && <p>No current structural requests on this page.</p>}
      {rows.map(({id,evidence:e}) => <article className="crm-card" key={id}>
        <h2><Link href={"/crm/leads/"+id}>{e.address}</Link></h2>
        <p>Incident {e.incident} · {e.type} · {e.status}</p>
        <p>Checked {e.checked}{e.parcel && <> · Parcel reported by 311: <span style={{ whiteSpace: "pre-wrap" }}>{e.parcel}</span></>}</p>
        {e.url && <a href={e.url} target="_blank" rel="noreferrer">Official Memphis 311 incident</a>}
      </article>)}
      <nav className="crm-toolbar" aria-label="Memphis research pages">
        {after && <Link href={route}>First page</Link>}
        {next && <Link href={route+"?after="+next}>Next</Link>}
      </nav>
    </section>
  </>
}
