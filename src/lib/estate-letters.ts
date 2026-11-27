// Executor letters and estate property reports, built from probate notices
// in homeowner_requests_staging that the bots matched to an assessor parcel.
//
// Pure data and copy only (no I/O, no imports) so it can be tested in
// isolation; estate-letter-pdf.ts renders it.
//
// A row qualifies only when:
//   - it carries a structured probate notice (court_notices bot),
//   - the decedent was matched to an assessor parcel with a positive value,
//   - someone can be addressed: a personal representative with a mailing
//     address, or failing that the estate's attorney (letter goes to the
//     representative in care of the attorney).
// One letter per estate: duplicate staging rows for the same county and
// docket collapse to the highest-value parcel.

export const ESTATE_LETTER_VERSION = "estate-letter-2026-11-05"

export const FALCO_CONTACT = {
  name: "Patrick Yuri Armour",
  company: "FALCO",
  phone: "601-213-8868",
  email: "falco@falco.llc",
  web: "falco.llc",
}

export type StagingRow = {
  id: string
  county: string | null
  property_address: string | null
  property_value: number | string | null
  property_value_source?: string | null
  staged_at?: string | null
  raw_payload: Record<string, unknown> | null
}

export type Recipient = {
  name: string
  role: string
  lines: string[]          // mailing block, name first
  careOfAttorney: boolean
}

export type EstateLetter = {
  stagingId: string
  county: string           // "Davidson"
  docket: string
  decedent: string
  dateOfDeath: string | null
  lettersType: string | null
  lettersDate: string | null
  publication: string | null
  representatives: { name: string; role: string }[]
  attorney: { names: string[]; address: string[] } | null
  recipient: Recipient
  property: {
    address: string
    parcel: string | null
    ownerOfRecord: string | null
    landUse: string | null
    appraisal: number
    matchConfidence: string | null
  }
  alreadyGenerated: boolean
}

type Json = Record<string, unknown>

const obj = (v: unknown): Json | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null)
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : []

/** "Janice Mann -" -> "Janice Mann"; collapses whitespace. */
export function cleanName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/\s+-\s*co\b.*$/i, "") // "Andrea Lewis -Co" (co-executor marker)
    .replace(/[\s,;:-]+$/, "")
    .trim()
}

export function titleCounty(county: string): string {
  const c = county.replace(/\s+county$/i, "").trim().toLowerCase()
  return c.replace(/\b[a-z]/g, (m) => m.toUpperCase())
}

const PUBLICATIONS: Record<string, string> = {
  nashville_ledger: "The Nashville Ledger",
  ledger: "The Nashville Ledger",
  memphis_daily_news: "The Memphis Daily News",
  tn_public_notice: "a Tennessee public notice",
}

export function publicationName(raw: Json): string | null {
  const p = str(raw.publication) || str(raw.newspaper)
  if (!p) return null
  return PUBLICATIONS[p.toLowerCase()] || p
}

const ROLE_LABEL: Record<string, string> = {
  personal_representative: "Personal Representative",
  executor: "Executor",
  executrix: "Executor",
  administrator: "Administrator",
  administratrix: "Administrator",
  co_executor: "Co-Executor",
}

export function roleLabel(role: string | null): string {
  return (role && ROLE_LABEL[role.toLowerCase()]) || "Personal Representative"
}

function money(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[$,]/g, "")) : NaN
  return Number.isFinite(n) && n > 0 && n < 1e9 ? Math.round(n) : null
}

/** Davidson's assessor writes "700 SPINNAKER CV, HERMITAGE, 37076"; add the state. */
export function withState(address: string): string {
  if (/\bTN\b|TENNESSEE/i.test(address)) return address
  return /,\s*\d{5}(-\d{4})?$/.test(address)
    ? address.replace(/,\s*(\d{5}(-\d{4})?)$/, ", TN $1")
    : `${address}, TN`
}

/** Returns null when the row cannot produce an accurate, addressable letter. */
export function estateFromStaging(row: StagingRow): EstateLetter | null {
  const raw = obj(row.raw_payload) || {}
  const notice = obj(raw.court_notice)
  if (!notice) return null
  const docket = str(notice.docket)
  const decedent = str(notice.decedent)
  if (!docket || !decedent) return null

  const padctn = obj(raw.padctn_owner_match)
  const ownerMatch = obj(raw.owner_match)
  const matched = !!padctn || str(ownerMatch?.status) === "matched"
  const appraisal = money(row.property_value)
  const address = str(row.property_address)
  if (!matched || !appraisal || !address) return null
  const primary = obj(ownerMatch?.primary)

  const reps = (Array.isArray(notice.representatives) ? notice.representatives : [])
    .map(obj)
    .filter((r): r is Json => !!r && !!str(r.name))
    .map((r) => ({ name: cleanName(str(r.name)!), role: roleLabel(str(r.role)), address: strList(r.address) }))
  const attorneyObj = obj(notice.attorney)
  const attorney = attorneyObj
    ? { names: strList(attorneyObj.names).map(cleanName), address: strList(attorneyObj.address) }
    : null

  let recipient: Recipient | null = null
  const withAddress = reps.find((r) => r.address.length >= 2)
  if (withAddress) {
    recipient = {
      name: withAddress.name,
      role: withAddress.role,
      lines: [withAddress.name, ...withAddress.address],
      careOfAttorney: false,
    }
  } else if (reps.length && attorney && attorney.address.length >= 2) {
    // "c/o Grayson Smith Cannon" then the firm on its own line.
    const [lead, ...rest] = attorney.names.length ? attorney.names : ["Attorney for the Estate"]
    recipient = {
      name: reps[0].name,
      role: reps[0].role,
      lines: [reps[0].name, `c/o ${lead}`, ...rest, ...attorney.address],
      careOfAttorney: true,
    }
  }
  if (!recipient) return null

  const county = titleCounty(str(notice.county) || row.county || "")
  if (!county) return null
  const letterLog = obj(raw.estate_letter)

  return {
    stagingId: row.id,
    county,
    docket,
    decedent: cleanName(decedent),
    dateOfDeath: str(notice.date_of_death),
    lettersType: str(notice.letters_type),
    lettersDate: str(notice.letters_date),
    publication: publicationName(raw),
    representatives: reps.map(({ name, role }) => ({ name, role })),
    attorney,
    recipient,
    property: {
      address: withState(address),
      parcel: str(padctn?.parcel) || str(primary?.parcel),
      ownerOfRecord: str(padctn?.owner) || strList(ownerMatch?.owner_keys).join(", ") || null,
      landUse: str(padctn?.land_use) || str(primary?.class),
      appraisal,
      matchConfidence: str(ownerMatch?.confidence),
    },
    alreadyGenerated: !!str(letterLog?.generated_at),
  }
}

/** One letter per county + docket; keep the highest-value parcel. */
export function dedupeEstates(estates: EstateLetter[]): EstateLetter[] {
  const best = new Map<string, EstateLetter>()
  for (const e of estates) {
    const key = `${e.county.toLowerCase()}|${e.docket.toUpperCase()}`
    const cur = best.get(key)
    if (!cur || e.property.appraisal > cur.property.appraisal) best.set(key, e)
  }
  return [...best.values()]
}

export function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US")
}

function lettersPhrase(e: EstateLetter): string {
  const kind = e.lettersType === "testamentary" ? "Letters Testamentary"
    : e.lettersType === "administration" ? "Letters of Administration"
    : "Letters of Authority"
  return e.lettersDate ? `${kind} issued ${e.lettersDate}` : kind
}

/** Letter body paragraphs. Plain sentences, no em dashes. */
export function letterParagraphs(e: EstateLetter): string[] {
  // The publication is not named: the Ledger's site carries other counties'
  // notices, so the paper of record is not always the site it came from.
  return [
    `Dear ${e.recipient.name},`,
    `I am sorry for your loss. I saw the published notice to creditors for the Estate of ` +
      `${e.decedent} (${e.county} County docket ${e.docket}), and I am writing because county ` +
      `records show the estate may own ${e.property.address}.`,
    `Enclosed is a short property report I put together from public records. It is free, ` +
      `and nothing I offer costs you or the estate anything.`,
    `Executors often have to sell a house while handling everything else, sometimes with ` +
      `several heirs who need to agree on a price. A public auction is one option: a set sale ` +
      `date, open bidding, and a documented result. If that is worth a look, I can introduce ` +
      `you to licensed Tennessee auction firms that sell estate property, so you can compare ` +
      `their written terms side by side. There is no cost to you for the introduction, and ` +
      `you are under no obligation.`,
    `Please talk with the estate's attorney before deciding anything. If now is not the ` +
      `right time, no reply is needed and I will not follow up. If this is not the estate's ` +
      `property, a quick note lets me correct my records.`,
    `You can reach me directly at ${FALCO_CONTACT.phone} or ${FALCO_CONTACT.email}.`,
  ]
}

/** Footer on every page. FALCO's role and compensation, stated plainly. */
export const DISCLOSURE =
  "FALCO LLC is a property research company. FALCO is not a real estate broker or an " +
  "auctioneer and does not represent you or the estate. Auction services are provided only " +
  "by independently licensed firms, under their own agreements with you. A firm may pay FALCO " +
  "a share of the buyer's premium, which is paid by the buyer. You never pay FALCO, and FALCO " +
  "takes no part of any commission you pay. This report is not an appraisal, title opinion " +
  "or legal advice. To stop mail from FALCO, call or email and it will stop."

export type ReportRow = [label: string, value: string]

export function reportSections(e: EstateLetter): { title: string; rows: ReportRow[] }[] {
  const reps = e.representatives.map((r) => `${r.name} (${r.role})`).join("; ") || "Not listed"
  const attorney = e.attorney
    ? [e.attorney.names.join(", "), e.attorney.address.join(", ")].filter(Boolean).join(". ")
    : "Not listed"
  const match = e.property.matchConfidence === "middle_initial"
    ? "Name and middle initial match the owner of record"
    : "Name matches the owner of record"
  return [
    {
      title: "Estate",
      rows: [
        ["Decedent", e.decedent],
        ["Date of death", e.dateOfDeath || "Not listed"],
        ["Court and docket", `${e.county} County, ${e.docket}`],
        ["Letters", lettersPhrase(e)],
        ["Personal representative", reps],
        ["Attorney of record", attorney],
      ],
    },
    {
      title: "Property on record",
      rows: [
        ["Address", e.property.address],
        ["Parcel", e.property.parcel || "Not listed"],
        ["Owner of record", e.property.ownerOfRecord || "Not listed"],
        ["Land use", e.property.landUse || "Not listed"],
        ["County appraisal", `${fmtMoney(e.property.appraisal)} (county assessor, for tax purposes)`],
        ["How it was matched", `${match}. Confirm ownership with the deed or title search.`],
      ],
    },
  ]
}

export const REPORT_NOTES: { title: string; body: string }[] = [
  {
    title: "What the appraisal is and is not",
    body: "The county appraisal is set for property tax. It is not a market value, a sale price " +
      "or a payoff figure, and it does not account for a mortgage, liens or the condition of the house.",
  },
  {
    title: "Before selling estate real property",
    body: "Ask the estate's attorney whether the will or the court's order allows you to sell real " +
      "property, whether the heirs must consent, and whether court approval is required. Order a " +
      "title search to confirm who owns the property and what is owed against it.",
  },
  {
    title: "If you consider an auction",
    body: "Auction firms differ in how they charge sellers and buyers, how long they market a " +
      "property and whether they sell with a reserve. Get each firm's terms in writing and compare " +
      "them with the estate's attorney before signing anything.",
  },
]
