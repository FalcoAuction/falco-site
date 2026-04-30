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

  let body: { listingSlug?: string; customMessage?: string }
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

  const sellerEmail = (hr?.email || inventory?.ownerMail || "").trim()
  if (!sellerEmail) {
    return NextResponse.json(
      { error: "No email on file for this lead — cannot send follow-up." },
      { status: 400 }
    )
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
  let mathBlock = ""
  let mathTextBlock = ""
  let auctionLow = 0
  let auctionHigh = 0
  let auctionWorst = 0
  let wholesaleNet = 0
  if (arv > 0) {
    const inputs = defaultInputsFor(arv, payoff)
    const m = computeMath(inputs)
    auctionLow = m.auction.low.netToHomeowner
    auctionHigh = m.auction.high.netToHomeowner
    auctionWorst = m.auction.worst.netToHomeowner
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
  <div style="${headerStyle}">Path 1 · If you sold to a wholesaler today</div>
  <table style="${tableStyle}">
    <tr><td style="${labelStyle}">Property value (AVM)</td><td style="${valStyle}">${esc(fmtMath(arv))}</td></tr>
    <tr><td style="${labelStyle}">Wholesaler max offer (70% rule)</td><td style="${valStyle}">${esc(fmtMath(arv * 0.7))}</td></tr>
    <tr><td style="${labelStyle}">Less repairs estimate</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(inputs.repairs))}</td></tr>
    <tr><td style="${labelStyle}">Less assignment fee</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(inputs.assignmentFee))}</td></tr>
    <tr><td style="${labelStyle}">Less investor margin</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(inputs.investorMargin))}</td></tr>
    <tr><td style="${labelStyle}">Cash offer to you</td><td style="${valStyle}">${esc(fmtMath(m.wholesaler.cashOfferStandard))}</td></tr>
    <tr><td style="${labelStyle}">Less mortgage payoff (est.)</td><td style="${valStyle};color:#dc2626">−${esc(fmtMath(payoff))}</td></tr>
    <tr><td style="${totalLabelStyle}">Your take-home</td><td style="${totalValStyle}">${esc(fmtMath(wholesaleNet))}</td></tr>
  </table>
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
  PATH 1 · If you sold to a wholesaler today
    Property value (AVM):              ${fmtMath(arv)}
    Wholesaler max offer (70%):        ${fmtMath(arv * 0.7)}
    Less repairs estimate:           - ${fmtMath(inputs.repairs)}
    Less assignment fee:             - ${fmtMath(inputs.assignmentFee)}
    Less investor margin:            - ${fmtMath(inputs.investorMargin)}
    Cash offer to you:                 ${fmtMath(m.wholesaler.cashOfferStandard)}
    Less mortgage payoff (est.):     - ${fmtMath(payoff)}
    Your take-home:                    ${fmtMath(wholesaleNet)}

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
  const subject = `${streetName} — quick numbers worth seeing`

  // Optional caller-customized message — slips in naturally, no decoration
  const customLine = body.customMessage?.trim()
    ? `<p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">${esc(body.customMessage.trim())}</p>`
    : ""

  // Soft mention of the source — only when AVM is meaningful, otherwise
  // skip so the email isn't disclosing a number we can't compute
  const mathIntro =
    arv > 0
      ? `<p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
        Pulled together what we estimate you'd take home in three different scenarios for ${esc(address)}:
      </p>`
      : `<p style="margin:14px 0;color:#1e293b;font-size:15px;line-height:1.6">
        Wanted to put something in front of you about ${esc(address)} before any decisions get rushed.
      </p>`

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px 16px;background:#ffffff;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto">

  <p style="margin:0 0 14px;color:#1e293b;font-size:15px;line-height:1.6">Hi ${esc(greetingName)},</p>

  ${mathIntro}

  ${mathBlock}

  ${
    arv > 0
      ? `<p style="margin:14px 0;color:#475569;font-size:13px;line-height:1.6">
    Numbers are estimates from public data — they get sharper once we
    pull your actual mortgage payoff. But the spread between option 1
    and option 3 is usually where most homeowners leave money. The
    courthouse outcome is the one most folks don't see coming until
    it's too late to do anything about it.
  </p>`
      : ""
  }

  ${customLine}

  <p style="margin:18px 0 14px;color:#1e293b;font-size:15px;line-height:1.6">
    If anything in there looks off, or you want to talk through your
    specific situation, just reply to this email or text the number
    that called you. No pressure either way — I'd rather you have the
    math than not.
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

  const text = [
    `Hi ${greetingName},`,
    ``,
    arv > 0
      ? `Pulled together what we estimate you'd take home in three different scenarios for ${address}:`
      : `Wanted to put something in front of you about ${address} before any decisions get rushed.`,
    mathTextBlock,
    arv > 0
      ? `Numbers are estimates from public data — they get sharper once we pull your actual mortgage payoff. The spread between option 1 and option 3 is usually where most homeowners leave money. The courthouse outcome is the one most folks don't see coming until it's too late.`
      : "",
    body.customMessage?.trim() ? `\n${body.customMessage.trim()}` : "",
    ``,
    `If anything in there looks off, or you want to talk through your specific situation, just reply to this email or text the number that called you. No pressure either way — I'd rather you have the math than not.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
  ]
    .filter((line) => line !== "")
    .join("\n")

  // Send via Resend
  const result = await resendClient.emails.send({
    from: fromAddress(),
    to: [sellerEmail],
    replyTo: "falco@falco.llc",
    subject,
    html,
    text,
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
