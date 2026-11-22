import Link from "next/link"
import { Head } from "@/app/crm/ui"
import { listMtJulietResearch } from "@/lib/mt-juliet-research"

export const dynamic = "force-dynamic"

export default async function MtJulietResearchPage() {
  const rows = await listMtJulietResearch()
  return <>
    <Head title="Mt. Juliet complaint research"><Link href="/crm/leads">Back to leads</Link></Head>
    <p>{rows.length} open or acknowledged building-condition complaints. The city intake record shows what a resident reported. Enforcement and sale authority require separate evidence.</p>
    {rows.map(({id, evidence}) => <article className="crm-card" key={id}>
      <h2><Link href={"/crm/leads/"+id}>{evidence.address}</Link></h2>
      <p>{evidence.condition}</p>
      <p>Reported {evidence.reported}. {evidence.status} as of {evidence.checked}.</p>
      <a href={evidence.url}>View municipal complaint {evidence.issue}</a>
    </article>)}
  </>
}
