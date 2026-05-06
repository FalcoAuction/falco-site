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

/** Estimated fine accrual range for a code violation lead.
 *  TN cities typically fine $50–$250 per day per violation while a
 *  citation is open. We multiply by violationCount so leads with
 *  multiple distinct violations show the compounded estimate. */
export function estimateFineAccrual(
  daysOutstanding: number | null,
  violationCount: number,
): { low: number; high: number } | null {
  if (daysOutstanding == null || daysOutstanding <= 0) return null
  const count = Math.max(1, violationCount)
  return {
    low: Math.round(daysOutstanding * count * 50),
    high: Math.round(daysOutstanding * count * 250),
  }
}
