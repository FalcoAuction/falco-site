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
    phone: string | null
  }
  let hr: HRSnap | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select("full_name, owner_name_records, property_value, phone")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) hr = data as unknown as HRSnap
  }

  const ownerFull =
    hr?.full_name || hr?.owner_name_records || inventory?.ownerName || ""
  const greeting = firstName(ownerFull)
  const address = inventory?.address || "your property"
  const arv = hr?.property_value ?? inventory?.avmMid ?? 0
  const loan = inventory?.mortgageAmount ?? 0
  const payoff = estimatePayoff(loan, inventory?.mortgageDate || null)
  const dts = daysToSale(inventory?.currentSaleDate)
  const distressType = (inventory?.distressType || "").toUpperCase()
  const isFSBO = distressType === "FSBO"
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
    return m ? m[1].trim() : address.split(",")[0]
  })()

  // ─── Variant selection ───────────────────────────────────────────────
  // Brutal short. Math sheet attached as IMAGE (Patrick adds from camera
  // roll after opener-png download). The text just sets the context.
  let text: string

  if (isFSBO) {
    // FSBO: no foreclosure framing. Purpose-hint: we help FSBO sellers
    // keep what their listing is worth without giving it up to an agent.
    text = `${greetTag}saw the FSBO on ${streetOnly}. We work with FSBO sellers who want a defined sale date and a broad buyer market without losing 6% to an agent commission. Reply if it's worth a conversation. — Patrick / FALCO`
  } else if (isUnderwater) {
    // Underwater: no math image (can't compute accurately). Purpose-hint:
    // even if the payoff is real, we work to get them walking away with
    // SOMETHING instead of $0 at the courthouse.
    text = `${greetTag}public records show your loan payoff at or above market on ${streetOnly}. Recorded balance is usually $30-80K stale. We work to keep something in your pocket instead of $0 at the courthouse. Text back the actual payoff. — Patrick / FALCO`
  } else {
    // Distressed default: hook + disqualifier + purpose-line + delivery.
    // The "extract" verb is precise — that's exactly what wholesalers do
    // via the assignment fee. Naming the contrast in plain English makes
    // us the opposite without any "save your home" scam-language traps.
    const hook =
      dts !== null && dts > 0
        ? `${dts} days to your trustee sale.`
        : dts !== null && dts <= 0
        ? `Your trustee sale already ran — call before another fires.`
        : `Pre-foreclosure on ${streetOnly}.`

    text = `${greetTag}${hook} We're not wholesalers — we work to keep your equity in your hands, not extract it. Math attached. — Patrick / FALCO`
  }

  // sms: URI for one-tap iMessage compose. iOS uses ?body=, Android uses
  // ;body= but ?body= works on iOS Messages too so we standardize on it.
  const smsHref = smsTo
    ? `sms:${smsTo}?body=${encodeURIComponent(text)}`
    : null

  return NextResponse.json({
    text,
    smsHref,
    variant: isFSBO ? "fsbo" : isUnderwater ? "underwater" : "distressed",
    phoneOnFile: phoneRaw || null,
  })
}
