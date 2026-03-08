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
  sourceMode: "full" | "site_fallback"
  sourceNote: string
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

type VaultListingLite = {
  slug: string
  title: string | null
  county: string | null
  falco_score: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  created_at: string
  packet_path: string | null
  is_active: boolean | null
}

function mapVaultRowToLead(row: VaultListingLite): OperatorLeadRow & {
  vaultLive: boolean
  vaultSlug: string | null
} {
  return {
    lead_key: row.slug,
    address: row.title,
    county: row.county,
    distress_type: "FORECLOSURE",
    falco_score_internal: row.falco_score,
    auction_readiness: row.auction_readiness,
    equity_band: row.equity_band,
    dts_days: row.dts_days,
    uw_ready: row.auction_readiness?.toUpperCase() === "GREEN" ? 1 : 0,
    score_updated_at: row.created_at,
    vaultLive: row.is_active !== false,
    vaultSlug: row.slug,
  }
}

async function getFallbackOperatorReport(): Promise<OperatorReport> {
  const [vaultResult, accessResult] = await Promise.all([
    supabaseAdmin
      ? supabaseAdmin
          .from("vault_listings")
          .select(
            "slug,title,county,falco_score,auction_readiness,equity_band,dts_days,created_at,packet_path,is_active"
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      ? supabaseAdmin
          .from("partner_access_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0, error: null }),
  ])

  const vaultRows = vaultResult.error ? [] : ((vaultResult.data ?? []) as VaultListingLite[])
  const pendingApprovals =
    "count" in accessResult && typeof accessResult.count === "number" ? accessResult.count : 0

  const recentLeads = vaultRows.slice(0, 12).map(mapVaultRowToLead)
  const topCandidates = [...vaultRows]
    .sort((a, b) => {
      const scoreDiff = (b.falco_score ?? 0) - (a.falco_score ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return (a.dts_days ?? 9999) - (b.dts_days ?? 9999)
    })
    .slice(0, 10)
    .map(mapVaultRowToLead)

  const recentPackets = vaultRows
    .filter((row) => Boolean(row.packet_path))
    .slice(0, 12)
    .map((row) => ({
      lead_key: row.slug,
      run_id: "vault_live",
      pdf_path: row.packet_path || "",
      bytes: 0,
      created_at: row.created_at,
      address: row.title,
      county: row.county,
      falco_score_internal: row.falco_score,
      auction_readiness: row.auction_readiness,
      dts_days: row.dts_days,
      vaultLive: row.is_active !== false,
      vaultSlug: row.slug,
    }))

  return {
    generatedAt: new Date().toISOString(),
    dbPath: "site_fallback",
    sourceMode: "site_fallback",
    sourceNote:
      "Running in site fallback mode. Live vault and approval data are shown, but upstream bots DB detail is only available in the shared workspace/local environment.",
    overview: {
      totalLeads: vaultRows.length,
      greenReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      uwReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      packeted: vaultRows.filter((row) => Boolean(row.packet_path)).length,
      contactReady: vaultRows.filter((row) => row.auction_readiness?.toUpperCase() === "GREEN").length,
      vaultLive: vaultRows.filter((row) => row.is_active !== false).length,
      pendingApprovals,
    },
    recentLeads,
    topCandidates,
    recentPackets,
  }
}

export async function getOperatorReport(): Promise<OperatorReport> {
  try {
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
      sourceMode: "full",
      sourceNote:
        "Full operator mode. Reading upstream bots database plus live vault and approval state.",
      overview: {
        ...parsed.overview,
        vaultLive: liveListings.length,
        pendingApprovals,
      },
      recentLeads: attachVaultState(parsed.recentLeads, liveListings),
      topCandidates: attachVaultState(parsed.topCandidates, liveListings),
      recentPackets: attachVaultState(parsed.recentPackets, liveListings),
    }
  } catch (error) {
    console.warn("getOperatorReport falling back to site-only mode", error)
    return getFallbackOperatorReport()
  }
}
