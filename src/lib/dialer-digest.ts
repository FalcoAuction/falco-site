import nodemailer from "nodemailer"
import { computeDialerMetrics, type DialerMetrics } from "@/lib/dialer-metrics"
import { STATUS_LABELS, CHANNEL_LABELS, OUTCOME_LABELS } from "@/lib/dialer-types"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const d = String(raw).replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return String(raw)
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  })
}

export function renderDialerDigestHtml(m: DialerMetrics): string {
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  })

  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #222;color:#999;font-size:12px">${escapeHtml(label)}</td><td style="padding:6px 10px;border-bottom:1px solid #222;color:#fff;font-size:13px;font-weight:600">${escapeHtml(String(value))}</td></tr>`

  const leadRows = (leads: typeof m.dueToday, showStuck = false) =>
    leads.length === 0
      ? `<tr><td colspan="2" style="padding:10px;color:#666;font-size:12px;font-style:italic">None.</td></tr>`
      : leads
          .slice(0, 10)
          .map(
            (l) => `
<tr>
  <td style="padding:6px 10px;border-bottom:1px solid #222;color:#fff;font-size:12px">
    <div style="font-weight:600">${escapeHtml(l.address)}</div>
    <div style="color:#888;font-size:11px">${escapeHtml(l.ownerName || "Unknown owner")}${l.phone ? ` · ${escapeHtml(fmtPhone(l.phone))}` : ""}</div>
  </td>
  <td style="padding:6px 10px;border-bottom:1px solid #222;color:#bbb;font-size:11px;text-align:right;white-space:nowrap">
    ${escapeHtml(STATUS_LABELS[l.status] ?? l.status)}<br/>
    ${showStuck && l.stuckDays !== undefined ? `<span style="color:#f59e0b">stuck ${l.stuckDays}d</span>` : l.nextActionAt ? `<span style="color:#999">${escapeHtml(fmtDateTime(l.nextActionAt))}</span>` : ""}
  </td>
</tr>`
          )
          .join("")

  const activityRows =
    m.recentActivities.length === 0
      ? `<tr><td colspan="3" style="padding:10px;color:#666;font-size:12px;font-style:italic">No activity in the last 24 hours.</td></tr>`
      : m.recentActivities
          .slice(0, 15)
          .map(
            (a) => `
<tr>
  <td style="padding:6px 10px;border-bottom:1px solid #222;color:#888;font-size:11px;white-space:nowrap">${escapeHtml(fmtDateTime(a.occurredAt))}</td>
  <td style="padding:6px 10px;border-bottom:1px solid #222;color:#fff;font-size:12px">
    <div><span style="color:#10b981">${escapeHtml(a.createdBy || "—")}</span> · ${escapeHtml(CHANNEL_LABELS[a.channel])} · ${escapeHtml(OUTCOME_LABELS[a.outcome])}</div>
    <div style="color:#888;font-size:11px">${escapeHtml(a.address)}</div>
    ${a.notes ? `<div style="color:#aaa;font-size:11px;margin-top:2px">${escapeHtml(a.notes.slice(0, 200))}${a.notes.length > 200 ? "…" : ""}</div>` : ""}
  </td>
</tr>`
          )
          .join("")

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
<div style="max-width:640px;margin:0 auto">
  <div style="padding:16px 0;border-bottom:2px solid #10b981">
    <div style="font-size:10px;letter-spacing:2px;color:#10b981;text-transform:uppercase">FALCO · Dialer Daily Digest</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(todayDate)}</div>
  </div>

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:24px 0 8px">Last 24 hours</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border-radius:6px">
    ${row("Dial attempts", m.today.dialAttempts)}
    ${row("Right-party contacts", m.today.rpcs)}
    ${row("Bookings (auction call)", m.today.bookings)}
    ${row("Voicemails left", m.today.byOutcome.voicemail_left)}
    ${row("No answer / hung up", m.today.byOutcome.no_answer + m.today.byOutcome.hung_up)}
    ${row("Wrong numbers", m.today.byOutcome.wrong_number)}
    ${row("Closed lost", m.today.closedLost)}
    ${row("Texts sent", m.today.byChannel.text)}
    ${row("Notes logged", m.today.byChannel.note)}
  </table>

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:24px 0 8px">Last 7 days</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border-radius:6px">
    ${row("Total dial attempts", m.last7days.dialAttempts)}
    ${row("Total RPCs", m.last7days.rpcs)}
    ${row("Total bookings", m.last7days.bookings)}
    ${row("Total closed lost", m.last7days.closedLost)}
  </table>

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:24px 0 8px">Pipeline snapshot</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border-radius:6px">
    ${row("Open leads", m.callableLeads)}
    ${row("New", m.status.new)}
    ${row("Attempting contact", m.status.attempting_contact)}
    ${row("RPC made", m.status.rpc_made)}
    ${row("Auction booked", m.status.auction_booked)}
    ${row("Listing signed", m.status.listing_signed)}
    ${row("Auction live", m.status.auction_live)}
    ${row("Closed won", m.status.closed_won)}
    ${row("Closed lost", m.status.closed_lost)}
  </table>

  ${m.overdue.length > 0 ? `
    <h2 style="font-size:12px;letter-spacing:1.5px;color:#ef4444;text-transform:uppercase;margin:24px 0 8px">Overdue (${m.overdue.length})</h2>
    <table style="width:100%;border-collapse:collapse;background:#1a0f0f;border:1px solid rgba(239,68,68,0.25);border-radius:6px">
      ${leadRows(m.overdue)}
    </table>
  ` : ""}

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#f59e0b;text-transform:uppercase;margin:24px 0 8px">Due today (${m.dueToday.length})</h2>
  <table style="width:100%;border-collapse:collapse;background:#1a160f;border:1px solid rgba(245,158,11,0.25);border-radius:6px">
    ${leadRows(m.dueToday)}
  </table>

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:24px 0 8px">Stuck in-progress (${m.stuck.length})</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border-radius:6px">
    ${leadRows(m.stuck, true)}
  </table>

  <h2 style="font-size:12px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:24px 0 8px">Recent activity</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border-radius:6px">
    ${activityRows}
  </table>

  <div style="margin:32px 0 16px;padding-top:16px;border-top:1px solid #222;text-align:center">
    <a href="https://falco.llc/operator/dialer" style="display:inline-block;padding:10px 20px;background:#10b981;color:#000;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Open Dialer Activity Dashboard</a>
  </div>

  <div style="color:#555;font-size:10px;text-align:center;margin-top:16px">
    FALCO · sent ${escapeHtml(fmtDateTime(m.generatedAt))} CT
  </div>
</div>
</body>
</html>`
}

export function renderDialerDigestText(m: DialerMetrics): string {
  const lines: string[] = []
  lines.push(`FALCO Dialer Daily Digest — ${new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago" })}`)
  lines.push("")
  lines.push("LAST 24 HOURS")
  lines.push(`  Dial attempts: ${m.today.dialAttempts}`)
  lines.push(`  RPCs: ${m.today.rpcs}`)
  lines.push(`  Bookings: ${m.today.bookings}`)
  lines.push(`  Closed lost: ${m.today.closedLost}`)
  lines.push("")
  lines.push("LAST 7 DAYS")
  lines.push(`  Dials: ${m.last7days.dialAttempts}  RPCs: ${m.last7days.rpcs}  Bookings: ${m.last7days.bookings}`)
  lines.push("")
  lines.push(`PIPELINE: ${m.callableLeads} open leads`)
  for (const [k, v] of Object.entries(m.status)) {
    if (v > 0) lines.push(`  ${STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k}: ${v}`)
  }
  lines.push("")
  if (m.overdue.length > 0) {
    lines.push(`OVERDUE (${m.overdue.length}):`)
    for (const l of m.overdue.slice(0, 10)) {
      lines.push(`  - ${l.address} (${l.ownerName || "unknown"}) · ${l.status}`)
    }
    lines.push("")
  }
  lines.push(`DUE TODAY (${m.dueToday.length}):`)
  for (const l of m.dueToday.slice(0, 10)) {
    lines.push(`  - ${l.address} at ${fmtDateTime(l.nextActionAt)}`)
  }
  lines.push("")
  lines.push("Dashboard: https://falco.llc/operator/dialer")
  return lines.join("\n")
}

function createTransport() {
  const user = process.env.FALCO_GMAIL_USER?.trim()
  const pass = process.env.FALCO_GMAIL_APP_PASSWORD?.trim()
  if (!user || !pass) {
    throw new Error("Missing FALCO_GMAIL_USER or FALCO_GMAIL_APP_PASSWORD.")
  }
  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    }),
    user,
  }
}

function isAuthorizedCron(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

function isAuthorizedManual(secret: string | null): boolean {
  const approvalSecret = process.env.FALCO_APPROVAL_SECRET?.trim()
  if (!approvalSecret || !secret) return false
  return secret.trim() === approvalSecret
}

export async function sendDailyDialerDigest(options?: {
  dryRun?: boolean
  authHeader?: string | null
  manualSecret?: string | null
  recipientOverride?: string
}) {
  const authed =
    isAuthorizedCron(options?.authHeader ?? null) ||
    isAuthorizedManual(options?.manualSecret ?? null)
  if (!authed) {
    throw new Error("Unauthorized dialer digest request.")
  }

  const metrics = await computeDialerMetrics()
  const html = renderDialerDigestHtml(metrics)
  const text = renderDialerDigestText(metrics)

  const recipient =
    options?.recipientOverride?.trim() ||
    process.env.FALCO_DIGEST_TO?.trim() ||
    process.env.FALCO_GMAIL_USER?.trim() ||
    ""

  if (!recipient) {
    throw new Error("Missing FALCO_DIGEST_TO.")
  }

  if (options?.dryRun) {
    return { ok: true, dryRun: true, recipient, metrics, htmlPreview: html.slice(0, 400) }
  }

  const { transporter, user } = createTransport()
  const info = await transporter.sendMail({
    from: `"FALCO Dialer Digest" <${user}>`,
    to: recipient,
    subject: `FALCO Dialer · ${metrics.today.dialAttempts} dials · ${metrics.today.bookings} bookings today`,
    text,
    html,
  })

  return { ok: true, recipient, messageId: info.messageId }
}
