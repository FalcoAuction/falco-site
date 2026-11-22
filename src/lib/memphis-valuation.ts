import type { StagedLead } from "./crm-data"

const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}
const text = (v: unknown) => typeof v === "string" ? v.trim() : ""
const parcelKey = (v: unknown) => text(v).toUpperCase().replace(/[\s-]/g, "")
export const shelbyEstimateSource = "shelby_trustee_assessment_estimate"

export function memphisValuation(lead: StagedLead) {
  if (lead.bot_source !== "memphis_daily_news" || !/^shelby(?: county)?$/i.test(lead.county ?? "")) return null
  const raw = lead.raw_payload ?? {}, review = obj(lead.shelby_value_review)
  const borrower = text(obj(raw.structured).borrower)
  const parcel = text(review.parcel_id), source = text(review.source_url)
  const ratio = ({ R: 0.25, C: 0.4, I: 0.4 } as Record<string, number>)[text(review.tax_class)]
  const assessed = review.assessed_value, estimate = review.estimated_appraisal
  const noticeParcel = parcelKey(obj(raw.extracted).parcel)
  const fullNoticeParcel = /^[A-Z0-9]{6}[A-Z]?[0-9]{5}$/.test(noticeParcel)
  const url = URL.canParse(source) ? new URL(source) : null
  const bound = lead.property_value_source === shelbyEstimateSource && review.status === "verified_assessment"
    && review.valuation_method === "county_tax_assessment_divided_by_class_ratio"
    && review.county === "shelby" && !!lead.pipeline_lead_key && review.notice_key === lead.pipeline_lead_key
    && !!lead.property_address && review.notice_address === lead.property_address && !!parcel
    && (!fullNoticeParcel || noticeParcel === parcelKey(parcel))
    && url?.origin === "https://apps2.shelbycountytrustee.com" && url.pathname === "/Parcel" && url.searchParams.get("parcel") === parcel
    && Number.isInteger(review.tax_year) && !!text(review.bill_number?.toString())
    && !!ratio && review.assessment_ratio === ratio && typeof assessed === "number" && assessed > 0
    && typeof estimate === "number" && estimate === Number(lead.property_value) && Math.abs(estimate - assessed / ratio) <= 0.5
  const assessor = obj(raw.shelby_arcgis)
  const matchedParcel = bound ? parcelKey(parcel) : fullNoticeParcel ? noticeParcel : ""
  return { borrower, assessorOwner: matchedParcel && matchedParcel === parcelKey(assessor.parid) ? text(assessor.owner) : "",
    bill: bound ? { parcel, source, assessed, ratio, year: Number(review.tax_year), owner: text(review.owner) } : null }
}
