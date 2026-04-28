import nodemailer from "nodemailer"
import { Resend } from "resend"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { OUTCOME_LABELS, CHANNEL_LABELS, distressTypeLabel } from "@/lib/dialer-types"
import type { DialerOutcome, DialerChannel } from "@/lib/dialer-types"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { defaultInputsFor, computeMath, fmt as fmtMath } from "@/lib/math-sheet"

// Resend client — preferred email transport (matches inbound-digest.ts).
// Falls back to nodemailer/Gmail for legacy notifyAuctionPartnerOnBooking.
const resendClient = (() => {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
})()

function fromAddress(): string {
  return process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"
}

/** Recipient for QL delivery notifications. Falls back to inbound digest
 *  recipient (Patrick) if Parks-specific notify address isn't configured yet. */
function qualifiedLeadNotifyRecipient(): string | null {
  return (
    process.env.FALCO_AUCTION_NOTIFY_TO?.trim() ||
    process.env.FALCO_INBOUND_NOTIFY_TO?.trim() ||
    null
  )
}

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
 * Pull the freshest data we have for a lead by merging dialer inventory
 * (sale date, mortgage details, beds/baths) with homeowner_requests
 * (BatchData skip-traced phones + emails).
 */
type HomeownerRequestSnapshot = {
  phone: string | null
  email: string | null
  owner_name_records: string | null
  property_value: number | null
  distress_type: string | null
}

async function loadEnhancedLeadContext(slug: string) {
  const inventory = await findDialerInventoryLead(slug)

  let hr: HomeownerRequestSnapshot | null = null

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select("phone, email, owner_name_records, property_value, distress_type")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) hr = data as unknown as HomeownerRequestSnapshot
  }

  return {
    address: inventory?.address || "(address unknown)",
    county: inventory?.county || "",
    ownerName:
      hr?.owner_name_records || inventory?.ownerName || "Unknown owner",
    // Prefer skip-traced phone over inventory snapshot phone
    phonePrimary: hr?.phone || inventory?.ownerPhonePrimary || "",
    phoneSecondary: inventory?.ownerPhoneSecondary || "",
    email: hr?.email || inventory?.ownerMail || "",
    distressType: inventory?.distressType || hr?.distress_type || "",
    saleDate: inventory?.currentSaleDate || "",
    saleControllerName: inventory?.saleControllerName || "",
    trusteePhonePublic: inventory?.trusteePhonePublic || "",
    // Prefer the freshest property value; homeowner_requests has BatchData re-enrichment
    avmMid: hr?.property_value ?? inventory?.avmMid ?? null,
    avmLow: inventory?.avmLow ?? null,
    avmHigh: inventory?.avmHigh ?? null,
    mortgageAmount: inventory?.mortgageAmount ?? null,
    mortgageDate: inventory?.mortgageDate || "",
    mortgageLender: inventory?.mortgageLender || "",
    beds: inventory?.beds ?? null,
    baths: inventory?.baths ?? null,
    sqft: inventory?.buildingAreaSqft ?? null,
    yearBuilt: inventory?.yearBuilt ?? null,
  }
}

function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Email Dale when a Qualified Lead is formally delivered. This is the
 * billable event AND the operational handoff — Dale needs everything
 * in this email to take the appointment cold.
 *
 * Sections (top to bottom):
 *   1. Header (address, owner, county, distress)
 *   2. Appointment + delivery context
 *   3. Sale timeline (date + countdown)
 *   4. Property snapshot (beds/baths/sqft/year)
 *   5. Seller contact (name, phones, email)
 *   6. Equity math — same numbers Chris walked seller through
 *   7. Title workflow (Lindsey Hahn / authorization form)
 *   8. Chris's delivery notes
 *   9. Next steps for Parks
 *  10. Billable delivery summary (tier, fee, billing terms)
 *
 * Uses Resend. Non-blocking — errors logged but never thrown.
 */
export async function notifyQualifiedLeadDelivered(
  ctx: QualifiedLeadDeliveredContext
): Promise<void> {
  try {
    const recipient = qualifiedLeadNotifyRecipient()
    if (!recipient) {
      console.warn(
        "notifyQualifiedLeadDelivered: no recipient configured (set FALCO_AUCTION_NOTIFY_TO or FALCO_INBOUND_NOTIFY_TO) — skipping"
      )
      return
    }
    if (!resendClient) {
      console.warn(
        "notifyQualifiedLeadDelivered: RESEND_API_KEY not set — skipping"
      )
      return
    }

    const lead = await loadEnhancedLeadContext(ctx.listingSlug)
    const tierLabel = TIER_LABELS[ctx.tier]
    const feeStr = fmtCurrency(ctx.feeUSD)
    const distress = distressTypeLabel(lead.distressType).label

    // Sale timeline
    const dts = daysFromNow(lead.saleDate)
    const saleStr = lead.saleDate ? fmtDate(lead.saleDate) : "Not scheduled"
    const dtsStr =
      dts === null ? "" : dts < 0 ? ` (${Math.abs(dts)} days past)` : ` (${dts} days out)`
    const saleColor =
      dts === null
        ? "#888"
        : dts < 0
        ? "#888"
        : dts <= 14
        ? "#ef4444"
        : dts <= 30
        ? "#f59e0b"
        : "#10b981"

    // Mortgage / payoff math
    const payoffEstimate = estimatePayoff(lead.mortgageAmount, lead.mortgageDate)

    // Equity math via the same engine the dialer math sheet uses
    let mathSummary: {
      arvStr: string
      payoffStr: string
      wholesalerNetStr: string
      wholesalerScenario: string
      auctionNetRange: string
      auctionMidpointStr: string
      spreadStr: string
      worstStillBeatsWholesaler: boolean
    } | null = null

    if (lead.avmMid && lead.avmMid > 0) {
      const inputs = defaultInputsFor(
        lead.avmMid,
        payoffEstimate ?? lead.mortgageAmount ?? 0
      )
      const m = computeMath(inputs)
      mathSummary = {
        arvStr: fmtMath(lead.avmMid),
        payoffStr: payoffEstimate
          ? fmtMath(payoffEstimate)
          : lead.mortgageAmount
          ? fmtMath(lead.mortgageAmount)
          : "—",
        wholesalerNetStr: fmtMath(m.wholesaler.realisticNet),
        wholesalerScenario: m.wholesaler.scenarioLabel,
        auctionNetRange: m.auction.netRangeLabel,
        auctionMidpointStr: fmtMath(
          (m.auction.low.netToHomeowner + m.auction.high.netToHomeowner) / 2
        ),
        spreadStr: fmtMath(m.spreadEstimate.midpointGain),
        worstStillBeatsWholesaler: m.auction.worstStillBeatsWholesaler,
      }
    }

    // Appointment formatting
    const apptStr = ctx.appointmentAt
      ? fmtDateTime(ctx.appointmentAt)
      : "Confirm with seller — appointment time pending"

    // Property snapshot
    const propBits: string[] = []
    if (lead.beds) propBits.push(`${lead.beds} bd`)
    if (lead.baths) propBits.push(`${lead.baths} ba`)
    if (lead.sqft) propBits.push(`${lead.sqft.toLocaleString()} sqft`)
    if (lead.yearBuilt) propBits.push(`built ${lead.yearBuilt}`)
    const propSnapshot = propBits.join("  ·  ")

    const subject = `[QL · ${ctx.tier} · ${feeStr}] ${lead.address} — ${apptStr}`

    const mathSheetUrl = `https://falco.llc/dialer/${ctx.listingSlug}/math-sheet`
    const dialerUrl = `https://falco.llc/dialer/${ctx.listingSlug}`

    // ────────────────────────────────────────────────────────────────────
    // HTML
    // ────────────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:680px;margin:0 auto">

  <!-- HEADER -->
  <div style="padding:16px 0 18px;border-bottom:2px solid #10b981">
    <div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase;font-weight:700">FALCO · Qualified Lead Delivered</div>
    <div style="font-size:22px;font-weight:700;margin-top:6px;color:#fff;line-height:1.2">${esc(lead.address)}</div>
    <div style="font-size:13px;color:#9ca3af;margin-top:4px">${esc(lead.ownerName)}  ·  ${esc(lead.county)}  ·  ${esc(distress)}</div>
    ${propSnapshot ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(propSnapshot)}</div>` : ""}
  </div>

  <!-- APPOINTMENT -->
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;font-weight:600;margin-bottom:8px">Appointment</div>
    <div style="font-size:16px;font-weight:600;color:#fff">${esc(apptStr)} CT</div>
    <div style="font-size:12px;color:#9ca3af;margin-top:2px">Booked by ${esc(ctx.deliveredBy || "FALCO")}</div>
  </div>

  <!-- SALE TIMELINE -->
  ${
    lead.saleDate || lead.saleControllerName
      ? `
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#f59e0b;text-transform:uppercase;font-weight:600;margin-bottom:8px">Sale Timeline</div>
    <table style="width:100%;border-collapse:collapse">
      ${
        lead.saleDate
          ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px;width:160px">Trustee sale</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:600">${esc(saleStr)}<span style="color:${saleColor};font-weight:600">${esc(dtsStr)}</span></td></tr>`
          : `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px;width:160px">Trustee sale</td><td style="padding:5px 0;color:#fff;font-size:13px">Not scheduled (pre-foreclosure)</td></tr>`
      }
      ${lead.saleControllerName ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px">Trustee / Attorney</td><td style="padding:5px 0;color:#fff;font-size:13px">${esc(lead.saleControllerName)}</td></tr>` : ""}
      ${lead.trusteePhonePublic ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px">Trustee phone</td><td style="padding:5px 0;color:#fff;font-size:13px">${esc(fmtPhone(lead.trusteePhonePublic))}</td></tr>` : ""}
    </table>
  </div>
  `
      : ""
  }

  <!-- SELLER CONTACT -->
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;font-weight:600;margin-bottom:8px">Seller Contact</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:5px 0;color:#9ca3af;font-size:12px;width:160px">Name</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:600">${esc(lead.ownerName)}</td></tr>
      ${lead.phonePrimary ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px">Primary phone</td><td style="padding:5px 0;color:#fff;font-size:13px"><a href="tel:${esc(lead.phonePrimary.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none;font-weight:600">${esc(fmtPhone(lead.phonePrimary))}</a></td></tr>` : ""}
      ${lead.phoneSecondary ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px">Secondary phone</td><td style="padding:5px 0;color:#fff;font-size:13px"><a href="tel:${esc(lead.phoneSecondary.replace(/\D/g, ""))}" style="color:#10b981;text-decoration:none">${esc(fmtPhone(lead.phoneSecondary))}</a></td></tr>` : ""}
      ${lead.email ? `<tr><td style="padding:5px 0;color:#9ca3af;font-size:12px">Email</td><td style="padding:5px 0;color:#fff;font-size:13px"><a href="mailto:${esc(lead.email)}" style="color:#10b981;text-decoration:none">${esc(lead.email)}</a></td></tr>` : ""}
    </table>
  </div>

  <!-- EQUITY MATH -->
  ${
    mathSummary
      ? `
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;font-weight:600;margin-bottom:8px">Equity Math <span style="color:#6b7280;font-weight:400;letter-spacing:normal;text-transform:none">— same numbers Chris walked the seller through</span></div>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;overflow:hidden">
      <tr><td style="padding:10px 14px;color:#9ca3af;font-size:12px;width:200px">Property value (AVM)</td><td style="padding:10px 14px;color:#fff;font-size:14px;font-weight:600">${esc(mathSummary.arvStr)}</td></tr>
      <tr><td style="padding:10px 14px;color:#9ca3af;font-size:12px;border-top:1px solid rgba(255,255,255,0.04)">Estimated mortgage payoff</td><td style="padding:10px 14px;color:#fff;font-size:13px;border-top:1px solid rgba(255,255,255,0.04)">${esc(mathSummary.payoffStr)}${lead.mortgageLender ? ` <span style="color:#6b7280">· ${esc(lead.mortgageLender)}</span>` : ""}</td></tr>
    </table>

    <div style="margin-top:14px;background:#0d1f17;border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:14px">
      <div style="font-size:11px;letter-spacing:1px;color:#10b981;text-transform:uppercase;font-weight:600;margin-bottom:10px">Three Paths · seller take-home</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;color:#9ca3af;font-size:12px;width:200px">If they wholesale</td>
          <td style="padding:6px 0;color:#f59e0b;font-size:14px;font-weight:600">${esc(mathSummary.wholesalerNetStr)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#9ca3af;font-size:11px;padding-bottom:10px">↳ ${esc(mathSummary.wholesalerScenario)}</td>
          <td></td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#9ca3af;font-size:12px">If trustee sale runs (no listing)</td>
          <td style="padding:6px 0;color:#ef4444;font-size:14px;font-weight:600">$0  <span style="color:#9ca3af;font-size:11px;font-weight:400">— equity wiped</span></td>
        </tr>
        <tr>
          <td style="padding:10px 0 6px;color:#9ca3af;font-size:12px;border-top:1px solid rgba(16,185,129,0.15);font-weight:600">If marketed auction (Parks)</td>
          <td style="padding:10px 0 6px;color:#10b981;font-size:16px;font-weight:700;border-top:1px solid rgba(16,185,129,0.15)">${esc(mathSummary.auctionNetRange)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#9ca3af;font-size:11px">↳ midpoint estimate</td>
          <td style="padding:6px 0;color:#9ca3af;font-size:12px">${esc(mathSummary.auctionMidpointStr)}</td>
        </tr>
      </table>
      <div style="margin-top:12px;padding:10px;background:rgba(16,185,129,0.08);border-left:3px solid #10b981;border-radius:3px">
        <div style="font-size:12px;color:#10b981;font-weight:600">Auction premium over wholesale: +${esc(mathSummary.spreadStr)}</div>
        ${mathSummary.worstStillBeatsWholesaler ? `<div style="font-size:11px;color:#9ca3af;margin-top:3px">Even at the worst-case auction clearance, this still beats the wholesaler offer.</div>` : ""}
      </div>
    </div>

    <div style="margin-top:10px;text-align:center">
      <a href="${esc(mathSheetUrl)}" style="display:inline-block;padding:8px 16px;background:transparent;color:#10b981;text-decoration:none;border:1px solid rgba(16,185,129,0.4);border-radius:4px;font-size:12px;font-weight:600">View / print full math sheet →</a>
    </div>
  </div>
  `
      : `
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px">Equity Math</div>
    <div style="color:#9ca3af;font-size:13px">Insufficient data to compute (missing AVM or mortgage info). Open the dialer for context.</div>
  </div>
  `
  }

  <!-- TITLE WORKFLOW -->
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;font-weight:600;margin-bottom:8px">Title &amp; Payoff Workflow</div>
    <div style="font-size:13px;color:#d1d5db;line-height:1.55">
      Use Signature Title Services (Lindsey Hahn) for upfront title and payoff verification.
      Send the seller authorization form so Lindsey can contact the lender directly.
      <span style="color:#9ca3af">[Authorization form attachment pending — coordinate with Lindsey]</span>
    </div>
  </div>

  ${
    ctx.notes
      ? `
  <!-- DELIVERY NOTES -->
  <div style="padding:18px 0;border-bottom:1px solid #1f2937">
    <div style="font-size:11px;letter-spacing:1.5px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px">Chris's Notes</div>
    <div style="background:#111827;padding:12px 14px;border-radius:5px;color:#e5e7eb;font-size:13px;white-space:pre-wrap;line-height:1.55">${esc(ctx.notes)}</div>
  </div>
  `
      : ""
  }

  <!-- NEXT STEPS -->
  <div style="padding:18px;border-radius:6px;background:#0d1f17;border:1px solid rgba(16,185,129,0.2);margin:18px 0">
    <div style="font-size:11px;letter-spacing:1.5px;color:#10b981;text-transform:uppercase;font-weight:700;margin-bottom:10px">Next Steps</div>
    <ol style="margin:0;padding-left:20px;color:#e5e7eb;font-size:13px;line-height:1.7">
      <li>Take the appointment with the seller at the time confirmed above</li>
      <li>Reference the math sheet — same numbers Chris already shared with them</li>
      <li>Send the seller the authorization form so Lindsey at Signature Title can pull payoff</li>
      <li>Run listing solicitation and execute the listing agreement</li>
      <li>Reject within 3 business days if the lead materially fails the qualification standard</li>
    </ol>
  </div>

  <!-- BILLING / DELIVERY DETAILS -->
  <div style="padding:14px 0;border-top:1px solid #1f2937">
    <div style="font-size:10px;letter-spacing:1.5px;color:#6b7280;text-transform:uppercase;margin-bottom:6px">Delivery Details</div>
    <div style="font-size:12px;color:#9ca3af;line-height:1.6">
      Tier: <span style="color:#fff">${esc(tierLabel)}</span>  ·  Per-QL fee: <span style="color:#10b981;font-weight:600">${esc(feeStr)}</span><br>
      Billing: invoice arrives separately, Net 15 from receipt.
    </div>
  </div>

  <!-- CTA -->
  <div style="padding:20px 0 16px;text-align:center">
    <a href="${esc(dialerUrl)}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#000;text-decoration:none;border-radius:6px;font-weight:700;font-size:13px">Open Lead in FALCO Dialer →</a>
  </div>

  <div style="color:#4b5563;font-size:10px;text-align:center;margin-top:8px">
    FALCO · Qualified Lead delivery
  </div>
</div>
</body>
</html>`

    // ────────────────────────────────────────────────────────────────────
    // Plain text fallback
    // ────────────────────────────────────────────────────────────────────
    const text = [
      `QUALIFIED LEAD DELIVERED`,
      `${lead.address}`,
      `${lead.ownerName} · ${lead.county} · ${distress}`,
      propSnapshot ? `${propSnapshot}` : "",
      ``,
      `APPOINTMENT`,
      `  ${apptStr} CT`,
      `  Booked by ${ctx.deliveredBy || "FALCO"}`,
      ``,
      lead.saleDate ? `SALE TIMELINE` : "",
      lead.saleDate ? `  Trustee sale: ${saleStr}${dtsStr}` : "",
      lead.saleControllerName ? `  Trustee/Attorney: ${lead.saleControllerName}` : "",
      lead.trusteePhonePublic ? `  Trustee phone: ${fmtPhone(lead.trusteePhonePublic)}` : "",
      ``,
      `SELLER CONTACT`,
      `  Name: ${lead.ownerName}`,
      lead.phonePrimary ? `  Primary: ${fmtPhone(lead.phonePrimary)}` : "",
      lead.phoneSecondary ? `  Secondary: ${fmtPhone(lead.phoneSecondary)}` : "",
      lead.email ? `  Email: ${lead.email}` : "",
      ``,
      mathSummary ? `EQUITY MATH (same numbers Chris walked seller through)` : "",
      mathSummary ? `  Property value (AVM): ${mathSummary.arvStr}` : "",
      mathSummary ? `  Est. mortgage payoff: ${mathSummary.payoffStr}${lead.mortgageLender ? " · " + lead.mortgageLender : ""}` : "",
      mathSummary ? `` : "",
      mathSummary ? `  Three paths — seller take-home:` : "",
      mathSummary ? `    Wholesale offer:        ${mathSummary.wholesalerNetStr}  (${mathSummary.wholesalerScenario})` : "",
      mathSummary ? `    Trustee sale runs:      $0  — equity wiped` : "",
      mathSummary ? `    Marketed auction:       ${mathSummary.auctionNetRange}  (midpoint ${mathSummary.auctionMidpointStr})` : "",
      mathSummary ? `` : "",
      mathSummary ? `  Auction premium over wholesale: +${mathSummary.spreadStr}` : "",
      mathSummary && mathSummary.worstStillBeatsWholesaler
        ? `  Even worst-case auction still beats wholesaler.`
        : "",
      mathSummary ? `  Full math sheet: ${mathSheetUrl}` : "",
      ``,
      `TITLE WORKFLOW`,
      `  Signature Title Services (Lindsey Hahn) — upfront title + payoff`,
      `  Send seller the authorization form so Lindsey can contact lender`,
      `  [Auth form attachment pending — coordinate with Lindsey]`,
      ``,
      ctx.notes ? `CHRIS'S NOTES` : "",
      ctx.notes ? ctx.notes : "",
      ctx.notes ? `` : "",
      `NEXT STEPS`,
      `  1. Take the appointment at confirmed time`,
      `  2. Reference the math sheet — same numbers Chris shared`,
      `  3. Send authorization form to seller; loop in Lindsey for payoff`,
      `  4. Run listing solicitation, execute listing agreement`,
      `  5. Reject within 3 business days if material qualification fail`,
      ``,
      `DELIVERY DETAILS`,
      `  Tier: ${tierLabel}`,
      `  Per-QL fee: ${feeStr}`,
      `  Billing: invoice arrives separately, Net 15`,
      ``,
      `Open lead: ${dialerUrl}`,
    ]
      .filter(Boolean)
      .join("\n")

    const result = await resendClient.emails.send({
      from: fromAddress(),
      to: [recipient],
      replyTo: recipient,
      subject,
      html,
      text,
    })
    if (result.error) {
      console.error("notifyQualifiedLeadDelivered Resend error:", result.error)
      return
    }
    console.log(
      `[notifyQualifiedLeadDelivered] sent to ${recipient} for ${ctx.listingSlug} (${ctx.tier} / ${feeStr})`
    )
  } catch (err) {
    console.error("notifyQualifiedLeadDelivered failed:", err)
  }
}
