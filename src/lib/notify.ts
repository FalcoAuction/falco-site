// Lightweight notification helpers used by crons + ops paths.
// Resend-only. Non-throwing on transport failure (logs + swallows).

import { Resend } from "resend"

const resendClient = (() => {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
})()

function fromAddress(): string {
  return process.env.FALCO_FROM_EMAIL?.trim() || "FALCO <falco@falco.llc>"
}

/** Parse a comma-separated env var into a clean recipient list.
 *  Empty / whitespace / dupes filtered. Returns [] when unset. */
export function parseRecipientList(raw: string | undefined | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of String(raw).split(",")) {
    const e = part.trim().toLowerCase()
    if (!e || !e.includes("@")) continue
    if (seen.has(e)) continue
    seen.add(e)
    out.push(e)
  }
  return out
}

/** Recipients for partner/QL notifications. Falls back to the inbound
 *  digest recipient (Patrick) if the auction-specific list isn't set. */
export function auctionPartnerRecipients(): string[] {
  const primary = parseRecipientList(process.env.FALCO_AUCTION_NOTIFY_TO)
  if (primary.length > 0) return primary
  return parseRecipientList(process.env.FALCO_INBOUND_NOTIFY_TO)
}

/** Recipients for ops/health/cron alerts. Always Patrick (FALCO_INBOUND_NOTIFY_TO). */
export function opsAlertRecipients(): string[] {
  return parseRecipientList(process.env.FALCO_INBOUND_NOTIFY_TO)
}

/** Send an ops alert email. Used by cron failure handlers. */
export async function notifyOpsAlert(
  subject: string,
  body: string
): Promise<void> {
  const recipients = opsAlertRecipients()
  if (recipients.length === 0) {
    console.warn("notifyOpsAlert skipped: no FALCO_INBOUND_NOTIFY_TO")
    return
  }
  if (!resendClient) {
    console.warn("notifyOpsAlert skipped: no RESEND_API_KEY")
    return
  }
  try {
    const html = `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;background:#f8f9fa;padding:14px;border-left:3px solid #dc2626;color:#1e293b;white-space:pre-wrap;line-height:1.5">${escapeHtml(body)}</pre>`
    const result = await resendClient.emails.send({
      from: fromAddress(),
      to: recipients,
      subject: `[FALCO ALERT] ${subject}`,
      html,
      text: body,
    })
    if (result.error) {
      console.error("notifyOpsAlert send failed:", result.error)
    }
  } catch (err) {
    console.error("notifyOpsAlert exception:", err)
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Wrap a fetch with a hard timeout. Returns the Response; throws on timeout. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
