/**
 * Normalize demolition / fire-damage permit specifics out of a
 * homeowner_request's raw_payload (set by davidson_demolition_bot.py)
 * and admin_notes. Drives:
 *
 *   - SMS opener variant selection (teardown vs fire-damage vs storm)
 *   - Math sheet "current path" cost projection
 *   - Dialer queue categorization
 *
 * Source data shape (raw_payload.davidson_demolition_permit):
 *   {
 *     Permit_Type_Description: "Building Demolition Permit"
 *                            | "Building Commercial - Fire Damage"
 *                            | "Building Residential Rehab Storm Damage",
 *     Const_Cost:   number,    // permit-stated cost (demo or rehab)
 *     Date_Issued:  number,    // unix-ms
 *     Permit__:     string,    // permit number
 *     Purpose:      string,    // narrative purpose
 *     Parcel:       string,
 *   }
 */

export type DemolitionSubtype =
  | "teardown"        // Pure demolition permit, residential cost band
  | "major_rebuild"   // Demolition permit, large $$ — likely developer (skip)
  | "fire_damage"     // Commercial fire-damage rehab permit
  | "storm_damage"    // Residential storm-damage rehab permit
  | "unknown"

export type DemolitionData = {
  subtype: DemolitionSubtype
  /** Verbatim permit type from data.nashville.gov. */
  permitType: string | null
  /** Permit number (Permit__) — what the homeowner can verify. */
  permitNumber: string | null
  /** ISO date issued (YYYY-MM-DD). */
  dateIssued: string | null
  /** Cost on the permit. For demolition permits, this is demo cost
   *  ($5–15K typical residential). For fire/storm rehab, this is
   *  the rehab budget the owner is committing to. */
  constCost: number | null
  /** Free-text purpose ("DEMOLISH SFR" etc). */
  purpose: string | null
  /** Davidson parcel. */
  parcel: string | null
}

const EMPTY: DemolitionData = {
  subtype: "unknown",
  permitType: null,
  permitNumber: null,
  dateIssued: null,
  constCost: null,
  purpose: null,
  parcel: null,
}

function parseDateMs(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    try {
      return new Date(v).toISOString().slice(0, 10)
    } catch {
      return null
    }
  }
  if (typeof v === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
    return m ? m[0] : null
  }
  return null
}

/**
 * Classify subtype from permit type + cost.
 *
 *  - Fire-damage permit  → fire_damage (always — owner is committing to
 *                          rehab a damaged structure)
 *  - Storm-damage permit → storm_damage (similar — but residential)
 *  - Demolition permit:
 *      - <$300K  → teardown    (residential teardown, hot lead)
 *      - ≥$300K  → major_rebuild (commercial / developer — skip)
 *
 *  $300K is the practical cutoff for "this is a developer or commercial
 *  job" vs. "this is a homeowner trying to clear a problem property."
 *  Residential demos in TN run $5–25K; the gray zone above $50K is
 *  usually still us if the owner is on the permit but tightens fast.
 */
export function classifyDemolitionSubtype(
  permitType: string | null | undefined,
  constCost: number | null | undefined,
): DemolitionSubtype {
  const pt = (permitType || "").toLowerCase()
  if (pt.includes("fire damage")) return "fire_damage"
  if (pt.includes("storm damage")) return "storm_damage"
  if (pt.includes("demolition")) {
    const c = typeof constCost === "number" ? constCost : 0
    if (c >= 300_000) return "major_rebuild"
    return "teardown"
  }
  return "unknown"
}

/**
 * Pull demolition specifics from the lead's raw_payload + admin_notes.
 */
export function extractDemolitionData(
  rawPayload: unknown,
  adminNotes: string | null,
): DemolitionData {
  const rp = (rawPayload && typeof rawPayload === "object")
    ? (rawPayload as Record<string, unknown>)
    : {}
  const permit = rp.davidson_demolition_permit as Record<string, unknown> | undefined

  if (permit && typeof permit === "object") {
    const permitType = (permit.Permit_Type_Description as string) || null
    const constCostRaw = permit.Const_Cost
    const constCost =
      typeof constCostRaw === "number" && Number.isFinite(constCostRaw)
        ? (constCostRaw as number)
        : null
    return {
      subtype: classifyDemolitionSubtype(permitType, constCost),
      permitType,
      permitNumber: (permit.Permit__ as string) || null,
      dateIssued: parseDateMs(permit.Date_Issued),
      constCost,
      purpose: (permit.Purpose as string) || null,
      parcel: (permit.Parcel as string) || null,
    }
  }

  // Fallback: parse admin_notes (legacy / pre-tagged leads).
  // Format: "permit 2024-12345 · type: Building Demolition Permit · cost: $12,500 · purpose: ... · issued: 2025-04-12 · parcel: ..."
  if (adminNotes) {
    const permitM = /permit\s+([\w-]+)/i.exec(adminNotes)
    const typeM = /type:\s*([^·]+?)(?:\s*·|$)/i.exec(adminNotes)
    const costM = /cost:\s*\$([\d,]+)/i.exec(adminNotes)
    const purposeM = /purpose:\s*([^·]+?)(?:\s*·|$)/i.exec(adminNotes)
    const dateM = /issued:\s*(\d{4}-\d{2}-\d{2})/i.exec(adminNotes)
    const parcelM = /parcel:\s*([^·]+?)(?:\s*·|$)/i.exec(adminNotes)

    if (permitM || typeM || costM) {
      const permitType = typeM?.[1]?.trim() || null
      const constCost = costM?.[1] ? parseInt(costM[1].replace(/,/g, ""), 10) : null
      return {
        subtype: classifyDemolitionSubtype(permitType, constCost),
        permitType,
        permitNumber: permitM?.[1] || null,
        dateIssued: dateM?.[1] || null,
        constCost,
        purpose: purposeM?.[1]?.trim() || null,
        parcel: parcelM?.[1]?.trim() || null,
      }
    }
  }

  return EMPTY
}

/**
 * Heuristic estimate of new construction cost for a teardown-rebuild
 * scenario. Not used for fire/storm rehab (those use Const_Cost from
 * the permit directly).
 *
 *   buildPerSqft   — TN residential new-build cost per sqft. $200 is
 *                    the 2025-2026 baseline for non-luxury TN markets;
 *                    luxury runs $300-400+. We use $200 as a
 *                    conservative anchor — rep can override.
 *   defaultSqft    — when sqft is missing (it shouldn't be after
 *                    assessor enrichment), fall back to a 2,000 sqft
 *                    average TN single-family — roughly the median
 *                    new-build size in Davidson.
 */
export function estimateRebuildCost(
  sqft: number | null | undefined,
  buildPerSqft: number = 200,
): number {
  const s = sqft && sqft > 0 ? sqft : 2000
  return Math.round(s * buildPerSqft)
}
