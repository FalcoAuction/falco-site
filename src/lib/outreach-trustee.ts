// Trustee signal: a Chapter 7 case where the debtor appears on record as the
// owner of real property. The recipient is the case's panel trustee, who
// decides whether the estate administers the property and, if it sells,
// employs the auctioneer with court approval (11 U.S.C. 327).
//
// Copy rules: say only what the records show. The match is by name, so the
// draft says "a name that matches the debtor" and makes no equity claim.
// No em dashes, no claim FALCO is paid on the real estate.

import { nameKey, tidyAddress } from "./outreach-signals"

export const TRUSTEE_MIN_VALUE = 100_000
export const TRUSTEE_WINDOW_DAYS = 150

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

/** '7009 Lenox Village Dr, Unit 208, Nashville' -> 'Lenox Village Dr'. */
function streetName(address: string): string {
  return tidyAddress(address).split(",")[0].replace(/^\d+[A-Z]?\s+/i, "").replace(/\bMacarthur\b/, "MacArthur").trim()
}

// Written the way one professional writes another (same voice as the
// estate draft): short, the case by name, FALCO as the company that routes
// each asset to the right licensed firm and stays the one contact, the
// court employment step named, one easy ask. No value read back, no
// "free comparison" pitch, no cost claim (employment and pay go through
// the court under 327 and 330).
export function trusteeDraft(f: TrusteeFacts): { subject: string; body: string } {
  const who = f.debtors.join(" and ")
  const joint = f.confidence === "joint" && f.debtors.length > 1
  const first = f.trustee.split(" ")[0]
  const subject = `In re ${who}${f.caseNumber ? `, ${f.caseNumber}` : ""}`
  const body = [
    `${first},`,
    "",
    `Saw the ${who} case${f.caseNumber ? ` (${f.caseNumber})` : ""} is yours. County records show a property on ${streetName(f.address)} ${joint ? "in both debtors' names" : "in a name that matches the debtor"}. If the estate ends up selling it, or anything else in the case, we'd like to help.`,
    "",
    "I run FALCO here in Nashville. We don't run auctions ourselves. We send each asset to the licensed Tennessee firm that's best at selling that kind of thing, that firm applies for employment under 327 the usual way, and we run point on all of it, so you've got one company to call for the whole case instead of a handful of auction houses.",
    "",
    "Worth a quick call?",
    "",
    "Patrick Armour",
    "FALCO · https://falco.llc",
    "Licensed TN Auctioneer #7622",
    "601-213-8868",
  ].join("\n")
  return { subject, body }
}
