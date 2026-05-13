#!/usr/bin/env node
/**
 * Targeted BatchData re-run for ACTIVE foreclosure-family leads with
 * data gaps.
 *
 * Audit (2026-05-12) identified 111 active foreclosure-family leads
 * (future sale date) where:
 *   - 18 missing property_value
 *   - 16 missing mortgage_balance (BatchData can't help here — HMDA/Ledger does)
 *   - 11 missing owner_name
 *   - 4 missing phone
 *
 * This script targets only the gaps BatchData can actually fill:
 * owner_name, phone, email (skip-trace) + property_value, beds, baths,
 * sqft, year_built (property lookup). Mortgage gaps are left to
 * hmda_enricher + nashville_ledger_reextract + mortgage_estimator
 * (the free-only chain in falco-distress-bots).
 *
 * Address normalization runs client-side before each BatchData call,
 * mirroring src/bots/_address.py — strips CRLF, "Property Address:"
 * prefix junk, duplicate "City, ST, City, ST" runs, and tags
 * parcel-only addresses ("0 Knight Drive") that won't AVM.
 *
 * Provenance: every successful write also records to
 * lead_field_provenance with source='batchdata_avm' (property_value)
 * or 'batchdata_skiptrace' (phone/owner/email).
 *
 * Run:
 *   node scripts/batchdata-rerun-incomplete-foreclosure.mjs              # dry run
 *   node scripts/batchdata-rerun-incomplete-foreclosure.mjs --apply      # write
 *   node scripts/batchdata-rerun-incomplete-foreclosure.mjs --apply --limit 50
 *
 * Env: same as enrich-batchdata.mjs.
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// ─────────────────── Env loading (matches sibling scripts) ────────────────────

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
const LOCAL_ENV = parseEnvFile(path.join(ROOT, ".env.local"))
const BOTS_ENV = parseEnvFile(path.join(ROOT, "..", "falco-distress-bots", ".env"))
const env = (n) => process.env[n] || VERCEL_ENV[n] || LOCAL_ENV[n] || BOTS_ENV[n] || ""

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const BD_KEY = env("FALCO_BATCHDATA_API_KEY") || env("BATCHDATA_API_KEY")

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase config")
  process.exit(1)
}
if (!BD_KEY) {
  console.error("Missing FALCO_BATCHDATA_API_KEY")
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const limitIdx = args.indexOf("--limit")
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : APPLY ? 60 : 5

// BatchData pricing: ~$0.20 verify+lookup, ~$0.25 skip-trace. Worst
// case per lead: $0.45 if both calls fire.
const COST_PER_LOOKUP = 0.20
const COST_PER_SKIPTRACE = 0.25

// ─────────────────── Address normalizer (mirrors _address.py) ────────────────

const PREFIX_PATTERNS = [
  /^.*?\b(?:commonly[\s,]+(?:known\s+as[\s,]+)?)?property\s+address[:\-]\s*/i,
  /^.*?\baka[:\-]?\s+/i,
  /^.*?\balso\s+known\s+as[:\-]?\s+/i,
]
const STATE_LONG = /\bTennessee\b/gi
// Optional zip between duplicated city/state pairs.
const DUP_CITY_STATE = /,\s*([A-Za-z][A-Za-z\s.'\-]+?)\s*,\s*TN\s*(?:\d{5})?\s*,?\s*\1\s*,?\s*TN\s*(\d{5})?/i
const WHITESPACE_NOISE = /[\r\n\t]+/g
const MULTI_SPACE = / {2,}/g
const MULTI_COMMA = /,(\s*,)+/g
const PARCEL_ONLY = /^0+\s+/i
const LEGAL_DESC_PREFIX = /^\s*(?:tax\s+)?map\s+\d+[\w.\-]*\s+parcel\s+\d+[\w.\-]*[,\s]+/i

function normalizeAddress(raw) {
  if (!raw) return { normalized: null, needsResolution: false, changes: [] }
  let s = String(raw).trim()
  const changes = []
  if (WHITESPACE_NOISE.test(s)) {
    s = s.replace(WHITESPACE_NOISE, " ")
    changes.push("stripped_crlf")
  }
  if (MULTI_SPACE.test(s)) {
    s = s.replace(MULTI_SPACE, " ")
    changes.push("collapsed_whitespace")
  }
  if (LEGAL_DESC_PREFIX.test(s)) {
    s = s.replace(LEGAL_DESC_PREFIX, "")
    changes.push("stripped_legal_desc")
  }
  for (let i = 0; i < 3; i++) {
    let did = false
    for (const pat of PREFIX_PATTERNS) {
      if (pat.test(s)) {
        s = s.replace(pat, "")
        changes.push("stripped_prefix_junk")
        did = true
        break
      }
    }
    if (!did) break
  }
  if (STATE_LONG.test(s)) {
    s = s.replace(STATE_LONG, "TN")
    changes.push("tennessee_to_tn")
  }
  const m = s.match(DUP_CITY_STATE)
  if (m) {
    const city = m[1].trim()
    const zip = m[2] || ""
    const repl = `, ${city}, TN${zip ? ` ${zip}` : ""}`
    s = s.slice(0, m.index) + repl + s.slice(m.index + m[0].length)
    changes.push("deduped_city_state")
  }
  if (MULTI_COMMA.test(s)) {
    s = s.replace(MULTI_COMMA, ",")
    changes.push("collapsed_commas")
  }
  s = s.trim().replace(/^,+|,+$/g, "").trim()
  if (!s) return { normalized: null, needsResolution: false, changes }
  const needsResolution = PARCEL_ONLY.test(s)
  if (needsResolution) changes.push("parcel_only_address")
  return { normalized: s, needsResolution, changes }
}

const ADDR_FULL = /^(?<street>.+?),\s*(?<city>[^,]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/
const ADDR_LOOSE = /^(?<street>.+?)\s+(?<city>[A-Za-z .'-]+),\s*(?<state>[A-Z]{2})\s+(?<zip>\d{5}(?:-\d{4})?)$/

function splitAddress(raw) {
  const text = (raw || "").trim().replace(/\s+/g, " ").replace(/,\s*$/, "")
  if (!text) return null
  const m1 = text.match(ADDR_FULL)
  if (m1) return { street: m1.groups.street.trim(), city: m1.groups.city.trim(), state: m1.groups.state, zip: m1.groups.zip }
  const m2 = text.match(ADDR_LOOSE)
  if (m2) return { street: m2.groups.street.trim(), city: m2.groups.city.trim(), state: m2.groups.state, zip: m2.groups.zip }
  return null
}

// ─────────────────── BatchData calls (lifted from sibling scripts) ───────────

const VERIFY_URL = "https://api.batchdata.com/api/v1/address/verify"
const LOOKUP_URL = "https://api.batchdata.com/api/v1/property/lookup/all-attributes"
const SKIPTRACE_URL = "https://api.batchdata.com/api/v1/property/skip-trace"

async function bdVerify(parts) {
  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${BD_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [parts] }),
  })
  if (!res.ok) throw new Error(`verify HTTP ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const addresses = json?.results?.addresses || []
  const hash = String(addresses[0]?.hash || "").trim()
  if (!hash) throw new Error(addresses[0]?.error || "verify returned no hash")
  return hash
}

async function bdLookup(hash) {
  const res = await fetch(LOOKUP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${BD_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ hash }] }),
  })
  if (!res.ok) throw new Error(`lookup HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

async function bdSkipTrace(parts, ownerName) {
  const body = { propertyAddress: parts }
  if (ownerName) body.ownerName = ownerName
  const res = await fetch(SKIPTRACE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${BD_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [body] }),
  })
  if (!res.ok) throw new Error(`skip-trace HTTP ${res.status}: ${await res.text()}`)
  return res.json()
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

function extractLookup(payload) {
  const p = payload?.results?.properties?.[0] || {}
  const v = p.valuation || {}
  const b = p.building || p.intel || {}
  const s = p.sale || {}
  const o = p.owner || {}
  const avm = intOrNull(v.estimatedValue) ?? intOrNull(v.value) ?? intOrNull(v.avm)
  return {
    property_value: avm,
    beds: intOrNull(b.bedroomCount ?? b.bedrooms ?? b.beds),
    baths: floatOrNull(b.bathroomCount ?? b.bathrooms ?? b.baths),
    sqft: intOrNull(b.totalBuildingAreaSquareFeet ?? b.livingAreaSquareFeet ?? b.buildingAreaSqft),
    year_built: intOrNull(b.yearBuilt),
    last_sale_date: dateOrNull(s.lastSaleDate ?? s.transferDate),
    last_sale_price: intOrNull(s.lastSalePrice ?? s.transferAmount),
    owner_name_records: typeof o.fullName === "string" ? o.fullName.trim() || null : null,
  }
}

function rankPhones(phones) {
  if (!Array.isArray(phones)) return []
  return phones
    .map((p) => {
      if (typeof p !== "object" || p === null) return null
      const number = String(p.number || p.phone || "").replace(/\D/g, "")
      if (!number || number.length < 10) return null
      const score = Number(p.score) || 0
      const tested = Boolean(p.tested)
      const reachable = Boolean(p.reachable)
      const dnc = Boolean(p.dnc)
      return {
        number: number.length === 11 && number.startsWith("1") ? number.slice(1) : number,
        score,
        tested,
        reachable,
        dnc,
        rank: (dnc ? 0 : 1000) + (reachable ? 500 : 0) + (tested ? 100 : 0) + score,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
}

function extractSkipTrace(payload) {
  const persons = payload?.results?.persons || []
  if (!Array.isArray(persons) || persons.length === 0) return null
  const allPhones = []
  const allEmails = []
  for (const person of persons) {
    const phones = person.phoneNumbers || person.phones || person.ownerPhones || []
    const emails = person.emails || person.emailAddresses || []
    allPhones.push(...phones)
    allEmails.push(...emails)
  }
  const ranked = rankPhones(allPhones)
  const firstPerson = persons[0] || {}
  const fullName =
    firstPerson.fullName ||
    [firstPerson.firstName, firstPerson.lastName].filter(Boolean).join(" ").trim() ||
    null
  return {
    primaryPhone: ranked[0] || null,
    secondaryPhone: ranked[1] || null,
    extraPhones: ranked.slice(2),
    primaryEmail: allEmails[0]?.email || allEmails[0]?.address || null,
    ownerName: fullName,
  }
}

// ─────────────────────────────────── Main ────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

function fmtPhone(d) {
  if (!d) return "—"
  const x = String(d).replace(/\D/g, "")
  if (x.length === 10) return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`
  return x
}

// Active foreclosure-family distress types we audited.
const FORECLOSURE_DISTRESS = [
  "PRE_FORECLOSURE", "PREFORECLOSURE", "TRUSTEE_NOTICE",
  "LIS_PENDENS", "SOT", "NOD", "FORECLOSURE",
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (writes)" : "DRY RUN"}`)
  console.log(`limit: ${LIMIT}`)
  console.log(`target: active foreclosure-family leads with future sale date + at least one gap`)
  console.log("---")

  const today = new Date().toISOString().slice(0, 10)

  const { data: leads, error } = await supabase
    .from("homeowner_requests")
    .select(
      "id, property_address, county, distress_type, trustee_sale_date, " +
      "full_name, owner_name_records, phone, email, " +
      "property_value, beds, baths, sqft, year_built, " +
      "phone_metadata"
    )
    .eq("source", "bot")
    .in("distress_type", FORECLOSURE_DISTRESS)
    .gte("trustee_sale_date", today)
    .order("trustee_sale_date", { ascending: true })
    .limit(LIMIT * 3) // overfetch — we'll skip leads with no gaps

  if (error) {
    console.error("Supabase fetch:", error.message)
    process.exit(1)
  }

  // Filter to leads that actually have a gap BatchData can fill.
  const candidates = leads.filter((l) => {
    const noOwner = !(l.owner_name_records || l.full_name)
    const noPhone = !l.phone
    const noValue = !l.property_value
    return noOwner || noPhone || noValue
  }).slice(0, LIMIT)

  console.log(`fetched ${leads.length} active foreclosure leads, ${candidates.length} have BatchData-fillable gaps`)
  console.log("---")

  let processed = 0
  let valueAdded = 0
  let ownerAdded = 0
  let phoneAdded = 0
  let parcelOnly = 0
  let failed = 0
  let estCost = 0

  for (let i = 0; i < candidates.length; i++) {
    const lead = candidates[i]
    const tag = `[${i + 1}/${candidates.length}]`
    const rawAddr = lead.property_address || ""

    // Normalize first
    const norm = normalizeAddress(rawAddr)
    const cleanAddr = norm.normalized || rawAddr
    if (norm.needsResolution) {
      console.log(`${tag} SKIP parcel-only "${cleanAddr}"`)
      parcelOnly++
      continue
    }

    const parts = splitAddress(cleanAddr)
    if (!parts) {
      console.log(`${tag} SKIP unparseable "${cleanAddr}"`)
      failed++
      continue
    }

    const gaps = {
      owner: !(lead.owner_name_records || lead.full_name),
      phone: !lead.phone,
      value: !lead.property_value,
    }
    const gapLabel = Object.entries(gaps)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join("+")
    console.log(`${tag} ${parts.street}, ${parts.city} ${parts.zip}  gaps=${gapLabel}`)

    const writePayload = {}
    const provenanceWrites = [] // { field, value, source, confidence, metadata }

    // ─── BatchData property lookup (value/beds/baths/sqft/owner) ────────
    if (gaps.value || gaps.owner) {
      try {
        const hash = await bdVerify(parts)
        const lookup = await bdLookup(hash)
        const fields = extractLookup(lookup)
        estCost += COST_PER_LOOKUP

        if (gaps.value && fields.property_value) {
          writePayload.property_value = fields.property_value
          writePayload.property_value_source = "BATCHDATA_AVM"
          writePayload.property_value_as_of = new Date().toISOString().slice(0, 10)
          provenanceWrites.push({
            field: "property_value",
            value: String(fields.property_value),
            source: "batchdata_avm_rerun",
            confidence: 0.85,
            metadata: { script: "batchdata-rerun-incomplete-foreclosure" },
          })
          valueAdded++
          console.log(`     value=$${fields.property_value.toLocaleString()}`)
        }
        if (gaps.owner && fields.owner_name_records) {
          writePayload.owner_name_records = fields.owner_name_records
          provenanceWrites.push({
            field: "owner_name_records",
            value: fields.owner_name_records,
            source: "batchdata_lookup_owner_rerun",
            confidence: 0.9,
            metadata: { script: "batchdata-rerun-incomplete-foreclosure" },
          })
          ownerAdded++
          console.log(`     owner=${fields.owner_name_records}`)
        }
        // Bonus fields if missing
        if (!lead.beds && fields.beds) writePayload.beds = fields.beds
        if (!lead.baths && fields.baths) writePayload.baths = fields.baths
        if (!lead.sqft && fields.sqft) writePayload.sqft = fields.sqft
        if (!lead.year_built && fields.year_built) writePayload.year_built = fields.year_built
      } catch (e) {
        console.log(`     lookup FAIL: ${e.message}`)
      }
    }

    // ─── BatchData skip-trace (phone/email + owner fallback) ────────────
    if (gaps.phone || (gaps.owner && !writePayload.owner_name_records)) {
      try {
        const ownerForSt = lead.owner_name_records || lead.full_name || null
        const st = await bdSkipTrace(parts, ownerForSt)
        const result = extractSkipTrace(st)
        estCost += COST_PER_SKIPTRACE

        if (result?.primaryPhone && gaps.phone) {
          writePayload.phone = result.primaryPhone.number
          provenanceWrites.push({
            field: "phone",
            value: result.primaryPhone.number,
            source: "batchdata_skiptrace_rerun",
            confidence: result.primaryPhone.dnc ? 0.4 : 0.85,
            metadata: {
              dnc: result.primaryPhone.dnc,
              reachable: result.primaryPhone.reachable,
              tested: result.primaryPhone.tested,
              script: "batchdata-rerun-incomplete-foreclosure",
            },
          })
          phoneAdded++
          console.log(`     phone=${fmtPhone(result.primaryPhone.number)}${result.primaryPhone.dnc ? " [DNC]" : ""}`)
        }
        if (result?.ownerName && gaps.owner && !writePayload.owner_name_records) {
          writePayload.owner_name_records = result.ownerName
          provenanceWrites.push({
            field: "owner_name_records",
            value: result.ownerName,
            source: "batchdata_skiptrace_owner_rerun",
            confidence: 0.8,
            metadata: { script: "batchdata-rerun-incomplete-foreclosure" },
          })
          ownerAdded++
          console.log(`     owner(via skiptrace)=${result.ownerName}`)
        }
        if (result?.primaryEmail && !lead.email) {
          writePayload.email = result.primaryEmail
        }
      } catch (e) {
        console.log(`     skiptrace FAIL: ${e.message}`)
      }
    }

    // Persist normalization fix even if no BatchData hit, so the lead's
    // address stops poisoning future enrichment runs.
    if (norm.normalized && norm.normalized !== rawAddr) {
      writePayload.property_address = norm.normalized
      console.log(`     normalized address: "${rawAddr}" -> "${norm.normalized}" (${norm.changes.join(",")})`)
    }

    if (Object.keys(writePayload).length === 0) {
      console.log(`     no fillable data found`)
      continue
    }

    if (APPLY) {
      writePayload.updated_at = new Date().toISOString()
      const { error: upErr } = await supabase
        .from("homeowner_requests")
        .update(writePayload)
        .eq("id", lead.id)
      if (upErr) {
        // Retry without email if dup constraint blocked it
        if (/unique constraint|duplicate key/i.test(upErr.message)) {
          const retry = { ...writePayload }
          delete retry.email
          const r2 = await supabase.from("homeowner_requests").update(retry).eq("id", lead.id)
          if (r2.error) {
            console.log(`     write FAIL: ${r2.error.message}`)
            failed++
            continue
          }
          console.log(`     ↳ retried without email (dup constraint), OK`)
        } else {
          console.log(`     write FAIL: ${upErr.message}`)
          failed++
          continue
        }
      }
      // Provenance writes — fire-and-forget. Use any() on table to
      // tolerate missing table in non-prod environments.
      for (const pv of provenanceWrites) {
        try {
          await supabase.from("lead_field_provenance").insert({
            lead_id: lead.id,
            field_name: pv.field,
            value: pv.value,
            source: pv.source,
            confidence: pv.confidence,
            metadata: pv.metadata,
          })
        } catch {}
      }
    }
    processed++

    // Be polite — small inter-lead delay (BatchData rate-limits aggressively)
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log("---")
  console.log(
    `SUMMARY: processed=${processed} value_added=${valueAdded} ` +
    `owner_added=${ownerAdded} phone_added=${phoneAdded} ` +
    `parcel_only=${parcelOnly} failed=${failed}`
  )
  console.log(`Estimated BatchData spend: $${estCost.toFixed(2)}`)
  if (!APPLY) console.log("(dry run — re-run with --apply to write)")
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
