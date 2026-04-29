#!/usr/bin/env node
/**
 * Address-based deduplication for homeowner_requests bot leads.
 *
 * Background: the unified-leads migration imported the same properties twice
 * — once with a short pipeline_lead_key (e.g. "rutherford-county-foreclosure-5b9d9f7c")
 * from the snapshot blob, and once with a long SHA1-style key from the
 * original NDJSON ingest. Same property, two rows. ~28 such cases.
 *
 * Strategy:
 *   1. Group bot rows by normalized property_address
 *   2. Within each group, pick the "winner" row (most data, oldest submission)
 *   3. Backfill the winner with any non-null fields from the losers
 *   4. Delete the losers
 *
 * Run:
 *   node scripts/dedup-homeowner-requests.mjs           # dry run
 *   node scripts/dedup-homeowner-requests.mjs --apply   # actually merge + delete
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\\n$/g, "").trim()
    out[line.slice(0, eq).trim()] = val
  }
  return out
}

const ROOT = path.resolve(process.cwd())
const VERCEL_ENV = parseEnvFile(path.join(ROOT, ".env.vercel.production"))
const env = (n) => process.env[n] || VERCEL_ENV[n] || ""

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase config")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// Fields where we'd want to backfill from a loser to the winner if winner is null.
// Excluded: id, source, pipeline_lead_key, submitted_at (don't change identity fields)
const MERGEABLE_FIELDS = [
  "full_name",
  "email",
  "phone",
  "best_callback",
  "situation_notes",
  "referrer",
  "status",
  "admin_notes",
  "next_action_at",
  "last_contacted_at",
  "owner_name_records",
  "distress_type",
  "property_value",
  "property_value_source",
  "property_value_as_of",
  "beds",
  "baths",
  "sqft",
  "year_built",
  "last_sale_date",
  "last_sale_price",
  "lien_position",
  "pipeline_score",
  "mortgage_balance",
  "trustee_sale_date",
  "county",
]

/** Normalize address for grouping: lowercase, collapse whitespace, strip trailing punctuation. */
function normalizeAddr(raw) {
  if (!raw) return ""
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.\s]+$/, "")
}

/** Score a row's "completeness" — higher = better candidate for winner. */
function scoreRow(row) {
  let score = 0
  if (row.property_value) score += 20
  if (row.email) score += 10
  if (row.owner_name_records) score += 5
  if (row.phone) score += 5
  if (row.mortgage_balance) score += 5
  if (row.beds) score += 2
  if (row.baths) score += 2
  if (row.sqft) score += 2
  if (row.year_built) score += 2
  if (row.last_sale_date) score += 2
  if (row.admin_notes && row.admin_notes.trim().length > 0) score += 3
  return score
}

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes + deletes)" : "DRY RUN"}`)
  console.log("---")

  // Pull all bot rows
  const { data: rows, error } = await supabase
    .from("homeowner_requests")
    .select("*")
    .eq("source", "bot")
    .order("submitted_at", { ascending: true })

  if (error) {
    console.error("fetch error:", error.message)
    process.exit(1)
  }

  console.log(`total bot rows: ${rows.length}`)

  // Group by normalized address
  const groups = new Map()
  for (const row of rows) {
    const key = normalizeAddr(row.property_address)
    if (!key) continue // skip blank addresses
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  const dupGroups = [...groups.entries()].filter(([, list]) => list.length > 1)
  console.log(`unique addresses: ${groups.size}`)
  console.log(`addresses with duplicates: ${dupGroups.length}`)
  console.log(
    `extra rows beyond one-per-address: ${rows.length - groups.size}`
  )
  console.log("---")

  let mergedCount = 0
  let deletedCount = 0
  let backfillCount = 0

  for (const [normAddr, dups] of dupGroups) {
    // Score each row, pick winner: highest score, oldest as tiebreak
    const scored = dups
      .map((r) => ({ ...r, _score: scoreRow(r) }))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score
        // tiebreak on oldest (already sorted asc by submitted_at, so first wins)
        return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      })
    const winner = scored[0]
    const losers = scored.slice(1)

    // Compute backfill: which fields can we fill in winner from losers
    const backfill = {}
    for (const field of MERGEABLE_FIELDS) {
      if (winner[field] !== null && winner[field] !== "" && winner[field] !== undefined) {
        continue
      }
      // Look for first loser with a value
      for (const loser of losers) {
        const val = loser[field]
        if (val !== null && val !== "" && val !== undefined) {
          backfill[field] = val
          break
        }
      }
    }
    const backfillKeys = Object.keys(backfill)

    console.log(
      `[DUP] ${normAddr.slice(0, 60)} (${dups.length} rows)`
    )
    console.log(
      `  winner: ${winner.id.slice(0, 8)} score=${winner._score} key=${winner.pipeline_lead_key?.slice(0, 30) || "(no key)"}`
    )
    for (const loser of losers) {
      console.log(
        `   loser: ${loser.id.slice(0, 8)} score=${loser._score} key=${loser.pipeline_lead_key?.slice(0, 30) || "(no key)"}`
      )
    }
    if (backfillKeys.length > 0) {
      console.log(`   backfill: ${backfillKeys.join(", ")}`)
    }

    if (APPLY) {
      // 1. Backfill winner if needed
      if (backfillKeys.length > 0) {
        const { error: upErr } = await supabase
          .from("homeowner_requests")
          .update({ ...backfill, updated_at: new Date().toISOString() })
          .eq("id", winner.id)
        if (upErr) {
          console.log(`     ↳ winner backfill FAIL: ${upErr.message}`)
          continue
        }
        backfillCount++
      }
      // 2. Delete losers
      for (const loser of losers) {
        const { error: delErr } = await supabase
          .from("homeowner_requests")
          .delete()
          .eq("id", loser.id)
        if (delErr) {
          console.log(`     ↳ delete ${loser.id.slice(0, 8)} FAIL: ${delErr.message}`)
          continue
        }
        deletedCount++
      }
      mergedCount++
    }
  }

  console.log("---")
  console.log(`SUMMARY:`)
  console.log(`  duplicate groups: ${dupGroups.length}`)
  console.log(`  rows that would be deleted: ${rows.length - groups.size}`)
  if (APPLY) {
    console.log(`  groups merged: ${mergedCount}`)
    console.log(`  winners backfilled: ${backfillCount}`)
    console.log(`  losers deleted: ${deletedCount}`)
    console.log(`  bot leads remaining: ${rows.length - deletedCount}`)
  } else {
    console.log(`  (dry run — re-run with --apply to actually merge + delete)`)
  }
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
