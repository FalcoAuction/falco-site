// The shared pilot review card. Lane bots write raw_payload.pilot_review
// (bots: src/bots/_pilot_review.py); this parses it defensively for the CRM
// and builds the statewide worklist with one row per owner group.

export type PilotSource = { label: string; url: string | null; date: string | null }
export type PilotDebt = { kind: string; amount: number | null; as_of: string | null; source: PilotSource | null; note: string }
export type PilotRoute = "first_trace_review" | "professional_relationship" | "research_hold" | "removed"
export type PilotLane = "pre_foreclosure" | "tax" | "cre" | "probate" | "land"

export type PilotReview = {
  lane: PilotLane; route: PilotRoute; routeReason: string; manual: boolean
  ownerGroupKey: string | null; propertyKey: string | null
  event: { what: string; status: string; checkedOn: string | null; source: PilotSource | null }
  asset: { description: string; parcel: string | null; address: string | null; tie: string; source: PilotSource | null }
  decider: { name: string | null; role: string; basis: string; verified: boolean; source: PilotSource | null }
  economics: { deadline: string | null; deadlineKind: string | null; value: number | null; valueBasis: string | null
    valueIsEstimate: boolean; valueSource: PilotSource | null; knownDebt: PilotDebt[]; unknowns: string[] }
  availability: { evidence: string; checkedOn: string | null; conflicts: string[]; firstCallQuestion: string; verifyNext: string[] }
  reviewedBy: string; reviewedAt: string | null
}

export const PILOT_LANE_LABEL: Record<PilotLane, string> = {
  pre_foreclosure: "Pre-foreclosure", tax: "Delinquent tax", cre: "Commercial", probate: "Probate", land: "Land",
}
export const PILOT_ROUTE_LABEL: Record<PilotRoute, string> = {
  first_trace_review: "Worth a first trace", professional_relationship: "Professional relationship",
  research_hold: "Research hold", removed: "Removed",
}
export const PILOT_DEBT_LABEL: Record<string, string> = {
  delinquent_tax: "Delinquent taxes", mortgage_original: "Original loan amount (not a payoff)",
  mortgage_estimate: "Estimated loan balance", judgment: "Judgment", lien: "Lien", other: "Other debt",
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const strOrNull = (v: unknown): string | null => str(v) || null
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])
const isoDay = (v: unknown): string | null => { const s = str(v).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null }
// Only http(s) links are rendered; anything else is shown as plain text.
const link = (v: unknown): string | null => { const s = str(v); return /^https?:\/\//i.test(s) ? s : null }
const src = (v: unknown): PilotSource | null => {
  const o = obj(v), label = str(o.label)
  return label ? { label, url: link(o.url), date: isoDay(o.date) } : null
}

const LANES = Object.keys(PILOT_LANE_LABEL), ROUTES = Object.keys(PILOT_ROUTE_LABEL)

/** Parse raw_payload.pilot_review. Returns null for a missing or malformed
 *  card so the CRM never shows half a recommendation. */
export function pilotReview(rawPayload: unknown): PilotReview | null {
  const r = obj(obj(rawPayload).pilot_review)
  const lane = str(r.lane), route = str(r.route)
  if (str(r.version) !== "pilot-review-1" || !LANES.includes(lane) || !ROUTES.includes(route)) return null
  const ev = obj(r.event), as = obj(r.asset), de = obj(r.decider), ec = obj(r.economics), av = obj(r.availability)
  return {
    lane: lane as PilotLane, route: route as PilotRoute, routeReason: str(r.route_reason), manual: r.manual === true,
    ownerGroupKey: strOrNull(r.owner_group_key), propertyKey: strOrNull(r.property_key),
    event: { what: str(ev.what), status: str(ev.status) || "unknown", checkedOn: isoDay(ev.checked_on), source: src(ev.source) },
    asset: { description: str(as.description), parcel: strOrNull(as.parcel), address: strOrNull(as.address), tie: str(as.tie), source: src(as.source) },
    decider: { name: strOrNull(de.name), role: str(de.role), basis: str(de.basis), verified: de.verified === true, source: src(de.source) },
    economics: {
      deadline: isoDay(ec.deadline), deadlineKind: strOrNull(ec.deadline_kind), value: num(ec.value), valueBasis: strOrNull(ec.value_basis),
      valueIsEstimate: ec.value_is_estimate === true, valueSource: src(ec.value_source),
      knownDebt: (Array.isArray(ec.known_debt) ? ec.known_debt : []).map(obj).map((d) => ({
        kind: str(d.kind) || "other", amount: num(d.amount), as_of: isoDay(d.as_of), source: src(d.source), note: str(d.note) })),
      unknowns: list(ec.unknowns),
    },
    availability: { evidence: str(av.evidence), checkedOn: isoDay(av.checked_on), conflicts: list(av.conflicts),
      firstCallQuestion: str(av.first_call_question), verifyNext: list(av.verify_next) },
    reviewedBy: str(r.reviewed_by), reviewedAt: strOrNull(r.reviewed_at),
  }
}

/** Days from today (Central date) to the deadline. Computed at render time:
 *  the stored runway goes stale the day after the bot ran. */
export function runwayDays(deadline: string | null, now: Date = new Date()): number | null {
  if (!deadline) return null
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(now)
  return Math.round((Date.parse(deadline + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000)
}

/** "Jan 5, 2027": deadlines cross the year end, so the year is always shown. */
export function fullDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z")
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export type WorklistCard = { id: string; county: string | null; review: PilotReview }
export type WorklistAsset = { propertyKey: string | null; cards: WorklistCard[] }
export type WorklistGroup = { ownerGroupKey: string | null; assets: WorklistAsset[]; lanes: PilotLane[]; soonest: number | null }

/** One row per owner group, every separately identified property kept under
 *  it, the same property across lanes merged. A card with no owner key
 *  stands alone: unknown owners are never merged. */
export function dedupeWorklist(cards: WorklistCard[], now: Date = new Date()): WorklistGroup[] {
  const groups = new Map<string, { g: WorklistGroup; assets: Map<string, WorklistAsset> }>()
  cards.forEach((card, n) => {
    const key = card.review.ownerGroupKey ?? `__solo_${n}`
    let slot = groups.get(key)
    if (!slot) { slot = { g: { ownerGroupKey: card.review.ownerGroupKey, assets: [], lanes: [], soonest: null }, assets: new Map() }; groups.set(key, slot) }
    const pkey = card.review.propertyKey ?? `__asset_${n}`
    let asset = slot.assets.get(pkey)
    if (!asset) { asset = { propertyKey: card.review.propertyKey, cards: [] }; slot.assets.set(pkey, asset); slot.g.assets.push(asset) }
    asset.cards.push(card)
    if (!slot.g.lanes.includes(card.review.lane)) slot.g.lanes.push(card.review.lane)
    const days = runwayDays(card.review.economics.deadline, now)
    if (days !== null && (slot.g.soonest === null || days < slot.g.soonest)) slot.g.soonest = days
  })
  // Dated deadlines first, soonest at the top; undated groups after.
  return [...groups.values()].map((s) => s.g).sort((a, b) =>
    a.soonest === null ? (b.soonest === null ? 0 : 1) : b.soonest === null ? -1 : a.soonest - b.soonest)
}
