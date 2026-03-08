import { supabaseAdmin } from "@/lib/supabase-admin"

export const NDA_VERSION = "v1.0"
export const NON_CIRC_VERSION = "v1.0"

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
  listing_slug: string
  full_name: string | null
  email: string
  nda_version: string | null
  non_circ_version: string | null
  accepted_at: string
  ip_address: string | null
  user_agent: string | null
}

function mapAcceptanceRow(row: ListingAcceptanceRow): VaultAcceptanceRecord {
  return {
    listingSlug: row.listing_slug,
    fullName: row.full_name ?? "",
    email: row.email,
    ndaVersion: row.nda_version ?? NDA_VERSION,
    nonCircVersion: row.non_circ_version ?? NON_CIRC_VERSION,
    acceptedAt: row.accepted_at,
    ipAddress: row.ip_address ?? "unknown",
    userAgent: row.user_agent ?? "unknown",
  }
}

export async function appendVaultAcceptance(record: VaultAcceptanceRecord) {
  const payload = {
    listing_slug: record.listingSlug,
    full_name: record.fullName,
    email: record.email.toLowerCase(),
    nda_version: record.ndaVersion,
    non_circ_version: record.nonCircVersion,
    accepted_at: record.acceptedAt,
    ip_address: record.ipAddress,
    user_agent: record.userAgent,
  }

  const { data, error } = await supabaseAdmin
    .from("listing_acceptances")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw new Error(`appendVaultAcceptance failed: ${error.message}`)
  }

  return mapAcceptanceRow(data as ListingAcceptanceRow)
}

export async function findVaultAcceptance(listingSlug: string, email: string) {
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

  return mapAcceptanceRow(data as ListingAcceptanceRow)
}
