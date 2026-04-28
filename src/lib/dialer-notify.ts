import nodemailer from "nodemailer"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { OUTCOME_LABELS, CHANNEL_LABELS, distressTypeLabel } from "@/lib/dialer-types"
import type { DialerOutcome, DialerChannel } from "@/lib/dialer-types"

type BookedNotifyContext = {
  listingSlug: string
  createdBy: string
  notes?: string
  channel: DialerChannel
  outcome: DialerOutcome
  nextActionAt?: string | null
  occurredAt?: string
}

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtPhone(raw?: string | null): string {
  if (!raw) return "—"
  const d = String(raw).replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return String(raw)
}

function fmtCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  })
}

function estimatePayoff(orig: number | null | undefined, mortgageDateIso: string | null | undefined): number | null {
  if (!orig || orig <= 0) return null
  if (!mortgageDateIso) return Math.round(orig * 0.93)
  const start = new Date(mortgageDateIso).getTime()
  if (Number.isNaN(start)) return Math.round(orig * 0.93)
  const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  const r = 0.04 / 12
  const n = 360
  const paid = Math.min(yrs * 12, n)
  const remaining = (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
  return Math.round(orig * remaining)
}

/**
 * Fire-and-forget email to the auction partner whenever a seller is booked for
 * an auction call. Non-blocking: errors are logged but never thrown.
 */
export async function notifyAuctionPartnerOnBooking(ctx: BookedNotifyContext): Promise<void> {
  try {
    if (ctx.outcome !== "booked") return

    const recipient = (process.env.FALCO_AUCTION_NOTIFY_TO ?? "").trim()
    if (!recipient) {
      console.warn("notifyAuctionPartner: FALCO_AUCTION_NOTIFY_TO not set — skipping")
      return
    }
    const from = (process.env.FALCO_GMAIL_USER ?? "").trim()
    const pass = (process.env.FALCO_GMAIL_APP_PASSWORD ?? "").trim()
    if (!from || !pass) {
      console.warn("notifyAuctionPartner: missing Gmail creds — skipping")
      return
    }

    // Pull lead data from the dialer inventory snapshot for context
    const lead = await findDialerInventoryLead(ctx.listingSlug)

    const address = lead?.address || "(address unknown)"
    const county = lead?.county || ""
    const owner = lead?.ownerName || "Unknown owner"
    const phone1 = lead?.ownerPhonePrimary || ""
    const phone2 = lead?.ownerPhoneSecondary || ""
    const saleDate = lead?.currentSaleDate || ""
    const avmLow = lead?.avmLow ?? null
    const avmMid = lead?.avmMid ?? null
    const avmHigh = lead?.avmHigh ?? null
    const loan = lead?.mortgageAmount ?? null
    const lender = lead?.mortgageLender || ""
    const distress = distressTypeLabel(lead?.distressType).label
    const payoff = estimatePayoff(loan, lead?.mortgageDate ?? null)

    // Days to sale
    const dts = saleDate
      ? Math.ceil((new Date(saleDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    // Three-path equity math
    const commissionPct = 0.09
    const wholesalerPct = 0.65
    const equityLow =
      avmLow && payoff !== null ? Math.max(0, Math.round(avmLow * (1 - commissionPct) - payoff)) : null
    const equityHigh =
      avmHigh && payoff !== null ? Math.max(0, Math.round(avmHigh * (1 - commissionPct) - payoff)) : null
    const wholesalerNet =
      avmMid && payoff !== null ? Math.max(0, Math.round(avmMid * wholesalerPct - payoff)) : null

    const subject = `🔥 New Auction Call Booked — ${address}${dts !== null ? ` (${dts}d to sale)` : ""}`

    const callTimeStr = ctx.nextActionAt ? fmtDateTime(ctx.nextActionAt) : "Not scheduled yet — confirm with seller"

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:640px;margin:0 auto">
  <div style="padding:16px 0;border-bottom:2px solid #10b981">
    <div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · New Auction Call Booked</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:#fff">${esc(address)}</div>
    <div style="font-size:13px;color:#888;margin-top:2px">${esc(owner)} · ${esc(county)} · ${esc(distress)}</div>
  </div>

  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;margin-bottom:8px">Call Details</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:140px">Scheduled for</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:600">${esc(callTimeStr)} CT</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Booked by</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(ctx.createdBy || "caller")}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Channel</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(CHANNEL_LABELS[ctx.channel] ?? ctx.channel)} — ${esc(OUTCOME_LABELS[ctx.outcome] ?? ctx.outcome)}</td></tr>
    </table>
  </div>

  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:8px">Seller Contact</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:140px">Name</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:600">${esc(owner)}</td></tr>
      ${phone1 ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Primary phone</td><td style="padding:6px 0;color:#fff;font-size:13px"><a href="tel:${esc(phone1.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none">${esc(fmtPhone(phone1))}</a></td></tr>` : ""}
      ${phone2 ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Secondary phone</td><td style="padding:6px 0;color:#fff;font-size:13px"><a href="tel:${esc(phone2.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none">${esc(fmtPhone(phone2))}</a></td></tr>` : ""}
    </table>
  </div>

  ${saleDate ? `
  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#f59e0b;text-transform:uppercase;margin-bottom:8px">Trustee Sale</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:140px">Sale date</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:600">${esc(fmtDate(saleDate))}${dts !== null ? ` <span style="color:${dts <= 14 ? "#ef4444" : dts <= 30 ? "#f59e0b" : "#888"}">(${dts} days)</span>` : ""}</td></tr>
      ${lead?.saleControllerName ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Trustee / Atty</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(lead.saleControllerName)}</td></tr>` : ""}
      ${lead?.trusteePhonePublic ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Trustee phone</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(fmtPhone(lead.trusteePhonePublic))}</td></tr>` : ""}
    </table>
  </div>
  ` : ""}

  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;margin-bottom:8px">Equity Math</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:140px">Market value (AVM)</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:600">${esc(fmtCurrency(avmMid))}${avmLow && avmHigh ? ` <span style="color:#888">(${esc(fmtCurrency(avmLow))} – ${esc(fmtCurrency(avmHigh))})</span>` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Loan amount</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(fmtCurrency(loan))}${lender ? ` <span style="color:#888">· ${esc(lender)}</span>` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Est. loan payoff</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(fmtCurrency(payoff))}</td></tr>
      <tr><td style="padding:6px 0;color:#10b981;font-size:12px;font-weight:600">Est. seller take-home</td><td style="padding:6px 0;color:#10b981;font-size:14px;font-weight:700">${equityLow !== null && equityHigh !== null ? `${esc(fmtCurrency(equityLow))} – ${esc(fmtCurrency(equityHigh))}` : "—"}</td></tr>
    </table>
    ${wholesalerNet !== null && equityLow !== null ? `
    <div style="margin-top:10px;padding:10px;background:#111;border-radius:4px;border-left:3px solid #10b981">
      <div style="font-size:11px;color:#888">Wholesaler comp: ${esc(fmtCurrency(wholesalerNet))} · <span style="color:#10b981;font-weight:600">Our play: +${esc(fmtCurrency(equityLow - wholesalerNet))}+ more to seller</span></div>
    </div>
    ` : ""}
  </div>

  ${ctx.notes ? `
  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:8px">Caller's Notes</div>
    <div style="background:#111;padding:12px;border-radius:4px;color:#ddd;font-size:13px;white-space:pre-wrap;line-height:1.5">${esc(ctx.notes)}</div>
  </div>
  ` : ""}

  <div style="padding:24px 0 16px;text-align:center">
    <a href="https://falco.llc/dialer/${esc(ctx.listingSlug)}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#000;text-decoration:none;border-radius:6px;font-weight:700;font-size:13px">Open Lead in Dialer →</a>
  </div>

  <div style="color:#555;font-size:10px;text-align:center;margin-top:16px">
    FALCO · auto-notification on booked outcome
  </div>
</div>
</body>
</html>`

    const text = [
      `New Auction Call Booked — ${address}`,
      `${owner} · ${county} · ${distress}`,
      ``,
      `Scheduled: ${callTimeStr} CT`,
      `Booked by: ${ctx.createdBy || "caller"}`,
      ``,
      `CONTACT`,
      `  Primary: ${fmtPhone(phone1) || "—"}`,
      phone2 ? `  Secondary: ${fmtPhone(phone2)}` : "",
      ``,
      saleDate ? `SALE: ${fmtDate(saleDate)}${dts !== null ? ` (${dts} days out)` : ""}` : "",
      ``,
      `EQUITY`,
      `  AVM: ${fmtCurrency(avmMid)}${avmLow && avmHigh ? ` (${fmtCurrency(avmLow)} – ${fmtCurrency(avmHigh)})` : ""}`,
      `  Loan: ${fmtCurrency(loan)}${lender ? ` · ${lender}` : ""}`,
      `  Est. payoff: ${fmtCurrency(payoff)}`,
      `  Est. seller take-home: ${equityLow !== null && equityHigh !== null ? `${fmtCurrency(equityLow)} – ${fmtCurrency(equityHigh)}` : "—"}`,
      ``,
      ctx.notes ? `NOTES\n${ctx.notes}` : "",
      ``,
      `Open: https://falco.llc/dialer/${ctx.listingSlug}`,
    ]
      .filter(Boolean)
      .join("\n")

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: from, pass },
    })

    await transporter.sendMail({
      from: `"FALCO Dialer" <${from}>`,
      to: recipient,
      subject,
      text,
      html,
    })
    console.log(`[notifyAuctionPartner] sent to ${recipient} for ${ctx.listingSlug}`)
  } catch (err) {
    // Non-blocking: log and swallow so the activity insert never fails
    console.error("notifyAuctionPartner failed:", err)
  }
}

// ============================================================================
// Qualified Lead Delivery Notification
// ----------------------------------------------------------------------------
// Fires when a lead is formally delivered to Parks as a billable Qualified
// Lead under the Data Services Agreement. Includes tier classification,
// per-QL fee, and a clear next-steps callout for Dale + ownership.
// ============================================================================

type QualifiedLeadDeliveredContext = {
  listingSlug: string
  deliveredBy: string
  tier: "T0" | "T1" | "T2" | "T3"
  feeUSD: number
  arvAtDelivery: number | null
  appointmentAt?: string | null
  notes?: string
}

const TIER_LABELS: Record<"T0" | "T1" | "T2" | "T3", string> = {
  T0: "Tier 0 (Under $250K)",
  T1: "Tier 1 ($250K – $550K)",
  T2: "Tier 2 ($550K – $750K)",
  T3: "Tier 3 ($750K and above)",
}

/**
 * Email Dale (and ownership cc, if configured) when a Qualified Lead is
 * formally delivered. This is the billable event under the Parks contract.
 *
 * Non-blocking: logs and swallows errors so the underlying delivery write
 * never fails because of email infra hiccups.
 */
export async function notifyQualifiedLeadDelivered(
  ctx: QualifiedLeadDeliveredContext
): Promise<void> {
  try {
    const recipient = (process.env.FALCO_AUCTION_NOTIFY_TO ?? "").trim()
    if (!recipient) {
      console.warn("notifyQualifiedLeadDelivered: FALCO_AUCTION_NOTIFY_TO not set — skipping")
      return
    }
    const from = (process.env.FALCO_GMAIL_USER ?? "").trim()
    const pass = (process.env.FALCO_GMAIL_APP_PASSWORD ?? "").trim()
    if (!from || !pass) {
      console.warn("notifyQualifiedLeadDelivered: missing Gmail creds — skipping")
      return
    }

    const lead = await findDialerInventoryLead(ctx.listingSlug)

    const address = lead?.address || "(address unknown)"
    const county = lead?.county || ""
    const owner = lead?.ownerName || "Unknown owner"
    const phone1 = lead?.ownerPhonePrimary || ""
    const phone2 = lead?.ownerPhoneSecondary || ""
    const distress = distressTypeLabel(lead?.distressType).label
    const tierLabel = TIER_LABELS[ctx.tier]
    const feeStr = fmtCurrency(ctx.feeUSD)
    const arvStr = ctx.arvAtDelivery !== null ? fmtCurrency(ctx.arvAtDelivery) : "—"
    const apptStr = ctx.appointmentAt
      ? fmtDateTime(ctx.appointmentAt)
      : "Confirm with seller — appointment time pending"

    const subject = `[QL Delivered · ${ctx.tier} · ${feeStr}] ${address}`

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:640px;margin:0 auto">
  <div style="padding:16px 0;border-bottom:2px solid #10b981">
    <div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · Qualified Lead Delivered</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:#fff">${esc(address)}</div>
    <div style="font-size:13px;color:#888;margin-top:2px">${esc(owner)} · ${esc(county)} · ${esc(distress)}</div>
  </div>

  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;margin-bottom:8px">Billable Delivery</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:160px">Tier</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:700">${esc(tierLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Per-QL fee</td><td style="padding:6px 0;color:#10b981;font-size:14px;font-weight:700">${esc(feeStr)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">ARV at delivery</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(arvStr)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Delivered by</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(ctx.deliveredBy || "FALCO")}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:12px">Appointment</td><td style="padding:6px 0;color:#fff;font-size:13px">${esc(apptStr)} CT</td></tr>
    </table>
  </div>

  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:8px">Seller Contact</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:12px;width:160px">Name</td><td style="padding:6px 0;color:#fff;font-size:13px;font-weight:600">${esc(owner)}</td></tr>
      ${phone1 ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Primary phone</td><td style="padding:6px 0;color:#fff;font-size:13px"><a href="tel:${esc(phone1.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none">${esc(fmtPhone(phone1))}</a></td></tr>` : ""}
      ${phone2 ? `<tr><td style="padding:6px 0;color:#888;font-size:12px">Secondary phone</td><td style="padding:6px 0;color:#fff;font-size:13px"><a href="tel:${esc(phone2.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none">${esc(fmtPhone(phone2))}</a></td></tr>` : ""}
    </table>
  </div>

  ${ctx.notes ? `
  <div style="padding:20px 0;border-bottom:1px solid #222">
    <div style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:8px">Delivery Notes</div>
    <div style="background:#111;padding:12px;border-radius:4px;color:#ddd;font-size:13px;white-space:pre-wrap;line-height:1.5">${esc(ctx.notes)}</div>
  </div>
  ` : ""}

  <div style="padding:20px 0;border-bottom:1px solid #222;background:#0d1f17;border-radius:6px;margin:16px 0;padding:16px">
    <div style="font-size:12px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;margin-bottom:8px;font-weight:600">Next Steps for Parks</div>
    <ol style="margin:0;padding-left:20px;color:#ddd;font-size:13px;line-height:1.6">
      <li>Take the appointment with the seller (time confirmed above)</li>
      <li>Run the listing solicitation and execute the listing agreement</li>
      <li>Invoice for ${esc(feeStr)} arrives separately — Net 15 from invoice receipt</li>
      <li>If the lead materially fails the qualification standard, reject within 10 business days for full refund</li>
    </ol>
  </div>

  <div style="padding:24px 0 16px;text-align:center">
    <a href="https://falco.llc/dialer/${esc(ctx.listingSlug)}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#000;text-decoration:none;border-radius:6px;font-weight:700;font-size:13px">Open Lead in Dialer →</a>
  </div>

  <div style="color:#555;font-size:10px;text-align:center;margin-top:16px">
    FALCO · Qualified Lead delivery under FALCO × Parks Data Services Agreement
  </div>
</div>
</body>
</html>`

    const text = [
      `QUALIFIED LEAD DELIVERED — ${address}`,
      `${owner} · ${county} · ${distress}`,
      ``,
      `BILLABLE DELIVERY`,
      `  Tier: ${tierLabel}`,
      `  Per-QL fee: ${feeStr}`,
      `  ARV at delivery: ${arvStr}`,
      `  Delivered by: ${ctx.deliveredBy || "FALCO"}`,
      `  Appointment: ${apptStr} CT`,
      ``,
      `SELLER CONTACT`,
      `  Name: ${owner}`,
      phone1 ? `  Primary: ${fmtPhone(phone1)}` : "",
      phone2 ? `  Secondary: ${fmtPhone(phone2)}` : "",
      ``,
      ctx.notes ? `DELIVERY NOTES\n${ctx.notes}\n` : "",
      `NEXT STEPS FOR PARKS`,
      `  1. Take the appointment with the seller`,
      `  2. Run listing solicitation and execute listing agreement`,
      `  3. Invoice for ${feeStr} arrives separately (Net 15)`,
      `  4. Reject within 10 business days if lead fails qualification standard`,
      ``,
      `Open: https://falco.llc/dialer/${ctx.listingSlug}`,
    ]
      .filter(Boolean)
      .join("\n")

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: from, pass },
    })

    await transporter.sendMail({
      from: `"FALCO Delivery" <${from}>`,
      to: recipient,
      subject,
      text,
      html,
    })
    console.log(`[notifyQualifiedLeadDelivered] sent to ${recipient} for ${ctx.listingSlug} (${ctx.tier} / ${feeStr})`)
  } catch (err) {
    console.error("notifyQualifiedLeadDelivered failed:", err)
  }
}
