import fs from "fs"
import path from "path"

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

const DATA_DIR = path.join(process.cwd(), "data")
const LISTINGS_FILE = path.join(DATA_DIR, "vault_listings.ndjson")

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, "", "utf8")
  }
}

function readNdjson<T>(filePath: string): T[] {
  ensureStore()
  const raw = fs.readFileSync(filePath, "utf8")

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as T
      } catch {
        return null
      }
    })
    .filter(Boolean) as T[]
}

function writeNdjson<T>(filePath: string, rows: T[]) {
  ensureStore()
  const payload = rows.map((row) => JSON.stringify(row)).join("\n")
  fs.writeFileSync(filePath, payload ? payload + "\n" : "", "utf8")
}

export function listVaultListings() {
  return readNdjson<VaultListing>(LISTINGS_FILE).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export function listActiveVaultListings() {
  const now = new Date().toISOString()

  return listVaultListings().filter((listing) => {
    if (listing.status !== "active") return false
    if (listing.expiresAt && listing.expiresAt < now) return false
    return true
  })
}

export function findVaultListing(slug: string) {
  return listVaultListings().find((listing) => listing.slug === slug) ?? null
}

export function upsertVaultListing(listing: VaultListing) {
  const rows = listVaultListings()
  const idx = rows.findIndex((r) => r.slug === listing.slug)

  if (idx >= 0) {
    rows[idx] = listing
  } else {
    rows.push(listing)
  }

  writeNdjson(LISTINGS_FILE, rows)
  return listing
}

export function updateVaultListingStatus(
  slug: string,
  status: VaultListingStatus,
  claimedBy?: string
) {
  const rows = listVaultListings()
  const idx = rows.findIndex((r) => r.slug === slug)

  if (idx === -1) return null

  rows[idx] = {
    ...rows[idx],
    status,
    claimedAt: status === "claimed" ? new Date().toISOString() : rows[idx].claimedAt,
    claimedBy: status === "claimed" ? claimedBy || "unknown" : rows[idx].claimedBy,
  }

  writeNdjson(LISTINGS_FILE, rows)
  return rows[idx]
}

export function seedVaultListingsIfEmpty() {
  const rows = listVaultListings()
  if (rows.length > 0) return rows

  const seed: VaultListing[] = [
    {
      slug: "davidson-county-foreclosure-seeded",
      title: "Davidson County Foreclosure",
      market: "Davidson County, TN",
      county: "Davidson County",
      status: "active",
      distressType: "Foreclosure",
      auctionWindow: "21–60 Days",
      summary:
        "Auction-timed opportunity currently inside the FALCO pipeline with packet-level underwriting and restricted routing.",
      publicTeaser:
        "Address-level details, packet, and contact path are restricted to approved users.",
      packetUrl: "/api/vault/packet?slug=davidson-county-foreclosure-seeded",
      packetLabel: "Auction Opportunity Brief",
      packetFileName: "",
      sourceLeadKey: "seeded",
      createdAt: new Date().toISOString(),
      falcoScore: 90,
      auctionReadiness: "GREEN",
      equityBand: "MED",
      dtsDays: 42,
      contactReady: false,
    },
  ]

  writeNdjson(LISTINGS_FILE, seed)
  return seed
}