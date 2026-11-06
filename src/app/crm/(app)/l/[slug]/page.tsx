// /crm/l/[slug]: open a lead by its pipeline key. Old dialer links
// (/dialer/[slug], in sent emails and call sheets) redirect here; the
// record page itself is keyed by staging id.

import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export default async function LeadBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (supabaseAdmin && slug && slug.length <= 200) {
    const r = await supabaseAdmin.from("homeowner_requests_staging").select("id").eq("pipeline_lead_key", slug).order("staged_at", { ascending: false }).limit(1)
    const id = (r.data?.[0] as { id: string } | undefined)?.id
    if (id) redirect(`/crm/leads/${id}`)
  }
  redirect(`/crm/leads?q=`)
}
