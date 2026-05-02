import Link from "next/link"
import { notFound } from "next/navigation"
import { requireDialerSession } from "../require-session"
import { getDialerLead } from "@/lib/dialer-data"
import { supabaseAdmin } from "@/lib/supabase-admin"
import LeadDetail from "./lead-detail"
import type { SkiptraceData } from "./contact-layer"

export const dynamic = "force-dynamic"

async function loadSkiptraceData(slug: string): Promise<SkiptraceData | null> {
  if (!supabaseAdmin) return null
  const { data } = await supabaseAdmin
    .from("homeowner_requests")
    .select("skiptrace_data")
    .eq("source", "bot")
    .eq("pipeline_lead_key", slug)
    .maybeSingle()
  const row = data as unknown as { skiptrace_data: SkiptraceData | null } | null
  return row?.skiptrace_data ?? null
}

export default async function DialerLeadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await requireDialerSession(`/dialer/${slug}`)
  const [lead, skiptraceData] = await Promise.all([
    getDialerLead(slug),
    loadSkiptraceData(slug),
  ])
  if (!lead) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <Link
        href="/dialer"
        className="inline-flex items-center text-xs text-white/55 hover:text-white/85"
      >
        ← Back to queue
      </Link>
      <LeadDetail
        lead={lead}
        caller={session?.caller ?? "caller"}
        skiptraceData={skiptraceData}
      />
    </main>
  )
}
