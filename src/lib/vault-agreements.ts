import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export const NDA_VERSION = "v1.0"
export const NON_CIRC_VERSION = "v1.0"
export const VAULT_ACCEPTANCE_AUDIT_COMPANY = "__falco_vault_acceptance__"

export type VaultAcceptanceRecord = {
  listingSlug: string
  fullName: string
  email: string
  ndaVersion: string
  nonCircVersion: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
}

type ListingAcceptanceRow = {
  id?: string
  listing_slug: string
  email: string
  accepted_at: string | null
  ip_address: string | null
}

type AcceptanceAuditNotesPayload = {
  version: 1
  type: "vault_acceptance"
  listingSlug: string
  fullName: string
  ndaVersion: string
  nonCircVersion: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
}

type AcceptanceAuditRow = {
  id: string
  email: string
  full_name: string | null
  company: string | null
  notes: string | null
  created_at: string
  status: string
}

function buildAuditNotes(record: VaultAcceptanceRecord) {
  return JSON.stringify({
    version: 1,
    type: "vault_acceptance",
    listingSlug: record.listingSlug,
    fullName: record.fullName,
    ndaVersion: record.ndaVersion,
    nonCircVersion: record.nonCircVersion,
    acceptedAt: record.acceptedAt,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
  } satisfies AcceptanceAuditNotesPayload)
}

function parseAuditNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<AcceptanceAuditNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "vault_acceptance") return null
    if (typeof parsed.listingSlug !== "string" || !parsed.listingSlug.trim()) return null

    return {
      listingSlug: parsed.listingSlug.trim(),
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      ndaVersion: typeof parsed.ndaVersion === "string" ? parsed.ndaVersion : NDA_VERSION,
      nonCircVersion:
        typeof parsed.nonCircVersion === "string" ? parsed.nonCircVersion : NON_CIRC_VERSION,
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : "",
      ipAddress: typeof parsed.ipAddress === "string" ? parsed.ipAddress : "unknown",
      userAgent: typeof parsed.userAgent === "string" ? parsed.userAgent : "unknown",
    }
  } catch {
    return null
  }
}

async function upsertAcceptanceAudit(record: VaultAcceptanceRecord) {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  const existing = await findAcceptanceAudit(record.listingSlug, record.email)
  const payload = {
    email: record.email.toLowerCase(),
    full_name: record.listingSlug,
    company: VAULT_ACCEPTANCE_AUDIT_COMPANY,
    notes: buildAuditNotes(record),
    status: "accepted",
  }

  const query = existing
    ? supabaseAdmin.from("partner_access_requests").update(payload).eq("id", existing.id)
    : supabaseAdmin.from("partner_access_requests").insert(payload)

  const { error } = await query.select("id").single()
  if (error) {
    throw new Error(`upsertAcceptanceAudit failed: ${error.message}`)
  }
}

async function findAcceptanceAudit(listingSlug: string, email: string) {
  if (!supabaseAdmin) {
    console.error("findAcceptanceAudit error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_ACCEPTANCE_AUDIT_COMPANY)
    .eq("full_name", listingSlug)
    .eq("email", email.toLowerCase())
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("findAcceptanceAudit error:", error.message)
    return null
  }

  return (data as AcceptanceAuditRow | null) ?? null
}

async function mergeAcceptanceAudit(row: ListingAcceptanceRow) {
  const audit = await findAcceptanceAudit(row.listing_slug, row.email)
  const parsed = parseAuditNotes(audit?.notes ?? null)

  return {
    listingSlug: row.listing_slug,
    fullName: parsed?.fullName ?? audit?.full_name ?? "",
    email: row.email,
    ndaVersion: parsed?.ndaVersion ?? NDA_VERSION,
    nonCircVersion: parsed?.nonCircVersion ?? NON_CIRC_VERSION,
    acceptedAt: row.accepted_at ?? parsed?.acceptedAt ?? new Date(0).toISOString(),
    ipAddress: row.ip_address ?? parsed?.ipAddress ?? "unknown",
    userAgent: parsed?.userAgent ?? "unknown",
  } satisfies VaultAcceptanceRecord
}

function mapAcceptanceRow(row: ListingAcceptanceRow): VaultAcceptanceRecord {
  return {
    listingSlug: row.listing_slug,
    fullName: "",
    email: row.email,
    ndaVersion: NDA_VERSION,
    nonCircVersion: NON_CIRC_VERSION,
    acceptedAt: row.accepted_at ?? new Date(0).toISOString(),
    ipAddress: row.ip_address ?? "unknown",
    userAgent: "unknown",
  }
}

export async function appendVaultAcceptance(record: VaultAcceptanceRecord) {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  const payload = {
    listing_slug: record.listingSlug,
    email: record.email.toLowerCase(),
    accepted_at: record.acceptedAt,
    ip_address: record.ipAddress,
  }

  const { data, error } = await supabaseAdmin
    .from("listing_acceptances")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      const existing = await findVaultAcceptance(record.listingSlug, record.email)
      if (existing) {
        await upsertAcceptanceAudit(record)
        return existing
      }
    }
    throw new Error(`appendVaultAcceptance failed: ${error.message}`)
  }

  await upsertAcceptanceAudit(record)
  return mergeAcceptanceAudit(data as ListingAcceptanceRow)
}

export async function findVaultAcceptance(listingSlug: string, email: string) {
  if (!supabaseAdmin) {
    console.error("findVaultAcceptance error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("listing_acceptances")
    .select("*")
    .eq("listing_slug", listingSlug)
    .eq("email", email.toLowerCase())
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("findVaultAcceptance error:", error.message)
    return null
  }

  if (!data) return null

  return mergeAcceptanceAudit(data as ListingAcceptanceRow)
}
