import nodemailer from "nodemailer"
import { listApprovedPartnerEmails } from "@/lib/access-workflow"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import { listActiveVaultListings, type VaultListing } from "@/lib/vault-listings"

const PARTNER_DIGEST_COMPANY = "__falco_partner_digest__"
const SITE_URL = (process.env.FALCO_SITE_URL?.trim() || "https://falco.llc").replace(/\/+$/, "")

type DigestLogNotes = {
  version: 1
  type: "partner_digest"
  listingSlug: string
  listingTitle: string
  listingType: string
  sentAt: string
}

type DigestLogRow = {
  id: string
  email: string
  notes: string | null
  created_at: string
  status: string
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
}

function parseDigestLogNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<DigestLogNotes>
    if (parsed.version !== 1 || parsed.type !== "partner_digest") return null

    return {
      version: 1 as const,
      type: "partner_digest" as const,
      listingSlug: typeof parsed.listingSlug === "string" ? parsed.listingSlug : "",
      listingTitle: typeof parsed.listingTitle === "string" ? parsed.listingTitle : "",
      listingType: typeof parsed.listingType === "string" ? parsed.listingType : "",
      sentAt: typeof parsed.sentAt === "string" ? parsed.sentAt : "",
    }
  } catch {
    return null
  }
}

function buildDigestLogNotes(listing: VaultListing, sentAt: string) {
  return JSON.stringify({
    version: 1,
    type: "partner_digest",
    listingSlug: listing.slug,
    listingTitle: listing.title,
    listingType: listing.distressType,
    sentAt,
  } satisfies DigestLogNotes)
}

function groupByType(listings: VaultListing[]) {
  const grouped = new Map<string, VaultListing[]>()
  for (const listing of listings) {
    const key = listing.distressType || "Distress Opportunity"
    const bucket = grouped.get(key) ?? []
    bucket.push(listing)
    grouped.set(key, bucket)
  }
  return [...grouped.entries()]
}

function buildDigestSubject(listings: VaultListing[]) {
  if (listings.length === 1) {
    return `FALCO Weekly Listing Update: ${listings[0].title}`
  }

  return `FALCO Weekly Listing Update: ${listings.length} New Screened Opportunities`
}

function buildDigestText(listings: VaultListing[]) {
  const lines: string[] = [
    "New screened opportunities are available in the FALCO vault.",
    "",
  ]

  for (const [type, rows] of groupByType(listings)) {
    lines.push(`${type}`)
    lines.push("-".repeat(type.length))
    for (const listing of rows) {
      lines.push(
        `${listing.title} | ${listing.county} | ${listing.auctionReadiness || "Screened"} | ${SITE_URL}/vault/${listing.slug}`
      )
    }
    lines.push("")
  }

  lines.push("Access remains restricted to approved partners and listing-level acceptance.")
  return lines.join("\n")
}

function buildDigestHtml(listings: VaultListing[]) {
  const groups = groupByType(listings)
    .map(([type, rows]) => {
      const items = rows
        .map(
          (listing) => `
            <tr>
              <td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:15px;font-weight:600;color:#ffffff;">${listing.title}</div>
                <div style="margin-top:6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5);">
                  ${listing.county} • ${listing.auctionReadiness || "Screened"}
                </div>
                <div style="margin-top:10px;">
                  <a href="${SITE_URL}/vault/${listing.slug}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#ffffff;color:#000000;text-decoration:none;font-size:13px;font-weight:600;">Open Listing</a>
                </div>
              </td>
            </tr>
          `
        )
        .join("")

      return `
        <div style="margin-top:28px;">
          <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.46);">${type}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;">${items}</table>
        </div>
      `
    })
    .join("")

  return `
    <div style="margin:0;padding:0;background:#000000;color:#ffffff;font-family:Arial,sans-serif;">
      <div style="max-width:700px;margin:0 auto;padding:40px 24px;">
        <div style="font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.45);">FALCO</div>
        <h1 style="margin:14px 0 0;font-size:34px;line-height:1.02;font-weight:600;letter-spacing:-0.04em;">Weekly listing update</h1>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.8;color:rgba(255,255,255,0.72);">
          New screened opportunities are available in the restricted FALCO vault.
        </p>
        ${groups}
        <p style="margin:28px 0 0;font-size:13px;line-height:1.8;color:rgba(255,255,255,0.5);">
          Access remains restricted to approved partners and each listing still requires listing-level acceptance before packet access.
        </p>
      </div>
    </div>
  `
}

async function listDigestLogRows() {
  const client = requireSupabaseAdmin()
  const { data, error } = await client
    .from("partner_access_requests")
    .select("id,email,notes,created_at,status")
    .eq("company", PARTNER_DIGEST_COMPANY)
    .eq("status", "digest_sent")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`listDigestLogRows failed: ${error.message}`)
  }

  return (data ?? []) as DigestLogRow[]
}

function sentSlugSetForEmail(rows: DigestLogRow[], email: string) {
  const sent = new Set<string>()
  for (const row of rows) {
    if (String(row.email ?? "").trim().toLowerCase() !== email.toLowerCase()) continue
    const notes = parseDigestLogNotes(row.notes)
    if (notes?.listingSlug) sent.add(notes.listingSlug)
  }
  return sent
}

async function recordDigestSend(email: string, listing: VaultListing, sentAt: string) {
  const client = requireSupabaseAdmin()
  const { error } = await client.from("partner_access_requests").insert({
    email: email.toLowerCase(),
    full_name: listing.title,
    company: PARTNER_DIGEST_COMPANY,
    notes: buildDigestLogNotes(listing, sentAt),
    status: "digest_sent",
  })

  if (error) {
    throw new Error(`recordDigestSend failed: ${error.message}`)
  }
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
      auth: {
        user,
        pass,
      },
    }),
    user,
  }
}

function isAuthorizedRequest(authHeader: string | null) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function sendWeeklyPartnerDigest(options?: {
  dryRun?: boolean
  manualSecret?: string
  authHeader?: string | null
}) {
  if (!isAuthorizedRequest(options?.authHeader ?? null)) {
    const approvalSecret = getAdminApprovalSecret()
    if (!options?.manualSecret || options.manualSecret.trim() !== approvalSecret) {
      throw new Error("Unauthorized partner digest request.")
    }
  }

  const [approvedEmails, liveListings, digestLogs] = await Promise.all([
    listApprovedPartnerEmails(),
    listActiveVaultListings(),
    listDigestLogRows(),
  ])

  const listings = [...liveListings].sort((a, b) => {
    const aCreated = new Date(a.createdAt || 0).getTime()
    const bCreated = new Date(b.createdAt || 0).getTime()
    return bCreated - aCreated
  })

  const sendAt = new Date().toISOString()
  const results: {
    email: string
    listingCount: number
    sent: boolean
  }[] = []

  const { transporter, user } = options?.dryRun ? { transporter: null, user: process.env.FALCO_GMAIL_USER?.trim() || "" } : createTransport()

  for (const email of approvedEmails) {
    const sentSlugs = sentSlugSetForEmail(digestLogs, email)
    const unsentListings = listings.filter((listing) => !sentSlugs.has(listing.slug))

    if (!unsentListings.length) {
      results.push({ email, listingCount: 0, sent: false })
      continue
    }

    if (!options?.dryRun) {
      await transporter!.sendMail({
        from: `"FALCO" <${user}>`,
        to: email,
        subject: buildDigestSubject(unsentListings),
        text: buildDigestText(unsentListings),
        html: buildDigestHtml(unsentListings),
      })
    }

    for (const listing of unsentListings) {
      await recordDigestSend(email, listing, sendAt)
    }

    results.push({ email, listingCount: unsentListings.length, sent: true })
  }

  return {
    ok: true,
    approvedPartnerCount: approvedEmails.length,
    liveListingCount: listings.length,
    sentAt: sendAt,
    dryRun: Boolean(options?.dryRun),
    results,
  }
}
