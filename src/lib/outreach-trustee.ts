// Trustee signal: a Chapter 7 case where the debtor appears on record as the
// owner of real property. The recipient is the case's panel trustee, who
// decides whether the estate administers the property and, if it sells,
// employs the auctioneer with court approval (11 U.S.C. 327).
//
// Copy rules: say only what the records show. The match is by name, and we do
// not see the mortgage, so the draft calls it a lead, not an equity finding.
// No em dashes, no claim FALCO is paid on the real estate.

import { nameKey, tidyAddress, valuePhrase } from "./outreach-signals"

export const TRUSTEE_MIN_VALUE = 100_000
export const TRUSTEE_WINDOW_DAYS = 150

const COURT: Record<string, string> = {
  tnmb: "Bankr. M.D. Tenn.",
  tneb: "Bankr. E.D. Tenn.",
  tnwb: "Bankr. W.D. Tenn.",
}

const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
// All-caps names (a "Jr." suffix does not count as mixed case) get title case.
const recase = (s: string) => (/[a-z]/.test(s.replace(/\b(jr|sr)\b\.?/gi, "")) ? s : title(s))

/** 'Weiner, Robin R' -> 'Robin R Weiner'; names without a comma pass through. */
export function trusteeDisplayName(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim()
  if (!s) return null
  const m = s.match(/^([^,]+),\s*(.+)$/)
  return recase(m ? `${m[2]} ${m[1]}` : s)
}

export function trusteeKey(raw: string | null | undefined): string | null {
  return nameKey(trusteeDisplayName(raw))
}

export type TrusteeFacts = {
  debtors: string[]
  court: string
  caseNumber: string | null
  address: string
  value: number
  valueSource: string | null
  confidence: string | null
  trustee: string
}

export function trusteeFacts(row: {
  owner_name_records: string | null
  full_name: string | null
  property_address: string | null
  property_value: number | string | null
  property_value_source: string | null
  raw_payload: Record<string, unknown> | null
}): TrusteeFacts | null {
  const raw = row.raw_payload ?? {}
  if (String(raw.chapter ?? "").trim() !== "7") return null
  const trustee = trusteeDisplayName(raw.trustee as string | undefined)
  const value = Number(row.property_value ?? 0)
  if (!trustee || !row.property_address || !(value >= TRUSTEE_MIN_VALUE)) return null
  const debtors = String(row.owner_name_records || row.full_name || "").split(";").map((d) => recase(d.trim())).filter(Boolean)
  if (!debtors.length) return null
  const parcel = (raw.comptroller_parcel ?? null) as { confidence?: string } | null
  return {
    debtors, court: String(raw.court_id ?? ""),
    caseNumber: (raw.case_number as string) || (raw.docket_number as string) || null,
    address: row.property_address, value, valueSource: row.property_value_source,
    confidence: parcel?.confidence ?? null, trustee,
  }
}

export function trusteeDraft(f: TrusteeFacts): { subject: string; body: string } {
  const where = tidyAddress(f.address)
  const street = where.split(",")[0]
  const lead = f.debtors[0]
  const caseLabel = [COURT[f.court] ?? null, f.caseNumber].filter(Boolean).join(" ")
  const first = f.trustee.split(" ")[0]
  const joint = f.confidence === "joint" && f.debtors.length > 1
  const subject = `In re ${lead}${f.caseNumber ? `, ${f.caseNumber}` : ""}: ${street}`
  const body = [
    `Dear ${first},`,
    "",
    `In ${f.debtors.join(" and ")}'s Chapter 7 case${caseLabel ? ` (${caseLabel})` : ""}, where you are the trustee, county records list ${where} under ${joint ? "both debtors' names" : "a name matching the debtor"}, ${valuePhrase(f.value, f.valueSource)}.`,
    "",
    "I don't see the mortgage balance from here, so treat this as a lead, not an equity finding. If the estate administers the property, I can send a one-page comparison of a marketed auction against a listing, built from local sale results, and connect you with a licensed Tennessee auction firm that can apply for employment under 11 U.S.C. 327. The comparison is free.",
    "",
    "Patrick Armour",
    "FALCO, Nashville",
    "601-213-8868",
  ].join("\n")
  return { subject, body }
}
