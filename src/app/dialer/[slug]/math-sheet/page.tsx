import { notFound } from "next/navigation"
import { requireDialerSession } from "../../require-session"
import { getDialerLead } from "@/lib/dialer-data"
import MathSheetContent, {
  type HomeownerSnapshot,
} from "@/app/admin/math-sheet/[id]/math-sheet-content"

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
 * Workflow Chris uses:
 *   /dialer → click a lead → "Math sheet" button → opens this page →
 *   tweak ARV/loan inputs if needed → Print/Save PDF → email to homeowner.
 */
export default async function DialerMathSheetPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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
  }

  return (
    <MathSheetContent
      homeowner={snapshot}
      backHref={`/dialer/${slug}`}
      backLabel="← Lead"
    />
  )
}
