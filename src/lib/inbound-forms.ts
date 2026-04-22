import nodemailer from "nodemailer"
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

function notifyRecipient(): string | null {
  return (
    process.env.FALCO_INBOUND_NOTIFY_TO?.trim() ||
    process.env.FALCO_DIGEST_TO?.trim() ||
    process.env.FALCO_GMAIL_USER?.trim() ||
    null
  )
}

async function sendNotificationEmail(subject: string, html: string, text: string) {
  const recipient = notifyRecipient()
  if (!recipient) return
  const user = process.env.FALCO_GMAIL_USER?.trim()
  const pass = process.env.FALCO_GMAIL_APP_PASSWORD?.trim()
  if (!user || !pass) return
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    })
    await transporter.sendMail({
      from: `"FALCO" <${user}>`,
      to: recipient,
      subject,
      text,
      html,
    })
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
      ? "Got it — we updated your request. We'll be in touch within 24 hours."
      : "Got it. We'll be in touch within 24 hours with the math on your specific situation.",
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
      ? "Updated. We'll be in touch shortly."
      : "Got it. We'll be in touch within 24 hours to set up a call.",
  }
}
