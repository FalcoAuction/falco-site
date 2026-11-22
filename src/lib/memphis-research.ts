import "server-only"
import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

const endpoint = "https://311.memphistn.gov/server/rest/services/311/311_Request_Map_PROD/FeatureServer/0/query"
// The same public case fields requested by the city collector. Reporter contact fields are excluded.
const publicFields = [
  "OBJECTID", "INCIDENT_NUMBER", "INCIDENT_ID", "DEPARTMENT", "REQUEST_TYPE", "REQUEST_STATUS",
  "Request_Sub_Status", "Location_Address", "Unit_Address", "CITY", "STATE", "ZipCode", "PARCEL_ID",
  "REPORTED_DATE", "last_edited_date", "Closed_Date", "RESOLVED_DATE", "RESOLUTION_CODE", "RESOLUTION_SUMMARY",
].join(",")
const parcelId = (value: unknown) => typeof value === "string" ? value.trim() : ""
const types = new Set(["CE-Substandard,Derelict Struc", "CE-Dilapidated", "CE-Boarded Vacant", "CE-Demolition", "CE-Unsafe Structure", "CE-Unfit", "CE-Open Vacant", "CE-Substandard", "CE-Major Building Repair", "CE-Roof", "CE-Foundation"])
const active = new Set(["Open", "In Progress", "Pending Litigation"])
const labels = new Map(Object.entries({
  terminal_request: "Closed or resolved request", other_request_type: "Outside structural request scope",
  disposition_review: "Conflicting disposition", status_review: "City status requires review",
  ambiguous: "Ambiguous incident", not_returned: "Incident not returned", identity_conflict: "Incident identity conflict",
  address_review: "Address requires review",
}))
type Fields = Record<string, unknown>
const obj = (v: unknown): Fields => v && typeof v === "object" && !Array.isArray(v) ? v as Fields : {}
const clean = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v).trim().replace(/\s+/g, " ") : ""
const same = (a: unknown, b: unknown) => clean(a).toUpperCase() === clean(b).toUpperCase()
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

function caseUrl(url: unknown, incident: string) {
  try {
    const u = new URL(clean(url))
    if (u.origin + u.pathname === endpoint && !u.username && !u.password && !u.hash &&
      u.searchParams.getAll("where").length === 1 && u.searchParams.get("where") === "INCIDENT_NUMBER='" + incident + "'" &&
      u.searchParams.get("f") === "json") {
      return endpoint + "?" + new URLSearchParams({ where: "INCIDENT_NUMBER='" + incident + "'", outFields: publicFields, returnGeometry: "false", f: "json" })
    }
  } catch { /* A missing or malformed source leaves the request unverified. */ }
  return null
}

function sourceAddress(a: Fields) {
  let street = clean(a.Location_Address), city = clean(a.CITY), zip = clean(a.ZipCode)
  const state = clean(a.STATE)
  if (!/^\d+[a-z]?\s+\S/i.test(street) || (state && !/^(tn|tennessee)$/i.test(state))) return ""
  const embedded = street.match(/^(.+?),\s*([^,]+),\s*(?:TN|Tennessee),?\s+(\d{5})(?:,\s*USA)?$/i)
  if (embedded) {
    if ((city && !same(city, embedded[2])) || (zip && zip !== embedded[3])) return ""
    street = embedded[1]
    city = embedded[2]
    zip = embedded[3]
  } else if (street.includes(",") || !state) return ""
  if (!/^(memphis|cordova)$/i.test(city) || !/^\d{5}$/.test(zip)) return ""
  const unit = clean(a.Unit_Address)
  if (unit && unit !== street.split(" ")[0] && !same(unit, street)) {
    if (!/^(?:apt\.?|unit|ste\.?|suite|#)\s*[a-z0-9-]+$/i.test(unit)) return ""
    if (!street.toLowerCase().endsWith(unit.toLowerCase())) {
      if (/(?:\b(?:unit|apt|suite|ste)\.?\s+|#)\w/i.test(street)) return ""
      street += ", " + unit
    }
  }
  return street + ", " + city + ", TN " + zip
}

export function memphisEvidence(row: Fields, today = isoDay(new Date())) {
  const raw = obj(row.raw_payload), a = obj(raw.memphis_311), r = obj(raw.memphis_codes_review)
  const incident = clean(a.INCIDENT_NUMBER), checked = clean(r.checked_on), finding = clean(r.finding)
  const url = caseUrl(r.source_url, incident), address = sourceAddress(a)
  const bound = row.bot_source === "memphis_codes" && /^\d+$/.test(incident) &&
    (same(row.county, "Shelby County") || same(row.county, "Shelby"))
  const identity = bound && row.pipeline_lead_key === createHash("sha1").update("memphis_codes|" + incident).digest("hex") &&
    clean(r.incident_number) === incident && !!url
  const stamp = Date.parse(checked + "T00:00:00Z"), age = (Date.parse(today + "T00:00:00Z") - stamp) / 86400000
  const fresh = /^\d{4}-\d{2}-\d{2}$/.test(checked) && Number.isFinite(stamp) && isoDay(new Date(stamp)) === checked && age >= 0 && age <= 3
  const type = clean(r.request_type), status = clean(r.request_status)
  const eligible = identity && fresh && row.staging_status !== "rejected" && finding === "structural_request" &&
    !!address && same(row.property_address, address) && types.has(type) && active.has(status) &&
    ["department", "reported_at_ms", "closed_at_ms", "resolved_at_ms", "resolution_code", "parcel_as_reported"].every(k => Object.hasOwn(r, k)) &&
    (!clean(a.REPORTED_DATE) || clean(r.reported_at_ms) === clean(a.REPORTED_DATE)) &&
    ["", "Code Enforcement"].includes(clean(r.department)) && ![r.closed_at_ms, r.resolved_at_ms, r.resolution_code].some(clean) &&
    (!parcelId(a.PARCEL_ID) || !parcelId(r.parcel_as_reported) || parcelId(a.PARCEL_ID) === parcelId(r.parcel_as_reported))
  let disposition = "Awaiting a bound city review"
  if (identity) disposition = labels.get(finding) ?? (eligible ? "Active structural service request" :
    !fresh ? "City review outside the three-day window" : "Request held for review")
  return {
    eligible, disposition, incident, checked: identity ? checked : "", type: identity ? type : "", status: identity ? status : "",
    url: identity ? url : null, parcel: eligible ? parcelId(r.parcel_as_reported) : "", address: eligible ? address : clean(row.property_address)
  }
}

export async function listMemphisResearch(after?: string) {
  if (!supabaseAdmin) throw new Error("Database unavailable")
  const today = isoDay(new Date()), cutoff = isoDay(new Date(Date.parse(today) - 3 * 86400000))
  let cursor = after && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(after) ? after : ""
  const rows: { id: string; evidence: ReturnType<typeof memphisEvidence> }[] = []
  while (rows.length < 26) {
    let q = supabaseAdmin.from("homeowner_requests_staging")
      .select("id,bot_source,county,pipeline_lead_key,staging_status,property_address,attrs:raw_payload->memphis_311,review:raw_payload->memphis_codes_review")
      .eq("bot_source", "memphis_codes").eq("raw_payload->memphis_codes_review->>finding", "structural_request")
      .gte("raw_payload->memphis_codes_review->>checked_on", cutoff).lte("raw_payload->memphis_codes_review->>checked_on", today)
      .order("id").limit(40)
    if (cursor) q = q.gt("id", cursor)
    const { data, error } = await q
    if (error) throw new Error("Unable to load Memphis city reviews")
    for (const row of data) {
      const evidence = memphisEvidence({ ...row, raw_payload: { memphis_311: row.attrs, memphis_codes_review: row.review } }, today)
      if (evidence.eligible) rows.push({ id: row.id, evidence })
    }
    if (data.length < 40) break
    cursor = data[data.length - 1].id
  }
  return { rows: rows.slice(0, 25), next: rows.length > 25 ? rows[24].id : null }
}
