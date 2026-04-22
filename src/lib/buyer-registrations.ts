import { Resend } from "resend"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

const resendClient = (() => {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
})()

export type BuyerRegistrationInput = {
  email: string
  fullName: string
  phone?: string
  company?: string
  priceMin?: number | null
  priceMax?: number | null
  counties?: string
  propertyTypes?: string
  strategies?: string
  cashReady: boolean
  fundingSource?: string
  closeSpeedDays?: number | null
  notes?: string
  referrer?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export type BuyerRegistration = BuyerRegistrationInput & {
  id: string
  registeredAt: string
}

export type RegisterResult =
  | { ok: true; registration: BuyerRegistration; alreadyExisted: boolean }
  | { ok: false; error: string }

function normEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function registerBuyer(input: BuyerRegistrationInput): Promise<RegisterResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Supabase admin not configured." }
  }

  const email = normEmail(input.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Valid email required." }
  }
  if (!input.fullName?.trim()) {
    return { ok: false, error: "Name required." }
  }

  const row = {
    email,
    full_name: input.fullName.trim(),
    phone: (input.phone ?? "").trim(),
    company: (input.company ?? "").trim(),
    price_min: input.priceMin ?? null,
    price_max: input.priceMax ?? null,
    counties: (input.counties ?? "").trim(),
    property_types: (input.propertyTypes ?? "").trim(),
    strategies: (input.strategies ?? "").trim(),
    cash_ready: Boolean(input.cashReady),
    funding_source: (input.fundingSource ?? "").trim(),
    close_speed_days: input.closeSpeedDays ?? null,
    notes: (input.notes ?? "").trim(),
    referrer: (input.referrer ?? "").trim(),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  // Upsert so resubmission with the same email is handled gracefully
  const { data: existing } = await supabaseAdmin
    .from("buyer_registrations")
    .select("id, registered_at")
    .eq("email", email)
    .maybeSingle()
  const alreadyExisted = Boolean(existing)

  const { data, error } = await supabaseAdmin
    .from("buyer_registrations")
    .upsert(row, { onConflict: "email" })
    .select("*")
    .single()

  if (error) {
    console.error("registerBuyer error:", error.message)
    return { ok: false, error: `Registration failed: ${error.message}` }
  }

  const registration: BuyerRegistration = {
    ...input,
    id: String(data.id),
    registeredAt: String(data.registered_at),
    email,
  }

  // Fire-and-forget notify email to FALCO ops
  notifyBuyerSignup(registration, alreadyExisted).catch((err) =>
    console.error("notifyBuyerSignup failed:", err)
  )

  return { ok: true, registration, alreadyExisted }
}

async function notifyBuyerSignup(reg: BuyerRegistration, alreadyExisted: boolean) {
  const recipient =
    process.env.FALCO_BUYER_NOTIFY_TO?.trim() ||
    process.env.FALCO_INBOUND_NOTIFY_TO?.trim() ||
    process.env.FALCO_DIGEST_TO?.trim()
  if (!recipient) return
  if (!resendClient) {
    console.warn("notifyBuyerSignup skipped: RESEND_API_KEY not set")
    return
  }
  const fromAddr = process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"

  function esc(s: string): string {
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

  const subject = alreadyExisted
    ? `🔁 Buyer re-registered: ${reg.fullName}`
    : `🆕 New Buyer Registered: ${reg.fullName}${reg.cashReady ? " · CASH READY" : ""}`

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
  <div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · New Cash Buyer</div>
  <div style="font-size:22px;font-weight:700;margin-top:4px">${esc(reg.fullName)}${reg.cashReady ? ' <span style="color:#10b981;font-size:12px">CASH READY</span>' : ""}</div>
  <div style="font-size:13px;color:#888;margin-top:2px">${esc(reg.email)}${reg.phone ? ` · ${esc(reg.phone)}` : ""}${reg.company ? ` · ${esc(reg.company)}` : ""}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-top:16px;background:#111;border-radius:6px">
${reg.priceMin || reg.priceMax ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;width:160px">Price range</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(fmtCurrency(reg.priceMin))} – ${esc(fmtCurrency(reg.priceMax))}</td></tr>` : ""}
${reg.counties ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Counties</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(reg.counties)}</td></tr>` : ""}
${reg.propertyTypes ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Property types</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(reg.propertyTypes)}</td></tr>` : ""}
${reg.strategies ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Strategies</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(reg.strategies)}</td></tr>` : ""}
${reg.fundingSource ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Funding</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(reg.fundingSource)}</td></tr>` : ""}
${reg.closeSpeedDays ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Close speed</td><td style="padding:8px 12px;color:#fff;font-size:13px">${reg.closeSpeedDays} days</td></tr>` : ""}
${reg.referrer ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px">Found us via</td><td style="padding:8px 12px;color:#fff;font-size:13px">${esc(reg.referrer)}</td></tr>` : ""}
${reg.notes ? `<tr><td style="padding:8px 12px;color:#888;font-size:12px;vertical-align:top">Notes</td><td style="padding:8px 12px;color:#fff;font-size:13px;white-space:pre-wrap">${esc(reg.notes)}</td></tr>` : ""}
</table>
<div style="color:#555;font-size:10px;text-align:center;margin-top:16px">FALCO · buyer registration ${alreadyExisted ? "(updated)" : "(new)"}</div>
</div>
</body></html>`

  const text = [
    `${alreadyExisted ? "Buyer re-registered" : "New buyer registered"}: ${reg.fullName}`,
    `Email: ${reg.email}`,
    reg.phone ? `Phone: ${reg.phone}` : "",
    reg.company ? `Company: ${reg.company}` : "",
    reg.priceMin || reg.priceMax ? `Price: ${fmtCurrency(reg.priceMin)} – ${fmtCurrency(reg.priceMax)}` : "",
    reg.counties ? `Counties: ${reg.counties}` : "",
    reg.propertyTypes ? `Types: ${reg.propertyTypes}` : "",
    reg.strategies ? `Strategies: ${reg.strategies}` : "",
    reg.cashReady ? "CASH READY ✓" : "",
    reg.fundingSource ? `Funding: ${reg.fundingSource}` : "",
    reg.closeSpeedDays ? `Close in: ${reg.closeSpeedDays} days` : "",
    reg.referrer ? `Via: ${reg.referrer}` : "",
    reg.notes ? `\nNotes:\n${reg.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const result = await resendClient.emails.send({
      from: fromAddr,
      to: [recipient],
      replyTo: recipient,
      subject,
      html,
      text,
    })
    if (result.error) console.error("resend send failed:", result.error)
  } catch (err) {
    console.error("notifyBuyerSignup send failed:", err)
  }
}
