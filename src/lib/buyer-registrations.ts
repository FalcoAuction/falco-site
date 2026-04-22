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

  // Fire-and-forget confirmation back to the buyer
  sendBuyerConfirmation(registration, alreadyExisted).catch((err) =>
    console.error("sendBuyerConfirmation failed:", err)
  )

  return { ok: true, registration, alreadyExisted }
}

// ----------------------------------------------------------------------------
// Confirmation back to the buyer who just registered
// ----------------------------------------------------------------------------
async function sendBuyerConfirmation(reg: BuyerRegistration, alreadyExisted: boolean) {
  if (!resendClient) return
  const fromAddr = process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"
  const replyTo =
    process.env.FALCO_INBOUND_NOTIFY_TO?.trim() ||
    process.env.FALCO_BUYER_NOTIFY_TO?.trim() ||
    "falco@falco.llc"

  function esc(s: string): string {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }
  function fmtCurrency(n: number | null | undefined): string {
    if (n === null || n === undefined) return ""
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  }
  const first = (reg.fullName.trim().split(/\s+/)[0] || reg.fullName.trim()).slice(0, 40)

  const details: Array<{ label: string; value: string }> = [
    {
      label: "Price range",
      value:
        reg.priceMin || reg.priceMax
          ? `${fmtCurrency(reg.priceMin) || "—"} – ${fmtCurrency(reg.priceMax) || "—"}`
          : "",
    },
    { label: "Counties", value: reg.counties ?? "" },
    { label: "Property types", value: reg.propertyTypes ?? "" },
    { label: "Strategies", value: reg.strategies ?? "" },
    { label: "Cash ready", value: reg.cashReady ? "Yes" : "" },
    { label: "Funding", value: reg.fundingSource ?? "" },
    {
      label: "Close speed",
      value: reg.closeSpeedDays ? `${reg.closeSpeedDays} days` : "",
    },
  ].filter((d) => d.value && d.value.trim())

  const detailRows = details
    .map(
      (d) =>
        `<tr><td style="padding:10px 14px;color:#9ca3af;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;width:160px;vertical-align:top">${esc(
          d.label
        )}</td><td style="padding:10px 14px;color:#fff;font-size:14px">${esc(
          d.value
        )}</td></tr>`
    )
    .join("")

  const greeting = alreadyExisted
    ? `${first}, your buyer profile is updated.`
    : `${first}, you're on the FALCO buyer list.`
  const intro = alreadyExisted
    ? "We updated the criteria you sent us. You'll keep getting first-look notifications when Tennessee inventory matches your buy box."
    : "Welcome. You're now on the early-notification list for Tennessee distressed inventory routed through FALCO. When something matches your buy box, you'll hear from us before it hits the broader market."
  const closer =
    "Heads up: nothing's listed automatically. We hand-screen properties, then send you the file with photos, the math, the auction date, and a clear path to bid. No spam, no drip campaigns."

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
           <div style="font-size:10px;letter-spacing:0.22em;color:#10b981;text-transform:uppercase;margin-bottom:8px;font-weight:600">Your buy box</div>
           <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:8px">${detailRows}</table>
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
    ...(details.length
      ? ["", "Your buy box:", ...details.map((d) => `  ${d.label}: ${d.value}`)]
      : []),
    "",
    closer,
    "",
    "Reply to this email anytime — it goes straight to us.",
    "— The FALCO team",
    "",
    "FALCO · Tennessee · falco.llc",
  ].join("\n")

  const subject = alreadyExisted
    ? "Your FALCO buyer profile is updated"
    : "You're on the FALCO buyer list — first look at TN inventory"

  try {
    const result = await resendClient.emails.send({
      from: fromAddr,
      to: [reg.email],
      replyTo,
      subject,
      html,
      text,
    })
    if (result.error) console.error("buyer confirm send failed:", result.error)
  } catch (err) {
    console.error("buyer confirm exception:", err)
  }
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
