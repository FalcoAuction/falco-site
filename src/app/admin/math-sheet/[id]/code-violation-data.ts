/**
 * Normalize code-violation specifics out of a homeowner_request's raw_payload
 * and admin_notes. Different city scrapers structure this data differently
 * (Nashville/Memphis use ArcGIS, Knoxville uses a PDF parser, Chattanooga
 * uses their own JSON). This module gives the math sheet a single shape to
 * render against.
 */

export type CodeViolationData = {
  /** The actual violation list — usually a comma-separated string of code
   *  sections (e.g. "ROOF, EXTERIOR REPAIR, HIGH WEEDS"). Verbatim from
   *  the city's database. */
  violations: string | null
  /** Number of distinct violations parsed from the list. Used to scale
   *  fine-accrual estimates (each violation accrues its own fine in TN). */
  violationCount: number
  /** City case / request number — what the inspector or homeowner can
   *  reference when looking up the file. */
  caseNumber: string | null
  /** Date the citation was filed (ISO YYYY-MM-DD). Used to compute days
   *  outstanding for the fine-accrual estimate. */
  receivedDate: string | null
  /** City the violation was issued in. Helpful for the rep on the call. */
  city: string | null
}

const EMPTY: CodeViolationData = {
  violations: null,
  violationCount: 0,
  caseNumber: null,
  receivedDate: null,
  city: null,
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

function countViolations(s: string | null): number {
  if (!s) return 0
  // Distinct violations are comma-delimited in Nashville's payload; some
  // cities use semicolons or pipes. Split on any of these.
  const parts = s.split(/[,;|]/).map((p) => p.trim()).filter(Boolean)
  return parts.length
}

/**
 * Pull code-violation specifics from whatever shape the lead came in as.
 * Falls back to admin_notes parsing for older leads where raw_payload
 * wasn't structured.
 */
export function extractCodeViolationData(
  rawPayload: unknown,
  adminNotes: string | null,
): CodeViolationData {
  const rp = (rawPayload && typeof rawPayload === "object")
    ? (rawPayload as Record<string, unknown>)
    : {}

  // Nashville Metro Codes (ArcGIS)
  const nash = rp.nashville_codes as Record<string, unknown> | undefined
  if (nash && typeof nash === "object") {
    const violations =
      (nash.Violations_Noted as string) ||
      (nash.Reported_Problem as string) ||
      null
    return {
      violations,
      violationCount: countViolations(violations),
      caseNumber: (nash.Request_Nbr as string) || null,
      receivedDate: parseDateMs(nash.Date_Received),
      city: (nash.City as string) || "Nashville",
    }
  }

  // Memphis 311 / code enforcement
  const mem = rp.memphis_311 as Record<string, unknown> | undefined
  if (mem && typeof mem === "object") {
    const violations =
      (mem.violation as string) ||
      (mem.description as string) ||
      (mem.service_request_type as string) ||
      null
    return {
      violations,
      violationCount: countViolations(violations),
      caseNumber: (mem.service_request_id as string) || (mem.case_number as string) || null,
      receivedDate: parseDateMs(mem.created_at) || parseDateMs(mem.requested_datetime),
      city: "Memphis",
    }
  }

  // Knoxville Property Owners Hearing
  const knx = rp.poh_section as string | undefined
  if (knx) {
    return {
      violations: (rp.body_excerpt as string) || null,
      violationCount: 1,
      caseNumber: null,
      receivedDate: parseDateMs(rp.date),
      city: "Knoxville",
    }
  }

  // Chattanooga / generic — try common keys
  const chat = rp.chattanooga as Record<string, unknown> | undefined
  if (chat && typeof chat === "object") {
    const violations =
      (chat.violation_description as string) ||
      (chat.case_type as string) ||
      null
    return {
      violations,
      violationCount: countViolations(violations),
      caseNumber: (chat.case_number as string) || null,
      receivedDate: parseDateMs(chat.opened_date) || parseDateMs(chat.created_at),
      city: "Chattanooga",
    }
  }

  // Fallback: parse admin_notes (some legacy leads have nothing in raw_payload).
  // Nashville's admin_notes format: "case 25-1451581 [HIGH-SIGNAL] · violation: ROOF, ... · received: 2025-09-25 ..."
  if (adminNotes) {
    const caseM = /case\s+([\w-]+)/i.exec(adminNotes)
    const violM = /violation:\s*([^·]+?)(?:\s*·|$)/i.exec(adminNotes)
    const probM = /problem:\s*([^·]+?)(?:\s*·|$)/i.exec(adminNotes)
    const recM = /received:\s*(\d{4}-\d{2}-\d{2})/i.exec(adminNotes)
    const violations = (violM?.[1] || probM?.[1] || "").trim() || null
    if (caseM || violations || recM) {
      return {
        violations,
        violationCount: countViolations(violations),
        caseNumber: caseM?.[1] || null,
        receivedDate: recM?.[1] || null,
        city: null,
      }
    }
  }

  return EMPTY
}

/** Days between a YYYY-MM-DD ISO date and today. Returns null if the
 *  input is unparseable or in the future. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
  return days >= 0 ? days : null
}

/**
 * Severity tier for fine accrual rates. Different cities and different
 * violation types accrue at very different rates.
 *
 *   minor    — lawn-only / single maintenance citation. $25–50/day.
 *              Tenn. Code Ann. § 13-21-105 effectively caps most
 *              municipalities at $50/day for property-maintenance
 *              violations, and most stay near the lower end.
 *   standard — typical property-maintenance with structural / exterior
 *              elements (roof, siding, debris accumulation, broken
 *              windows). $50–100/day. Common Nashville Metro Codes
 *              practice after the cure window.
 *   severe   — declared dangerous building / unfit for habitation /
 *              demolition order / condemned / boarded-vacant.
 *              $100–500/day. Environmental Court can stack additional
 *              penalties under nuisance-abatement statutes.
 */
export type CvSeverityTier = "minor" | "standard" | "severe"

const RATES_BY_TIER: Record<CvSeverityTier, { low: number; high: number }> = {
  minor: { low: 25, high: 50 },
  standard: { low: 50, high: 100 },
  severe: { low: 100, high: 500 },
}

/**
 * Classify the severity tier from the actual citation text. Severe
 * keywords win over standard, which win over minor. If no signal is
 * detected, default to "standard" — most enforcement-engaged
 * properties have something beyond a lawn violation.
 */
export function classifyCvSeverity(violationsString: string | null | undefined): CvSeverityTier {
  const text = (violationsString || "").toUpperCase()
  if (!text) return "standard"

  // Severe — dangerous-building, unfit, demolition, condemned, vacant
  if (/UNFIT|DEMOLITION|DANGEROUS|UNSAFE|CONDEMN|BOARDED VACANT|OPEN VACANT/.test(text)) {
    return "severe"
  }

  // Minor — only when EVERY signal is lawn-bucket. If anything
  // structural is also present, it's standard at minimum.
  const hasStructural = /STRUCTURAL|ROOF|FOUNDATION|EXTERIOR|JUNK|TRASH|DEBRIS|REPAIR|INOP|UNLIC|BROKEN|BOARDED|MOLD|PLUMBING|ELECTRICAL|MECHANICAL/.test(text)
  const hasLawn = /HIGH WEEDS|TALL GRASS|WEEDS|GRASS|MOW|OVERGROWN/.test(text)
  if (hasLawn && !hasStructural) {
    return "minor"
  }

  return "standard"
}

/**
 * Estimated fine accrual range for a code-violation lead.
 *
 *   - First 30 days = cure window (TN-typical). No fines accrue. The
 *     citation is just a "you have 30 days to fix it" notice; the
 *     fine clock starts only if it stays open past then.
 *   - Daily rate set by severity tier from the violation text — NOT
 *     multiplied by violation count. The previous version stacked
 *     fines per cited code, which dramatically overstated accruals
 *     for properties with multiple minor citations. Property is
 *     fined daily as a whole; multiple violations can push toward the
 *     high end of the tier, not multiply the rate.
 *   - Capped at 365 days of accrual. Even years-old cases settle in
 *     hearings/Environmental Court for fractions of theoretical max.
 *     Showing $50K+ on a 5-year-old case implies a precision the
 *     system doesn't actually deliver.
 */
export function estimateFineAccrual(
  daysOutstanding: number | null,
  /** Reserved for future use — currently ignored to avoid the
   *  per-violation multiplier bug. Keep param for caller compat. */
  _violationCount: number,
  violationsString?: string | null,
): { low: number; high: number; tier: CvSeverityTier; accrualDays: number; cureDays: number } | null {
  if (daysOutstanding == null || daysOutstanding <= 0) return null

  const CURE_WINDOW_DAYS = 30
  const accrualDays = Math.max(0, daysOutstanding - CURE_WINDOW_DAYS)
  if (accrualDays <= 0) return null

  const tier = classifyCvSeverity(violationsString)
  const { low: lowRate, high: highRate } = RATES_BY_TIER[tier]

  // Cap at 365 accrual days. Real-world settlements rarely reflect
  // longer than a year of straight accrual.
  const cappedDays = Math.min(accrualDays, 365)

  return {
    low: Math.round(cappedDays * lowRate),
    high: Math.round(cappedDays * highRate),
    tier,
    accrualDays: cappedDays,
    cureDays: CURE_WINDOW_DAYS,
  }
}
