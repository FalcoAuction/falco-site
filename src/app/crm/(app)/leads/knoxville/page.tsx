import Link from "next/link"
import { Head } from "@/app/crm/ui"
import { HearingRecord } from "@/app/crm/hearing-record"
import { listKnoxvilleResearch } from "@/lib/knoxville-research"

export const dynamic = "force-dynamic"
const route = "/crm/leads/knoxville"

export default async function KnoxvilleResearchPage({searchParams}: {searchParams: Promise<{after?:string}>}) {
  const {after} = await searchParams
  const {rows, next} = await listKnoxvilleResearch(after)
  return <>
    <Head title="Knoxville hearing research"><Link href="/crm/leads">Back to leads</Link></Head>
    {rows.map(({id,evidence}) => <article key={id}>
      <h2><Link href={"/crm/leads/"+id}>{evidence.address}</Link></h2>
      <HearingRecord evidence={evidence}/>
    </article>)}
    {!rows.length && <p>No verified hearing documents on this page.</p>}
    <nav className="crm-toolbar" aria-label="Knoxville research pages">
      {after && <Link href={route}>First page</Link>}
      {next && <Link href={route+"?after="+next}>Next</Link>}
    </nav>
  </>
}
