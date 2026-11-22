type Fields = Record<string, unknown>
function object(value: unknown): Fields {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Fields : {}
}
const text = (v: unknown) => typeof v === "string" ? v.trim() : ""
const strings = (v: unknown) => Array.isArray(v) ? v.map(text).filter(Boolean) : []
const key = (v: unknown) => text(v).toUpperCase().replace(/\s+/g, " ")
const same = (a: unknown, b: unknown) => !!key(a) && key(a) === key(b)

function source(value: unknown) {
  try {
    const url = new URL(text(value))
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""
  } catch { return "" }
}

function day(value: unknown) {
  const d = text(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return ""
  const ms = Date.parse(d + "T00:00:00Z")
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === d ? d : ""
}

// The final year is a version only in the Comptroller's fixed-width PARCELID.
const rollId = /^([0-9]{3} [0-9]{3}[ A-Z] [ A-Z] [0-9]{5}[ A-Z][0-9]{3}) (20[0-9]{2})$/
export function landParcelKey(origin: unknown, county: unknown, id: unknown) {
  if ((origin !== "comptroller_roll" && origin !== "county_gis") || typeof id !== "string" || !id.trim()) return null
  const name = text(county).toLowerCase()
  if (!name) return null
  const scopedCounty = name === "vanburen" ? "van buren" : name === "de kalb" ? "dekalb" : name
  return JSON.stringify([origin, scopedCounty, origin === "comptroller_roll" ? rollId.exec(id)?.[1] ?? id : id])
}

const centralDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" })

export function landEvidence(row: Fields, data: Fields, asOf?: string) {
  const land = object(data.land), roll = object(data.roll), lane = object(data.lane), q = object(lane.land_qualification)
  if (row.bot_source !== "land_lane" && !["HEIRS_PROPERTY", "ABSENTEE_LAND"].includes(text(row.distress_type))
      && !Object.keys(land).length && data.lane !== "land" && !Object.keys(q).length) return null
  const today = asOf ?? centralDate.format(new Date())
  const owner = text(land.owner_of_record) || text(roll.owner) || text(row.owner_name_records)
  const parcel = typeof land.parcel_id === "string" ? land.parcel_id : typeof roll.parcelid === "string" ? roll.parcelid : ""
  const county = text(land.county) || text(row.county)
  const identity = landParcelKey(data.origin, county, parcel)
  const reasons = new Set(strings(q.reasons))
  if (!identity || q.parcel_control !== JSON.parse(identity)[2] || row.county == null || !same(county, row.county) || !same(roll.county, county)
      || roll.parcelid !== parcel || q.parcel_id !== parcel || !same(q.county, county) || q.parcel_namespace !== data.origin
      || !same(roll.owner, owner) || !same(row.owner_name_records, owner) || !same(q.owner_of_record, owner))
    reasons.add("Parcel or recorded ownership requires review")
  if (land.status !== "current" || land.review_required !== false) reasons.add("Acquisition requires review")
  if (row.staging_status === "rejected") reasons.add("Rejected staging record")
  if (q.status === "corroborated_opportunity" && (q.sale_authority_verified !== false || q.outreach_eligible !== false))
    reasons.add("Qualification flags require review")
  let direct = false
  const events = (Array.isArray(q.events) ? q.events : []).map(value => {
    const e = object(value)
    const inScope = !!identity && landParcelKey(e.parcel_namespace, e.county, e.parcel_id) === identity
    const assessorOnly = e.evidence_level === "assessor_link_only"
    const named = e.evidence_level === "notice_parcel" && !!text(e.printed_parcel)
    const published = day(e.publication_date), sale = day(e.sale_date), url = source(e.source_url), status = text(e.status)
    if (!inScope) reasons.add("Event parcel scope differs")
    if (named && inScope) {
      direct = true
      if (e.owner && !same(e.owner, owner)) reasons.add("Event ownership differs")
      if (!["tax_suit_notice","published_delinquency","scheduled_tax_sale"].includes(status)) reasons.add(status || "Unknown disposition")
      if (e.rejection_reason || !url || !text(e.staging_id) || (!published && !sale) || published > today ||
          (e.sale_date && (!sale || sale < today))) reasons.add("Source held, undated or sale date passed")
    }
    return { label: assessorOnly ? "Assessor link only" : named ? "Parcel named in notice" : "Unclassified evidence",
      parcel: text(e.printed_parcel) || text(e.parcel_id), party: text(e.owner), status, method: text(e.match_method),
      caseId: text(e.case_id), published, sale, source: url, reviewSource: source(e.review_source_url), rejection: text(e.rejection_reason) }
  })
  if (!direct) reasons.add("No parcel-naming notice")
  if (q.status !== "corroborated_opportunity" && !reasons.size) reasons.add("Producer review required")
  return { corroborated: q.status === "corroborated_opportunity" && !reasons.size, owner, parcel, reasons: [...reasons],
    acquisitionStatus: text(land.status), signals: strings(land.ownership_signals ?? land.signals), source: source(land.source_url),
    observed: day(land.observed_on), sourceDate: day(land.source_refreshed_on), events,
    rollYear: data.origin === "comptroller_roll" ? rollId.exec(parcel)?.[2] ?? "" : "" }
}
export type LandEvidence = NonNullable<ReturnType<typeof landEvidence>>
