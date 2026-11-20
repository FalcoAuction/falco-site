// Signal-based outreach: turn one lead event into one email draft for the
// person who can act on it. Pure functions (no database) so they can be
// tested; the cron route at /api/cron/outreach-signals wires them up.
//
// First signal: a new probate notice in a focus county with real property
// worth the work. The recipient is the estate's attorney named on the notice.
// Copy rules: written like one professional to another, short, the estate by
// name, FALCO as the router and single contact, no em dashes, no claim FALCO is paid on the real estate, no ask to list
// with FALCO (that would be listing solicitation; FALCO_LICENSED gates it).

// All 41 Middle Tennessee counties (matches lead_quality_reasons()).
export const FOCUS_COUNTIES = [
  "bedford", "cannon", "cheatham", "clay", "coffee", "davidson", "dekalb", "dickson", "fentress",
  "franklin", "giles", "grundy", "hickman", "houston", "humphreys", "jackson", "lawrence", "lewis",
  "lincoln", "macon", "marshall", "maury", "montgomery", "moore", "overton", "perry", "pickett",
  "putnam", "robertson", "rutherford", "sequatchie", "smith", "stewart", "sumner", "trousdale",
  "van buren", "warren", "wayne", "white", "williamson", "wilson",
]
export const MIN_ESTATE_VALUE = 150_000
export const SIGNAL_WINDOW_DAYS = 45

const SUFFIX = /^(JR|SR|II|III|IV|V|ESQ|ESQUIRE)\.?$/i
// Lines in a notice's attorney block that are a building or firm, not a person.
const NOT_PERSON = /\d|\b(PLACE|SUITE|STE|BUILDING|BLDG|TOWER|CENTER|CENTRE|SQUARE|PLAZA|STREET|AVENUE|AVE|PIKE|ROAD|HWY|HIGHWAY|DRIVE|BLVD|FLOOR|LLC|PLLC|PLC|LLP|PC|PA|FIRM|LAW|OFFICE|OFFICES|ASSOCIATES|GROUP|ATTORNEYS?|COUNSEL|BOX)\b/i

/** Lines from a notice's attorney block that name a person. */
export function attorneyPeople(names: unknown): string[] {
  if (!Array.isArray(names)) return []
  return names
    .map((n) => String(n ?? "").replace(/\s+/g, " ").trim())
    .filter((n) => n && !NOT_PERSON.test(n) && n.split(" ").filter((t) => t.replace(/\./g, "").length > 0).length >= 2)
}

/** The firm line, when the notice's attorney block has one. */
export function attorneyFirm(names: unknown): string | null {
  if (!Array.isArray(names)) return null
  const firm = names.map((n) => String(n ?? "").trim())
    .find((n) => /\b(LLC|PLLC|PLC|LLP|PC|PA|FIRM|LAW|ASSOCIATES|GROUP|OFFICES?)\b/i.test(n) && !/\d/.test(n))
  return firm || null
}

function tokens(name: string): string[] {
  return name.replace(/[.,]/g, " ").split(/\s+/).map((t) => t.trim()).filter(Boolean).filter((t) => !SUFFIX.test(t))
}

/** 'William Warner McNeilly III' -> 'william|mcneilly'. Null without first and last. */
export function nameKey(name: string | null | undefined): string | null {
  const t = tokens(String(name ?? ""))
  if (t.length < 2) return null
  return `${t[0].toLowerCase()}|${t[t.length - 1].toLowerCase()}`
}

export function firstName(name: string): string {
  return tokens(name)[0] ?? name
}

export type AttorneyContact = { id: string; person_name: string | null; org_name: string | null; email: string | null }

/** One contact per name key; contacts with an email win over those without. */
export function contactIndex(contacts: AttorneyContact[]): Map<string, AttorneyContact> {
  const out = new Map<string, AttorneyContact>()
  for (const c of contacts) {
    const k = nameKey(c.person_name)
    if (!k) continue
    const cur = out.get(k)
    if (!cur || (!cur.email && c.email)) out.set(k, c)
  }
  return out
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US")
const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
  .replace(/\bMc([a-z])/g, (_, c: string) => "Mc" + c.toUpperCase())
/** Names from notices arrive in any case; only all-caps names are re-cased. */
const personName = (s: string) => (s === s.toUpperCase() ? title(s) : s)

/** '276 WHITE BRIDGE PIKE, Unit # 5, NASHVILLE, 37209' -> '276 White Bridge Pike, Unit # 5, Nashville' */
export function tidyAddress(addr: string): string {
  const parts = addr.split(",").map((p) => p.trim()).filter((p) => p && !/^\d{5}(-\d{4})?$/.test(p) && !/^TN$/i.test(p))
  return parts.map((p) => (p === p.toUpperCase() ? title(p) : p)).join(", ")
}

export type EstateFacts = {
  decedent: string
  county: string
  docket: string | null
  address: string
  value: number
  valueSource: string | null
  attorney: string
}

/** Assessor and county values are stated as such; anything else is an estimate. */
export function valuePhrase(value: number, source: string | null): string {
  const s = (source ?? "").toLowerCase()
  const county = /assessor|padctn|metro|comptroller|county|parcel|fl_dor|roll/.test(s)
  return county ? `appraised by the county at about ${money(value)}` : `estimated at about ${money(value)}`
}

export function estateDraft(f: EstateFacts): { subject: string; body: string } {
  // Written the way one professional writes another: short, plain, the
  // estate by name, FALCO as the company that routes each asset to the
  // right licensed firm and stays the one contact, and one easy ask.
  const decedent = personName(f.decedent)
  const last = tokens(decedent).at(-1) ?? decedent
  const subject = `${last} estate`
  const body = [
    `${firstName(personName(f.attorney))},`,
    "",
    `Saw you're handling the ${decedent} estate. If the house or anything in it ends up needing to be sold, we'd like to help.`,
    "",
    "I run FALCO here in Nashville. We don't run auctions ourselves. We go through what the estate has, send each piece to the licensed Tennessee firm that's best at selling that kind of thing, and run point on all of it, so you've got one company to call instead of a handful of auction houses. Costs the estate nothing; the buyer's premium covers it.",
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

/** Facts for an estate lead, or null when it should not produce a draft. */
export function estateFacts(row: {
  county: string | null
  property_address: string | null
  property_value: number | string | null
  property_value_source: string | null
  raw_payload: Record<string, unknown> | null
}): { facts: Omit<EstateFacts, "attorney">; people: string[]; firm: string | null; officeAddress: string | null } | null {
  const notice = (row.raw_payload?.court_notice ?? null) as Record<string, unknown> | null
  const county = (row.county ?? "").toLowerCase().replace(/\s+county$/, "")
  const value = Number(row.property_value ?? 0)
  if (!notice || !FOCUS_COUNTIES.includes(county) || !row.property_address || !(value >= MIN_ESTATE_VALUE)) return null
  const att = (notice.attorney ?? null) as { names?: unknown; address?: unknown } | null
  const people = attorneyPeople(att?.names)
  const decedent = String(notice.decedent ?? "").trim()
  if (!people.length || !decedent) return null
  const office = Array.isArray(att?.address) ? (att!.address as unknown[]).map(String).join(", ") : null
  return {
    facts: { decedent, county, docket: (notice.docket as string) || null, address: row.property_address, value, valueSource: row.property_value_source },
    people, firm: attorneyFirm(att?.names), officeAddress: office,
  }
}
