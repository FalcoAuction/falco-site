import { listAccessRequests } from "@/lib/access-workflow"
import { getOperatorReport } from "@/lib/operator-report"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import { listVaultListings } from "@/lib/vault-listings"

function uniqueCount(values: (string | null | undefined)[]) {
  return new Set(values.filter(Boolean)).size
}

export type HomeMetrics = {
  activeCounties: number
  trackedLeads: number
  greenReady: number
  packetsInVault: number
  approvedPartners: number
}

export async function getHomeMetrics(): Promise<HomeMetrics> {
  if (!supabaseAdmin) {
    console.error("getHomeMetrics error:", supabaseAdminConfigError)
    return {
      activeCounties: 0,
      trackedLeads: 0,
      greenReady: 0,
      packetsInVault: 0,
      approvedPartners: 0,
    }
  }

  const [vaultListings, accessRequests, approvalsResult, operatorReport] = await Promise.all([
    listVaultListings(),
    listAccessRequests(),
    supabaseAdmin.from("partner_approvals").select("email").eq("approved", true),
    getOperatorReport().catch(() => null),
  ])

  // Active vault listings are the source of truth for vault metrics
  const activeListings = vaultListings.filter(
    (listing) => listing.status === "active"
  )

  // Counties: merge all sources
  const allCountySources = [
    ...(operatorReport?.autonomy?.marketAllocation?.counties
      ?.map((row) => row.county)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0) ?? []),
    ...(operatorReport?.recentLeads
      ?.map((lead) => lead.county)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0) ?? []),
    ...activeListings.map((listing) => listing.county),
  ]

  const activeCounties = allCountySources.length > 0
    ? uniqueCount(allCountySources)
    : 0

  // Total leads from operator report (pipeline-wide), fallback to listing count
  const trackedLeads = operatorReport?.overview.totalLeads ?? activeListings.length

  // GREEN count from actual vault listings, not operator report
  const greenReady = activeListings.filter((listing) => {
    const r = String(listing.auctionReadiness ?? "").toUpperCase()
    return r === "GREEN"
  }).length

  // Vault count from actual active listings
  const packetsInVault = activeListings.length

  const approvedEmails = approvalsResult.error
    ? []
    : (approvalsResult.data ?? []).map((row) => row.email as string | null | undefined)

  const approvedPartners =
    approvedEmails.length > 0
      ? uniqueCount(approvedEmails)
      : uniqueCount(
          accessRequests
            .filter((request) => request.status === "approved")
            .map((request) => request.email)
        )

  return {
    activeCounties,
    trackedLeads,
    greenReady,
    packetsInVault,
    approvedPartners,
  }
}
