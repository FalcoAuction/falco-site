import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"
import { supabaseAdmin } from "@/lib/supabase-admin"

const execFileAsync = promisify(execFile)

export type OperatorLeadRow = {
  lead_key: string
  address: string | null
  county: string | null
  distress_type: string | null
  falco_score_internal: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  uw_ready: number
  first_seen_at?: string | null
  last_seen_at?: string | null
  score_updated_at?: string | null
  latest_packet_at?: string | null
}

export type OperatorPacketRow = {
  lead_key: string
  run_id: string
  pdf_path: string
  bytes: number
  created_at: string
  address: string | null
  county: string | null
  falco_score_internal: number | null
  auction_readiness: string | null
  dts_days: number | null
}

export type OperatorReport = {
  generatedAt: string
  dbPath: string
  overview: {
    totalLeads: number
    greenReady: number
    uwReady: number
    packeted: number
    contactReady: number
    vaultLive: number
    pendingApprovals: number
  }
  recentLeads: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
  topCandidates: (OperatorLeadRow & { vaultLive: boolean; vaultSlug: string | null })[]
  recentPackets: (OperatorPacketRow & { vaultLive: boolean; vaultSlug: string | null })[]
}

function leadKeyPrefix(leadKey: string) {
  return (leadKey || "").slice(0, 8).toLowerCase()
}

function attachVaultState<T extends { lead_key: string }>(
  rows: T[],
  liveListings: { slug: string }[]
) {
  return rows.map((row) => {
    const prefix = leadKeyPrefix(row.lead_key)
    const matched = liveListings.find((listing) => listing.slug.toLowerCase().endsWith(prefix))
    return {
      ...row,
      vaultLive: Boolean(matched),
      vaultSlug: matched?.slug ?? null,
    }
  })
}

export async function getOperatorReport(): Promise<OperatorReport> {
  const scriptPath = path.join(process.cwd(), "scripts", "operator_report.py")
  const defaultDbPath = path.join(
    process.cwd(),
    "..",
    "falco-distress-bots",
    "data",
    "falco.db"
  )

  const { stdout } = await execFileAsync(
    path.join(process.cwd(), "..", "falco-distress-bots", ".venv", "Scripts", "python.exe"),
    [scriptPath, defaultDbPath],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  )

  const parsed = JSON.parse(stdout) as {
    generatedAt: string
    dbPath: string
    overview: {
      totalLeads: number
      greenReady: number
      uwReady: number
      packeted: number
      contactReady: number
    }
    recentLeads: OperatorLeadRow[]
    topCandidates: OperatorLeadRow[]
    recentPackets: OperatorPacketRow[]
  }

  const [vaultResult, accessResult] = await Promise.all([
    supabaseAdmin
      ? supabaseAdmin.from("vault_listings").select("slug").eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      ? supabaseAdmin
          .from("partner_access_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0, error: null }),
  ])

  const liveListings = vaultResult.error ? [] : (vaultResult.data ?? [])
  const pendingApprovals =
    "count" in accessResult && typeof accessResult.count === "number" ? accessResult.count : 0

  return {
    generatedAt: parsed.generatedAt,
    dbPath: parsed.dbPath,
    overview: {
      ...parsed.overview,
      vaultLive: liveListings.length,
      pendingApprovals,
    },
    recentLeads: attachVaultState(parsed.recentLeads, liveListings),
    topCandidates: attachVaultState(parsed.topCandidates, liveListings),
    recentPackets: attachVaultState(parsed.recentPackets, liveListings),
  }
}
