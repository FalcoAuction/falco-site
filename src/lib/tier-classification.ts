/**
 * Tier classification for FALCO leads — property size buckets.
 *
 * NOTE 2026-04-30: The data-services per-QL pricing model
 * (T0=$4K, T1=$6K, T2=$8K, T3=$10K) is RETIRED. FALCO compensation
 * now flows via the standard 65/20/15 commission split on close
 * (Parks / Caller-via-Benchmark / FALCO). The tier label is kept as
 * a property-size descriptor for UI grouping; `feeUSD` is preserved
 * in the type for schema compatibility but always returns 0.
 *
 * Pure, client-safe helpers — no server imports.
 */

export type QualifiedLeadTier = "T0" | "T1" | "T2" | "T3"

export type TierInfo = {
  tier: QualifiedLeadTier
  /** Always 0 under the commission-split model. Field retained for
   *  schema compatibility with `dialer_qualified_leads.fee_usd`. */
  feeUSD: number
  /** Human-friendly label for UI. */
  label: string
  /** Description of the ARV band. */
  arvBand: string
}

/**
 * Classify a property's ARV into a size bucket.
 *
 * Returns null if ARV is missing or not a positive number — caller should
 * block QL delivery and route the lead through enrichment first.
 */
export function classifyTier(arv: number | null | undefined): TierInfo | null {
  if (arv === null || arv === undefined) return null
  if (!Number.isFinite(arv) || arv <= 0) return null

  if (arv < 250_000) {
    return { tier: "T0", feeUSD: 0, label: "Tier 0", arvBand: "Under $250K" }
  }
  if (arv < 550_000) {
    return { tier: "T1", feeUSD: 0, label: "Tier 1", arvBand: "$250K – $550K" }
  }
  if (arv < 750_000) {
    return { tier: "T2", feeUSD: 0, label: "Tier 2", arvBand: "$550K – $750K" }
  }
  return { tier: "T3", feeUSD: 0, label: "Tier 3", arvBand: "$750K and above" }
}

/** Format a tier fee as currency for UI display. Retained for callers
 *  that still reference legacy fee fields; under the commission-split
 *  model fees are 0 and this returns "—" for clarity. */
export function fmtTierFee(feeUSD: number): string {
  if (!feeUSD || feeUSD <= 0) return "—"
  return feeUSD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}
