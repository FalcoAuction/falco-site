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
  let mathBlock = ""
  let mathTextBlock = ""
  let auctionLow = 0
  let auctionHigh = 0
  let wholesaleNet = 0
  if (arv > 0) {
    const m = computeMath(defaultInputsFor(arv, loan))
    auctionLow = m.auction.low.netToHomeowner
    auctionHigh = m.auction.high.netToHomeowner
    wholesaleNet = m.wholesaler.realisticNet

    // Plain, scannable, no marketing decoration. Three lines, monospace
    // numbers, single light divider before the auction line. Reads like
    // someone who actually did the math, not a template.
    mathBlock = `
<div style="margin:18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.7">
    <tr>
      <td style="padding:4px 0;color:#475569">If you sold to a wholesaler today</td>
      <td style="padding:4px 0;color:#1e293b;text-align:right;font-variant-numeric:tabular-nums">${esc(fmtMath(wholesaleNet))}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#475569">If the trustee sale runs (no listing)</td>
      <td style="padding:4px 0;color:#1e293b;text-align:right;font-variant-numeric:tabular-nums">$0</td>
    </tr>
    <tr>
      <td style="padding:8px 0 4px;color:#475569;border-top:1px solid #e2e8f0">If we route it through a marketed auction</td>
      <td style="padding:8px 0 4px;color:#15803d;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;border-top:1px solid #e2e8f0">${esc(fmtMath(auctionLow))} – ${esc(fmtMath(auctionHigh))}</td>
    </tr>
  </table>
</div>`

    mathTextBlock = `
  If you sold to a wholesaler today:        ${fmtMath(wholesaleNet)}
  If the trustee sale runs (no listing):    $0
  If we route through a marketed auction:   ${fmtMath(auctionLow)} - ${fmtMath(auctionHigh)}
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
