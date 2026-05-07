import { notFound } from "next/navigation"
import { requireDialerSession } from "../../require-session"
import { getDialerLead } from "@/lib/dialer-data"
import { supabaseAdmin } from "@/lib/supabase-admin"
import MathSheetContent, {
  type HomeownerSnapshot,
} from "@/app/admin/math-sheet/[id]/math-sheet-content"
import { type Scenario } from "@/app/admin/math-sheet/[id]/scenario-config"
import { extractCodeViolationData } from "@/app/admin/math-sheet/[id]/code-violation-data"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Math sheet · Dialer · FALCO",
  robots: "noindex, nofollow",
}

/**
 * Dialer-side math sheet for a specific listing. Same printable 3-path
 * comparison the /admin route renders, but loaded from dialer + vault data
 * instead of the homeowner_requests table.
 *
 * Caller workflow:
 *   /dialer → click a lead → "Math sheet" button → opens this page →
 *   tweak ARV/loan inputs if needed → Print/Save PDF → email to homeowner.
 */
export default async function DialerMathSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ view?: string; embed?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const view = sp.view ?? null
  // ?embed=1 strips the dark chrome bar (back link, email/print buttons,
  // input override panel) and renders only the printable sheet — used by
  // the off-screen iframe in the SMS share flow on lead-detail.
  const embed = sp.embed === "1"
  await requireDialerSession(`/dialer/${slug}/math-sheet`)
  const lead = await getDialerLead(slug)
  if (!lead) notFound()

  // VaultListing doesn't formally type avmMid/Low/High but inventoryToListing
  // (in dialer-data.ts) attaches them as extras — the same pattern the UI uses
  // when casting to DialerLeadView. We grab them via a narrow safe accessor.
  const avmFields = lead as unknown as {
    avmMid?: number | null
    avmLow?: number | null
    avmHigh?: number | null
  }
  const avmMid = avmFields.avmMid ?? null

  // For code-violation leads we need raw_payload + admin_notes from the
  // homeowner_requests row to surface the violation list / case number /
  // received date on the math sheet. The dialer query doesn't pull those
  // (heavy payloads), so we do a one-off fetch here keyed off the lead's
  // pipeline_lead_key.
  let codeViolation: ReturnType<typeof extractCodeViolationData> | null = null
  if ((lead.distressType || "").toUpperCase() === "CODE_VIOLATION" && supabaseAdmin) {
    try {
      const sourceKey = (lead as unknown as { sourceLeadKey?: string }).sourceLeadKey
      if (sourceKey) {
        const { data: hr } = await supabaseAdmin
          .from("homeowner_requests")
          .select("raw_payload, admin_notes")
          .eq("pipeline_lead_key", sourceKey)
          .eq("source", "bot")
          .maybeSingle()
        if (hr) {
          codeViolation = extractCodeViolationData(
            hr.raw_payload,
            (hr.admin_notes as string | null) ?? null,
          )
        }
      }
    } catch {
      // Non-fatal — the math sheet renders fine without the panel.
    }
  }

  // Map the dialer/vault lead into the HomeownerSnapshot shape MathSheetContent
  // expects. Falls back gracefully when fields are missing.
  const snapshot: HomeownerSnapshot = {
    id: lead.slug,
    fullName: lead.ownerName ?? "",
    email: lead.ownerMail ?? "",
    phone: lead.ownerPhonePrimary ?? "",
    propertyAddress: lead.address ?? lead.title ?? "",
    county: lead.county ?? "",
    trusteeSaleDate: lead.currentSaleDate ?? null,
    mortgageBalance: lead.mortgageAmount ?? null,
    submittedAt: lead.createdAt ?? new Date().toISOString(),
    // Pipeline AVM (from ATTOM) — pre-populates ARV in the math sheet
    propertyValue: avmMid,
    propertyValueSource: avmMid ? "AVM" : null,
    distressType: lead.distressType ?? null,
    codeViolation,
    trusteeSaleStatus:
      (lead as unknown as { trusteeSaleStatus?: HomeownerSnapshot["trusteeSaleStatus"] })
        .trusteeSaleStatus ?? null,
  }

  return (
    <MathSheetContent
      homeowner={snapshot}
      backHref={`/dialer/${slug}`}
      backLabel="← Lead"
      scenarioOverride={view as Scenario | null}
      embed={embed}
    />
  )
}
