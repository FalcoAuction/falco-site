// GET /api/cron/auto-promote-staging
//
// Nightly auto-promote of FULLY ENRICHED pre-foreclosure staged leads
// into the live homeowner_requests table. Fires via Vercel cron twice
// daily after the bot runs.
//
// IMPORTANT QUALITY GATE
// =======================
// A staged lead is only promoted if it has the data needed to actually
// work the lead — math sheet, dialer, SMS. Bar:
//
//   1. property_address contains a street number (\d)
//   2. property_value > 0  (we know the AVM → can compute equity)
//   3. mortgage_balance > 0  (we know the loan → can compute equity)
//   4. at least one contact path: phone OR alternate_phones non-empty
//
// Leads that fail the gate stay in staging as 'pending' so that a
// future BatchData enrichment pass can fill in the gaps and the cron
// will pick them up on a later run.
//
// Background: on 2026-05-19 we discovered ~5,000 un-enriched leads
// had been bulk-promoted with no property data — useless for the
// dialer. The roll-back set them back to pending; this gate makes
// sure that never happens again.
//
// Allowlist: only DISTRESS / pre-foreclosure sources auto-promote.
// Code-violation sources (nashville_codes, memphis_codes,
// davidson_demolition, etc) stay manual review.
//
// Auth: Vercel cron header check.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Trustee-notice / pre-foreclosure family only — the leads the
// auction-routing pitch actually works on. Deliberately excluded
// (2026-07-04, Patrick's call — "drop the dead types"):
//   courtlistener_bankruptcy — automatic stay freezes the sale; BK
//     debtors are contacted through counsel, not cold outreach. The
//     BK play is B2B with trustees/attorneys, later.
//   tn_tax_delinquent / hamilton_tax_delinquent — 1-year redemption,
//     multi-year timelines, no urgency to pitch.
//   hud_reo — already bank-owned; no homeowner, no equity to save.
//   code violations + demolition — excluded since day one.
// All geographies stay (East TN sources included).
const AUTO_PROMOTE_SOURCES = [
  "tn_public_notice",
  "tn_lis_pendens",
  "memphis_daily_news",
  "nashville_ledger",
  "mackie_wolf_trustee",
  "brock_scott_trustee",
  "hamilton_county_herald",
  "knoxville_poh",
]

type StagingRow = {
  id: string
  bot_source: string | null
  property_address: string | null
  property_value: number | null
  mortgage_balance: number | null
  phone: string | null
  alternate_phones: unknown
}

function hasUsableAddress(addr: string | null): boolean {
  if (!addr) return false
  return /\d/.test(addr)
}

function hasUsableContact(row: StagingRow): boolean {
  const phoneDigits = (row.phone || "").replace(/\D/g, "")
  if (phoneDigits.length >= 10) return true
  const alt = row.alternate_phones
  if (Array.isArray(alt) && alt.length > 0) return true
  if (typeof alt === "string") {
    try {
      const parsed = JSON.parse(alt)
      if (Array.isArray(parsed) && parsed.length > 0) return true
    } catch {
      // ignore
    }
  }
  return false
}

function passesQualityGate(row: StagingRow): boolean {
  if (!hasUsableAddress(row.property_address)) return false
  if (!row.property_value || row.property_value <= 0) return false
  if (!row.mortgage_balance || row.mortgage_balance <= 0) return false
  if (!hasUsableContact(row)) return false
  return true
}

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

  // Pull every pending row from the allowlisted sources
  const { data: rows, error } = await supabaseAdmin
    .from("homeowner_requests_staging")
    .select(
      "id, bot_source, property_address, property_value, mortgage_balance, phone, alternate_phones"
    )
    .eq("staging_status", "pending")
    .in("bot_source", AUTO_PROMOTE_SOURCES)
    // Push the gate's hard requirements into the query. PostgREST caps
    // any single fetch at 1,000 rows regardless of .limit(), and with
    // 6k+ pending rows and no filter, the cron only ever examined an
    // arbitrary 1,000 un-enrichable rows and never saw newly-enriched
    // ones. Filtering here means the cap applies only to rows that can
    // actually pass (address + contact-path still checked in JS).
    .gt("property_value", 0)
    .gt("mortgage_balance", 0)
    .not("phone", "is", null)
    .order("trustee_sale_date", { ascending: true, nullsFirst: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const all = (rows || []) as StagingRow[]
  const passing = all.filter(passesQualityGate)

  // Per-source breakdown for logging
  type Bucket = { eligible: number; promoted: number; merged: number; failed: number }
  const perSource: Record<string, Bucket> = {}
  for (const src of AUTO_PROMOTE_SOURCES) {
    perSource[src] = { eligible: 0, promoted: 0, merged: 0, failed: 0 }
  }
  for (const r of passing) {
    const s = r.bot_source || ""
    if (perSource[s]) perSource[s].eligible++
  }

  let totalInserted = 0
  let totalMerged = 0
  let totalFailed = 0

  for (const row of passing) {
    try {
      const { data, error: rpcErr } = await supabaseAdmin.rpc("promote_staged_lead", {
        p_staging_id: row.id,
        p_reviewer: "cron_auto_promote",
      })
      if (rpcErr) {
        totalFailed++
        const s = row.bot_source || ""
        if (perSource[s]) perSource[s].failed++
        continue
      }
      const r = data as { ok?: boolean; action?: string }
      if (r?.ok) {
        const s = row.bot_source || ""
        if (r.action === "inserted") {
          totalInserted++
          if (perSource[s]) perSource[s].promoted++
        } else if (r.action === "merged") {
          totalMerged++
          if (perSource[s]) perSource[s].merged++
        }
      } else {
        totalFailed++
        const s = row.bot_source || ""
        if (perSource[s]) perSource[s].failed++
      }
    } catch {
      totalFailed++
      const s = row.bot_source || ""
      if (perSource[s]) perSource[s].failed++
    }
  }

  return NextResponse.json({
    ok: true,
    total_pending_in_allowlist: all.length,
    total_passing_gate: passing.length,
    total_inserted: totalInserted,
    total_merged: totalMerged,
    total_failed: totalFailed,
    per_source: perSource,
    ran_at: new Date().toISOString(),
    gate: {
      requires_street_address: true,
      requires_property_value_gt_0: true,
      requires_mortgage_balance_gt_0: true,
      requires_contact_path: true,
    },
  })
}
