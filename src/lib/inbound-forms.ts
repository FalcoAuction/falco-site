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
 * Wraps a confirmation body in the FALCO email shell, styled like the site:
 * warm off-white ground, one white card, black type, the bird mark, no
 * accent color. Table layout and inline styles so it holds up in Gmail,
 * Outlook and Apple Mail. Pass the greeting, the intro, an optional
 * key/value details block, an optional echo of what they typed, an
 * optional highlighted line (`note`), and the closer.
 */
export function confirmationTemplate({
  greeting,
  intro,
  details,
  detailsLabel,
  echoMessage,
  note,
  closer,
}: {
  greeting: string
  intro: string
  details?: Array<{ label: string; value: string }>
  detailsLabel?: string
  /** Optional: echo back a multi-line message the user typed (for the
   *  general-inquiry form so they can see what we received). */
  echoMessage?: string
  /** Optional: one short line set apart in a tinted box, e.g. the
   *  no-cost line for sellers. */
  note?: string
  closer: string
}): { html: string; text: string } {
  const ink = "#0c0c0b"
  const muted = "#6d6c66"
  const line = "#ecebe7"
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
  const rows = (details ?? []).filter((d) => d.value && d.value.trim())
  const label = detailsLabel ?? "What you sent us"

  const detailRows = rows
    .map(
      (d, i) =>
        `<tr><td style="padding:12px 0;${i ? `border-top:1px solid ${line};` : ""}color:${muted};font-size:14px;vertical-align:top;width:44%">${esc(
          d.label
        )}</td><td style="padding:12px 0;${i ? `border-top:1px solid ${line};` : ""}color:${ink};font-size:14px;text-align:right;vertical-align:top">${esc(
          d.value
        )}</td></tr>`
    )
    .join("")

  const section = (inner: string) => `<tr><td style="padding:0 0 26px">${inner}</td></tr>`
  const small = (t: string) =>
    `<div style="font-size:13px;color:${muted};margin:0 0 8px">${esc(t)}</div>`

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(greeting)}</title>
<style>@media (max-width:480px){.fc-card{padding:28px 22px 24px !important}.fc-h1{font-size:23px !important}}</style></head>
<body style="margin:0;padding:0;background:#f3f2f0;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f0;font-family:${font};color:${ink}">
<tr><td align="center" style="padding:36px 16px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 22px">
      <a href="https://falco.llc" style="text-decoration:none;color:${ink}"><img src="https://falco.llc/media/falco-bird-ink.png" width="27" height="32" alt="FALCO" style="display:inline-block;vertical-align:middle;border:0"><span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:17px;font-weight:700;letter-spacing:-0.03em">FALCO</span></a>
    </td></tr>
    <tr><td class="fc-card" style="background:#ffffff;border:1px solid #e7e5e0;border-radius:24px;padding:36px 32px 30px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${section(`<h1 class="fc-h1" style="margin:0;font-size:26px;line-height:1.15;font-weight:500;letter-spacing:-0.025em;color:${ink}">${esc(greeting)}</h1>`)}
        ${section(`<p style="margin:0;font-size:16px;line-height:1.6;color:#3a3935">${esc(intro)}</p>`)}
        ${note && note.trim() ? section(`<div style="background:#f3f2f0;border-radius:14px;padding:16px 18px;font-size:15px;line-height:1.55;color:${ink}">${esc(note.trim())}</div>`) : ""}
        ${detailRows ? section(`${small(label)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${line};border-bottom:1px solid ${line}">${detailRows}</table>`) : ""}
        ${echoMessage && echoMessage.trim() ? section(`${small("Your message")}<div style="background:#f3f2f0;border-radius:14px;padding:16px 18px;font-size:15px;line-height:1.6;color:${ink};white-space:pre-wrap">${esc(echoMessage.trim())}</div>`) : ""}
        ${section(`<p style="margin:0;font-size:15px;line-height:1.6;color:#3a3935">${esc(closer)}</p>`)}
        <tr><td style="padding:22px 0 0;border-top:1px solid ${line}">
          <p style="margin:0;font-size:15px;line-height:1.5;color:${ink};font-weight:500">Patrick Armour</p>
          <p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:${muted}">Founder, FALCO. Licensed Tennessee Auctioneer #7622</p>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${muted}">Reply to this email or call or text <a href="tel:+16012138868" style="color:${ink};text-decoration:none;white-space:nowrap">601-213-8868</a>.</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.6;color:#8e8d86;text-align:center">
      FALCO, Nashville, Tennessee. <a href="https://falco.llc" style="color:#8e8d86">falco.llc</a><br>Licensed Tennessee auction firms run every sale.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`

  const text = [
    greeting,
    "",
    intro,
    ...(note && note.trim() ? ["", note.trim()] : []),
    ...(rows.length ? ["", `${label}:`, ...rows.map((d) => `  ${d.label}: ${d.value}`)] : []),
    ...(echoMessage && echoMessage.trim() ? ["", "Your message:", echoMessage.trim()] : []),
    "",
    closer,
    "",
    "Patrick Armour",
    "Founder, FALCO. Licensed Tennessee Auctioneer #7622",
    "Reply to this email or call or text 601-213-8868.",
    "",
    "FALCO, Nashville, Tennessee. falco.llc",
    "Licensed Tennessee auction firms run every sale.",
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
    greeting: `${firstName(row.full_name)}, we got it.`,
    intro:
      "Thanks for reaching out. We're pulling the public records now, and within one business day you'll have your numbers: what it would likely clear at a marketed auction, what you'd keep after what's owed, and how that compares to the other ways out.",
    note:
      "It costs you $0. No listing fee and no commission from your side. The buyer pays a 10% premium on top of the winning bid, and that's how the auction firm and FALCO are paid.",
    details: [
      { label: "Property", value: row.property_address },
      { label: "County", value: row.county },
      { label: "Sale date", value: fmtDateHuman(row.trustee_sale_date) },
      {
        label: "Owed, roughly",
        value: row.mortgage_balance ? fmtCurrency(row.mortgage_balance) : "",
      },
      { label: "Best time to call", value: row.best_callback },
    ],
    closer:
      "Every sale is run by a licensed Tennessee auction firm, and you only sign if the numbers make sense. If an auction isn't the right fit, we'll tell you plainly.",
  })
  // Send notification + confirmation in parallel, but AWAIT both so the
  // serverless function doesn't tear down before the HTTP requests to
  // Resend complete. Fire-and-forget on Vercel is a race we lose.
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "We got it. Your numbers are coming within one business day",
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
      : "Got it. Within one business day we'll send your numbers: what it would likely clear at a marketed auction and what you'd keep.",
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
      "Thanks for writing to FALCO. A person reads every message, and you'll hear back within one business day.",
    details: [
      { label: "Topic", value: row.topic },
      { label: "Company", value: row.company },
      { label: "Phone", value: row.phone },
    ],
    echoMessage: row.message,
    closer:
      "If it's time-sensitive, say so in a reply and we'll move it to the front.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "We got your message",
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
// Real estate agent signup (/agents)
// ============================================================================

export type AgentSignupInput = {
  email: string
  fullName: string
  phone?: string
  licenseNumber?: string
  brokerage?: string
  principalBroker?: string
  inventory?: string[]
  propertyAddress?: string
  notes?: string
  ipAddress?: string | null
  userAgent?: string | null
}

/** Stored in general_inquiries (topic "Agent signup", brokerage in company)
 *  so signups show in the CRM inbox without a new table. */
export async function submitAgentSignup(input: AgentSignupInput): Promise<SubmitResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Database not configured." }
  }
  const email = normEmail(input.email)
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required." }
  }
  const fullName = (input.fullName ?? "").trim()
  const license = (input.licenseNumber ?? "").trim()
  const brokerage = (input.brokerage ?? "").trim()
  const principal = (input.principalBroker ?? "").trim()
  if (!fullName) return { ok: false, error: "Please tell us your name." }
  if (!license) return { ok: false, error: "Please add your Tennessee license number." }
  if (!brokerage || !principal) {
    return { ok: false, error: "Please add your brokerage and principal broker." }
  }
  const inventory = (input.inventory ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 10)
  const property = (input.propertyAddress ?? "").trim()
  const notes = (input.notes ?? "").trim()

  const message = [
    `License: ${license}`,
    `Brokerage: ${brokerage}`,
    `Principal broker: ${principal}`,
    inventory.length ? `Has: ${inventory.join(", ")}` : "",
    property ? `Property: ${property}` : "",
    notes ? `\n${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const row = {
    email,
    full_name: fullName,
    phone: (input.phone ?? "").trim(),
    company: brokerage,
    topic: "Agent signup",
    message,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from("general_inquiries")
    .insert(row)
    .select("id")
    .single()
  if (error) {
    console.error("submitAgentSignup error:", error.message)
    return { ok: false, error: `Submission failed: ${error.message}` }
  }

  const subject = `🔑 Agent signup: ${fullName} · ${brokerage}${property ? " · has a property" : ""}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
<div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · Agent Signup</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(fullName)}</div>
<div style="font-size:13px;color:#888;margin-top:2px">${esc(email)}${row.phone ? ` · ${esc(row.phone)}` : ""}</div>
</div>
<div style="font-size:14px;color:#fff;margin-top:16px;background:#111;padding:12px 16px;border-radius:6px;white-space:pre-wrap;line-height:1.55">${esc(message)}</div>
<div style="color:#888;font-size:12px;margin-top:12px">Verify the license on the TREC lookup before sending the firm's referral agreement to the principal broker.</div>
</div></body></html>`
  const text = [
    `Agent signup: ${fullName}`,
    `Email: ${email}`,
    ...(row.phone ? [`Phone: ${row.phone}`] : []),
    "",
    message,
  ].join("\n")

  const agentConfirm = confirmationTemplate({
    greeting: `${firstName(fullName)}, you're signed up.`,
    intro:
      "We'll check your license with the Tennessee Real Estate Commission, then send the auction firm's referral agreement to your principal broker. That usually takes one business day.",
    note: "Your broker is paid 1% of the winning bid at closing, by the auction firm, under that written agreement. Your seller pays no commission.",
    detailsLabel: "What you sent us",
    details: [
      { label: "License", value: license },
      { label: "Brokerage", value: brokerage },
      { label: "Principal broker", value: principal },
      { label: "Property", value: property },
    ],
    closer: property
      ? "We'll have numbers on that property back to you within one business day: a likely range, the firm we'd route it to, and the timeline."
      : "Got a property? Reply with the address and what's going on, and we'll send numbers within one business day.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(email, "You're signed up with FALCO", agentConfirm.html, agentConfirm.text),
  ])

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted: false,
    message: "You're signed up. We'll be in touch within one business day.",
  }
}

// ============================================================================
// Professional file (/professionals, /start, bankruptcy and lien-sale pages)
// ============================================================================

export type ProfessionalFileInput = {
  role?: string
  matter?: string
  assets?: string[]
  location?: string
  caseNumber?: string
  deadline?: string | null
  fullName: string
  firm?: string
  email: string
  phone?: string
  notes?: string
  ipAddress?: string | null
  userAgent?: string | null
}

/** Stored in general_inquiries (topic "Professional file", firm in company)
 *  so it shows in the CRM inbox with the role and matter on it. */
export async function submitProfessionalFile(input: ProfessionalFileInput): Promise<SubmitResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: supabaseAdminConfigError ?? "Database not configured." }
  }
  const email = normEmail(input.email)
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required." }
  }
  const fullName = (input.fullName ?? "").trim()
  if (!fullName) return { ok: false, error: "Please tell us your name." }
  const location = (input.location ?? "").trim()
  if (!location) return { ok: false, error: "Please add the county or city." }
  const role = (input.role ?? "").trim()
  const matter = (input.matter ?? "").trim()
  const firm = (input.firm ?? "").trim()
  const caseNumber = (input.caseNumber ?? "").trim()
  const deadline = (input.deadline ?? "").trim()
  const deadlineHuman = deadline ? fmtDateHuman(deadline) || deadline : ""
  const assets = (input.assets ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
  const notes = (input.notes ?? "").trim()

  const message = [
    role ? `Role: ${role}` : "",
    matter ? `Matter: ${matter}` : "",
    assets.length ? `Needs to sell: ${assets.join(", ")}` : "",
    `Where: ${location}`,
    caseNumber ? `Case: ${caseNumber}` : "",
    deadlineHuman ? `Deadline: ${deadlineHuman}` : "",
    notes ? `\n${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const row = {
    email,
    full_name: fullName,
    phone: (input.phone ?? "").trim(),
    company: firm,
    topic: "Professional file",
    message,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from("general_inquiries")
    .insert(row)
    .select("id")
    .single()
  if (error) {
    console.error("submitProfessionalFile error:", error.message)
    return { ok: false, error: `Submission failed: ${error.message}` }
  }

  const who = [fullName, firm].filter(Boolean).join(", ")
  const subject = `📁 Professional file: ${who}${matter ? ` · ${matter}` : ""}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto">
<div style="padding:16px 0;border-bottom:2px solid #10b981">
<div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · Professional File</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(who)}</div>
<div style="font-size:13px;color:#888;margin-top:2px">${esc(email)}${row.phone ? ` · ${esc(row.phone)}` : ""}</div>
</div>
<div style="font-size:14px;color:#fff;margin-top:16px;background:#111;padding:12px 16px;border-radius:6px;white-space:pre-wrap;line-height:1.55">${esc(message)}</div>
</div></body></html>`
  const text = [
    `Professional file: ${who}`,
    `Email: ${email}`,
    ...(row.phone ? [`Phone: ${row.phone}`] : []),
    "",
    message,
  ].join("\n")

  const proConfirm = confirmationTemplate({
    greeting: `${firstName(fullName)}, we got the file.`,
    intro:
      "Within one business day we'll come back with what is worth auctioning, which licensed Tennessee firm sells each asset class, and what it would likely clear.",
    note: "No listing fee and no commission from the seller's side. The buyer pays a 10% premium on top of the winning bid.",
    detailsLabel: "What you sent us",
    details: [
      { label: "Role", value: role },
      { label: "Matter", value: matter },
      { label: "Where", value: location },
      { label: "Case", value: caseNumber },
      { label: "Deadline", value: deadlineHuman },
    ],
    closer:
      "Court approval, notice periods and authority to sell stay with you and the court. We work on that timeline.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(email, "We got the file", proConfirm.html, proConfirm.text),
  ])

  return {
    ok: true,
    id: String(data.id),
    alreadyExisted: false,
    message: "Got the file. We'll be in touch within one business day.",
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
      ? `We got your inquiry from ${row.company}. We'll reach out within one business day to set up a call.`
      : "We got your inquiry. We'll reach out within one business day to set up a call.",
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
      "On the call we'll cover how sellers reach us, how we match each asset to the firm that sells it best, and how FALCO is paid: a share of the buyer's premium, never anything from the seller. No contract pressure.",
  })
  await Promise.allSettled([
    sendNotificationEmail(subject, html, text),
    sendConfirmationEmail(
      email,
      "We got your auction partner inquiry",
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
