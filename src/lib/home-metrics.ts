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

  // Active vault listings (used as a fallback / floor for vault count)
  const activeListings = vaultListings.filter(
    (listing) => listing.status === "active"
  )

  // Counties: FALCO monitors all 95 TN counties continuously. Show that —
  // not just the subset that produced leads in the last report window.
  // This can be overridden via FALCO_MONITORED_COUNTIES env var if we
  // expand outside TN.
  const monitoredCountiesEnv = Number(process.env.FALCO_MONITORED_COUNTIES ?? "")
  const activeCounties = Number.isFinite(monitoredCountiesEnv) && monitoredCountiesEnv > 0
    ? Math.floor(monitoredCountiesEnv)
    : 95

  // Total leads — operator_report.overview is the authoritative pipeline-wide
  // count. Fall back to the vault listing count if the report is missing.
  const trackedLeads = operatorReport?.overview.totalLeads ?? activeListings.length

  // Ready-to-call: prefer the bot-side count (which sees every lead in the DB
  // BEFORE the vault sync's top-tier-ready demotion). Fall back to the vault
  // count tagged READY_TO_CALL (post-demotion). The bot-side number is the
  // honest "leads operationally ready to dial today" metric.
  const reportGreenReady = operatorReport?.overview.greenReady ?? 0
  const vaultGreenReady = activeListings.filter((listing) => {
    const r = String(listing.auctionReadiness ?? "").toUpperCase()
    return r === "READY_TO_CALL" || r === "GREEN"
  }).length
  const greenReady = Math.max(reportGreenReady, vaultGreenReady)

  // Vault count — prefer the report's vaultLive count (which reflects everything
  // the bot pushed, before any Supabase-side filtering). Fall back to active
  // Supabase listings.
  const reportVaultLive = operatorReport?.overview.vaultLive ?? 0
  const packetsInVault = Math.max(reportVaultLive, activeListings.length)

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
