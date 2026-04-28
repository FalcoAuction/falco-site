/**
 * Tier classification for FALCO × Parks pilot pricing.
 *
 * Per the executed Data Services Agreement, Parks pays FALCO a per-Qualified-Lead
 * fee determined by the property's after-repair-value (ARV) at time of delivery.
 *
 * Pure, client-safe helpers — no server imports.
 */

export type QualifiedLeadTier = "T0" | "T1" | "T2" | "T3"

export type TierInfo = {
  tier: QualifiedLeadTier
  feeUSD: number
  /** Human-friendly label for UI. */
  label: string
  /** Description of the ARV band. */
  arvBand: string
}

/**
 * Classify a property's ARV into the contract tier and corresponding per-QL fee.
 *
 * Returns null if ARV is missing or not a positive number — caller should
 * block QL delivery and route the lead through enrichment first.
 */
export function classifyTier(arv: number | null | undefined): TierInfo | null {
  if (arv === null || arv === undefined) return null
  if (!Number.isFinite(arv) || arv <= 0) return null

  if (arv < 250_000) {
    return {
      tier: "T0",
      feeUSD: 4_000,
      label: "Tier 0",
      arvBand: "Under $250K",
    }
  }
  if (arv < 550_000) {
    return {
      tier: "T1",
      feeUSD: 6_000,
      label: "Tier 1",
      arvBand: "$250K – $550K",
    }
  }
  if (arv < 750_000) {
    return {
      tier: "T2",
      feeUSD: 8_000,
      label: "Tier 2",
      arvBand: "$550K – $750K",
    }
  }
  return {
    tier: "T3",
    feeUSD: 10_000,
    label: "Tier 3",
    arvBand: "$750K and above",
  }
}

/** Format a tier fee as currency for UI display. */
export function fmtTierFee(feeUSD: number): string {
  return feeUSD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}
