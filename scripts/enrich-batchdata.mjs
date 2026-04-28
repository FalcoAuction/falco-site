#!/usr/bin/env node
/**
 * One-off BatchData enrichment pass against falco-site Supabase.
 *
 * Pulls homeowner_requests rows where source='bot' and property_value IS NULL,
 * calls BatchData verify + property-lookup APIs, extracts AVM + property
 * details, and updates the row.
 *
 * Run:
 *   node scripts/enrich-batchdata.mjs            # dry-run, top 5 rows
 *   node scripts/enrich-batchdata.mjs --apply    # actually write updates
 *   node scripts/enrich-batchdata.mjs --apply --limit 60   # full pass
 *
 * Env vars required (loaded from .env.vercel.production by default):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FALCO_BATCHDATA_API_KEY  (or pass via env or .env)
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// -----------------------------------------------------------------------------
// Config + env loading
// -----------------------------------------------------------------------------

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  const text = fs.readFileSync(filePath, "utf8")
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    // The .env.vercel.production has literal "\n" in some values — strip it
    val = val.replace(/\\n$/g, "").trim()
    out[key] = val
  }
  return out
}

const ROOT = path.resolve(process.cwd())
const VERCEL_ENV = parseEnvFile(path.join(ROOT, ".env.vercel.production"))
const LOCAL_ENV = parseEnvFile(path.join(ROOT, ".env.local"))
const BOTS_ENV = parseEnvFile(path.join(ROOT, "..", "falco-distress-bots", ".env"))

function envOf(name) {
  return (
    process.env[name] ||
    VERCEL_ENV[name] ||
    LOCAL_ENV[name] ||
    BOTS_ENV[name] ||
    ""
  )
}

const SUPABASE_URL = envOf("NEXT_PUBLIC_SUPABASE_URL") || envOf("SUPABASE_URL")
const SUPABASE_KEY = envOf("SUPABASE_SERVICE_ROLE_KEY")
const BATCHDATA_KEY = envOf("FALCO_BATCHDATA_API_KEY") || envOf("BATCHDATA_API_KEY")

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase config — check NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
if (!BATCHDATA_KEY) {
  console.error("Missing FALCO_BATCHDATA_API_KEY — check ../falco-distress-bots/.env")
  process.exit(1)
}

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const limitIdx = args.indexOf("--limit")
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : APPLY ? 100 : 5

// Estimated cost per BatchData address — verify + lookup combined.
// BatchData pricing varies by plan; use $0.20 as a conservative estimate.
const ESTIMATED_COST_PER_LEAD_USD = 0.2

// -----------------------------------------------------------------------------
// BatchData API
// -----------------------------------------------------------------------------

const VERIFY_URL = "https://api.batchdata.com/api/v1/address/verify"
const LOOKUP_URL = "https://api.batchdata.com/api/v1/property/lookup/all-attributes"

const ADDR_FULL_RE = /^(?<street>.+?),\s*(?<city>[^,]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/
const ADDR_LOOSE_RE = /^(?<street>.+?)\s+(?<city>[A-Za-z .'-]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/

function splitAddress(raw) {
  const text = (raw || "").trim().replace(/\s+/g, " ").replace(/,\s*$/, "")
  if (!text) return null
  const m1 = text.match(ADDR_FULL_RE)
  if (m1) return { street: m1.groups.street.trim(), city: m1.groups.city.trim(), state: m1.groups.state, zip: m1.groups.zip }
  const m2 = text.match(ADDR_LOOSE_RE)
  if (m2) return { street: m2.groups.street.trim(), city: m2.groups.city.trim(), state: m2.groups.state, zip: m2.groups.zip }
  return null
}

async function verifyAddress(parts) {
  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BATCHDATA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests: [parts] }),
  })
  if (!res.ok) {
    throw new Error(`verify HTTP ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  const addresses = json?.results?.addresses || []
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("verify returned no addresses")
  }
  const verified = addresses[0]
  const hash = String(verified?.hash || "").trim()
  if (!hash) {
    throw new Error(verified?.error || "verify failed (no hash)")
  }
  return hash
}

async function lookupProperty(hash) {
  const res = await fetch(LOOKUP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BATCHDATA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests: [{ hash }] }),
  })
  if (!res.ok) {
    throw new Error(`lookup HTTP ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// -----------------------------------------------------------------------------
// Field extraction from BatchData property payload
// -----------------------------------------------------------------------------

function dig(obj, ...path) {
  let cur = obj
  for (const k of path) {
    if (cur == null) return null
    cur = cur[k]
  }
  return cur
}

function intOrNull(v) {
  if (v === null || v === undefined || v === "") return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : null
}

function floatOrNull(v) {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function dateOrNull(v) {
  if (!v) return null
  const s = String(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * Extract canonical fields from a BatchData property-lookup payload.
 *
 * BatchData returns a tree like results.properties[0].{ valuation, building,
 * sale, owner, mortgage, ... }. Different shape than ATTOM but covers the
 * same ground for our purposes.
 */
function extractFields(lookupPayload) {
  const property = dig(lookupPayload, "results", "properties", 0) || {}
  const valuation = property.valuation || {}
  const building = property.building || property.intel || {}
  const lot = property.lot || {}
  const sale = property.sale || {}
  const owner = property.owner || {}

  // BatchData AVM — common field names
  const avm =
    intOrNull(valuation?.estimatedValue) ??
    intOrNull(valuation?.value) ??
    intOrNull(valuation?.avm)
  const avmLow =
    intOrNull(valuation?.priceRangeMin) ??
    intOrNull(valuation?.estimatedValueLow) ??
    intOrNull(valuation?.lowValue)
  const avmHigh =
    intOrNull(valuation?.priceRangeMax) ??
    intOrNull(valuation?.estimatedValueHigh) ??
    intOrNull(valuation?.highValue)

  return {
    property_value: avm,
    property_value_source: avm ? "BATCHDATA_AVM" : null,
    property_value_as_of: avm ? new Date().toISOString().slice(0, 10) : null,
    beds: intOrNull(building?.bedroomCount ?? building?.bedrooms ?? building?.beds),
    baths: floatOrNull(
      building?.bathroomCount ?? building?.bathrooms ?? building?.baths
    ),
    sqft: intOrNull(
      building?.totalBuildingAreaSquareFeet ??
        building?.livingAreaSquareFeet ??
        building?.buildingAreaSqft
    ),
    year_built: intOrNull(building?.yearBuilt),
    last_sale_date: dateOrNull(sale?.lastSaleDate ?? sale?.transferDate),
    last_sale_price: intOrNull(sale?.lastSalePrice ?? sale?.transferAmount),
    owner_name_records:
      typeof owner?.fullName === "string"
        ? owner.fullName.trim() || null
        : null,
    _raw_avm_low: avmLow,
    _raw_avm_high: avmHigh,
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

function fmt(n) {
  return n === null || n === undefined ? "—" : Number(n).toLocaleString()
}

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes)" : "DRY RUN"}`)
  console.log(`limit: ${LIMIT}`)
  console.log(`estimated cost per lead: $${ESTIMATED_COST_PER_LEAD_USD}`)
  console.log("---")

  const { data: leads, error } = await supabase
    .from("homeowner_requests")
    .select("id, property_address, county, property_value, beds, baths, sqft, year_built, last_sale_date")
    .eq("source", "bot")
    .is("property_value", null)
    .order("submitted_at", { ascending: true })
    .limit(LIMIT)

  if (error) {
    console.error("Supabase fetch error:", error.message)
    process.exit(1)
  }

  console.log(`fetched ${leads.length} bot leads missing property_value`)
  console.log(`estimated total cost if all hit: $${(leads.length * ESTIMATED_COST_PER_LEAD_USD).toFixed(2)}`)
  console.log("---")

  let success = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const tag = `[${i + 1}/${leads.length}]`
    const addr = lead.property_address || ""
    const county = lead.county || ""

    // Construct full address with state if not present
    let fullAddr = addr
    if (!/,\s*TN\s+\d{5}/.test(fullAddr) && !/\sTN\s+\d{5}/.test(fullAddr)) {
      // address may not have state/zip — try anyway, BatchData verify is forgiving
      // but we want better hit rate. For now, just use as-is.
    }

    const parts = splitAddress(fullAddr)
    if (!parts) {
      console.log(`${tag} SKIP no-parse "${fullAddr}" (${county})`)
      skipped++
      continue
    }

    try {
      const hash = await verifyAddress(parts)
      const lookup = await lookupProperty(hash)
      const fields = extractFields(lookup)

      if (!fields.property_value) {
        console.log(
          `${tag} NO-AVM ${parts.street}, ${parts.city} ${parts.state} ${parts.zip}`
        )
        skipped++
        continue
      }

      console.log(
        `${tag} OK $${fmt(fields.property_value)} (${fmt(fields._raw_avm_low)}–${fmt(fields._raw_avm_high)}) · ${fields.beds || "—"}bd ${fields.baths || "—"}ba ${fmt(fields.sqft)}sqft · ${parts.street}`
      )

      if (APPLY) {
        // Strip internal fields before write
        const update = { ...fields }
        delete update._raw_avm_low
        delete update._raw_avm_high
        // Don't overwrite existing values; only fill nulls
        const writePayload = {}
        if (update.property_value && lead.property_value === null)
          writePayload.property_value = update.property_value
        if (update.property_value_source) writePayload.property_value_source = update.property_value_source
        if (update.property_value_as_of) writePayload.property_value_as_of = update.property_value_as_of
        if (update.beds && !lead.beds) writePayload.beds = update.beds
        if (update.baths && !lead.baths) writePayload.baths = update.baths
        if (update.sqft && !lead.sqft) writePayload.sqft = update.sqft
        if (update.year_built && !lead.year_built) writePayload.year_built = update.year_built
        if (update.last_sale_date && !lead.last_sale_date)
          writePayload.last_sale_date = update.last_sale_date
        if (update.last_sale_price) writePayload.last_sale_price = update.last_sale_price
        writePayload.updated_at = new Date().toISOString()

        const { error: upErr } = await supabase
          .from("homeowner_requests")
          .update(writePayload)
          .eq("id", lead.id)

        if (upErr) {
          console.log(`     ↳ write FAIL: ${upErr.message}`)
          failed++
          continue
        }
      }
      success++
    } catch (err) {
      console.log(`${tag} FAIL ${parts.street}, ${parts.city}: ${err.message}`)
      failed++
    }

    // Be polite to BatchData — small delay between leads
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log("---")
  console.log(`SUMMARY: success=${success} skipped=${skipped} failed=${failed}`)
  console.log(`Estimated cost: $${(success * ESTIMATED_COST_PER_LEAD_USD).toFixed(2)}`)
  if (!APPLY) {
    console.log("(dry run — re-run with --apply to actually write updates)")
  }
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
