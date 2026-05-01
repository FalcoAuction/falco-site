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

  // Compute math (kept for warm-lead callers / future use; the brutal
  // opener delegates the numbers to the PDF link, doesn't put them in
  // the text body).
  if (arv > 0) {
    computeMath(defaultInputsFor(arv, payoff))
  }
  // Suppress unused-import warning by referencing fmt
  void fmt

  const greetTag = greeting ? `${greeting} — ` : ""

  // Public math link — falco.llc/m/{slug}. Resolves to the one-page PDF
  // via /api/m/[slug]. Slug is the sha40 pipeline_lead_key, unguessable.
  const baseUrl =
    process.env.FALCO_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://falco.llc"
  const mathLink = `${baseUrl}/m/${slug}`

  // ─── Variant selection ───────────────────────────────────────────────
  // Brutal short. No permission ask. No "want the math?" — the math IS
  // the link. They tap or they don't.
  let text: string

  if (isFSBO) {
    // FSBO: no foreclosure framing. Direct trade-off statement + math link.
    text = `${greetTag}saw the FSBO on ${address}. Marketed sale gets you a defined sale date, broad buyer pool, buyer pays the premium. Math: ${mathLink} — Patrick / FALCO`
  } else if (isUnderwater) {
    // Underwater: no math link (we can't compute it accurately). The
    // ASK itself is the action — text back the actual payoff number.
    text = `${greetTag}public records show your loan payoff at or above market on ${address}. The recorded number is usually $30-80K stale. Text back your actual payoff and I'll run real numbers. — Patrick / FALCO`
  } else {
    // Distressed default: brutal short. Hook + disqualifier + math link.
    const hook =
      dts !== null && dts > 0
        ? `${dts} days to your trustee sale.`
        : dts !== null && dts <= 0
        ? `Your trustee sale already ran — call me before another fires.`
        : `Pre-foreclosure on ${address}.`

    text = `${greetTag}${hook} We're not wholesalers. Real math: ${mathLink} — Patrick / FALCO`
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
