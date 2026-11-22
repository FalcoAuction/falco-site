import { createHash } from "node:crypto"
import type { StagedLead } from "@/lib/crm-data"

function fields(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}
}

function packetUrl(v: unknown) {
  return typeof v === "string" && /^https:\/\/johnsoncitytn\.civicweb\.net\/document\/[0-9]+\//i.test(v) ? v : null
}

export function JohnsonHearingRecord({ lead }: { lead: StagedLead }) {
  const event = fields(lead.raw_payload?.johnson_city_bdsr)
  const number = String(event.case_number ?? "")
  const source = packetUrl(event.source_url)
  if (!/^CEPM\d{6,}$/.test(number) || !source ||
      lead.pipeline_lead_key !== createHash("sha1").update("johnson_city_bdsr|" + number).digest("hex") ||
      lead.property_address?.toLowerCase() !== (event.address + ", Johnson City, TN").toLowerCase()) {
    return <p>Historical board record. Case and address need verification.</p>
  }
  const minutes = fields(event.minutes_evidence)
  const removal = event.stage === "docket_removal_reported" && packetUrl(minutes.source_url)
  const property = fields(lead.raw_payload?.johnson_property_review)
  const parcel = typeof property.parcel_id === "string" ? property.parcel_id : ""
  const parcelQuery = "https://gis.johnsoncitytn.org/arcgis/rest/services/ParcelPublishing/TaxParcels/MapServer/0/query?"
  const value = property.appraised_value
  const owner = property.owner
  const parcelUrl = typeof property.source_url === "string" && property.source_url.startsWith(parcelQuery)
    && new URLSearchParams(property.source_url.slice(parcelQuery.length)).get("where") === "GISLINK='" + parcel + "'"
    ? property.source_url : null
  const matched = parcelUrl && parcel && property.case_number === number && property.property_address === lead.property_address
    && typeof owner === "string" && owner.trim() && typeof value === "number" && Number.isFinite(value) && value > 0
  return <section className="crm-card">
    <h2>Board of Dwelling Standards and Review</h2>
    <dl className="crm-props">
      <dt>Case</dt><dd>{number}</dd>
      <dt>Hearing listed</dt><dd><a href={source}>{String(event.meeting_on ?? "Board packet")}</a></dd>
      {removal && <><dt>Board action</dt><dd><a href={removal}>Docket removal recorded {String(minutes.meeting_on ?? "")}</a></dd></>}
      {matched && <>
        <dt>Parcel</dt><dd>{parcel}</dd>
        <dt>Assessment-roll owner</dt><dd>{owner}</dd>
        <dt>County appraisal</dt><dd>${value.toLocaleString("en-US")}</dd>
        <dt>Property evidence</dt><dd><a href={parcelUrl}>Official parcel record</a> · checked {String(property.checked_on)}</dd>
      </>}
    </dl>
    <p>Sale authority unverified.</p>
  </section>
}
