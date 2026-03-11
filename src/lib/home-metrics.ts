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
  uwReady: number
  packetsInVault: number
  approvedPartners: number
}

export async function getHomeMetrics(): Promise<HomeMetrics> {
  if (!supabaseAdmin) {
    console.error("getHomeMetrics error:", supabaseAdminConfigError)
    return {
      activeCounties: 0,
      trackedLeads: 0,
      uwReady: 0,
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

  const activeCounties = uniqueCount(vaultListings.map((listing) => listing.county))
  const trackedLeads = operatorReport?.overview.totalLeads ?? vaultListings.length

  const uwReady = vaultListings.filter((listing) => {
    const val = listing.contactReady ?? listing.auctionReadiness

    if (typeof val === "boolean") return val
    if (typeof val === "number") return val > 0

    if (typeof val === "string") {
      const s = val.toLowerCase()
      return (
        s.includes("ready") ||
        s === "true" ||
        s === "yes" ||
        s === "uw_ready" ||
        s === "contact-ready" ||
        s === "green"
      )
    }

    return false
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
    uwReady,
    packetsInVault,
    approvedPartners,
  }
}

