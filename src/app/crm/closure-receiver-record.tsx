import { Fragment } from "react"
import { createHash } from "node:crypto"

type Fields = Record<string, unknown>
const obj = (v: unknown): Fields => v && typeof v === "object" && !Array.isArray(v) ? v as Fields : {}
const value = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v).trim() : ""
const array = (v: unknown) => Array.isArray(v) ? v : []
const price = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? "$" + v.toLocaleString("en-US") : ""
const label = (v: unknown) => value(v).replaceAll("_", " ")
const key = (parts: unknown[]) => createHash("sha1").update(parts.join("|")).digest("hex")
type Pair = [string, string]
type Evidence = { title: string; heading: string; fields: Pair[]; sources: Pair[]; note: string }

export function churchRecord(row: Fields): Evidence | null {
  if (row.bot_source !== "church_closure") return null
  const raw = obj(row.raw_payload), church = obj(raw.church_closure)
  const record: Evidence = { title: value(row.property_address) || "Church closure", heading: "Church closure research",
    fields: [], sources: [], note: "Seller availability and auction authority require independent verification. A future opportunity requires a current, parcel-specific instruction from a verified authorized seller or representative, with any existing listing or contract resolved." }
  if (raw.source !== "twk_umc_closures" || !value(church.church) || !value(church.address) ||
      row.pipeline_lead_key !== key(["church_closure", church.church, church.address])) return record
  const obs = obj(raw.church_disposition_observation), lookup = obj(raw.church_parcel_lookup)
  const roll = obj(obs.roll), market = obj(obs.market), historic = obj(obs.county_record)
  record.title = value(church.church)
  record.fields.push(["Resolution address", value(church.address)], ["Property address in CRM", value(row.property_address)],
    ["Disposition at review", obs.disposition === "contract_showing" ? "Under contract, showing" : label(obs.disposition)], ["Disposition checked", value(obs.checked_on)],
    ["Parcel at disposition review", value(obs.parcel)], ["Owner on assessment roll", [roll.OWNER, roll.OWNER2].map(value).filter(Boolean).join(" ")],
    ["Historical county parcel", value(historic.ParcelID)], ["Historical county roll owner", value(historic.Owner1)],
    ["County record year", value(historic.RecordYear)], ["MLS", value(market.mls)], ["Listing asking price", price(market.asking_price)],
    ["Parcel lookup result", label(lookup.status)], ["Parcel lookup checked", value(lookup.checked_on)])
  if (lookup.status === "parcel_identified" && value(lookup.county).toLowerCase() === value(church.county).toLowerCase()) {
    record.fields.push(["Identified assessor parcel", value(lookup.parcel_id)], ["Owner on matched assessor parcel", value(lookup.assessment_owner)])
  }
  record.sources.push(["Conference resolution", value(obs.resolution_url || row.source_url)], ["Assessment roll", value(obs.roll_url)],
    ["Historical county record", value(obs.county_record_url)], ["Listing at review", value(market.source_url)],
    ["Reported transfer", value(obs.transfer_report)], ["Successor directory", value(obs.successor_directory)])
  array(lookup.sources).forEach((url,i) => record.sources.push(["Parcel lookup source " + (i+1), value(url)]))
  return record
}

export function receiverRecord(row: Fields): Evidence | null {
  const raw = obj(row.raw_payload), r = obj(raw.shelby_receiver_review), bill = obj(r.property_review)
  const cases = array(r.cases).map(obj)
  if (row.bot_source !== "shelby_tax_sale" || r.status !== "receiver_eligibility_research" ||
      !value(raw.parcel) || !value(raw.alt_parcel) || !value(raw.sale_id) ||
      raw.parcel !== r.parcel || raw.alt_parcel !== r.alt_parcel || raw.sale_id !== r.sale_id ||
      row.pipeline_lead_key !== key(["shelby_tax_sale",raw.sale_id,raw.alt_parcel]) ||
      bill.status !== "matched_county_bill" || bill.parcel !== raw.parcel || !cases.length ||
      cases.some(c => !value(c.warrant) || !value(c.address)) || !value(r.roster_date)) return null
  const fields: Pair[] = [["Roster date",value(r.roster_date)],["Review checked",value(r.checked_on)],["Trustee parcel",value(raw.parcel)],
    ["County tax sale",value(raw.sale_id)],["Advertised county tax-sale date",value(row.trustee_sale_date)],
    ["County tax year",value(bill.tax_year)],["County assessed value",price(bill.assessed_value)]]
  if (bill.owner_status === "trustee_primary_owner") fields.push(["Owner on county tax bill",value(bill.tax_roll_owner)])
  if (bill.value_status === "county_assessment_divided_by_class_ratio") fields.push(["Assessment-derived estimate",price(bill.estimated_appraisal)])
  const sources: Pair[] = [["Court eligibility roster",value(r.roster_url)],["Trustee parcel and bill",value(bill.source_url)],["County tax-sale schedule",value(raw.schedule_url)]]
  for (const c of cases) fields.push(["Court warrant",value(c.warrant)],["Court roster address",value(c.address)],["Listed court hearing",value(c.hearing_listed)])
  const history = array(r.sale_history).map(obj)
  if (!history.length) fields.push(["Historical sale-book result","No match in the searched books"])
  for (const h of history) {
    fields.push(["Historical sale-book result",label(h.outcome)],["Historical sale",value(h.sale)],["Printed unit",value(h.printed_unit)],["Historical buyer",value(h.historical_buyer)])
    sources.push(["County sale book, page " + value(h.page),value(h.source_url)])
  }
  return { title:value(row.property_address), heading:"Shelby receiver eligibility", fields,sources,
    note:"Roster eligibility documents a court case. Receiver appointment and authority for a private sale require a court order. The county tax sale has its own schedule." }
}

export function EvidenceCard({record}: {record: Evidence}) {
  return <section className="crm-card"><h2>{record.heading}</h2><dl className="crm-props">
    {record.fields.filter(([,v]) => v).map(([k,v],i) => <Fragment key={i}><dt>{k}</dt><dd style={{whiteSpace:"pre-wrap"}}>{v}</dd></Fragment>)}
  </dl><p>{record.note}</p><ul>{record.sources.filter(([,url]) => /^https:\/\//i.test(url)).map(([name,url],i) =>
    <li key={i}><a href={url}>{name}</a></li>)}</ul></section>
}
