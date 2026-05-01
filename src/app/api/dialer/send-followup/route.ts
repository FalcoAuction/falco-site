// POST /api/dialer/send-followup
// Send a personal-feel follow-up email to a homeowner from the dialer.
// Used after a no-answer / voicemail / "thinking about it" call to keep
// the lead warm with the math sheet and FALCO context in writing.
//
// Auto-logs as a dialer_activities row (channel=email, outcome=note_only).
// Caller authentication: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { recordActivity } from "@/lib/dialer-data"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { defaultInputsFor, computeMath, fmt as fmtMath } from "@/lib/math-sheet"
import { distressTypeLabel } from "@/lib/dialer-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const resendClient = (() => {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
})()

function fromAddress(): string {
  return process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"
}

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function firstName(full: string): string {
  const trimmed = (full || "").trim()
  if (!trimmed) return ""
  const first = trimmed.split(/\s+/)[0]
  // Title-case if it's all caps
  if (first === first.toUpperCase()) {
    return first.charAt(0) + first.slice(1).toLowerCase()
  }
  return first
}

export async function POST(req: NextRequest) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: {
    listingSlug?: string
    customMessage?: string
    testRecipient?: string  // Override recipient for QA tests. Auth-gated.
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const slug = (body.listingSlug ?? "").trim()
  if (!slug) {
    return NextResponse.json({ error: "listingSlug required." }, { status: 400 })
  }

  if (!resendClient) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured." },
      { status: 500 }
    )
  }

  // Pull lead context
  const inventory = await findDialerInventoryLead(slug)
  type HRSnapshot = {
    email: string | null
    full_name: string | null
    owner_name_records: string | null
    property_value: number | null
  }
  let hr: HRSnapshot | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select("email, full_name, owner_name_records, property_value")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) hr = data as unknown as HRSnapshot
  }

  // Test-recipient override — lets QA fire the email to a target inbox
  // without spamming the real homeowner. Requires the dialer session
  // (already enforced above) so it can't be abused publicly. Logged so
  // we can audit any test fires.
  const testOverride = (body.testRecipient ?? "").trim().toLowerCase()
  const realEmail = (hr?.email || inventory?.ownerMail || "").trim()
  const sellerEmail = testOverride && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testOverride)
    ? testOverride
    : realEmail

  if (!sellerEmail) {
    return NextResponse.json(
      { error: "No email on file for this lead — cannot send follow-up." },
      { status: 400 }
    )
  }
  if (testOverride) {
    console.log(`[send-followup TEST] override recipient → ${testOverride} (real: ${realEmail || "none"})`)
  }

  const ownerFullName =
    hr?.full_name || hr?.owner_name_records || inventory?.ownerName || ""
  const greetingName = firstName(ownerFullName) || "there"
  const address = inventory?.address || "your property"
  const distress = distressTypeLabel(inventory?.distressType).label

  // Pull the street name for a more conversational subject
  const streetName = (() => {
    const m = address.match(/^[\d-]+\s+([^,]+)/)
    return m ? m[1].trim() : address.split(",")[0]
  })()

  // Compute math for the email body
  const arv = hr?.property_value ?? inventory?.avmMid ?? 0
  const loan = inventory?.mortgageAmount ?? 0
  // Estimate current mortgage payoff via simple amortization at 4%, default
  // 0.93 of original if mortgage date unknown.
  const mortgageDate = inventory?.mortgageDate || ""
  let payoff = loan
  if (loan > 0) {
    const start = mortgageDate ? new Date(mortgageDate).getTime() : NaN
    if (Number.isFinite(start)) {
      const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
      const r = 0.04 / 12
      const n = 360
      const paid = Math.min(yrs * 12, n)
      const remaining =
        (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
      payoff = Math.round(loan * remaining)
    } else {
      payoff = Math.round(loan * 0.93)
    }
  }
  // Underwater detection — if estimated payoff is at or near AVM, all
  // pitches that quote a "you'll net $X" number are misleading. Public-
  // records mortgage_balance is often stale or includes stacked liens
  // (HELOCs, second mortgages), so we'd rather verify with the homeowner
  // than send a math sheet that shows negative take-home.
  const isUnderwater = arv > 0 && payoff > arv * 0.90

  let mathBlock = ""
  let mathTextBlock = ""
  let auctionLow = 0
  let auctionHigh = 0
  let auctionWorst = 0
  let wholesaleNet = 0
  if (arv > 0 && !isUnderwater) {
    const inputs = defaultInputsFor(arv, payoff)
    const m = computeMath(inputs)
    // Clamp at $0 — never display negative take-home in the email even
    // if raw arithmetic goes underwater on the worst-case scenario.
    auctionLow = Math.max(0, m.auction.low.netToHomeowner)
    auctionHigh = Math.max(0, m.auction.high.netToHomeowner)
    auctionWorst = Math.max(0, m.auction.worst.netToHomeowner)
    wholesaleNet = m.wholesaler.realisticNet

    // Full math sheet inline. Reads like someone showed you their
    // calculation — three sections, line-item breakdown, monospace
    // numbers so they line up. Same data the homeowner would see if
    // Chris walked them through the printed math sheet on a call.
    const sectionStyle =
      "margin:0 0 16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden"
    const headerStyle =
      "padding:10px 14px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase"
    const tableStyle =
      "width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;font-variant-numeric:tabular-nums"
    const labelStyle = "padding:6px 14px;color:#475569"
    const valStyle = "padding:6px 14px;color:#1e293b;text-align:right"
    const totalLabelStyle =
      "padding:10px 14px 12px;color:#1e293b;font-weight:600;border-top:1px solid #e2e8f0"
    const totalValStyle =
      "padding:10px 14px 12px;color:#1e293b;font-weight:700;text-align:right;border-top:1px solid #e2e8f0"

    mathBlock = `
<!-- WHOLESALER PATH -->
<div style="${sectionStyle}">
  <div style="${headerStyle}">Path 1 · Cash wholesaler offer</div>
  <table style="${tableStyle}">
    <tr><td style="${labelStyle}">Property value (AVM)</td><td style="${valStyle}">${esc(fmtMath(arv))}</td></tr>
    <tr><td style="${labelStyle}">Cash offer to you (real distressed comps)</td><td style="${valStyle}">${esc(fmtMath(m.wholesaler.cashOfferStandard))}</td></tr>
    <tr><td style="${labelStyle}">Less mortgage payoff (est.)</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(payoff))}</td></tr>
    <tr><td style="${totalLabelStyle}">Your take-home</td><td style="${totalValStyle}">${esc(fmtMath(wholesaleNet))}</td></tr>
  </table>
  <div style="padding:8px 14px 12px;color:#94a3b8;font-size:11px;line-height:1.5">Reflects what TN cash buyers actually offer on distressed properties (45-55% of market). Not the textbook 70%-rule formula — that's what investors pay wholesalers, not what wholesalers pay you.</div>
</div>

<!-- TRUSTEE PATH -->
<div style="${sectionStyle}">
  <div style="${headerStyle}">Path 2 · If the trustee sale runs (no listing)</div>
  <div style="padding:12px 14px;color:#475569;font-size:14px;line-height:1.6">
    Sells at the courthouse steps for whatever the bank needs to recover.
    Typically wipes the equity. After the bank is paid, the homeowner gets
    what's left — almost always <strong style="color:#dc2626">$0</strong>
    in distressed scenarios.
  </div>
</div>

<!-- AUCTION PATH -->
<div style="${sectionStyle};border-color:#bbf7d0;background:#f0fdf4">
  <div style="${headerStyle};background:#dcfce7;color:#166534">Path 3 · If we route it through a marketed auction</div>
  <table style="${tableStyle}">
    <tr><td style="${labelStyle}">Property value (AVM)</td><td style="${valStyle}">${esc(fmtMath(arv))}</td></tr>
    <tr><td style="${labelStyle}">Modeled clearance range</td><td style="${valStyle}">80% – 88%</td></tr>
    <tr><td style="${labelStyle}">Winning bid range</td><td style="${valStyle}">${esc(fmtMath(arv * 0.8))} – ${esc(fmtMath(arv * 0.88))}</td></tr>
    <tr><td style="${labelStyle}">Less mortgage payoff (est.)</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(payoff))}</td></tr>
    <tr><td style="${labelStyle}">Less closing costs</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(inputs.closingCosts))}</td></tr>
    <tr><td style="${totalLabelStyle};color:#15803d">Your take-home</td><td style="${totalValStyle};color:#15803d">${esc(fmtMath(auctionLow))} – ${esc(fmtMath(auctionHigh))}</td></tr>
  </table>
  ${
    m.auction.worstStillBeatsWholesaler
      ? `<div style="padding:10px 14px;background:#dcfce7;color:#166534;font-size:13px;line-height:1.5">
        <strong>Even at a worst-case auction (~70% clearance):</strong> you'd still net
        <strong>${esc(fmtMath(auctionWorst))}</strong> — better than the wholesaler offer.
      </div>`
      : `<div style="padding:10px 14px;background:#dcfce7;color:#166534;font-size:13px;line-height:1.5">
        Worst-case auction (~70% clearance): ${esc(fmtMath(auctionWorst))}
      </div>`
  }
</div>`

    mathTextBlock = `
  PATH 1 · Cash wholesaler offer
    Property value (AVM):              ${fmtMath(arv)}
    Cash offer (real distressed comps): ${fmtMath(m.wholesaler.cashOfferStandard)}
    Less mortgage payoff (est.):     - ${fmtMath(payoff)}
    Your take-home:                    ${fmtMath(wholesaleNet)}
    (Reflects what TN cash buyers actually offer — 45-55% of market.
     Not the textbook 70% rule — that's what investors pay wholesalers,
     not what wholesalers pay you.)

  PATH 2 · If the trustee sale runs (no listing)
    Sells at courthouse for whatever the bank needs to recover.
    Typically wipes the equity. Almost always $0 to the homeowner.

  PATH 3 · If we route it through a marketed auction
    Property value (AVM):              ${fmtMath(arv)}
    Modeled clearance range:           80% - 88%
    Winning bid range:                 ${fmtMath(arv * 0.8)} - ${fmtMath(arv * 0.88)}
    Less mortgage payoff (est.):     - ${fmtMath(payoff)}
    Less closing costs:              - ${fmtMath(inputs.closingCosts)}
    Your take-home:                    ${fmtMath(auctionLow)} - ${fmtMath(auctionHigh)}
    Even at worst-case auction (~70%): ${fmtMath(auctionWorst)}
`
  }

  const callerName = firstName(session.caller) || "Patrick"

  // Branch: FSBO sellers need a different pitch than distressed/foreclosure.
  // FSBO are already actively selling — no wholesale pressure, no urgency.
  // Distressed homeowners face foreclosure timeline + wholesalers circling.
  // Underwater homeowners need payoff verification before any model runs.
  const isFSBO = (inventory?.distressType || "").toUpperCase() === "FSBO"

  const subject = isUnderwater
    ? `${streetName} — quick question on your mortgage payoff`
    : isFSBO
    ? `${streetName} — quick note on your FSBO listing`
    : `${streetName} — quick numbers worth seeing`

  // Optional caller-customized message — slips in naturally, no decoration
  const customLine = body.customMessage?.trim()
    ? `<p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">${esc(body.customMessage.trim())}</p>`
    : ""

  // ─────────────────────────────────────────────────────────────────────
  // BODY VARIANT A: FSBO seller
  // They're actively selling on their own, no wholesale pressure, no
  // foreclosure deadline. Different pitch entirely — focus on the
  // tradeoffs FSBO sellers actually feel: open-ended timeline, managing
  // showings, no broad buyer pool. Auction = certainty + speed + buyer
  // pays the premium. Soft, conversational, no math sheet.
  // ─────────────────────────────────────────────────────────────────────
  const fsboHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px 16px;background:#ffffff;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto">

  <p style="margin:0 0 14px;color:#1e293b;font-size:15px;line-height:1.6">Hi ${esc(greetingName)},</p>

  <p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
    Saw your property at ${esc(address)} is listed for sale by owner.
    Most folks in your spot are doing it to keep more of the sale price
    (no 6% agent commission), but the trade-off is the open-ended
    timeline and managing inquiries yourself.
  </p>

  <p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
    If you've been at it a while, or just want a different option on
    the table, we route properties like yours through marketed auction
    with Parks Auction &amp; Realty here in Nashville. A few things that
    tend to make sense for FSBO sellers:
  </p>

  <ul style="margin:14px 0;padding-left:20px;color:#1e293b;font-size:15px;line-height:1.7">
    <li>Defined sale date — typically 30-45 days from listing to close</li>
    <li>The buyer pays the premium, so your sale price stays cleaner</li>
    <li>Broad buyer pool — Parks has 40K+ active investors on their list</li>
    <li>No showings, no repeated negotiations</li>
  </ul>

  ${customLine}

  <p style="margin:18px 0 14px;color:#1e293b;font-size:15px;line-height:1.6">
    Won't always be the right move — depends on your situation. If
    it's worth a quick conversation, just reply or text the number
    that called you. No pressure either way.
  </p>

  <p style="margin:18px 0 8px;color:#1e293b;font-size:15px;line-height:1.6">
    — ${esc(callerName)}
  </p>
  <p style="margin:0;color:#64748b;font-size:12px">
    FALCO · falco@falco.llc
  </p>

</div>
</body>
</html>`

  const fsboText = [
    `Hi ${greetingName},`,
    ``,
    `Saw your property at ${address} is listed for sale by owner. Most folks in your spot are doing it to keep more of the sale price (no 6% agent commission), but the trade-off is the open-ended timeline and managing inquiries yourself.`,
    ``,
    `If you've been at it a while, or just want a different option on the table, we route properties like yours through marketed auction with Parks Auction & Realty here in Nashville. A few things that tend to make sense for FSBO sellers:`,
    ``,
    `  • Defined sale date — typically 30-45 days from listing to close`,
    `  • The buyer pays the premium, so your sale price stays cleaner`,
    `  • Broad buyer pool — Parks has 40K+ active investors on their list`,
    `  • No showings, no repeated negotiations`,
    ``,
    body.customMessage?.trim() ? body.customMessage.trim() : "",
    ``,
    `Won't always be the right move — depends on your situation. If it's worth a quick conversation, just reply or text the number that called you. No pressure either way.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
  ]
    .filter((line) => line !== "")
    .join("\n")

  // ─────────────────────────────────────────────────────────────────────
  // BODY VARIANT B: Distressed (TRUSTEE_NOTICE / LIS_PENDENS / NOD / etc.)
  // Brute-honest opener: three numbers up front, named the trap, full
  // math sheet attached as PDF + embedded for inline reading. No soft
  // intro, no "no pressure" close — homeowners in distress want clarity,
  // not a hand on the shoulder.
  // ─────────────────────────────────────────────────────────────────────

  // Brutal opener: state the situation, name the wholesale trap, give
  // the three numbers in a one-line summary. Math detail follows below.
  const distressedOpener =
    arv > 0
      ? `<p style="margin:0 0 14px;color:#1e293b;font-size:15px;line-height:1.6">
          The wholesale offers calling you don't get better — they get worse as the sale date gets closer. Here's what your house actually clears via marketed sale vs. what they're offering vs. doing nothing:
        </p>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <tr><td style="padding:10px 14px;color:#475569;font-size:13px;width:65%">Cash wholesaler — your take-home</td><td style="padding:10px 14px;color:#991b1b;font-size:14px;font-weight:600;text-align:right">${esc(fmtMath(wholesaleNet))}</td></tr>
          <tr><td style="padding:10px 14px;color:#475569;font-size:13px;border-top:1px solid #e2e8f0">Trustee sale (do nothing)</td><td style="padding:10px 14px;color:#52525b;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">$0</td></tr>
          <tr><td style="padding:10px 14px;color:#475569;font-size:13px;border-top:1px solid #e2e8f0">Marketed sale — your take-home</td><td style="padding:10px 14px;color:#15803d;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #e2e8f0">${esc(fmtMath(auctionLow))} – ${esc(fmtMath(auctionHigh))}</td></tr>
        </table>
        <p style="margin:0 0 18px;color:#475569;font-size:13px;line-height:1.6">One-page PDF attached with the full breakdown. Numbers below are the same data in case the PDF doesn't render in your client.</p>`
      : `<p style="margin:0 0 14px;color:#1e293b;font-size:15px;line-height:1.6">
          You're on the trustee-sale list for ${esc(address)}. We can't model your numbers without the AVM yet — but the wholesale offers calling you aren't your only option, and the trustee sale isn't either. Reply with your most recent mortgage statement and we'll run the real math within the day.
        </p>`

  const distressedHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px 16px;background:#ffffff;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:580px;margin:0 auto">

  ${distressedOpener}

  ${mathBlock}

  ${customLine}

  <p style="margin:18px 0 14px;color:#1e293b;font-size:14px;line-height:1.55">
    Reply or text back if you want to talk through it. If you don't, I'm not going to keep emailing — wanted you to have the actual math once.
  </p>

  <p style="margin:18px 0 8px;color:#1e293b;font-size:14px;line-height:1.6">
    — ${esc(callerName)}<br/>
    <span style="color:#64748b;font-size:12px">FALCO · falco@falco.llc</span>
  </p>

</div>
</body>
</html>`

  const distressedText = [
    arv > 0
      ? `The wholesale offers calling you don't get better — they get worse as the sale date gets closer. Here's what your house actually clears, three ways:`
      : `You're on the trustee-sale list for ${address}. We can't model your numbers without the AVM yet — but the wholesale offers calling you aren't your only option, and the trustee sale isn't either. Reply with your most recent mortgage statement and we'll run the real math within the day.`,
    arv > 0 ? `` : null,
    arv > 0 ? `  Cash wholesaler — your take-home:  ${fmtMath(wholesaleNet)}` : null,
    arv > 0 ? `  Trustee sale (do nothing):         $0` : null,
    arv > 0 ? `  Marketed sale — your take-home:    ${fmtMath(auctionLow)} – ${fmtMath(auctionHigh)}` : null,
    arv > 0 ? `` : null,
    arv > 0 ? `One-page PDF attached with the full breakdown.` : null,
    mathTextBlock,
    body.customMessage?.trim() ? `\n${body.customMessage.trim()}` : "",
    ``,
    `Reply or text back if you want to talk through it. If you don't, I'm not going to keep emailing — wanted you to have the actual math once.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
  ]
    .filter((line): line is string => line !== null && line !== "")
    .join("\n")

  // ─────────────────────────────────────────────────────────────────────
  // BODY VARIANT C: Underwater
  // Public-records mortgage_balance shows payoff at or above market.
  // Could be real, could be stale data / stacked liens. Either way the
  // math sheet pitch fails — they'd see negative take-home and trash it.
  // Short, no math, asks for the actual payoff letter so we can re-model.
  // ─────────────────────────────────────────────────────────────────────
  const underwaterHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px 16px;background:#ffffff;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto">

  <p style="margin:0 0 14px;color:#1e293b;font-size:15px;line-height:1.6">Hi ${esc(greetingName)},</p>

  <p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
    Pulled what I could on ${esc(address)} from public records. Based on
    what's filed, your loan payoff looks like it's right around — or
    above — the current market value of the house.
  </p>

  <p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
    Two things that's usually true:
  </p>

  <ul style="margin:14px 0;padding-left:20px;color:#1e293b;font-size:15px;line-height:1.7">
    <li>The recorded balance is often stale by years, or it stacks a HELOC on top of the first mortgage. Your real payoff might be $30K–$80K lower.</li>
    <li>If the payoff really is at or above market, the cleanest path is usually a short-sale negotiation with your lender before the trustee sale runs — they often write off the deficiency rather than take the property back.</li>
  </ul>

  ${customLine}

  <p style="margin:18px 0 14px;color:#1e293b;font-size:15px;line-height:1.6">
    Easiest way to get clarity: pull your most recent mortgage statement
    (or call the servicer's payoff line) and reply with the actual
    number. I'll re-run the comparison with real data — takes me about
    ten minutes — and we'll know exactly which path makes sense.
  </p>

  <p style="margin:14px 0;color:#475569;font-size:13px;line-height:1.6">
    No pressure, no sales pitch. If you'd rather just text me back the payoff number, that works too.
  </p>

  <p style="margin:18px 0 8px;color:#1e293b;font-size:15px;line-height:1.6">
    — ${esc(callerName)}
  </p>
  <p style="margin:0;color:#64748b;font-size:12px">
    FALCO · falco@falco.llc
  </p>

</div>
</body>
</html>`

  const underwaterText = [
    `Hi ${greetingName},`,
    ``,
    `Pulled what I could on ${address} from public records. Based on what's filed, your loan payoff looks like it's right around — or above — the current market value of the house.`,
    ``,
    `Two things that's usually true:`,
    ``,
    `  • The recorded balance is often stale by years, or it stacks a HELOC on top of the first mortgage. Your real payoff might be $30K-$80K lower.`,
    `  • If the payoff really is at or above market, the cleanest path is usually a short-sale negotiation with your lender before the trustee sale runs — they often write off the deficiency rather than take the property back.`,
    ``,
    body.customMessage?.trim() ? body.customMessage.trim() : "",
    ``,
    `Easiest way to get clarity: pull your most recent mortgage statement (or call the servicer's payoff line) and reply with the actual number. I'll re-run the comparison with real data — takes me about ten minutes — and we'll know exactly which path makes sense.`,
    ``,
    `No pressure, no sales pitch. If you'd rather just text me back the payoff number, that works too.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
  ]
    .filter((line) => line !== "")
    .join("\n")

  const html = isUnderwater ? underwaterHtml : isFSBO ? fsboHtml : distressedHtml
  const text = isUnderwater ? underwaterText : isFSBO ? fsboText : distressedText

  // Build the math PNG for distressed leads. Same image the dialer
  // attaches to SMS — keeps the homeowner's view of the math identical
  // across channels (SMS image inline + email image attachment + future
  // print). One asset, not two — and PNG renders reliably in every
  // email client (PDF inline rendering is patchy in Outlook + Gmail).
  let pngAttachment: { filename: string; content: string } | null = null
  if (!isFSBO && !isUnderwater && arv > 0) {
    try {
      // Internal fetch to our own /math-png route. Vercel keeps this
      // in-region so latency is ~50ms. Forwards the dialer cookie so
      // the route's auth check passes.
      const origin =
        process.env.FALCO_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
        new URL(req.url).origin
      const cookieHeader = req.headers.get("cookie") || ""
      const pngRes = await fetch(`${origin}/api/dialer/${slug}/math-png`, {
        headers: { cookie: cookieHeader },
      })
      if (pngRes.ok) {
        const pngBuf = Buffer.from(await pngRes.arrayBuffer())
        const filenameBase = address
          .toLowerCase()
          .replace(/,.*$/, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60)
        pngAttachment = {
          filename: `math-${filenameBase}.png`,
          content: pngBuf.toString("base64"),
        }
      } else {
        console.error("send-followup PNG fetch failed:", pngRes.status)
      }
    } catch (err) {
      console.error("send-followup PNG build failed (sending without):", err)
    }
  }

  // Send via Resend
  const result = await resendClient.emails.send({
    from: fromAddress(),
    to: [sellerEmail],
    replyTo: "falco@falco.llc",
    subject,
    html,
    text,
    ...(pngAttachment ? { attachments: [pngAttachment] } : {}),
  })

  if (result.error) {
    console.error("send-followup Resend error:", result.error)
    return NextResponse.json(
      { error: `Email send failed: ${String(result.error)}` },
      { status: 500 }
    )
  }

  // Log as dialer activity (channel=email, outcome=note_only) for audit trail
  await recordActivity({
    listingSlug: slug,
    channel: "email",
    outcome: "note_only",
    notes: `Follow-up email sent to ${sellerEmail}${
      body.customMessage ? ` · custom note: "${body.customMessage.slice(0, 100)}"` : ""
    }`,
    createdBy: session.caller,
  })

  return NextResponse.json({
    ok: true,
    sentTo: sellerEmail,
    distress,
  })
}
