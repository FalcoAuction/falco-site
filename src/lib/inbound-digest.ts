import { Resend } from "resend"
import { fetchLast24hLeads, type Lead } from "@/lib/admin-leads"

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

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function leadRowsHtml(leads: Lead[]): string {
  if (!leads.length) {
    return `<tr><td colspan="3" style="padding:14px;color:#6b7280;font-size:13px;text-align:center">— None —</td></tr>`
  }
  return leads
    .map(
      (l) => `<tr style="border-top:1px solid rgba(255,255,255,0.06)">
  <td style="padding:10px 14px;color:#9ca3af;font-size:12px;width:80px;vertical-align:top;white-space:nowrap">${esc(fmtTime(l.submittedAt))}</td>
  <td style="padding:10px 14px;color:#fff;font-size:13px;vertical-align:top">
    <div style="font-weight:600">${esc(l.name || "(no name)")}</div>
    <div style="color:#10b981;font-size:12px;margin-top:2px"><a href="mailto:${esc(l.email)}" style="color:#10b981;text-decoration:none">${esc(l.email)}</a></div>
  </td>
  <td style="padding:10px 14px;color:#d1d5db;font-size:13px;vertical-align:top">${esc(l.summary)}</td>
</tr>`
    )
    .join("")
}

function sectionHtml(title: string, emoji: string, leads: Lead[]): string {
  return `<div style="margin-top:24px">
  <div style="font-size:11px;letter-spacing:0.22em;color:#10b981;text-transform:uppercase;font-weight:700;margin-bottom:8px">${emoji} ${esc(title)}<span style="color:rgba(255,255,255,0.45);margin-left:8px;letter-spacing:normal;text-transform:none;font-weight:400">${leads.length}</span></div>
  <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:8px;overflow:hidden">
    <tbody>${leadRowsHtml(leads)}</tbody>
  </table>
</div>`
}

function leadTextLines(leads: Lead[], label: string): string[] {
  if (!leads.length) return [`${label}: none`]
  const lines = [`${label} (${leads.length}):`]
  for (const l of leads) {
    lines.push(`  • ${fmtTime(l.submittedAt)} — ${l.name || "(no name)"} <${l.email}>`)
    if (l.summary) lines.push(`      ${l.summary}`)
  }
  return lines
}

export type DigestResult = {
  ok: boolean
  sent: boolean
  totals: { homeowners: number; buyers: number; partners: number; inquiries: number; total: number }
  reason?: string
}

/**
 * Build + send the daily inbound digest email.
 * - Always queries the last 24h.
 * - If no leads, by default skips the send (but `force=true` will send an empty digest).
 */
export async function sendInboundDigest(opts?: { force?: boolean }): Promise<DigestResult> {
  const recipient = notifyRecipient()
  if (!recipient) {
    return {
      ok: false,
      sent: false,
      totals: { homeowners: 0, buyers: 0, partners: 0, inquiries: 0, total: 0 },
      reason: "FALCO_INBOUND_NOTIFY_TO not set",
    }
  }
  if (!resendClient) {
    return {
      ok: false,
      sent: false,
      totals: { homeowners: 0, buyers: 0, partners: 0, inquiries: 0, total: 0 },
      reason: "RESEND_API_KEY not set",
    }
  }

  const last = await fetchLast24hLeads()
  const totals = {
    homeowners: last.homeowners.length,
    buyers: last.buyers.length,
    partners: last.partners.length,
    inquiries: last.inquiries.length,
    total:
      last.homeowners.length +
      last.buyers.length +
      last.partners.length +
      last.inquiries.length,
  }

  if (!opts?.force && totals.total === 0) {
    return { ok: true, sent: false, totals, reason: "no leads in last 24h" }
  }

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  const subject = `FALCO daily digest — ${totals.total} new lead${totals.total === 1 ? "" : "s"} (${today})`

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#060606;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden">
  <div style="padding:24px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:11px;letter-spacing:0.32em;color:#10b981;font-weight:700;text-transform:uppercase">FALCO · Daily Digest</div>
    <div style="font-size:24px;font-weight:600;color:#fff;margin-top:10px">${totals.total} new lead${totals.total === 1 ? "" : "s"} in the last 24 hours</div>
    <div style="font-size:13px;color:#9ca3af;margin-top:4px">${esc(today)} · falco.llc/admin</div>
  </div>
  <div style="padding:6px 28px 24px">
    ${sectionHtml("Homeowners", "🏠", last.homeowners)}
    ${sectionHtml("Buyers", "🆕", last.buyers)}
    ${sectionHtml("Auction partners", "🤝", last.partners)}
    ${sectionHtml("General inquiries", "📨", last.inquiries)}
  </div>
  <div style="padding:14px 28px;border-top:1px solid rgba(255,255,255,0.06);color:#4b5563;font-size:11px;text-align:center;letter-spacing:0.16em;text-transform:uppercase">
    <a href="https://falco.llc/admin" style="color:#10b981;text-decoration:none">Open Admin Inbox →</a>
  </div>
</div>
</body></html>`

  const text = [
    `FALCO Daily Digest — ${today}`,
    `${totals.total} new lead${totals.total === 1 ? "" : "s"} in the last 24 hours`,
    "",
    ...leadTextLines(last.homeowners, "🏠 Homeowners"),
    "",
    ...leadTextLines(last.buyers, "🆕 Buyers"),
    "",
    ...leadTextLines(last.partners, "🤝 Auction partners"),
    "",
    ...leadTextLines(last.inquiries, "📨 General inquiries"),
    "",
    "Open the inbox: https://falco.llc/admin",
  ].join("\n")

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
      console.error("digest send failed:", result.error)
      return { ok: false, sent: false, totals, reason: String(result.error) }
    }
    return { ok: true, sent: true, totals }
  } catch (err) {
    console.error("digest exception:", err)
    return { ok: false, sent: false, totals, reason: err instanceof Error ? err.message : "unknown" }
  }
}
