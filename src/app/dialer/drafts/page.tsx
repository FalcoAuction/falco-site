// /dialer/drafts — review queue for machine-drafted SMS awaiting a
// human eye: campaign dry-run drafts, brain escalations, and
// low-confidence holds. Read, edit, approve (sends), or reject.

import { redirect } from "next/navigation"
import Link from "next/link"
import { requireDialerSession } from "../require-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { DraftsReview, type PendingDraft } from "./drafts-review"

export const dynamic = "force-dynamic"

type LeadLite = {
  pipeline_lead_key: string
  full_name: string | null
  owner_name_records: string | null
  property_address: string | null
  county: string | null
  trustee_sale_date: string | null
  property_value: number | null
  mortgage_balance: number | null
}

export default async function DraftsPage() {
  const session = await requireDialerSession("/dialer/drafts")
  if (!session) redirect("/dialer/login")

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-[#060606] text-white p-8">
        <div className="text-red-300">Supabase admin unavailable.</div>
      </main>
    )
  }

  const { data: rows } = await supabaseAdmin
    .from("sms_messages")
    .select(
      "id, listing_slug, to_phone, body, status, bot_confidence, bot_rationale, escalation_reason, angle, created_at"
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(100)

  const drafts = rows || []
  const slugs = [...new Set(drafts.map((d) => d.listing_slug).filter(Boolean))] as string[]
  const leadBySlug = new Map<string, LeadLite>()
  if (slugs.length > 0) {
    const { data: leads } = await supabaseAdmin
      .from("homeowner_requests")
      .select(
        "pipeline_lead_key, full_name, owner_name_records, property_address, county, trustee_sale_date, property_value, mortgage_balance"
      )
      .eq("source", "bot")
      .in("pipeline_lead_key", slugs)
    for (const l of (leads || []) as LeadLite[]) {
      leadBySlug.set(l.pipeline_lead_key, l)
    }
  }

  const view: PendingDraft[] = drafts.map((d) => {
    const lead = d.listing_slug ? leadBySlug.get(d.listing_slug as string) : undefined
    const equity =
      lead?.property_value && lead.property_value > 0
        ? lead.property_value - (lead.mortgage_balance || 0)
        : null
    return {
      id: d.id as number,
      slug: (d.listing_slug as string) || "",
      toPhone: (d.to_phone as string) || "",
      body: (d.body as string) || "",
      confidence: (d.bot_confidence as number) ?? null,
      rationale: (d.bot_rationale as string) || "",
      reason: (d.escalation_reason as string) || "",
      angle: (d.angle as string) || "",
      createdAt: (d.created_at as string) || "",
      ownerName: lead?.full_name || lead?.owner_name_records || "",
      address: lead?.property_address || "",
      county: lead?.county || "",
      saleDate: lead?.trustee_sale_date || null,
      equity,
    }
  })

  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/85 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dialer" className="text-[12px] text-white/55 hover:text-white">
              ← Dialer
            </Link>
            <div className="text-[13px] font-semibold tracking-[0.18em] text-emerald-300">
              DRAFT REVIEW
            </div>
          </div>
          <div className="text-[12px] text-white/55">{view.length} pending</div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <DraftsReview drafts={view} />
      </div>
    </main>
  )
}
