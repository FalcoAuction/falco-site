// GET /api/cron/sale-date-sync
//
// Cross-references live bot leads against the freshest scraped notices
// in staging and corrects trustee_sale_date when a sale was postponed
// ("continued"). Also maintains sale_date_last_seen_at so the admin +
// dialer views can flag leads whose notice hasn't been re-verified
// recently (possibly postponed/cancelled).
//
// All the logic lives in the Postgres function sync_sale_dates()
// (supabase/migrations/20260704_sale_date_freshness.sql) — set-based,
// idempotent, skips leads with a manual sale_status. This route just
// triggers it and reports counts.
//
// Scheduled in vercel.json after each bot run (bots finish ~15:10 and
// ~23:10 UTC; auto-promote runs 16:00 / 23:30; this runs 16:30 / 23:45
// so promoted rows get the same-day freshness pass).
//
// Auth: Vercel cron header check.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 120

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

  const { data, error } = await supabaseAdmin.rpc("sync_sale_dates")
  if (error) {
    console.error("sync_sale_dates failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) })
}
