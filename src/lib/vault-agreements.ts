import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

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
  email: string
  accepted_at: string | null
  ip_address: string | null
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
      if (existing) return existing
    }
    throw new Error(`appendVaultAcceptance failed: ${error.message}`)
  }

  return mapAcceptanceRow(data as ListingAcceptanceRow)
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

  return mapAcceptanceRow(data as ListingAcceptanceRow)
}
