import { notFound } from "next/navigation"
import { requireDialerSession } from "../../require-session"
import { getDialerLead } from "@/lib/dialer-data"
import { supabaseAdmin } from "@/lib/supabase-admin"
import MathSheetContent, {
  type HomeownerSnapshot,
} from "@/app/admin/math-sheet/[id]/math-sheet-content"
import { type Scenario } from "@/app/admin/math-sheet/[id]/scenario-config"
import { extractCodeViolationData } from "@/app/admin/math-sheet/[id]/code-violation-data"
import { computePropertyValueConsensus } from "@/lib/property-value-consensus"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Math sheet · Dialer · FALCO",
  robots: "noindex, nofollow",
}

// When the page is loaded inside the off-screen iframe used by the
// "Share opener + math (one-click)" flow on the lead-detail page
// (?embed=1), pin the viewport to a fixed 1100px wide. iOS Safari
// otherwise renders an iframe's inner document at device-width (e.g.
// 390px on iPhone), which causes the captured PNG to clip on the right.
export async function generateViewport({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>
}) {
  const sp = await searchParams
  if (sp.embed === "1") {
    return { width: 1100, initialScale: 1, userScalable: false }
  }
  return {}
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

  // Fetch the homeowner_requests row to get (a) raw_payload + admin_notes
  // for CV leads and (b) phone_metadata + property_value + last_sale_date
  // for the multi-source ARV consensus. Single fetch for both purposes —
  // previously only fetched on CV leads.
  let codeViolation: ReturnType<typeof extractCodeViolationData> | null = null
  let consensusArv: number | null = null
  let consensusSourceLabel: string | null = null
  if (supabaseAdmin) {
    try {
      const sourceKey = (lead as unknown as { sourceLeadKey?: string }).sourceLeadKey
      if (sourceKey) {
        const { data: hr } = await supabaseAdmin
          .from("homeowner_requests")
          .select(
            "raw_payload, admin_notes, property_value, property_value_source, last_sale_date, phone_metadata"
          )
          .eq("pipeline_lead_key", sourceKey)
          .eq("source", "bot")
          .maybeSingle()
        if (hr) {
          if ((lead.distressType || "").toUpperCase() === "CODE_VIOLATION") {
            codeViolation = extractCodeViolationData(
              hr.raw_payload,
              (hr.admin_notes as string | null) ?? null,
            )
          }
          // Multi-source ARV consensus (assessor + last-sale-appreciated +
          // BatchData + HMDA cross-checked). Falls back to raw column when
          // no defensible sources are present.
          const consensus = computePropertyValueConsensus({
            property_value: (hr.property_value as number | null) ?? null,
            property_value_source: (hr.property_value_source as string | null) ?? null,
            last_sale_date: (hr.last_sale_date as string | null) ?? null,
            phone_metadata: hr.phone_metadata as Record<string, unknown> | null,
          })
          consensusArv = consensus.consensus
          consensusSourceLabel = consensus.primary?.label ?? null
        }
      }
    } catch {
      // Non-fatal — the math sheet renders fine on raw column fallback.
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
    // ARV: prefer multi-source consensus (assessor + last-sale-appreciated
    // + BatchData + HMDA cross-checked) over the raw inventory AVM.
    propertyValue: consensusArv ?? avmMid,
    propertyValueSource: consensusSourceLabel ?? (avmMid ? "AVM" : null),
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
