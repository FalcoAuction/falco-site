import fs from "fs"
import path from "path"
import { listVaultListings } from "@/lib/vault-listings"

const PRIVATE_PACKET_DIR = path.join(process.cwd(), "private", "vault", "packets")

export type VaultReadinessIssue = {
  slug: string
  severity: "error" | "warning"
  message: string
}

export type VaultReadinessReport = {
  checkedAt: string
  totals: {
    listings: number
    activeListings: number
    packetFilesPresent: number
    issues: number
  }
  issues: VaultReadinessIssue[]
}

export async function getVaultReadinessReport(): Promise<VaultReadinessReport> {
  const listings = await listVaultListings()
  const issues: VaultReadinessIssue[] = []
  let packetFilesPresent = 0

  for (const listing of listings) {
    if (!listing.packetFileName) {
      issues.push({
        slug: listing.slug,
        severity: "error",
        message: "Listing is missing a private packet filename.",
      })
      continue
    }

    const packetPath = path.join(PRIVATE_PACKET_DIR, listing.packetFileName)
    if (!fs.existsSync(packetPath)) {
      issues.push({
        slug: listing.slug,
        severity: "error",
        message: `Private packet file is missing: ${listing.packetFileName}`,
      })
      continue
    }

    const packetStats = fs.statSync(packetPath)
    if (packetStats.size <= 0) {
      issues.push({
        slug: listing.slug,
        severity: "error",
        message: `Private packet file is empty: ${listing.packetFileName}`,
      })
      continue
    }

    packetFilesPresent += 1

    if (listing.status === "active" && !listing.packetUrl.includes(listing.slug)) {
      issues.push({
        slug: listing.slug,
        severity: "warning",
        message: "Packet URL does not include the listing slug.",
      })
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    totals: {
      listings: listings.length,
      activeListings: listings.filter((listing) => listing.status === "active").length,
      packetFilesPresent,
      issues: issues.length,
    },
    issues,
  }
}
