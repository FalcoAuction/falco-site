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

  // Compute math for the opener
  let wholesaleNet = 0
  let auctionLow = 0
  let auctionHigh = 0
  if (arv > 0) {
    const m = computeMath(defaultInputsFor(arv, payoff))
    wholesaleNet = Math.max(0, m.wholesaler.realisticNet)
    auctionLow = Math.max(0, m.auction.low.netToHomeowner)
    auctionHigh = Math.max(0, m.auction.high.netToHomeowner)
  }

  const greetTag = greeting ? `${greeting} — ` : ""

  // ─── Variant selection ───────────────────────────────────────────────
  let text: string

  if (isFSBO) {
    // FSBO: no foreclosure trap framing. Direct trade-off statement.
    text = [
      `${greetTag}saw your FSBO listing.`,
      ``,
      `Most FSBO sellers we work with eventually deal with one of two issues — open-ended timeline or no buyer pool. We route through a marketed sale (Parks Auction & Realty, state-licensed) — defined sale date in 30-45 days, broad buyer market, you keep agent commission, buyer pays the premium.`,
      ``,
      `Want me to text you the math on what your house would clear? Reply yes or ignore. — Patrick / FALCO`,
    ].join("\n")
  } else if (isUnderwater) {
    // Underwater: payoff verification angle, no math claims.
    text = [
      `${greetTag}pulled the records on your house. Public data shows your loan payoff at or above current market value.`,
      ``,
      `That's usually wrong by $30-80K (recorded balance is stale, or it's stacking a HELOC). If you have your most recent mortgage statement handy, text me the actual payoff and I'll run the real numbers — wholesale vs marketed sale vs trustee sale.`,
      ``,
      `If the payoff is real, the cleanest path is a short sale negotiation before the trustee sale runs — different conversation. — Patrick / FALCO`,
    ].join("\n")
  } else {
    // Distressed default: brute honesty + the wholesaler trap.
    const dtsLine =
      dts !== null && dts > 0
        ? `Trustee sale in ${dts} days.`
        : dts !== null && dts <= 0
        ? `Trustee sale already passed — call me before another runs.`
        : `Pre-foreclosure on record.`

    const numbersLine =
      arv > 0
        ? `Cash wholesalers will offer ~${fmt(wholesaleNet)} take-home. Marketed sale projects ${fmt(auctionLow)}–${fmt(auctionHigh)}. Trustee sale = $0.`
        : `I'd rather you have the math than not.`

    text = [
      `${greetTag}${dtsLine}`,
      ``,
      `The wholesale offers don't get better — they get worse the closer the sale date gets. ${numbersLine}`,
      ``,
      `Reply for a one-page PDF with the breakdown, or ignore. — Patrick / FALCO`,
    ].join("\n")
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
