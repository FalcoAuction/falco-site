import { supabaseAdmin } from "@/lib/supabase-admin"
import type { HomeownerSnapshot } from "./math-sheet-content"
import { extractCodeViolationData } from "./code-violation-data"
import { extractDemolitionData } from "./demolition-data"
import { computePropertyValueConsensus } from "@/lib/property-value-consensus"

/** Load one homeowner_requests row and shape it for the math sheet.
 *  Shared by the math sheet page and the lead page preview so both
 *  show the same numbers. Returns null when the row does not exist. */
export async function loadHomeownerSnapshot(id: string): Promise<HomeownerSnapshot | null> {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("math-sheet load error:", error.message)
  }
  if (!data) return null

  // Compute multi-source consensus once and use the consensus value as
  // the primary ARV. Sources surface on the math sheet so the homeowner
  // sees the work — assessor + last-sale + BatchData all in one view.
  const consensus = computePropertyValueConsensus({
    property_value: (data.property_value as number | null) ?? null,
    property_value_source: (data.property_value_source as string | null) ?? null,
    last_sale_date: (data.last_sale_date as string | null) ?? null,
    phone_metadata: data.phone_metadata as Record<string, unknown> | null,
  })

  return {
    id: String(data.id),
    fullName: (data.full_name as string) || (data.owner_name_records as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    propertyAddress: (data.property_address as string) || "",
    county: (data.county as string) || "",
    trusteeSaleDate: (data.trustee_sale_date as string | null) ?? null,
    mortgageBalance: (data.mortgage_balance as number | null) ?? null,
    submittedAt: (data.submitted_at as string) || "",
    // Pipeline-enriched fields used to pre-populate the math sheet inputs.
    // propertyValue is the multi-source consensus (assessor + last-sale-
    // appreciated + BatchData + HMDA cross-checked); falls back to the
    // raw column when no sources resolve.
    propertyValue: consensus.consensus ?? (data.property_value as number | null) ?? null,
    propertyValueSource:
      consensus.primary?.label ?? (data.property_value_source as string | null) ?? null,
    distressType: (data.distress_type as string | null) ?? null,
    trusteeSaleStatus: (() => {
      const pm = data.phone_metadata as Record<string, unknown> | null | undefined
      const ss = pm && typeof pm === "object"
        ? (pm.sale_status as Record<string, unknown> | undefined)
        : undefined
      const s = ss?.status
      if (s === "cancelled" || s === "postponed" || s === "ran" || s === "reinstated") {
        return s
      }
      return null
    })(),
    // Wrap in try/catch — if a single lead has malformed raw_payload it
    // shouldn't crash the entire math sheet render.
    codeViolation: (() => {
      try {
        return extractCodeViolationData(
          data.raw_payload,
          (data.admin_notes as string | null) ?? null,
        )
      } catch (e) {
        console.error("extractCodeViolationData failed for", id, e)
        return null
      }
    })(),
    demolition: (() => {
      try {
        return extractDemolitionData(
          data.raw_payload,
          (data.admin_notes as string | null) ?? null,
        )
      } catch (e) {
        console.error("extractDemolitionData failed for", id, e)
        return null
      }
    })(),
    sqft: (data.sqft as number | null) ?? null,
  }
}
