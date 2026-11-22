import type { PersonalPropertyTag } from "./crm-data"

type Fields = Record<string, unknown>
const obj = (v: unknown): Fields => v && typeof v === "object" && !Array.isArray(v) ? v as Fields : {}
const text = (v: unknown) => typeof v === "string" ? v.trim() : ""

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false
  const left = a as Fields, right = b as Fields
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(k => same(left[k], right[k]))
}

export function warnAsset(row: Fields, raw: Fields, today = new Date().toISOString().slice(0, 10)): PersonalPropertyTag | null {
  const w = obj(raw.warn), review = obj(raw.warn_review), tag = obj(raw.personal_property)
  if (row.bot_source !== "warn_notices" && (row.bot_source || row.distress_type !== "BUSINESS_CLOSURE"
      || !(raw.source === "tn_dol_warn" || Object.keys(w).length || Object.keys(review).length))) return null
  const terminal = [review.asset_disposition, w.asset_disposition].find(s => ["sold","unavailable","withdrawn"].includes(String(s)))
  const employer = text(w.company), evidence = obj(raw.personal_property_evidence)
  const assets = Array.isArray(evidence.assets) ? evidence.assets.map(obj) : []
  const planes = Array.isArray(raw.aircraft) ? raw.aircraft.map(obj) : []
  const aircraftCurrent = assets.filter(a => a.kind === "aircraft").every(a =>
    planes.some(p => p.n_number === a.asset_id && p.serial && p.serial === a.serial && p.registrant === a.registrant
      && p.identity_verified === true && p.registration_status === "V" && [p.verified_on,p.registry_date].every(d => {
        const age = (Date.parse(today) - Date.parse(text(d))) / 86400000
        return age >= 0 && age <= 7
      })))
  if (!terminal && row.staging_status !== "rejected" && tag.policy === "pp-warn-v1" && !tag.duplicate_of
      && tag.lane === "owner_asset" && tag.prospect === true && tag.warn_company === employer && employer
      && [row.full_name,row.owner_name_records].some(n => text(n).toLowerCase() === employer.toLowerCase())
      && String(tag.warn_notice ?? "") === String(w.notice ?? "")
      && String(tag.letter_sha256 ?? "") === String(review.letter_sha256 ?? "")
      && text(evidence.subject_name).toLowerCase() === employer.toLowerCase()
      && assets.length > 0 && same(assets, tag.asset_evidence) && same(tag.authority_review, evidence)
      && aircraftCurrent && /^\d{4}-\d{2}-\d{2}$/.test(text(tag.review_valid_through)) && text(tag.review_valid_through) >= today
      && (!tag.deadline || text(tag.deadline) > today)
      && ((tag.routable === true && tag.qualification === "reviewed") ||
          (tag.routable === false && tag.qualification === "qualified_prospect"))) return tag as PersonalPropertyTag
  return { lane: "warn_research", grade: null, categories: [], est_value_min: null, signals: [], caveats: [],
    qualification: terminal ? "hold" : "research", routable: false, prospect: false, route_to: null, deadline: null,
    not_routable_reason: terminal ? "Reported asset disposition: " + terminal : "Review employer and independent asset evidence." }
}

export function warnDocuments(raw: Fields) {
  const ev = obj(raw.personal_property_evidence), controller = obj(ev.controller)
  const documents = (Array.isArray(ev.assets) ? ev.assets.map(obj) : []).map(asset => ({
    label: "Asset record", detail: [text(asset.description), text(asset.asset_id)].filter(Boolean).join(" / "),
    source: text(asset.source_url), date: text(asset.verified_on) }))
  if (controller.name && controller.role) documents.push({ label: "Controller record",
    detail: [controller.name, controller.role, controller.authority].map(text).filter(Boolean).join(" / "),
    source: text(controller.source_url), date: text(controller.verified_on) })
  const w = obj(raw.warn), review = obj(raw.warn_review)
  for (const record of [w, review]) if (record.disposition_source) documents.push({
    label: "Disposition record", detail: text(record.asset_disposition), source: text(record.disposition_source), date: "" })
  return documents.filter((doc, i) => doc.detail && /^https?:\/\//.test(doc.source)
    && documents.findIndex(d => d.label === doc.label && d.detail === doc.detail && d.source === doc.source) === i)
}

export function employmentDate(raw: Fields) {
  const w = obj(raw.warn), window = obj(obj(raw.warn_review).employment_window)
  return text(window.index_text) || text(w.effective_raw) || text(w.effective) || "Unspecified"
}

export function warnWorksite(raw: Fields) {
  const w = obj(raw.warn), p = obj(w.worksite_parcel)
  if ((p.printed_worksite && p.printed_worksite !== w.worksite) || p.match_basis !== "exact_worksite_address" || p.county !== "davidson" || !text(p.parcel_id) ||
      !text(p.recorded_owner) || !text(p.property_address) || !text(p.source_url).startsWith("https://")) return null
  return { parcel: text(p.parcel_id), owner: text(p.recorded_owner), address: text(p.property_address),
    previous: w.worksite_parcel_status === "previous_observation", checkedOn: text(p.checked_on),
    landUse: text(p.land_use), appraisal: typeof p.county_appraisal === "number" ? p.county_appraisal : null, url: text(p.source_url) }
}
