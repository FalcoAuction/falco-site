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

  // Compute math for the email body
  const arv = hr?.property_value ?? inventory?.avmMid ?? 0
  const loan = inventory?.mortgageAmount ?? 0
  let mathBlock = ""
  let mathTextBlock = ""
  if (arv > 0) {
    const m = computeMath(defaultInputsFor(arv, loan))
    const auctionLow = m.auction.low.netToHomeowner
    const auctionHigh = m.auction.high.netToHomeowner
    const wholesaleNet = m.wholesaler.realisticNet

    mathBlock = `
<table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin:16px 0">
  <tr><td colspan="2" style="padding:12px 14px 4px;color:#1e293b;font-size:13px;font-weight:600">What we estimate you'd take home, three different ways:</td></tr>
  <tr>
    <td style="padding:6px 14px;color:#475569;font-size:13px">Wholesaler offer (typical 70% rule)</td>
    <td style="padding:6px 14px;color:#1e293b;font-size:13px;font-weight:600;text-align:right">${esc(fmtMath(wholesaleNet))}</td>
  </tr>
  <tr>
    <td style="padding:6px 14px;color:#475569;font-size:13px">If trustee sale runs (no listing)</td>
    <td style="padding:6px 14px;color:#dc2626;font-size:13px;font-weight:600;text-align:right">$0</td>
  </tr>
  <tr>
    <td style="padding:6px 14px 12px;color:#15803d;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0">Marketed auction (Parks Auction &amp; Realty)</td>
    <td style="padding:6px 14px 12px;color:#15803d;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #e2e8f0">${esc(fmtMath(auctionLow))} – ${esc(fmtMath(auctionHigh))}</td>
  </tr>
</table>`

    mathTextBlock = `
What we estimate you'd take home, three different ways:

  Wholesaler offer (typical 70% rule):  ${fmtMath(wholesaleNet)}
  If trustee sale runs (no listing):    $0
  Marketed auction (Parks):             ${fmtMath(auctionLow)} - ${fmtMath(auctionHigh)}
`
  }

  const callerName = firstName(session.caller) || "Chris"
  const subject = `Quick numbers on ${address}`

  // Optional caller-customized message
  const customLine = body.customMessage?.trim()
    ? `<p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.6">${esc(body.customMessage.trim())}</p>`
    : ""

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f1f5f9;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

  <p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.6">Hi ${esc(greetingName)},</p>

  <p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.6">
    ${esc(callerName)} here from FALCO — I tried to reach you earlier today about
    ${esc(address)}. Wanted to follow up by email since I know cold calls
    are easy to ignore.
  </p>

  <p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.6">
    Quick context: I work with Parks Auction &amp; Realty here in Nashville
    — the largest auction firm in the Southeast. We help homeowners in
    pre-foreclosure and foreclosure situations preserve a lot more of
    their equity than wholesalers offer. The math is usually pretty stark.
  </p>

  ${customLine}

  ${mathBlock}

  <p style="margin:14px 0;color:#475569;font-size:12px;line-height:1.5">
    Those numbers are estimates based on public data — they get sharper
    once we look at your actual mortgage payoff and property condition.
    But the spread is real, and the trustee sale outcome is the one
    most homeowners don't realize until it's too late.
  </p>

  <p style="margin:14px 0;color:#1e293b;font-size:14px;line-height:1.6">
    Worth 10 minutes on the phone? No pressure — I just want to make
    sure you've seen the actual options before any decisions get made.
    Easiest is to text or call me back at the number I rang from.
  </p>

  <p style="margin:14px 0;color:#1e293b;font-size:14px;line-height:1.6">
    — ${esc(callerName)}<br>
    <span style="color:#64748b;font-size:12px">FALCO &middot; falco@falco.llc</span>
  </p>

</div>

<div style="max-width:560px;margin:12px auto 0;text-align:center;color:#94a3b8;font-size:11px;line-height:1.5">
  This is a one-time follow-up regarding your property. If you'd prefer
  no further contact, just reply STOP and we'll remove you from outreach.
</div>
</body>
</html>`

  const text = [
    `Hi ${greetingName},`,
    ``,
    `${callerName} here from FALCO — I tried to reach you earlier today about ${address}. Wanted to follow up by email since I know cold calls are easy to ignore.`,
    ``,
    `Quick context: I work with Parks Auction & Realty here in Nashville — the largest auction firm in the Southeast. We help homeowners in pre-foreclosure and foreclosure situations preserve a lot more of their equity than wholesalers offer. The math is usually pretty stark.`,
    body.customMessage?.trim() ? `\n${body.customMessage.trim()}\n` : "",
    mathTextBlock,
    `Those numbers are estimates based on public data — they get sharper once we look at your actual mortgage payoff and property condition. But the spread is real, and the trustee sale outcome is the one most homeowners don't realize until it's too late.`,
    ``,
    `Worth 10 minutes on the phone? No pressure — I just want to make sure you've seen the actual options before any decisions get made. Easiest is to text or call me back at the number I rang from.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
    ``,
    `(If you'd prefer no further contact, reply STOP and we'll remove you.)`,
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
