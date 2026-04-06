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

  // Collect counties from all available sources to show true coverage
  const allCountySources = [
    ...(operatorReport?.autonomy?.marketAllocation?.counties
      ?.map((row) => row.county)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0) ?? []),
    ...(operatorReport?.recentLeads
      ?.map((lead) => lead.county)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0) ?? []),
    ...vaultListings.map((listing) => listing.county),
  ]

  const activeCounties = allCountySources.length > 0
    ? uniqueCount(allCountySources)
    : 0
  const trackedLeads = operatorReport?.overview.totalLeads ?? vaultListings.length

  const greenReady = operatorReport?.overview.greenReady ??
    vaultListings.filter((listing) => {
      const r = String(listing.auctionReadiness ?? "").toUpperCase()
      return r === "GREEN"
    }).length

  const packetsInVault =
    operatorReport?.overview.vaultLive ??
    vaultListings.filter((listing) => Boolean(listing.slug)).length

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

