import { supabaseAdmin } from "@/lib/supabase-admin"

export type VaultListingStatus = "active" | "claimed" | "expired"

export type VaultListing = {
  slug: string
  title: string
  market: string
  county: string
  status: VaultListingStatus
  distressType: string
  auctionWindow: string
  summary: string
  publicTeaser: string

  packetUrl: string
  packetLabel: string
  packetFileName?: string

  sourceLeadKey: string
  createdAt: string
  expiresAt?: string
  claimedAt?: string
  claimedBy?: string

  falcoScore?: number | null
  auctionReadiness?: string
  equityBand?: string
  dtsDays?: number | null
  contactReady?: boolean
}

type VaultListingRow = {
  slug: string
  title: string | null
  county: string | null
  state: string | null
  falco_score: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  packet_path: string | null
  is_active: boolean | null
  created_at: string
}

function mapRowToVaultListing(row: VaultListingRow): VaultListing {
  const countyBase = row.county ?? "Unknown County"
  const stateBase = row.state ?? "TN"
  const titleBase = row.title ?? row.slug

  return {
    slug: row.slug,
    title: titleBase,
    market: `${countyBase}, ${stateBase}`,
    county: countyBase,
    status: row.is_active === false ? "expired" : "active",
    distressType: "Foreclosure",
    auctionWindow: "21–60 Days",
    summary:
      "Auction-timed opportunity currently inside the FALCO pipeline with packet-level underwriting and restricted routing.",
    publicTeaser:
      "Address-level details, packet, and contact path are restricted to approved users.",
    packetUrl: `/api/vault/packet?slug=${row.slug}`,
    packetLabel: "Auction Opportunity Brief",
    packetFileName: row.packet_path ?? undefined,
    sourceLeadKey: row.slug,
    createdAt: row.created_at,
    falcoScore: row.falco_score,
    auctionReadiness: row.auction_readiness ?? undefined,
    equityBand: row.equity_band ?? undefined,
    dtsDays: row.dts_days,
    contactReady:
      typeof row.auction_readiness === "string"
        ? row.auction_readiness.toUpperCase() === "GREEN"
        : false,
  }
}

export async function listVaultListings() {
  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultListings error:", error.message)
    return []
  }

  return (data ?? []).map(mapRowToVaultListing)
}

export async function listActiveVaultListings() {
  const rows = await listVaultListings()
  const now = new Date().toISOString()

  return rows.filter((listing) => {
    if (listing.status !== "active") return false
    if (listing.expiresAt && listing.expiresAt < now) return false
    return true
  })
}

export async function findVaultListing(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("findVaultListing error:", error.message)
    return null
  }

  if (!data) return null

  return mapRowToVaultListing(data as VaultListingRow)
}

export async function upsertVaultListing(listing: VaultListing) {
  const payload = {
    slug: listing.slug,
    title: listing.title,
    county: listing.county,
    state: "TN",
    falco_score: listing.falcoScore ?? null,
    auction_readiness: listing.auctionReadiness ?? null,
    equity_band: listing.equityBand ?? null,
    dts_days: listing.dtsDays ?? null,
    packet_path: listing.packetFileName ?? null,
    is_active: listing.status === "active",
  }

  const { error } = await supabaseAdmin
    .from("vault_listings")
    .upsert(payload, { onConflict: "slug" })

  if (error) {
    console.error("upsertVaultListing error:", error.message)
    return null
  }

  return listing
}

export async function updateVaultListingStatus(
  slug: string,
  status: VaultListingStatus,
  claimedBy?: string
) {
  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .update({
      is_active: status === "active",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("updateVaultListingStatus error:", error.message)
    return null
  }

  if (!data) return null

  return {
    ...mapRowToVaultListing(data as VaultListingRow),
    status,
    claimedAt: status === "claimed" ? new Date().toISOString() : undefined,
    claimedBy: status === "claimed" ? claimedBy || "unknown" : undefined,
  }
}

export async function seedVaultListingsIfEmpty() {
  const rows = await listVaultListings()
  return rows
}