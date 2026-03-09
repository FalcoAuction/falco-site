import fs from "fs"
import path from "path"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  getVaultRoutingSnapshot,
  getVaultRoutingSnapshotsForListings,
  type VaultRoutingState,
} from "@/lib/vault-pursuit"

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
  topTierReady?: boolean
  vaultPublishReady?: boolean
  dataNotes?: string[]
  routingState?: VaultRoutingState
  routingReservedByEmail?: string
  routingReservedByName?: string
  pursuitRequestCount?: number
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

type LocalVaultListingOverlay = Partial<VaultListing> & {
  slug: string
}

const LOCAL_VAULT_LISTINGS_FILE = path.join(process.cwd(), "data", "vault_listings.ndjson")

function loadLocalVaultListingOverlay() {
  const overlays = new Map<string, LocalVaultListingOverlay>()

  if (!fs.existsSync(LOCAL_VAULT_LISTINGS_FILE)) {
    return overlays
  }

  const raw = fs.readFileSync(LOCAL_VAULT_LISTINGS_FILE, "utf8").trim()
  if (!raw) return overlays

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const row = JSON.parse(trimmed) as LocalVaultListingOverlay
      if (row?.slug) overlays.set(row.slug, row)
    } catch {
      continue
    }
  }

  return overlays
}

function mapRowToVaultListing(
  row: VaultListingRow,
  overlay?: LocalVaultListingOverlay
): VaultListing {
  const countyBase = row.county ?? "Unknown County"
  const stateBase = row.state ?? "TN"
  const titleBase = overlay?.title ?? row.title ?? row.slug
  const auctionReadiness = overlay?.auctionReadiness ?? row.auction_readiness ?? undefined
  const dtsDays = overlay?.dtsDays ?? row.dts_days
  const contactReady =
    typeof overlay?.contactReady === "boolean"
      ? overlay.contactReady
      : typeof auctionReadiness === "string"
      ? auctionReadiness.toUpperCase() === "GREEN"
      : false

  return {
    slug: row.slug,
    title: titleBase,
    market: overlay?.market ?? `${countyBase}, ${stateBase}`,
    county: countyBase,
    status: row.is_active === false ? "expired" : "active",
    distressType: overlay?.distressType ?? "Distress Opportunity",
    auctionWindow: overlay?.auctionWindow ?? "Confidential",
    summary:
      overlay?.summary ??
      "Auction-timed opportunity currently inside the FALCO pipeline with packet-level underwriting and restricted routing.",
    publicTeaser:
      overlay?.publicTeaser ??
      "Address-level details, packet, and contact path are restricted to approved users.",
    packetUrl: `/api/vault/packet?slug=${row.slug}`,
    packetLabel: overlay?.packetLabel ?? "Auction Opportunity Brief",
    packetFileName: overlay?.packetFileName ?? row.packet_path ?? undefined,
    sourceLeadKey: overlay?.sourceLeadKey ?? row.slug,
    createdAt: overlay?.createdAt ?? row.created_at,
    falcoScore: overlay?.falcoScore ?? row.falco_score,
    auctionReadiness,
    equityBand: overlay?.equityBand ?? row.equity_band ?? undefined,
    dtsDays,
    contactReady,
    topTierReady: overlay?.topTierReady,
    vaultPublishReady: overlay?.vaultPublishReady,
    dataNotes: overlay?.dataNotes,
  }
}

export async function listVaultListings() {
  if (!supabaseAdmin) {
    console.error("listVaultListings error:", supabaseAdminConfigError)
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultListings error:", error.message)
    return []
  }

  const overlayBySlug = loadLocalVaultListingOverlay()
  const mappedRows = (data ?? []).map((row) =>
    mapRowToVaultListing(row as VaultListingRow, overlayBySlug.get((row as VaultListingRow).slug))
  )
  const routingSnapshots = await getVaultRoutingSnapshotsForListings(
    mappedRows.map((listing) => ({
      slug: listing.slug,
      status: listing.status,
    }))
  )

  return mappedRows.map((listing) => {
    const snapshot = routingSnapshots.get(listing.slug)

    return {
      ...listing,
      routingState: snapshot?.routingState ?? (listing.status === "active" ? "open" : "closed"),
      routingReservedByEmail: snapshot?.reservedByEmail,
      routingReservedByName: snapshot?.reservedByName,
      pursuitRequestCount: snapshot?.requestCount ?? 0,
    }
  })
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
  if (!supabaseAdmin) {
    console.error("findVaultListing error:", supabaseAdminConfigError)
    return null
  }

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

  const overlayBySlug = loadLocalVaultListingOverlay()
  const mapped = mapRowToVaultListing(
    data as VaultListingRow,
    overlayBySlug.get((data as VaultListingRow).slug)
  )
  const snapshot = await getVaultRoutingSnapshot(mapped.slug, mapped.status !== "active")

  return {
    ...mapped,
    routingState: snapshot.routingState,
    routingReservedByEmail: snapshot.reservedByEmail,
    routingReservedByName: snapshot.reservedByName,
    pursuitRequestCount: snapshot.requestCount,
  }
}

export async function upsertVaultListing(listing: VaultListing) {
  if (!supabaseAdmin) {
    console.error("upsertVaultListing error:", supabaseAdminConfigError)
    return null
  }

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
  if (!supabaseAdmin) {
    console.error("updateVaultListingStatus error:", supabaseAdminConfigError)
    return null
  }

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
    ...mapRowToVaultListing(data as VaultListingRow, loadLocalVaultListingOverlay().get(slug)),
    status,
    claimedAt: status === "claimed" ? new Date().toISOString() : undefined,
    claimedBy: status === "claimed" ? claimedBy || "unknown" : undefined,
  }
}

export async function seedVaultListingsIfEmpty() {
  const rows = await listVaultListings()
  return rows
}
