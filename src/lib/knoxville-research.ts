import "server-only"
import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

const hearings = "https://www.knoxvilletn.gov/173/Better-Building-Board-Public-Officer-Hea"
const casePage = "https://knoxvilleworksearch.knoxvilletn.gov/recorddetails.html?RecordID="
type Row = {
  bot_source: string; pipeline_lead_key: string | null; county: string | null
  property_address: string | null; raw_payload: Record<string, unknown> | null; knoxville_review?: unknown
}
function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
const str = (v: unknown) => typeof v === "string" ? v.trim() : ""
function day(value: unknown) {
  const s = str(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ""
  const date = new Date(s + "T00:00:00Z")
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(s) ? s : ""
}

export function knoxvilleEvidence(row: Row, today = new Date().toISOString().slice(0,10)) {
  const raw = obj(row.raw_payload)
  const review = obj(row.knoxville_review ?? raw.knoxville_hearing_review)
  const number = str(raw.case_number), parcel = str(raw.parcel_id), address = str(row.property_address)
  if (row.bot_source !== "knoxville_poh" || raw.poh_section !== "case" || row.county?.toLowerCase() !== "knox county" ||
      !/^[A-Z][A-Z0-9-]*[0-9]$/.test(number) || !/^[0-9][A-Z0-9.-]+$/.test(parcel) ||
      row.pipeline_lead_key !== createHash("sha1").update(`knoxville_poh|poh-record-${number}-${parcel}`).digest("hex") ||
      review.case_number !== number || review.parcel_id !== parcel || !address || str(review.property_address).toLowerCase() !== address.toLowerCase()) return null
  const url = str(review.source_url), hearing = day(review.hearing_date), checked = day(review.checked_on)
  const kind = str(review.document_kind)
  const agenda = /^(poh|bbb)_agenda$/.test(kind) && review.status === "agenda_outcome_unverified"
  const result = /^(poh|bbb)_results$/.test(kind) && review.status === "published_result_review"
  if ((!agenda && !result) || review.meeting_cancelled !== false || !hearing || !checked || checked > today ||
      (result && hearing > checked) || !str(review.violations) ||
      !/^https:\/\/(www\.)?knoxvilletn\.gov\/DocumentCenter\/View\/\d+(?:\/[\w-]+)?$/.test(url) ||
      review.source_page_url !== hearings || !/^[a-f0-9]{64}$/.test(str(review.source_sha256))) return null
  const caseUrl = casePage + encodeURIComponent(number)
  const city = obj(obj(row.knoxville_review).city_record)
  const statusDate = day(city.status_date), checkedOn = day(city.checked_on)
  const complaint = city.case_number === number && city.parcel_id === parcel && city.source_url === caseUrl &&
    statusDate && checkedOn && statusDate <= checkedOn && checkedOn <= today && str(city.status)
    ? { status: str(city.status), statusDate, checkedOn } : null
  const roll = obj(raw.knox_assessor), year = roll.tax_year, value = roll.appraised_value
  const account = /^([0-9]{3}[A-Z]{2})([0-9]+)$/.exec(parcel)
  const checkedRoll = day(roll.checked_on)
  const countyUrl = account && typeof year === "number" && Number.isInteger(year)
    ? `https://propertytax.knoxcountytn.gov/property-tax/bill/${account[1]}-${account[2]}/${year}` : ""
  const assessor = countyUrl && roll.case_number === number && roll.parcel_id === parcel &&
    roll.property_address === address && checkedRoll && checkedRoll <= today && year === Number(checkedRoll.slice(0,4)) &&
    roll.source_url === countyUrl && typeof value === "number" && Number.isFinite(value) && value > 0 && str(roll.owner)
    ? { owner: str(roll.owner), value, year, url: countyUrl, checked: checkedRoll } : null
  return { number, parcel, address, hearing, checked, url, caseUrl, agenda, violations: str(review.violations), complaint, assessor }
}

export async function listKnoxvilleResearch(after?: string) {
  if (!supabaseAdmin) throw new Error("Database unavailable")
  let cursor = after && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(after) ? after : undefined
  const rows: {id: string; evidence: NonNullable<ReturnType<typeof knoxvilleEvidence>>}[] = []
  for (;;) {
    let query = supabaseAdmin.from("homeowner_requests_staging")
      .select("id,bot_source,pipeline_lead_key,county,property_address,section:raw_payload->>poh_section,number:raw_payload->>case_number,parcel:raw_payload->>parcel_id,original:raw_payload->knoxville_hearing_review,assessor:raw_payload->knox_assessor,knoxville_review:phone_metadata->knoxville_hearing_review")
      .eq("bot_source","knoxville_poh").order("id").limit(80)
    if (cursor) query = query.gt("id",cursor)
    const { data, error } = await query
    if (error) throw new Error("Unable to load Knoxville hearings")
    for (const row of data ?? []) {
      const evidence = knoxvilleEvidence({ ...row, raw_payload: { poh_section: row.section, case_number: row.number,
        parcel_id: row.parcel, knoxville_hearing_review: row.original, knox_assessor: row.assessor } })
      if (evidence) {
        if (rows.length === 25) return { rows, next: rows[24].id }
        rows.push({id:row.id,evidence})
      }
    }
    if (!data || data.length < 80) return {rows, next:null}
    cursor = data[data.length-1].id
  }
}
