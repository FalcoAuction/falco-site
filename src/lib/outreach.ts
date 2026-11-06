// Outreach rules shared by the send route, the unsubscribe flow and the
// Resend webhook. Pure functions (plus node crypto) so they can be tested
// without a database. Tables: supabase/migrations/20261112_outreach.sql.
//
// Every email carries the CAN-SPAM footer (sender, physical postal address,
// working unsubscribe); a send without FALCO_POSTAL_ADDRESS is refused.
// Nothing leaves unless OUTREACH_SEND_ENABLED=1, and a campaign asking
// owners to sell (requires_license) is blocked until FALCO_LICENSED=1,
// because soliciting listings is licensed activity (TCA 62-13-102).

import { createHmac, timingSafeEqual } from "crypto"

export type Env = Record<string, string | undefined>

export type Campaign = {
  id: string
  slug: string
  audience_kind: string
  channel: "email" | "mail"
  subject: string | null
  body_text: string
  status: "draft" | "active" | "paused" | "done"
  requires_license: boolean
  daily_cap: number
}

export type Contact = {
  id: string
  kind: string
  org_name: string | null
  person_name: string | null
  title: string | null
  email: string | null
  county: string | null
}

export const OWNER_AUDIENCES = new Set(["landlord"])

export function siteUrl(env: Env): string {
  return (env.FALCO_SITE_URL?.trim() || "https://falco.llc").replace(/\/+$/, "")
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const e = String(raw ?? "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}

// ---- unsubscribe token: base64url(email).base64url(hmac) -----------------

function secretOf(env: Env): string {
  const s = env.OUTREACH_UNSUBSCRIBE_SECRET?.trim() || env.FALCO_APPROVAL_SECRET?.trim()
  if (!s) throw new Error("Missing OUTREACH_UNSUBSCRIBE_SECRET (or FALCO_APPROVAL_SECRET).")
  return s
}

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64")

export function unsubscribeToken(email: string, env: Env): string {
  const e = normalizeEmail(email)
  if (!e) throw new Error("invalid email")
  const sig = createHmac("sha256", secretOf(env)).update(`unsub:${e}`).digest()
  return `${b64url(Buffer.from(e, "utf8"))}.${b64url(sig)}`
}

/** Returns the email the token was issued for, or null when forged. */
export function verifyUnsubscribeToken(token: string | null | undefined, env: Env): string | null {
  const [p, s] = String(token ?? "").split(".")
  if (!p || !s) return null
  const email = normalizeEmail(fromB64url(p).toString("utf8"))
  if (!email) return null
  const want = createHmac("sha256", secretOf(env)).update(`unsub:${email}`).digest()
  const got = fromB64url(s)
  return got.length === want.length && timingSafeEqual(got, want) ? email : null
}

export function unsubscribeUrl(email: string, env: Env): string {
  return `${siteUrl(env)}/unsubscribe?t=${unsubscribeToken(email, env)}`
}

// ---- templates ------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export function templateVars(c: Contact): Record<string, string> {
  const county = c.county ? c.county.replace(/\b[a-z]/g, (m) => m.toUpperCase()) : ""
  const out: Record<string, string> = {}
  if (c.org_name) out.org_name = c.org_name
  if (c.person_name) {
    out.person_name = c.person_name
    out.first_name = c.person_name.trim().split(/\s+/)[0]
  }
  if (c.title) out.title = c.title
  if (county) out.county = county
  out.greeting = c.person_name ? `Hi ${c.person_name.trim().split(/\s+/)[0]},` : "Hello,"
  return out
}

/** Replace {{var}}; throws on a variable the contact does not have, so a
 *  half-filled email never goes out. */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k]
    if (v === undefined || v === "") throw new Error(`missing template variable: ${k}`)
    return v
  })
}

export function footerText(unsubUrl: string, env: Env): string {
  const addr = env.FALCO_POSTAL_ADDRESS?.trim()
  if (!addr) throw new Error("FALCO_POSTAL_ADDRESS is not set; CAN-SPAM requires a physical address in every message.")
  return `--\nFALCO LLC, ${addr}\nYou are receiving this because of your role at your organization. Unsubscribe: ${unsubUrl}`
}

export type RenderedEmail = { subject: string; text: string; html: string; headers: Record<string, string> }

export function buildEmail(campaign: Campaign, contact: Contact, env: Env): RenderedEmail {
  const to = normalizeEmail(contact.email)
  if (!to) throw new Error("contact has no valid email")
  const vars = templateVars(contact)
  const subject = render(campaign.subject ?? "", vars)
  if (!subject.trim()) throw new Error("campaign has no subject")
  const body = render(campaign.body_text, vars)
  const unsub = unsubscribeUrl(to, env)
  const footer = footerText(unsub, env)
  const text = `${body.trim()}\n\n${footer}\n`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">${
    escapeHtml(body.trim()).replace(/\n/g, "<br>")
  }<p style="margin-top:24px;font-size:12px;color:#666">FALCO LLC, ${escapeHtml(env.FALCO_POSTAL_ADDRESS!.trim())}<br>` +
    `<a href="${escapeHtml(unsub)}">Unsubscribe</a></p></div>`
  return {
    subject, text, html,
    headers: {
      "List-Unsubscribe": `<${siteUrl(env)}/api/outreach/unsubscribe?t=${unsubscribeToken(to, env)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }
}

// ---- gates ----------------------------------------------------------------

export type Gate = { send: boolean; reasons: string[] }

/** Whether a campaign may actually send now. Dry runs ignore send gates
 *  but still report them. */
export function sendGate(campaign: Campaign, env: Env): Gate {
  const reasons: string[] = []
  if (campaign.channel !== "email") reasons.push("mail campaigns are exported for printing, not sent here")
  if (campaign.status !== "active") reasons.push(`campaign is ${campaign.status}, not active`)
  if (env.OUTREACH_SEND_ENABLED?.trim() !== "1") reasons.push("OUTREACH_SEND_ENABLED is not 1")
  if (!env.FALCO_POSTAL_ADDRESS?.trim()) reasons.push("FALCO_POSTAL_ADDRESS is not set")
  if ((campaign.requires_license || OWNER_AUDIENCES.has(campaign.audience_kind)) && env.FALCO_LICENSED?.trim() !== "1") {
    reasons.push("owner outreach is listing solicitation and needs FALCO_LICENSED=1 (TCA 62-13-102)")
  }
  return { send: reasons.length === 0, reasons }
}

/** How many more sends today: daily cap minus sends already made today. */
export function remainingToday(campaign: Campaign, sentToday: number, requested: number): number {
  return Math.max(0, Math.min(requested, campaign.daily_cap - sentToday))
}

// ---- Resend (Svix) webhook signature -------------------------------------

/** Svix scheme: HMAC-SHA256 over `${id}.${timestamp}.${body}` with the
 *  base64 secret after "whsec_"; header holds space-separated "v1,<b64>". */
export function verifySvix(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false
  const key = Buffer.from(secret.trim().replace(/^whsec_/, ""), "base64")
  const want = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest()
  return headers.signature.split(" ").some((part) => {
    const [ver, sig] = part.split(",")
    if (ver !== "v1" || !sig) return false
    const got = Buffer.from(sig, "base64")
    return got.length === want.length && timingSafeEqual(got, want)
  })
}

/** Resend event type -> send status and suppression reason. */
export function webhookOutcome(type: string): { status: "bounced" | "complained"; reason: "bounce" | "complaint" } | null {
  if (type === "email.bounced") return { status: "bounced", reason: "bounce" }
  if (type === "email.complained") return { status: "complained", reason: "complaint" }
  return null
}

// ---- contact import -------------------------------------------------------

const KINDS = new Set(["bank", "attorney", "broker", "auction_firm", "landlord", "investor", "other"])
const FIELDS = ["org_name", "person_name", "title", "email", "phone", "mail_line1", "mail_line2", "mail_city", "mail_state",
  "mail_zip", "county", "source", "source_ref"] as const

export type ContactRow = Record<(typeof FIELDS)[number], string | null> & { kind: string; meta: Record<string, unknown> }

/** Minimal CSV parser (quoted fields, doubled quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ",") { row.push(cell); cell = "" }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell); cell = ""
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  const [head, ...rest] = rows
  if (!head) return []
  const keys = head.map((h) => h.trim())
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])))
}

/** Validate one import row; extra columns go to meta. Returns an error
 *  string instead of throwing so a batch reports every bad row. */
export function toContactRow(raw: Record<string, unknown>, defaults: { kind?: string; source?: string } = {}): ContactRow | string {
  const get = (k: string) => {
    const v = raw[k]
    return v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim()
  }
  const kind = (get("kind") ?? defaults.kind ?? "").toLowerCase()
  if (!KINDS.has(kind)) return `bad kind: ${kind || "(empty)"}`
  const out = { kind, meta: {} } as ContactRow
  for (const f of FIELDS) out[f] = get(f)
  out.source = out.source ?? defaults.source ?? "manual"
  if (out.email !== null) {
    const e = normalizeEmail(out.email)
    if (!e) return `bad email: ${out.email}`
    out.email = e
  }
  if (!out.org_name && !out.person_name) return "row needs org_name or person_name"
  for (const [k, v] of Object.entries(raw)) {
    if (k !== "kind" && k !== "meta" && !(FIELDS as readonly string[]).includes(k) && v !== "" && v !== null && v !== undefined) out.meta[k] = v
  }
  if (raw.meta && typeof raw.meta === "object") Object.assign(out.meta, raw.meta as Record<string, unknown>)
  return out
}
