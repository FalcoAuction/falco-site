/**
 * Property-value consensus across the multiple sources our pipeline pulls.
 *
 * Why this exists: a single source (BatchData AVM, HMDA-anchor estimate,
 * one assessor) is fragile — Mike Kniery's lead showed $766K from a
 * HMDA loan anchor that turned out to be ~$400K off market value. We
 * cross-check every source we have for the property and produce:
 *
 *   - A weighted-consensus value
 *   - A confidence tier (high / medium / low / none)
 *   - The full breakdown so the math sheet can SHOW its work
 *
 * Source priority + confidence weights (calibrated from observed accuracy
 * on Davidson + Williamson leads):
 *
 *   davidson/williamson/etc. assessor (current year)  → 0.95
 *   county assessor (1-2 years old, appreciation-adjusted) → 0.85
 *   last_sale_price within 3 yr (appreciation-adjusted) → 0.80
 *   batchdata avm                                       → 0.75
 *   attom avm (historical, ATTOM expired 4/2026)        → 0.55
 *   xref propagation from same-address neighbor         → 0.55
 *   hmda anchor (loan/LTV reverse-engineering)          → 0.45
 *   manual override (caller-set)                        → 1.00
 *   homeowner-confirmed (caller's call notes)           → 1.00
 *
 * Spread analysis:
 *   - When sources agree within 15% → confidence "high"
 *   - 15-30% → "medium"
 *   - > 30% spread → "low" (gate share buttons)
 *   - Single source only → cap at "medium" regardless
 *   - No sources → "none" (block share entirely)
 */

const APPRECIATION_FACTOR_TO_2026: Record<number, number> = {
  2018: 1.85,
  2019: 1.74,
  2020: 1.65,
  2021: 1.48,
  2022: 1.22,
  2023: 1.10,
  2024: 1.06,
  2025: 1.02,
  2026: 1.0,
}

function appreciate(value: number, fromYear: number | null | undefined): number {
  if (!fromYear || !Number.isFinite(fromYear)) return value
  const factor = APPRECIATION_FACTOR_TO_2026[fromYear]
  if (factor) return Math.round(value * factor)
  // Outside the table: pre-2018 properties get capped at 2018's factor;
  // future-dated entries (data error) treated as today.
  if (fromYear < 2018) return Math.round(value * APPRECIATION_FACTOR_TO_2026[2018])
  return value
}

export type ValuationSourceKey =
  | "davidson_assessor"
  | "williamson_assessor"
  | "hamilton_assessor"
  | "shelby_assessor"
  | "rutherford_assessor"
  | "assessor_generic"
  | "batchdata_avm"
  | "attom_avm"
  | "last_sale_appreciated"
  | "hmda_anchor"
  | "xref_propagated"
  | "manual_override"
  | "homeowner_confirmed"

export type ValuationSource = {
  key: ValuationSourceKey
  label: string
  value: number
  /** Year or ISO date the underlying data is dated to. Null = "current". */
  asOf: string | null
  /** Pre-appreciation raw value (when applicable). */
  rawValue?: number
  /** 0..1 — calibrated trust score for this source. */
  confidence: number
  /** Optional human-readable note (e.g. "2024 appraisal × 1.06 appreciation"). */
  note?: string
}

const SOURCE_CONFIDENCE: Record<ValuationSourceKey, number> = {
  davidson_assessor: 0.95,
  williamson_assessor: 0.95,
  hamilton_assessor: 0.95,
  shelby_assessor: 0.95,
  rutherford_assessor: 0.95,
  assessor_generic: 0.9,
  batchdata_avm: 0.75,
  attom_avm: 0.55,
  last_sale_appreciated: 0.8,
  hmda_anchor: 0.45,
  xref_propagated: 0.55,
  manual_override: 1.0,
  homeowner_confirmed: 1.0,
}

const SOURCE_LABEL: Record<ValuationSourceKey, string> = {
  davidson_assessor: "Davidson Assessor",
  williamson_assessor: "Williamson Assessor",
  hamilton_assessor: "Hamilton Assessor",
  shelby_assessor: "Shelby Assessor",
  rutherford_assessor: "Rutherford Assessor",
  assessor_generic: "County Assessor",
  batchdata_avm: "BatchData AVM",
  attom_avm: "ATTOM AVM",
  last_sale_appreciated: "Last sale + appreciation",
  hmda_anchor: "HMDA loan anchor",
  xref_propagated: "Same-address cross-ref",
  manual_override: "Manual override",
  homeowner_confirmed: "Homeowner confirmed",
}

export type ConfidenceTier = "high" | "medium" | "low" | "none"

export type PropertyValueConsensus = {
  /** Weighted-average value across all sources. Null if no sources. */
  consensus: number | null
  /** Highest-confidence single source (the one we'd quote if forced to pick one). */
  primary: ValuationSource | null
  sources: ValuationSource[]
  /** (max - min) / consensus, when ≥2 sources. Null otherwise. */
  spreadPct: number | null
  confidence: ConfidenceTier
  /** Hint for the UI: short reason this came out high / low. */
  reason: string
}

/**
 * Pull every plausible source from a homeowner_request row's
 * phone_metadata + flat columns and produce a consensus.
 *
 * Input shape is loosely typed because the bot pipeline writes JSON
 * blobs of varying shapes.
 */
export function computePropertyValueConsensus(input: {
  property_value?: number | null
  property_value_source?: string | null
  last_sale_date?: string | null
  phone_metadata?: Record<string, unknown> | null
}): PropertyValueConsensus {
  const sources: ValuationSource[] = []
  const pm = (input.phone_metadata ?? {}) as Record<string, unknown>

  // ─── County assessor (per-county explicit + generic assessor_lookup) ──
  for (const cty of [
    "davidson",
    "williamson",
    "hamilton",
    "shelby",
    "rutherford",
  ] as const) {
    const block = pm[`${cty}_assessor`] as Record<string, unknown> | undefined
    if (block && typeof block === "object") {
      const v = num(block.appraised_value ?? block.appraised)
      if (v) {
        const yr = parseYear(block.appraisal_year ?? block.year ?? block.as_of)
        sources.push({
          key: `${cty}_assessor` as ValuationSourceKey,
          label: SOURCE_LABEL[`${cty}_assessor` as ValuationSourceKey],
          value: appreciate(v, yr),
          rawValue: v,
          asOf: yr ? String(yr) : null,
          confidence: SOURCE_CONFIDENCE[`${cty}_assessor` as ValuationSourceKey],
          note: yr && yr < 2026
            ? `${yr} appraisal · appreciation-adjusted`
            : undefined,
        })
      }
    }
  }
  // Generic assessor_lookup (used by Montgomery / Knox / mcgtn_parcels etc.)
  const assess = pm["assessor_lookup"] as Record<string, unknown> | undefined
  if (assess && typeof assess === "object") {
    const v = num(assess.appraised ?? assess.appraised_value)
    if (v && !sources.some((s) => s.rawValue === v)) {
      const yr = parseYear(assess.appraisal_year ?? assess.year ?? assess.resolved_at)
      sources.push({
        key: "assessor_generic",
        label:
          (assess.source as string)
            ? `Assessor (${assess.source})`
            : SOURCE_LABEL.assessor_generic,
        value: appreciate(v, yr),
        rawValue: v,
        asOf: yr ? String(yr) : null,
        confidence: SOURCE_CONFIDENCE.assessor_generic,
        note: yr && yr < 2026
          ? `${yr} appraisal · appreciation-adjusted`
          : undefined,
      })
    }
  }

  // ─── Last sale price + appreciation ──────────────────────────────────
  const saleHints: Array<{ price: unknown; date: unknown }> = []
  if (assess && typeof assess === "object") {
    saleHints.push({ price: assess.sale_price, date: assess.sale_date })
  }
  const rod = pm["rod_lookup"] as Record<string, unknown> | undefined
  if (rod && typeof rod === "object") {
    saleHints.push({ price: rod.sale_price, date: rod.document_date })
  }
  const bd = pm["batchdata_skip_trace"] as Record<string, unknown> | undefined
  if (bd && typeof bd === "object") {
    saleHints.push({ price: bd.last_sale_price, date: bd.last_sale_date })
  }
  if (input.last_sale_date) {
    saleHints.push({ price: null, date: input.last_sale_date })
  }
  for (const hint of saleHints) {
    const v = num(hint.price)
    const yr = parseYear(hint.date)
    if (v && yr && yr >= 2018) {
      const adjusted = appreciate(v, yr)
      if (!sources.some((s) => s.rawValue === v)) {
        sources.push({
          key: "last_sale_appreciated",
          label: SOURCE_LABEL.last_sale_appreciated,
          value: adjusted,
          rawValue: v,
          asOf: String(yr),
          confidence: SOURCE_CONFIDENCE.last_sale_appreciated,
          note: yr < 2026 ? `${yr} sale · appreciation-adjusted` : undefined,
        })
      }
    }
  }

  // ─── BatchData AVM ─────────────────────────────────────────────────
  if (bd && typeof bd === "object") {
    const v = num(bd.estimated_value)
    if (v) {
      sources.push({
        key: "batchdata_avm",
        label: SOURCE_LABEL.batchdata_avm,
        value: v,
        asOf: null,
        confidence: SOURCE_CONFIDENCE.batchdata_avm,
      })
    }
  }

  // ─── ATTOM AVM (historical — ATTOM contract expired 4/2026) ────────
  const attom = pm["attom_lookup"] as Record<string, unknown> | undefined
  if (attom && typeof attom === "object") {
    const v = num(attom.avm_value)
    if (v) {
      sources.push({
        key: "attom_avm",
        label: SOURCE_LABEL.attom_avm,
        value: v,
        asOf: parseAsOf(attom.avm_date),
        confidence: SOURCE_CONFIDENCE.attom_avm,
      })
    }
  }

  // ─── HMDA loan-anchor estimate (weakest fallback) ──────────────────
  const sig = pm["mortgage_signal"] as Record<string, unknown> | undefined
  if (sig && typeof sig === "object" && sig.kind === "hmda_origination") {
    const v = num(sig.anchor_property_value)
    if (v) {
      const yr = parseYear(sig.match_year ?? sig.deed_reference)
      sources.push({
        key: "hmda_anchor",
        label: SOURCE_LABEL.hmda_anchor,
        value: v,
        rawValue: v,
        asOf: yr ? String(yr) : null,
        confidence: SOURCE_CONFIDENCE.hmda_anchor,
        note: "Reverse-engineered from loan amount; weakest source",
      })
    }
  }

  // ─── Cross-ref propagation ─────────────────────────────────────────
  const xref = pm["property_value_xref"] as Record<string, unknown> | undefined
  if (xref && typeof xref === "object") {
    const v = num(input.property_value)
    if (v && (input.property_value_source || "").includes("xref")) {
      sources.push({
        key: "xref_propagated",
        label: SOURCE_LABEL.xref_propagated,
        value: v,
        asOf: null,
        confidence: SOURCE_CONFIDENCE.xref_propagated,
      })
    }
  }

  // ─── Manual override / homeowner-confirmed ─────────────────────────
  const ov = pm["property_value_override"] as Record<string, unknown> | undefined
  if (ov && typeof ov === "object") {
    const v = num(ov.amount ?? ov.value)
    const isHomeowner = (ov.source as string) === "homeowner_verbal"
    if (v) {
      const key: ValuationSourceKey = isHomeowner
        ? "homeowner_confirmed"
        : "manual_override"
      sources.push({
        key,
        label: SOURCE_LABEL[key],
        value: v,
        asOf: parseAsOf(ov.confirmed_at ?? ov.set_at),
        confidence: SOURCE_CONFIDENCE[key],
        note: (ov.note as string) || undefined,
      })
    }
  }

  // ─── Compute consensus ─────────────────────────────────────────────
  if (sources.length === 0) {
    return {
      consensus: null,
      primary: null,
      sources: [],
      spreadPct: null,
      confidence: "none",
      reason: "no defensible source — share blocked",
    }
  }

  // Manual override or homeowner confirmation — those are authoritative.
  // If present, that's the single source of truth and we pin to it.
  const authoritative = sources.find(
    (s) => s.key === "manual_override" || s.key === "homeowner_confirmed"
  )
  if (authoritative) {
    return {
      consensus: authoritative.value,
      primary: authoritative,
      sources,
      spreadPct: null,
      confidence: "high",
      reason: `pinned to ${authoritative.label}`,
    }
  }

  const totalWeight = sources.reduce((s, x) => s + x.confidence, 0)
  const consensus = Math.round(
    sources.reduce((s, x) => s + x.value * x.confidence, 0) / totalWeight
  )
  sources.sort((a, b) => b.confidence - a.confidence)
  const primary = sources[0]
  const min = Math.min(...sources.map((s) => s.value))
  const max = Math.max(...sources.map((s) => s.value))
  const spreadPct = sources.length >= 2 && consensus > 0
    ? (max - min) / consensus
    : null

  let confidence: ConfidenceTier
  let reason: string
  if (sources.length === 1) {
    // Single source caps at medium — no cross-validation possible.
    confidence = primary.confidence >= 0.85 ? "medium" : "low"
    reason = `single source (${primary.label})`
  } else if (spreadPct !== null && spreadPct < 0.15) {
    confidence = "high"
    reason = `${sources.length} sources within ${Math.round(spreadPct * 100)}%`
  } else if (spreadPct !== null && spreadPct < 0.30) {
    confidence = "medium"
    reason = `${sources.length} sources, ${Math.round(spreadPct * 100)}% spread`
  } else {
    confidence = "low"
    reason = spreadPct !== null
      ? `${sources.length} sources, ${Math.round(spreadPct * 100)}% spread — verify`
      : `single weak source — verify`
  }

  return { consensus, primary, sources, spreadPct, confidence, reason }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.]/g, ""))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

function parseYear(v: unknown): number | null {
  if (typeof v === "number" && v >= 1900 && v <= 2100) return v
  if (typeof v === "string") {
    const m = /^(19|20)\d{2}/.exec(v.trim())
    if (m) return parseInt(m[0], 10)
  }
  return null
}

function parseAsOf(v: unknown): string | null {
  if (typeof v !== "string") return null
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v)
  return m ? m[1] : null
}
