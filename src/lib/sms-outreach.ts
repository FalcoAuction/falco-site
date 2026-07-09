// Shared machinery for the autonomous SMS campaign engine
// (/api/cron/sms-campaign). Everything here exists to make automated
// outreach read and behave like a person texting from their phone:
// human hours, human pacing, human message rhythm — while keeping the
// compliance rails (quiet hours, DNC, A2P gate, STOP handling) hard.

import { supabaseAdmin } from "@/lib/supabase-admin"

// ───────────────────────── Send windows ──────────────────────────────
// TN is Central time. Crude CDT offset (UTC-5) — matches the existing
// quiet-hours logic in twilio-send. A human doesn't text strangers at
// 8:01am sharp or on Sunday morning; the campaign window is tighter
// than the legal window on purpose:
//   Mon-Fri  9:40am – 6:50pm CT
//   Sat     11:10am – 3:50pm CT
//   Sun      closed
export function ctNow(): { hour: number; minute: number; day: number } {
  const now = new Date()
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const ctMinutes = (utcMinutes - 5 * 60 + 24 * 60) % (24 * 60)
  // Day-of-week in CT: shift when UTC date is ahead of CT date
  const shifted = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return {
    hour: Math.floor(ctMinutes / 60),
    minute: ctMinutes % 60,
    day: shifted.getUTCDay(), // 0 = Sunday
  }
}

export function isWithinCampaignWindow(): boolean {
  const { hour, minute, day } = ctNow()
  const m = hour * 60 + minute
  if (day === 0) return false // Sunday
  if (day === 6) return m >= 11 * 60 + 10 && m <= 15 * 60 + 50 // Saturday
  return m >= 9 * 60 + 40 && m <= 18 * 60 + 50 // weekdays
}

// ───────────────────────── Trust ramp ────────────────────────────────
// New 10DLC numbers get carrier-filtered when they go 0 → 200 messages
// overnight. Ramp the daily cap from the first campaign send:
//   day 0-1: 15/day, then +12/day up to 75 (or FALCO_SMS_DAILY_CAP).
export async function dailyCapRemaining(): Promise<{
  cap: number
  sentToday: number
  remaining: number
}> {
  const envCap = parseInt(process.env.FALCO_SMS_DAILY_CAP || "", 10)
  const ceiling = Number.isFinite(envCap) && envCap > 0 ? envCap : 75

  let firstSend: string | null = null
  let sentToday = 0
  if (supabaseAdmin) {
    const { data: first } = await supabaseAdmin
      .from("sms_messages")
      .select("created_at")
      .eq("direction", "out")
      .eq("status", "auto_sent")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    firstSend = first?.created_at ?? null

    const midnightCt = new Date()
    midnightCt.setUTCHours(5, 0, 0, 0) // midnight CT (UTC-5)
    if (midnightCt.getTime() > Date.now()) {
      midnightCt.setUTCDate(midnightCt.getUTCDate() - 1)
    }
    const { count } = await supabaseAdmin
      .from("sms_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "out")
      .gte("created_at", midnightCt.toISOString())
    sentToday = count ?? 0
  }

  const daysSinceFirst = firstSend
    ? Math.floor((Date.now() - new Date(firstSend).getTime()) / 86400000)
    : 0
  const ramp = Math.min(15 + 12 * daysSinceFirst, ceiling)
  return { cap: ramp, sentToday, remaining: Math.max(0, ramp - sentToday) }
}

// ─────────────────────── Humanized scheduling ────────────────────────
// Real people don't text at :00 or :30. Pick a random minute inside
// the next open window, `baseDays` out with ±jitter.
export function humanNextSendAt(baseDays: number): Date {
  const jitterDays = baseDays + (Math.random() * 1.4 - 0.7)
  const target = new Date(Date.now() + Math.max(0.05, jitterDays) * 86400000)
  // Snap into a human hour: 10:00-18:30 CT weekday-ish. We only pick
  // the time here — the send tick re-checks the live window anyway.
  const hourCt = 10 + Math.floor(Math.random() * 8) // 10..17
  const minute = 3 + Math.floor(Math.random() * 53) // avoid :00 / :57+
  target.setUTCHours((hourCt + 5) % 24, minute, Math.floor(Math.random() * 60), 0)
  // Never land on Sunday (CT): push to Monday
  const ctDay = new Date(target.getTime() - 5 * 3600000).getUTCDay()
  if (ctDay === 0) target.setUTCDate(target.getUTCDate() + 1)
  return target
}

/** Sleep helper with jitter — used between sends in a tick so the
 *  carrier sees human inter-message gaps, not API bursts. */
export function jitterMs(minS: number, maxS: number): number {
  return Math.round((minS + Math.random() * (maxS - minS)) * 1000)
}

// ─────────────────── Draft hygiene enforcement ───────────────────────
// The prompt bans em/en dashes (AI tell, Patrick's hard rule) and
// requires single-bubble openers, but models drift. Enforce in code so
// a rule broken in composition never reaches a homeowner's phone.
export function humanizeDraft(draft: string, opts?: { singleBubble?: boolean }): string {
  let out = draft
    // em/en dashes → sentence-friendly punctuation
    .replace(/\s*[—–]\s*/g, ", ")
    // double-spaces from the scrub
    .replace(/ {2,}/g, " ")
  if (opts?.singleBubble) {
    // Openers are ONE bubble: collapse any paragraph breaks.
    out = out.replace(/\s*\n+\s*/g, " ").trim()
  }
  return out.trim()
}

/** Stable per-lead opener-variant assignment: same lead always lands
 *  in the same test arm, arms stay balanced across the pool. */
export function openerVariantForSlug(slug: string): "not_buying" | "curiosity" | "straight" {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  const arms = ["not_buying", "curiosity", "straight"] as const
  return arms[h % 3]
}

// ───────────────────── Human message rhythm ──────────────────────────
// People frequently send two shorter texts instead of one wall. When a
// draft has a natural break (paragraph, or >240 chars with multiple
// sentences), split it into two parts sent a few seconds apart.
export function splitForHumanRhythm(draft: string): string[] {
  const clean = draft.trim()
  const paraSplit = clean.split(/\n\n+/)
  if (paraSplit.length >= 2) {
    const first = paraSplit[0].trim()
    const rest = paraSplit.slice(1).join(" ").trim()
    if (first.length >= 30 && rest.length >= 20) return [first, rest]
  }
  if (clean.length > 240) {
    const sentences = clean.match(/[^.!?]+[.!?]+[\s]*/g)
    if (sentences && sentences.length >= 3) {
      let firstPart = ""
      let i = 0
      while (i < sentences.length - 1 && firstPart.length < clean.length / 2) {
        firstPart += sentences[i]
        i++
      }
      const rest = sentences.slice(i).join("").trim()
      if (firstPart.trim().length >= 40 && rest.length >= 30) {
        return [firstPart.trim(), rest]
      }
    }
  }
  return [clean]
}

// ─────────────────────────── Twilio send ─────────────────────────────
export type TwilioSendResult =
  | { ok: true; sid: string; status: string }
  | { ok: false; code: number | null; error: string; optedOut: boolean }

/** Raw Twilio send with StatusCallback + STOP-list detection.
 *  Error 21610 = recipient previously replied STOP at the carrier
 *  level — surfaced as optedOut so callers can retire the sequence. */
export async function sendTwilioSms(
  toPhone: string,
  body: string,
  host?: string
): Promise<TwilioSendResult> {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim()
  const fromNumber = (process.env.TWILIO_FROM_NUMBER || "").trim()
  if (!sid || !token || !fromNumber) {
    return { ok: false, code: null, error: "twilio env missing", optedOut: false }
  }
  const statusCallback = `https://${host || "falco.llc"}/api/sms/twilio-status`
  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toPhone,
          Body: body,
          StatusCallback: statusCallback,
        }).toString(),
      }
    )
    const json = (await resp.json().catch(() => ({}))) as {
      sid?: string
      status?: string
      code?: number
      error_code?: number
      message?: string
      error_message?: string
    }
    if (!resp.ok) {
      const code = json.code ?? json.error_code ?? null
      return {
        ok: false,
        code,
        error: json.message || json.error_message || `http_${resp.status}`,
        optedOut: code === 21610,
      }
    }
    return { ok: true, sid: json.sid || "", status: json.status || "queued" }
  } catch (e) {
    return { ok: false, code: null, error: String(e).slice(0, 200), optedOut: false }
  }
}

// ─────────────────── Sequence state transitions ──────────────────────
/** Retire a lead's sequence when the homeowner engages or opts out.
 *  Called from the inbound webhook. Safe no-op when not enrolled. */
export async function settleSequenceOnInbound(
  listingSlug: string,
  kind: "replied" | "opted_out"
): Promise<void> {
  if (!supabaseAdmin) return
  try {
    await supabaseAdmin
      .from("sms_outreach_state")
      .update({ status: kind, updated_at: new Date().toISOString() })
      .eq("listing_slug", listingSlug)
      .in("status", ["active", "paused", "exhausted"])
  } catch (e) {
    console.error("settleSequenceOnInbound:", e)
  }
}
