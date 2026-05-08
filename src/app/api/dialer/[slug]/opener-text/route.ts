// GET /api/dialer/[slug]/opener-text
// Returns the brute-honest iMessage opener with the lead's actual numbers
// pre-filled. Patrick taps "Send opener text" in the dialer, the route
// returns { text, smsHref }, the UI copies to clipboard + opens the SMS app.
//
// Three variants by distress posture:
//   - distressed (TRUSTEE_NOTICE / LIS_PENDENS / NOD): wholesaler trap angle
//   - underwater (payoff > 90% AVM): payoff-verification angle
//   - FSBO: trade-off angle, no foreclosure framing
//
// Auth: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { defaultInputsFor, computeMath, fmt } from "@/lib/math-sheet"
import {
  foreclosureSmsBody,
  codeViolationSmsBody,
} from "@/lib/foreclosure-language"
import { extractCodeViolationData } from "@/app/admin/math-sheet/[id]/code-violation-data"
import { computePropertyValueConsensus } from "@/lib/property-value-consensus"

export const dynamic = "force-dynamic"

function estimatePayoff(orig: number, mortgageDateIso: string | null): number {
  if (!orig || orig <= 0) return 0
  const start = mortgageDateIso ? new Date(mortgageDateIso).getTime() : NaN
  if (Number.isNaN(start)) return Math.round(orig * 0.93)
  const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  const r = 0.04 / 12
  const n = 360
  const paid = Math.min(yrs * 12, n)
  const remaining = (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
  return Math.round(orig * remaining)
}

function firstName(full: string): string {
  const t = (full || "").trim()
  if (!t) return ""
  const f = t.split(/\s+/)[0]
  if (f === f.toUpperCase()) return f.charAt(0) + f.slice(1).toLowerCase()
  return f
}

function daysToSale(saleIso: string | null | undefined): number | null {
  if (!saleIso) return null
  const ms = new Date(saleIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

/**
 * Convert all-caps source-data strings like "N 14TH ST" or "MAIN STREET" to
 * normal-case ("N 14th St", "Main Street") for SMS bodies. Public-records
 * data is almost always uppercase; that reads like a robocall when it
 * lands on someone's phone.
 *
 *  - Capitalize first letter of each word, lowercase the rest.
 *  - Preserve numeric ordinal suffixes ("14TH" → "14th", "1ST" → "1st").
 *  - Single-letter directionals ("N", "S", "E", "W", "NE", etc.) stay
 *    capitalized via the standard rule (first letter capital).
 */
function titleCaseStreet(s: string): string {
  return s.replace(/\w+/g, (w) => {
    if (/^\d+(st|nd|rd|th)$/i.test(w)) return w.toLowerCase()
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 })
  }

  const inventory = await findDialerInventoryLead(slug)

  type HRSnap = {
    full_name: string | null
    owner_name_records: string | null
    property_value: number | null
    property_value_source: string | null
    last_sale_date: string | null
    phone: string | null
    phone_metadata: Record<string, unknown> | null
    raw_payload: unknown
    admin_notes: string | null
  }
  let hr: HRSnap | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select(
        "full_name, owner_name_records, property_value, property_value_source, last_sale_date, phone, phone_metadata, raw_payload, admin_notes"
      )
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) hr = data as unknown as HRSnap
  }

  // Multi-source ARV consensus for the share-button capture flow. The
  // returned `propertyValue` field replaces the raw inventory AVM in
  // lead-detail's captureSnapshot, so the inline-rendered math sheet
  // shows the cross-checked number across assessor + last-sale-
  // appreciated + BatchData + HMDA instead of a single fragile source.
  const consensus = computePropertyValueConsensus({
    property_value: hr?.property_value ?? null,
    property_value_source: hr?.property_value_source ?? null,
    last_sale_date: hr?.last_sale_date ?? null,
    phone_metadata: hr?.phone_metadata ?? null,
  })

  const ownerFull =
    hr?.full_name || hr?.owner_name_records || inventory?.ownerName || ""
  const greeting = firstName(ownerFull)
  const address = inventory?.address || "your property"
  const arv = consensus.consensus ?? hr?.property_value ?? inventory?.avmMid ?? 0
  const loan = inventory?.mortgageAmount ?? 0
  const payoff = estimatePayoff(loan, inventory?.mortgageDate || null)
  let dts = daysToSale(inventory?.currentSaleDate)

  // Manual sale-status flag (set via /api/dialer/[slug]/sale-status)
  // overrides the urgency. "cancelled" / "reinstated" → no urgency pitch
  // (treat like unscheduled). "ran" → past. "postponed" already
  // updated trustee_sale_date so dts already reflects the new date.
  const ss = hr?.phone_metadata?.sale_status as
    | { status?: string }
    | undefined
  const trusteeSaleStatus = ss?.status
  if (trusteeSaleStatus === "cancelled" || trusteeSaleStatus === "reinstated") {
    dts = null
  } else if (trusteeSaleStatus === "ran") {
    dts = -1
  }
  const distressType = (inventory?.distressType || "").toUpperCase()
  const isFSBO = distressType === "FSBO"
  const isCodeViolation = distressType === "CODE_VIOLATION"
  const isUnderwater = arv > 0 && payoff > arv * 0.9

  // Phone number to dial (e.g. +16155551212 for sms: link)
  const phoneRaw = hr?.phone || inventory?.ownerPhonePrimary || ""
  const phoneDigits = phoneRaw.replace(/\D/g, "")
  const smsTo = phoneDigits.length === 10
    ? `+1${phoneDigits}`
    : phoneDigits.length === 11 && phoneDigits.startsWith("1")
    ? `+${phoneDigits}`
    : ""

  // Math is delivered as an IMAGE attachment Patrick adds from his phone
  // (downloaded via the Send opener button → math-png endpoint). The text
  // body stays brutally short — no link (phishing pattern), no math wall
  // (numbers without context confuse), no permission ask.
  // Avoid the unused-import linter noise:
  void fmt; void computeMath; void defaultInputsFor; void payoff; void arv

  const greetTag = greeting ? `${greeting} — ` : ""
  const streetOnly = (() => {
    const m = address.match(/^[\d-]+\s+([^,]+)/)
    const raw = m ? m[1].trim() : address.split(",")[0]
    return titleCaseStreet(raw)
  })()

  // For CV leads, extract violation specifics up front. The same
  // payload powers (a) the SMS body's count anchor ("N citations
  // stacking") and (b) the response field that lets the share-button
  // inline render show real violation list / case number / fine
  // accrual instead of generic defaults.
  let codeViolation: ReturnType<typeof extractCodeViolationData> | null = null
  if (isCodeViolation && hr) {
    try {
      codeViolation = extractCodeViolationData(hr.raw_payload, hr.admin_notes)
    } catch {
      codeViolation = null
    }
  }
  const cvViolationCount = codeViolation?.violationCount ?? 0

  // ─── Variant selection ───────────────────────────────────────────────
  // Brutal short. Math sheet attached as IMAGE (Patrick adds from camera
  // roll after opener-png download). The text just sets the context.
  let text: string

  if (isFSBO) {
    // FSBO: no foreclosure framing. Purpose-hint: we help FSBO sellers
    // keep what their listing is worth without giving it up to an agent.
    text = `${greetTag}saw the FSBO on ${streetOnly}. We work with FSBO sellers who want a defined sale date and a broad buyer market without losing 6% to an agent commission. Reply if it's worth a conversation. — Patrick / FALCO`
  } else if (isCodeViolation) {
    // Code violation: NOT foreclosure language. Owner has an open
    // code-enforcement case w/ fines accruing — auction pitch is
    // "transfer the liability to the buyer." Matches the math sheet's
    // "FALCO · LIABILITY OPTIONS" framing so the homeowner sees the
    // same story in the SMS as the attached image.
    text = codeViolationSmsBody(streetOnly, cvViolationCount)
  } else if (isUnderwater) {
    // Underwater: no math image (can't compute accurately). Purpose-hint:
    // even if the payoff is real, we work to get them walking away with
    // SOMETHING instead of $0 at the courthouse.
    text = `${greetTag}public records show your loan payoff at or above market on ${streetOnly}. Recorded balance is usually $30-80K stale. We work to keep something in your pocket instead of $0 at the courthouse. Text back the actual payoff. — Patrick / FALCO`
  } else {
    // Distressed default — full multi-line body from foreclosureSmsBody.
    // No greeting prefix (the urgency hook leads cold), no separate
    // signature appended (the helper includes "— Patrick Armour /
    // FALCO" at the end). Voice + format calibrated from the text
    // that drew the first homeowner response.
    text = foreclosureSmsBody(dts, streetOnly)
  }

  // sms: URI for one-tap iMessage compose. iOS uses ?body=, Android uses
  // ;body= but ?body= works on iOS Messages too so we standardize on it.
  const smsHref = smsTo
    ? `sms:${smsTo}?body=${encodeURIComponent(text)}`
    : null

  return NextResponse.json({
    text,
    smsHref,
    variant: isFSBO
      ? "fsbo"
      : isCodeViolation
      ? "code_violation"
      : isUnderwater
      ? "underwater"
      : "distressed",
    phoneOnFile: phoneRaw || null,
    codeViolation,
    // Multi-source ARV consensus for the share-button capture flow.
    // lead-detail's captureSnapshot uses propertyValueConsensus to
    // override the raw inventory AVM so the inline math sheet renders
    // with the cross-checked number.
    propertyValueConsensus: consensus.consensus,
    propertyValueSourceLabel: consensus.primary?.label ?? null,
    propertyValueConfidence: consensus.confidence,
  })
}
