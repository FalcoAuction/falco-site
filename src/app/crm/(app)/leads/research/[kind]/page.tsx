import Link from "next/link"
import { notFound } from "next/navigation"
import { Head } from "@/app/crm/ui"
import { churchRecord, receiverRecord } from "@/app/crm/closure-receiver-record"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export default async function ResearchPage({params}: {params: Promise<{kind: string}>}) {
  const {kind} = await params
  if (kind !== "church" && kind !== "receiver") notFound()
  if (!supabaseAdmin) throw new Error("Database unavailable")
  const church = kind === "church"
  const rows = []
  for (let start = 0; ; start += 200) {
    let query = supabaseAdmin.from("homeowner_requests_staging")
      .select("id,property_address,pipeline_lead_key,bot_source,raw_payload,source_url,trustee_sale_date")
      .eq("bot_source", church ? "church_closure" : "shelby_tax_sale")
    if (!church) query = query.eq("raw_payload->shelby_receiver_review->>status","receiver_eligibility_research")
    const {data,error} = await query.order("property_address").order("id").range(start,start+199)
    if (error) throw new Error("Unable to load research records")
    for (const row of data) {
      const record = church ? churchRecord(row) : receiverRecord(row)
      if (record) rows.push({id:row.id,title:record.title})
    }
    if (data.length < 200) break
  }
  return <><Head title={church ? "Church closure research" : "Shelby receiver eligibility"}><Link href="/crm/leads">Back to leads</Link></Head>
    <p>{rows.length} {church ? "closure records" : "county tax parcels matched to the court roster"}</p>
    <ul>{rows.map(row => <li key={row.id}><Link href={"/crm/leads/"+row.id}>{row.title}</Link></li>)}</ul></>
}
