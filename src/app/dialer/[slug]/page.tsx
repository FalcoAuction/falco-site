import Link from "next/link"
import { notFound } from "next/navigation"
import { requireDialerSession } from "../require-session"
import { getDialerLead } from "@/lib/dialer-data"
import LeadDetail from "./lead-detail"

export const dynamic = "force-dynamic"

export default async function DialerLeadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await requireDialerSession(`/dialer/${slug}`)
  const lead = await getDialerLead(slug)
  if (!lead) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <Link
        href="/dialer"
        className="inline-flex items-center text-xs text-white/55 hover:text-white/85"
      >
        ← Back to queue
      </Link>
      <LeadDetail lead={lead} caller={session?.caller ?? "caller"} />
    </main>
  )
}
