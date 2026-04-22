import { Resend } from "resend"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

// ============================================================================
// Shared helpers
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normEmail(e: string): string {
  return e.trim().toLowerCase()
}

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

// ============================================================================
// Email layer — Resend
// ----------------------------------------------------------------------------
// We send via Resend's API instead of SMTP because GoDaddy / M365 SMTP auth
// is a hostile experience. Resend signs mail as falco.llc via DNS records, so
// notifications appear to come from falco@falco.llc (or whatever FALCO_FROM
// is set to) without anyone touching SMTP credentials.
//
// Required env vars (set in Vercel):
//   RESEND_API_KEY           the API key starting with "re_..."
//   FALCO_INBOUND_NOTIFY_TO  recipient (e.g. falco@falco.llc)
//
// Optional:
//   FALCO_FROM_EMAIL         override sender. Default: "FALCO <falco@falco.llc>"
// ============================================================================

const resendClient = (() => {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
})()

function notifyRecipient(): string | null {
  return (
    process.env.FALCO_INBOUND_NOTIFY_TO?.trim() ||
    process.env.FALCO_DIGEST_TO?.trim() ||
    null
  )
}

function fromAddress(): string {
  return process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"
}

async function sendNotificationEmail(subject: string, html: string, text: string) {
  const recipient = notifyRecipient()
  if (!recipient) {
    console.warn("inbound notify skipped: FALCO_INBOUND_NOTIFY_TO not set")
    return
  }
  if (!resendClient) {
    console.warn("inbound notify skipped: RESEND_API_KEY not set")
    return
  }
  try {
    const result = await resendClient.emails.send({
      from: fromAddress(),
      to: [recipient],
      replyTo: recipient,
      subject,
      html,
      text,
    })
    if (result.error) {
      console.error("resend send failed:", result.error)
    }
  } catch (err) {
    console.error("inbound notify email failed:", err)
  }
}

/**
 * Sends a branded confirmation email back to the form submitter so they
 * know their submission landed and what to expect next. Reply-to is set
 * to the FALCO ops inbox so any reply comes straight to us.
 */
async function sendConfirmationEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  if (!resendClient) return
  try {
    const result = await resendClient.emails.send({
      from: fromAddress(),
      to: [to],
      replyTo: notifyRecipient() ?? "falco@falco.llc",
      subject,
      html,
      text,
    })
    if (result.error) {
      console.error("confirmation send failed:", result.error)
    }
  } catch (err) {
    console.error("confirmation email failed:", err)
  }
}

/**
 * Wraps a confirmation body in the FALCO email shell. Pass in the friendly
 * intro, an optional key/value details block, and the closer paragraph.
 */
function confirmationTemplate({
  greeting,
  intro,
  details,
  detailsLabel,
  echoMessage,
  closer,
}: {
  greeting: string
  intro: string
  details?: Array<{ label: string; value: string }>
  detailsLabel?: string
  /** Optional: echo back a multi-line message the user typed (for the
   *  general-inquiry form so they can see what we received). */
  echoMessage?: string
  closer: string
}): { html: string; text: string } {
  const detailRows = (details ?? [])
    .filter((d) => d.value && d.value.trim())
    .map(
      (d) =>
        `<tr><td style="padding:10px 14px;color:#9ca3af;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;width:160px;vertical-align:top">${esc(
          d.label
        )}</td><td style="padding:10px 14px;color:#fff;font-size:14px">${esc(
          d.value
        )}</td></tr>`
    )
    .join("")

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#060606;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden">
  <div style="padding:24px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:11px;letter-spacing:0.32em;color:#10b981;font-weight:700;text-transform:uppercase">FALCO</div>
    <div style="font-size:22px;font-weight:600;color:#fff;margin-top:10px;line-height:1.2">${esc(greeting)}</div>
  </div>
  <div style="padding:22px 28px 4px">
    <p style="margin:0;color:#d1d5db;font-size:15px;line-height:1.65">${esc(intro)}</p>
  </div>
  ${
    detailRows
      ? `<div style="padding:18px 28px 0">
           <div style="font-size:10px;letter-spacing:0.22em;color:#10b981;text-transform:uppercase;margin-bottom:8px;font-weight:600">${esc(detailsLabel ?? "What you sent us")}</div>
           <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:8px">
             ${detailRows}
           </table>
         </div>`
      : ""
  }
  ${
    echoMessage && echoMessage.trim()
      ? `<div style="padding:18px 28px 0">
           <div style="font-size:10px;letter-spacing:0.22em;color:#10b981;text-transform:uppercase;margin-bottom:8px;font-weight:600">Your message</div>
           <div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;color:#e5e7eb;font-size:14px;line-height:1.6;white-space:pre-wrap;font-family:inherit">${esc(echoMessage.trim())}</div>
         </div>`
      : ""
  }
  <div style="padding:22px 28px 28px">
    <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.65">${esc(closer)}</p>
    <p style="margin:18px 0 0;color:#9ca3af;font-size:13px;line-height:1.65">Reply to this email anytime — it goes straight to us.<br/><span style="color:#6b7280">— The FALCO team</span></p>
  </div>
  <div style="padding:14px 28px;border-top:1px solid rgba(255,255,255,0.06);color:#4b5563;font-size:11px;text-align:center;letter-spacing:0.16em;text-transform:uppercase">FALCO · Tennessee · falco.llc</div>
</div>
</body></html>`

  const text = [
    greeting,
    "",
    intro,
    ...(details && detailRows
      ? [
          "",
          `${detailsLabel ?? "What you sent us"}:`,
          ...details
            .filter((d) => d.value && d.value.trim())
            .map((d) => `  ${d.label}: ${d.value}`),
        ]
      : []),
    ...(echoMessage && echoMessage.trim()
      ? ["", "Your message:", echoMessage.trim()]
      : []),
    "",
    closer,
    "",
    "Reply to this email anytime — it goes straight to us.",
    "— The FALCO team",
    "",
    "FALCO · Tennessee · falco.llc",
  ].join("\n")

  return { html, text }
}

/** First name extracted from a full name, for friendly greetings. */
function firstName(full: string): string {
  return (full.trim().split(/\s+/)[0] || full.trim()).slice(0, 40)
}

/** "2026-05-14" → "May 14, 2026" for human-friendly date display. */
function fmtDateHuman(iso: string | null | undefined): string {
  if (!iso) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mm, d] = m
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const monthIdx = Number(mm) - 1
  if (monthIdx < 0 || monthIdx > 11) return iso
  return `${months[monthIdx]} ${Number(d)}, ${y}`
}

// ============================================================================
// Homeowner request
// ============================================================================

export type HomeownerRequestInput = {
  email: string
  fullName: string
  phone?: string
  propertyAddress?: string
  county?: string
  trusteeSaleDate?: string | null
  mortgageBalance?: number | null
  bestCallback?: string
  situationNotes?: string
  referrer?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export type SubmitResult =
  | { ok: true; id: string; alreadyExisted: boolean; message: string }
  | { ok: false; error: string }

export async function submitHomeownerRequest(
  input: HomeownerRequestInput
): Promise<SubmitResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Database not configured." }
  }
  const email = normEmail(input.email)
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required so we can follow up." }
  }
  if (!input.fullName?.trim()) {
    return { ok: false, error: "Please tell us your name." }
  }

  const row = {
    email,
    full_name: input.fullName.trim(),
    phone: (input.phone ?? "").trim(),
    property_address: (input.propertyAddress ?? "").trim(),
    county: (input.county ?? "").trim(),
    trustee_sale_date: input.trusteeSaleDate || null,
    mortgage_balance: input.mortgageBalance ?? null,
    best_callback: (input.bestCallback ?? "").trim(),
    situation_notes: (input.situationNotes ?? "").trim(),
    referrer: (input.referrer ?? "").trim(),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  // Detect existing record on (email, property)
  const { data: existing } = await supabaseAdmin
    .from("homeowner_requests")
    .select("id")
    .eq("email", email)
    .eq("property_address", row.property_address)
    .maybeSingle()
  const alreadyExisted = Boolean(existing)

  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .upsert(row, { onConflict: "email,property_address" })
    .select("id")
    .single()
  if (error) {
    console.error("submitHomeownerRequest error:", error.message)
    return { ok: false, error: `Submission failed: ${error.message}` }
  }

  // Notify FALCO ops
  const subject = `🏠 Homeowner request: ${row.full_name}${row.trustee_sale_date ? ` (sale ${row.trustee_sale_date})` : ""}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
<div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · New Homeowner Request</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(row.full_name)}</div>
<div style="font-size:13px;color:#888;margin-top:2px">${esc(email)}${row.phone ? ` · ${esc(row.phone)}` : ""}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-top:16px;background:#111;border-radius:6px">
${row.property_address ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;width:170px">Property</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.property_address)}</td></tr>` : ""}
${row.county ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">County</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.county)}</td></tr>` : ""}
${row.trustee_sale_date ? `<tr><td style="padding:8px 12px;color:#f59e0b;font-size:12px;font-weight:600">Trustee sale date</td><td style="padding:8px 12px;color:#f59e0b;font-size:13px;font-weight:600">${esc(row.trustee_sale_date)}</td></tr>` : ""}
${row.mortgage_balance ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Est. mortgage balance</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(fmtCurrency(row.mortgage_balance))}</td></tr>` : ""}
${row.best_callback ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Best callback</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.best_callback)}</td></tr>` : ""}
${row.referrer ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Found us via</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.referrer)}</td></tr>` : ""}
${row.situation_notes ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;vertical-align:top">Situation</td><td style="padding:8px 12px;color:#fff;font-size:13px;white-space:pre-wrap">${esc(row.situation_notes)}</td></tr>` : ""}
</table>
<div style="color:#555;font-size:10px;text-align:center;margin-top:16px">FALCO · homeowner inbound ${alreadyExisted ? "(updated)" : "(new)"}</div>
</div></body></html>`
  const text = [
    `New homeowner request: ${row.full_name}`,
    `Email: ${email}`,
    row.phone ? `Phone: ${row.phone}` : "",
    row.property_address ? `Property: ${row.property_address}` : "",
    row.county ? `County: ${row.county}` : "",
    row.trustee_sale_date ? `Trustee sale: ${row.trustee_sale_date}` : "",
    row.mortgage_balance ? `Est. balance: ${fmtCurrency(row.mortgage_balance)}` : "",
    row.best_callback ? `Best callback: ${row.best_callback}` : "",
    row.referrer ? `Via: ${row.referrer}` : "",
    row.situation_notes ? `\nSituation:\n${row.situation_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  // Confirmation back to the homeowner
  const homeownerConfirm = confirmationTemplate({
    greeting: `${firstName(row.full_name)}, we got your request.`,
    intro:
      "Thanks for reaching out. We're going to pull the public records on your property and put together the actual math for your situation. You'll hear from us within one business day.",
    details: [
      { label: "Property", value: row.property_address },
      { label: "County", value: row.county },
      { label: "Trustee sale date", value: fmtDateHuman(row.trustee_sale_date) },
      {
        label: "Est. mortgage balance",
        value: row.mortgage_balance ? fmtCurrency(row.mortgage_balance) : "",
      },
      { label: "Best callback", value: row.best_callback },
    ],
    closer:
      "When we come back, we'll show you what your home would clear at a marketed auction (run by a state-licensed Tennessee auction firm), what you'd walk away with after the loan is paid, and how that compares to letting the trustee sale go through. If the auction route doesn't fit your situation, we'll tell you that plainly.",
  })
  // Send notification + confirmation in parallel, but AWAIT both so the
  // serverless function doesn't tear down before the HTTP requests to
  // Resend complete. Fire-and-forget on Vercel is a race we lose.
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "We got your FALCO request — math coming within one business day",
      homeownerConfirm.html,
      homeownerConfirm.text
    ),
  ])

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted,
    message: alreadyExisted
      ? "Got it. We updated your request and will be in touch within one business day with the math on what your home would clear at a marketed auction."
      : "Got it. We'll be in touch within one business day with the math on your specific situation — what your home would clear at a marketed auction vs. what you'd lose at the trustee sale.",
  }
}

// ============================================================================
// General inquiry (anything else)
// ============================================================================

export type GeneralInquiryInput = {
  email: string
  fullName: string
  phone?: string
  company?: string
  topic?: string
  message?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export async function submitGeneralInquiry(
  input: GeneralInquiryInput
): Promise<SubmitResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Database not configured." }
  }
  const email = normEmail(input.email)
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required." }
  }
  if (!input.fullName?.trim()) {
    return { ok: false, error: "Please tell us your name." }
  }
  if (!input.message?.trim()) {
    return { ok: false, error: "Please tell us what's on your mind." }
  }

  const row = {
    email,
    full_name: input.fullName.trim(),
    phone: (input.phone ?? "").trim(),
    company: (input.company ?? "").trim(),
    topic: (input.topic ?? "").trim(),
    message: (input.message ?? "").trim(),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from("general_inquiries")
    .insert(row)
    .select("id")
    .single()
  if (error) {
    console.error("submitGeneralInquiry error:", error.message)
    return { ok: false, error: `Submission failed: ${error.message}` }
  }

  const subject = `📨 General inquiry: ${row.full_name}${row.topic ? ` · ${row.topic}` : ""}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
<div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · General Inquiry</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(row.full_name)}</div>
<div style="font-size:13px;color:#888;margin-top:2px">${esc(email)}${row.phone ? ` · ${esc(row.phone)}` : ""}${row.company ? ` · ${esc(row.company)}` : ""}</div>
</div>
${row.topic ? `<div style="margin-top:12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.5px">Topic</div><div style="font-size:14px;color:#fff;margin-top:4px">${esc(row.topic)}</div>` : ""}
<div style="margin-top:16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.5px">Message</div>
<div style="font-size:14px;color:#fff;margin-top:6px;background:#111;padding:12px 16px;border-radius:6px;white-space:pre-wrap;line-height:1.55">${esc(row.message)}</div>
<div style="color:#555;font-size:10px;text-align:center;margin-top:16px">FALCO · general inquiry</div>
</div></body></html>`
  const text = [
    `General inquiry: ${row.full_name}`,
    `Email: ${email}`,
    row.phone ? `Phone: ${row.phone}` : "",
    row.company ? `Company: ${row.company}` : "",
    row.topic ? `Topic: ${row.topic}` : "",
    "",
    "Message:",
    row.message,
  ]
    .filter(Boolean)
    .join("\n")

  const inquiryConfirm = confirmationTemplate({
    greeting: `${firstName(row.full_name)}, message received.`,
    intro:
      "Thanks for getting in touch with FALCO. We've got your note and someone will read it personally. Expect a reply within one business day.",
    details: [
      { label: "Topic", value: row.topic },
      { label: "Company", value: row.company },
      { label: "Phone", value: row.phone },
    ],
    echoMessage: row.message,
    closer:
      "If anything's time-sensitive, just hit reply — it lands directly in our inbox.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "We got your message — replying within one business day",
      inquiryConfirm.html,
      inquiryConfirm.text
    ),
  ])

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted: false,
    message: "Got it. We'll be in touch within one business day.",
  }
}

// ============================================================================
// Partner inquiry (auction company)
// ============================================================================

export type PartnerInquiryInput = {
  email: string
  fullName: string
  company?: string
  phone?: string
  countyCoverage?: string
  dealsPerYear?: number | null
  yearsInBusiness?: number | null
  feeStructure?: string
  notes?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export async function submitPartnerInquiry(
  input: PartnerInquiryInput
): Promise<SubmitResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Database not configured." }
  }
  const email = normEmail(input.email)
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required." }
  }
  if (!input.fullName?.trim()) {
    return { ok: false, error: "Please tell us your name." }
  }

  const row = {
    email,
    full_name: input.fullName.trim(),
    company: (input.company ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    county_coverage: (input.countyCoverage ?? "").trim(),
    deals_per_year: input.dealsPerYear ?? null,
    years_in_business: input.yearsInBusiness ?? null,
    fee_structure: (input.feeStructure ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  const { data: existing } = await supabaseAdmin
    .from("partner_inquiries")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  const alreadyExisted = Boolean(existing)

  const { data, error } = await supabaseAdmin
    .from("partner_inquiries")
    .upsert(row, { onConflict: "email" })
    .select("id")
    .single()
  if (error) {
    console.error("submitPartnerInquiry error:", error.message)
    return { ok: false, error: `Submission failed: ${error.message}` }
  }

  const subject = `🤝 Auction partner inquiry: ${row.company || row.full_name}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
<div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · Auction Partner Inquiry</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(row.company || row.full_name)}</div>
<div style="font-size:13px;color:#888;margin-top:2px">${esc(row.full_name)}${row.full_name !== row.company && row.company ? "" : ""} · ${esc(email)}${row.phone ? ` · ${esc(row.phone)}` : ""}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-top:16px;background:#111;border-radius:6px">
${row.county_coverage ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;width:170px">County coverage</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.county_coverage)}</td></tr>` : ""}
${row.deals_per_year ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Deals / year</td><td style="padding:8px 12px;color:#fff;font-size:13px">${row.deals_per_year}</td></tr>` : ""}
${row.years_in_business ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Years in business</td><td style="padding:8px 12px;color:#fff;font-size:13px">${row.years_in_business}</td></tr>` : ""}
${row.fee_structure ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Fee structure</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(row.fee_structure)}</td></tr>` : ""}
${row.notes ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;vertical-align:top">Notes</td><td style="padding:8px 12px;color:#fff;font-size:13px;white-space:pre-wrap">${esc(row.notes)}</td></tr>` : ""}
</table>
<div style="color:#555;font-size:10px;text-align:center;margin-top:16px">FALCO · partner inquiry ${alreadyExisted ? "(updated)" : "(new)"}</div>
</div></body></html>`
  const text = [
    `Auction partner inquiry: ${row.company || row.full_name}`,
    `Contact: ${row.full_name}`,
    `Email: ${email}`,
    row.phone ? `Phone: ${row.phone}` : "",
    row.county_coverage ? `Coverage: ${row.county_coverage}` : "",
    row.deals_per_year ? `Deals/yr: ${row.deals_per_year}` : "",
    row.years_in_business ? `Years: ${row.years_in_business}` : "",
    row.fee_structure ? `Fee: ${row.fee_structure}` : "",
    row.notes ? `\nNotes:\n${row.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const partnerConfirm = confirmationTemplate({
    greeting: `${firstName(row.full_name)}, thanks for reaching out.`,
    intro: row.company
      ? `We got your inquiry from ${row.company} and will be in touch within one business day to set up a call.`
      : "We got your inquiry and will be in touch within one business day to set up a call.",
    details: [
      { label: "County coverage", value: row.county_coverage },
      {
        label: "Deals / year",
        value: row.deals_per_year ? String(row.deals_per_year) : "",
      },
      {
        label: "Years in business",
        value: row.years_in_business ? String(row.years_in_business) : "",
      },
      { label: "Fee structure", value: row.fee_structure },
    ],
    closer:
      "On the call we'll walk you through how the inventory pipeline works, what we'd send your way, and how the partnership fee structure lays out. No surprises, no contract pressure.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "FALCO got your partner inquiry — call within one business day",
      partnerConfirm.html,
      partnerConfirm.text
    ),
  ])

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted,
    message: alreadyExisted
      ? "Updated. We'll be in touch within one business day."
      : "Got it. We'll be in touch within one business day to set up a call.",
  }
}
