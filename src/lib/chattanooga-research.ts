import "server-only"
import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const cityCsv = "https://www.arcgis.com/sharing/rest/content/items/19f35e4e09c041718905088a1fc7a6bb/data"
export const assessorSource = "https://www.hamiltontn.gov/_downloadsAssessor/AssessorExportCSV.zip"
const projection = "id,bot_source,county,property_address,pipeline_lead_key,staging_status,case_number:raw_payload->chattanooga_codes->>case_number,review:phone_metadata->chattanooga_case_review,parcelReview:raw_payload->chattanooga_parcel_review"

type Fields = Record<string, unknown>
const obj = (v: unknown): Fields => v && typeof v === "object" && !Array.isArray(v) ? v as Fields : {}
const str = (v: unknown) => typeof v === "string" ? v.trim() : ""
const words = (v: unknown) => str(v).toUpperCase().replace(/\s+/g, " ")
const strings = (v: unknown) => Array.isArray(v) ? v.map(str).filter(Boolean) : []
const date = (v: unknown) => /^\d{4}-\d{2}-\d{2}/.test(str(v)) ? str(v).slice(0,10) : ""

function validIdentity(row: Fields) {
  const street = str(row.property_address).split(",")[0].trim().toUpperCase()
  const key = createHash("sha1").update("chattanooga_codes|" + str(row.case_number) + "|" + street).digest("hex")
  return !!street && !!str(row.case_number) && row.pipeline_lead_key === key && row.bot_source === "chattanooga_codes" &&
    /^HAMILTON( COUNTY)?$/.test(words(row.county))
}

export function chattanoogaParcel(row: Fields) {
  const street = words(str(row.property_address).split(",")[0])
  const p = obj(row.parcelReview)
  const parcelBound = validIdentity(row) && p.case_number === row.case_number && words(p.property_address) === street &&
    p.source_url === assessorSource && !!str(p.county_file_stamp)
  const assessor = parcelBound && p.status === "exact_county_address" && str(p.parcel) ? {
    parcel: str(p.parcel), owner: str(p.recorded_owner), landUse: str(p.land_use), stamp: str(p.county_file_stamp),
    value: typeof p.county_appraisal === "number" && p.county_appraisal > 0 ? p.county_appraisal : null,
  } : null
  const parcelStatus = parcelBound ? str(p.status) : ""
  return { assessor, parcelStatus }
}

export function parcelHoldLabel(status: string) {
  if (status === "ambiguous_address") return "Multiple county parcels match this street address. Parcel, ownership and appraisal require review."
  if (status === "no_exact_address") return "County review found no exact street address match."
  return "County parcel review pending."
}

function reviewedCase(row: Fields) {
  const r = obj(row.review), address = str(row.property_address), street = words(address.split(",")[0])
  const checked = date(r.checked_on), modified = date(r.source_modified_on)
  const truncated = r.evidence_truncated === true
  const ids = strings(r.record_ids), descriptions = strings(r.active_descriptions), statuses = strings(r.official_statuses)
  if (!validIdentity(row) ||
      row.staging_status === "rejected" || r.status !== "active" || r.current_code_signal !== true ||
      !(Number(r.serious_active_count) > 0) || (!truncated && (!descriptions.length || !ids.length)) || !statuses.some(s => s === "INPR" || s === "O") ||
      !str(row.case_number) || r.case_number !== row.case_number || !street || words(str(r.property_address).split(",")[0]) !== street ||
      r.source_url !== cityCsv || !/^[a-f0-9]{64}$/i.test(str(r.source_sha256)) || !modified || !checked || modified > checked) return null
  const records = (Array.isArray(r.serious_active_records) ? r.serious_active_records : []).map(obj).map(rec => ({
    id: str(rec.record_id), status: str(rec.status), description: str(rec.description), detail: str(rec.description_extended),
    entered: date(rec.date_entered), cited: date(rec.date_cited), dangerous: rec.flag_dangerous === true || rec.flag_dangerous === "true",
  }))
  const seriousCount = Number(r.serious_active_count)
  if (!records.length || !Number.isInteger(seriousCount) || (truncated ? records.length > seriousCount : records.length !== seriousCount) || new Set(records.map(record => record.id)).size !== records.length ||
      records.some(record => !record.id || (!truncated && !ids.includes(record.id)) || !["INPR","O"].includes(record.status) || !record.description)) return null
  const { assessor, parcelStatus } = chattanoogaParcel(row)
  return { id: str(row.id), address, caseNumber: str(r.case_number), checked, modified, records, seriousCount, truncated, assessor, parcelStatus }
}

type Case = NonNullable<ReturnType<typeof reviewedCase>>
type Group = { key: string; assessor: Case["assessor"]; cases: Case[] }

export function chattanoogaGroups(rows: Fields[]) {
  const groups = new Map<string, Group>()
  for (const row of rows) {
    const c = reviewedCase(row)
    if (!c) continue
    const key = c.assessor ? 'hamilton_assessor|TN|Hamilton|' + c.assessor.parcel : 'case|' + c.caseNumber + '|' + c.address
    const group = groups.get(key)
    if (!group) groups.set(key, { key, assessor: c.assessor && { ...c.assessor }, cases: [c] })
    else {
      if (!group.cases.some(other => other.caseNumber === c.caseNumber && other.address === c.address)) group.cases.push(c)
      if (group.assessor && c.assessor) {
        if (group.assessor.landUse !== c.assessor.landUse) group.assessor.landUse = ""
        if (group.assessor.stamp !== c.assessor.stamp) group.assessor.stamp = ""
        if (group.assessor.owner !== c.assessor.owner) group.assessor.owner = ""
        if (group.assessor.value !== c.assessor.value) group.assessor.value = null
      }
    }
  }
  return [...groups.values()].sort((a,b) => a.cases[0].address.localeCompare(b.cases[0].address) || a.key.localeCompare(b.key))
}

export async function listChattanoogaResearch() {
  if (!supabaseAdmin) throw new Error("Database unavailable")
  const rows: Fields[] = []
  let lastId = ""
  for (;;) {
    let q = supabaseAdmin.from("homeowner_requests_staging").select("id").eq("bot_source", "chattanooga_codes").order("id").limit(80)
    if (lastId) q = q.gt("id", lastId)
    const { data, error } = await q
    if (error) throw new Error("Unable to load Chattanooga case IDs")
    const ids = (data ?? []).map(r => r.id)
    if (ids.length) {
      const batch = await supabaseAdmin.from("homeowner_requests_staging").select(projection).eq("bot_source", "chattanooga_codes").in("id", ids)
      if (batch.error) throw new Error("Unable to load Chattanooga case evidence")
      rows.push(...batch.data)
    }
    if (ids.length < 80) break
    lastId = ids[ids.length - 1]
  }
  return chattanoogaGroups(rows)
}
