// GET /api/cron/auto-promote-staging
//
// Nightly auto-promote of pre-foreclosure-related staged leads into the
// live homeowner_requests table. Fires via Vercel cron after the daily
// bot runs so /admin/pipeline always shows fresh leads.
//
// Background: bots write to homeowner_requests_staging with
// staging_status='pending'. Without auto-promote, leads sit forever
// unless someone clicks promote in /admin/staging. From 2026-05-15 to
// 2026-05-19 zero leads got promoted while ~1,600 stacked up. This
// cron prevents that drought.
//
// Allowlist: only DISTRESS / pre-foreclosure sources auto-promote.
// Code violations and demolition orders stay manual review (Patrick's
// call — they're a different funnel).
//
// Calls Postgres function promote_staged_batch(bot_source, reviewer).
// The function already handles dedupe + merge, so safe to re-run.
//
// Auth: Vercel cron header check.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Pre-foreclosure / distress sources that auto-promote.
// Code-violation sources (nashville_codes, memphis_codes,
// davidson_demolition, chattanooga_codes, mtn_cities_codes,
// johnson_city_bdsr) stay manual review — they're a different
// signal than imminent foreclosure.
const AUTO_PROMOTE_SOURCES = [
  "tn_public_notice", // TN trustee sale ads
  "courtlistener_bankruptcy", // BK filings
  "tn_lis_pendens", // lis pendens (pre-foreclosure)
  "memphis_daily_news", // newspaper foreclosure ads
  "nashville_ledger", // newspaper foreclosure ads
  "mackie_wolf_trustee", // trustee law firm
  "brock_scott_trustee", // trustee law firm
  "hamilton_county_herald", // newspaper foreclosure ads
  "tn_tax_delinquent", // tax delinquent → upcoming tax sale
  "hamilton_tax_delinquent", // tax delinquent → upcoming tax sale
  "knoxville_poh", // posted-on-house notices
  "hud_reo", // HUD REO listings (distressed)
]

export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim()
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 })
  }

  const results: Array<{
    bot_source: string
    inserted: number
    merged: number
    failed: number
    error?: string
  }> = []
  let totalInserted = 0
  let totalMerged = 0
  let totalFailed = 0

  for (const src of AUTO_PROMOTE_SOURCES) {
    try {
      const { data, error } = await supabaseAdmin.rpc("promote_staged_batch", {
        p_bot_source: src,
        p_reviewer: "cron_auto_promote",
      })
      if (error) {
        results.push({
          bot_source: src,
          inserted: 0,
          merged: 0,
          failed: 0,
          error: error.message,
        })
        continue
      }
      const r = data as {
        bot_source?: string
        inserted?: number
        merged?: number
        failed?: number
      }
      const inserted = r.inserted || 0
      const merged = r.merged || 0
      const failed = r.failed || 0
      totalInserted += inserted
      totalMerged += merged
      totalFailed += failed
      results.push({ bot_source: src, inserted, merged, failed })
    } catch (e) {
      results.push({
        bot_source: src,
        inserted: 0,
        merged: 0,
        failed: 0,
        error: String(e).slice(0, 200),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    sources_run: AUTO_PROMOTE_SOURCES.length,
    total_inserted: totalInserted,
    total_merged: totalMerged,
    total_failed: totalFailed,
    per_source: results,
    ran_at: new Date().toISOString(),
  })
}
