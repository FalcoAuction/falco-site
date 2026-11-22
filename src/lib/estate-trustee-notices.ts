import { createHash } from "node:crypto"
import type { StagedLead } from "./crm-data"

const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}
const text = (v: unknown) => typeof v === "string" ? v.trim() : ""
const names = (v: unknown) => Array.isArray(v) ? v.map(text).filter(Boolean) : []
const isoDay = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(v)) ? text(v) : ""

export function postponedCalendar(lead: StagedLead) {
  const raw = lead.raw_payload ?? {}, calendar = obj(raw.memphis_trustee_calendar)
  const notice = obj(raw.structured), listing = obj(calendar.listing)
  const date = isoDay(listing.date), prior = isoDay(listing.prior_date), checked = isoDay(calendar.checked_on)
  if (lead.bot_source !== "memphis_daily_news" || lead.county?.toLowerCase() !== "shelby" ||
      calendar.status !== "postponed" || calendar.source_url !== "https://sales.thefoundationlegalgroup.com/" ||
      notice.substitute_trustee !== "Foundation Legal Group, LLP" || !/^F[DN]\d+$/.test(text(notice.tdn_no)) ||
      lead.pipeline_lead_key !== createHash("sha1").update("memphis_daily_news|" + text(notice.tdn_no)).digest("hex") ||
      calendar.notice_id !== notice.tdn_no || !lead.property_address || calendar.property_address !== lead.property_address ||
      !date || date !== lead.trustee_sale_date || !prior || prior >= date || !checked) return null
  return { date,prior,checked,time:text(listing.time),source:calendar.source_url,notice:text(notice.tdn_no) }
}

export function probateNotice(lead: StagedLead) {
  const raw = lead.raw_payload ?? {}
  if (raw.kind !== "probate_notice_to_creditors" || lead.distress_type !== "PROBATE") return null
  const court = obj(raw.court_notice), review = obj(raw.probate_review)
  const county = text(court.county), docket = text(court.docket)
  const legacyKey = createHash("sha1").update(["court_notice",raw.kind,county,docket].join("|")).digest("hex")
  const legacy = raw.probate_review == null && lead.pipeline_lead_key === legacyKey
  const bound = !!county && county === lead.county?.toLowerCase() && !!docket && (legacy || review.estate_key === county + "|" + docket)
  const reps = bound && Array.isArray(court.representatives) ? court.representatives.map(obj).filter(r =>
    text(r.name) && ["administrator","executor","personal_representative"].includes(text(r.role))) : []
  return { docket:bound ? docket : "", decedent:bound && !legacy ? text(court.decedent) : "",
    representatives:reps.map(r => text(r.name) + " (" + text(r.role).replaceAll("_"," ") + ")"),
    counsel:bound ? names(obj(court.attorney).names) : [], printed:bound ? names(review.decedent_names_printed) : [],
    date:text(raw.publication_date), bound, legacy, unverified:!bound || review.sale_authority_verified !== true }
}
