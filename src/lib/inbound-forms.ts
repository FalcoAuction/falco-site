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

  sendNotificationEmail(subject, html, text).catch(() => {})

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

  sendNotificationEmail(subject, html, text).catch(() => {})

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

  sendNotificationEmail(subject, html, text).catch(() => {})

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted,
    message: alreadyExisted
      ? "Updated. We'll be in touch within one business day."
      : "Got it. We'll be in touch within one business day to set up a call.",
  }
}
