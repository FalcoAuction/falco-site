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

/** Bad phones (cross-lead, never serve again) + junk fallback phones
 *  (appear on 3+ unrelated leads = BatchData garbage). Returned as a
 *  set of normalized 10-digit numbers. */
async function loadBadPhones(): Promise<Set<string>> {
  if (!supabaseAdmin) return new Set()
  const out = new Set<string>()
  const [bad, junk] = await Promise.all([
    supabaseAdmin.from("dialer_bad_phones").select("phone"),
    supabaseAdmin.from("junk_fallback_phones").select("phone"),
  ])
  for (const r of (bad.data as { phone: string }[]) || []) {
    out.add(String(r.phone).replace(/\D/g, "").slice(-10))
  }
  for (const r of (junk.data as { phone: string }[]) || []) {
    out.add(String(r.phone).replace(/\D/g, "").slice(-10))
  }
  return out
}

export default async function DialerLeadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await requireDialerSession(`/dialer/${slug}`)
  const [lead, skiptraceData, badPhones] = await Promise.all([
    getDialerLead(slug),
    loadSkiptraceData(slug),
    loadBadPhones(),
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
        badPhones={Array.from(badPhones)}
      />
    </main>
  )
}
