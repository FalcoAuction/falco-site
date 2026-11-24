// One home for the source-by-source research queues, so the leads page
// keeps a short tab row. Each queue holds records whose evidence is still
// being checked; nothing here is cleared for owner contact.

import Link from "next/link"
import { Head } from "@/app/crm/ui"

const QUEUES: { href: string; title: string; what: string }[] = [
  { href: "/crm/leads/research/church", title: "Church closure research", what: "Church closures from conference resolutions, not yet tied to a sale." },
  { href: "/crm/leads/research/receiver", title: "Shelby receiver eligibility", what: "County tax parcels matched to the court receiver roster." },
  { href: "/crm/leads/knoxville", title: "Knoxville hearing research", what: "Property hearing records waiting on a city document and parcel." },
  { href: "/crm/leads/mt-juliet", title: "Mt. Juliet complaint research", what: "Building-condition complaints from the city." },
  { href: "/crm/leads/memphis", title: "Memphis 311 research", what: "Structural service requests that still need ownership and a sale." },
  { href: "/crm/leads/chattanooga", title: "Chattanooga code research", what: "City code cases with the county parcel review." },
]

export default function ResearchIndexPage() {
  return (
    <>
      <Head title="Research" sub="Evidence still being checked. Nothing here is cleared for owner contact.">
        <Link href="/crm/leads">Back to leads</Link>
      </Head>
      <table className="crm-table">
        <thead>
          <tr><th>Queue</th><th>What&apos;s in it</th></tr>
        </thead>
        <tbody>
          {QUEUES.map((q) => (
            <tr key={q.href}>
              <td><Link href={q.href}>{q.title}</Link></td>
              <td className="crm-muted">{q.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
