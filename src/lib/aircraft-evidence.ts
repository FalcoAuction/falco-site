import type { AircraftTag, PersonalPropertyTag } from "./crm-data"
import { isDeepStrictEqual } from "node:util"

type Fields = Record<string, unknown>
const obj = (x: unknown): Fields => x && typeof x === "object" && !Array.isArray(x) ? x as Fields : {}
const list = (x: unknown): Fields[] => Array.isArray(x) ? x.map(obj) : []
const str = (x: unknown) => typeof x === "string" ? x.trim() : ""

export function aircraftAsset(row: { full_name?: string | null; owner_name_records?: string | null; distress_type?: string | null },
  planes: unknown, personal: unknown, evidence: unknown, today = new Date().toISOString().slice(0, 10)) {
  const tag = obj(personal)
  const cats = Array.isArray(tag.categories) ? tag.categories : []
  const registry = list(planes)
  const aircraftLane = cats.includes("aircraft") || tag.lane === "owner_asset"
  const pp = personal as PersonalPropertyTag | null
  if (!registry.length && !aircraftLane) return { pp, confirmed: [] as AircraftTag[] }
  // A vessel, estate or other independently classified asset keeps its own controls.
  if (personal && !aircraftLane) return { pp, confirmed: [] as AircraftTag[] }

  const ev = obj(evidence), assets = list(ev.assets), controller = obj(ev.controller)
  const fresh = (d: unknown) => {
    const age = (Date.parse(today) - Date.parse(str(d))) / 86400000
    return /^\d{4}-\d{2}-\d{2}$/.test(str(d)) && age >= 0 && age <= 7
  }
  const sourced = (f: Fields) => /^https?:\/\//i.test(str(f.source_url)) && fresh(f.verified_on)
  const fact = (key: string, allowed: string[]) => sourced(obj(ev[key])) && allowed.includes(str(obj(ev[key]).status))
  const deadline = obj(ev.deadline), subject = str(ev.subject_name).toLowerCase()
  const reviewed = tag.policy === "pp-v3" && tag.routable === true && tag.qualification === "reviewed" && !tag.duplicate_of
    && !!subject && [row.owner_name_records, row.full_name].some(n => str(n).toLowerCase() === subject)
    && isDeepStrictEqual(ev, tag.authority_review) && isDeepStrictEqual(ev.assets, tag.asset_evidence)
    && assets.length > 0 && assets.every(a => str(a.kind) && str(a.asset_id) && str(a.description) && sourced(a))
    && sourced(controller) && controller.authority === "verified" && str(controller.name) && str(controller.role)
    && fact("availability", ["available"]) && fact("liens", ["reviewed", "not_applicable"])
    && (!["BANKRUPTCY", "PROBATE", "VESSEL_ARREST"].includes(row.distress_type ?? "") || fact("court", ["permitted", "not_applicable"]))
    && sourced(deadline) && (str(deadline.date) ? /^\d{4}-\d{2}-\d{2}$/.test(str(deadline.date)) && str(deadline.date) > today : deadline.status === "none_documented")
  const confirmed = reviewed ? registry.filter(p => p.identity_verified === true && p.registration_status === "V"
    && /^\d{8}$/.test(str(p.registration_expires)) && str(p.registration_expires) > today.replaceAll("-", "")
    && fresh(p.registry_date) && fresh(p.verified_on) && str(p.serial) && str(p.registrant)
    && assets.some(a => a.kind === "aircraft" && a.asset_id === p.n_number && a.serial === p.serial && a.registrant === p.registrant)) : []
  const kinds = [...new Set(assets.filter(a => a.kind !== "aircraft").map(a => str(a.kind)))]
  if (confirmed.length || (reviewed && kinds.length)) {
    const valuation = obj(ev.valuation)
    const value = sourced(valuation) && typeof valuation.amount === "number" && valuation.amount > 0 ? valuation.amount : null
    return { confirmed: confirmed as AircraftTag[], pp: { ...pp!, categories: [...kinds, ...(confirmed.length ? ["aircraft"] : [])],
      est_value_min: value, value_basis: value ? str(valuation.source_url) : undefined, signals: [], registry_assets: [] } }
  }
  const held: PersonalPropertyTag = { lane: pp?.lane ?? "owner_asset", grade: null, categories: cats.filter(c => c !== "aircraft"),
    signals: (pp?.signals ?? []).filter(s => !/aircraft|FAA|plane/i.test(s)), caveats: [], est_value_min: null,
    dedupe_key: pp?.dedupe_key, qualification: "research", routable: false, prospect: false, not_routable_reason: "Aircraft sale authority unverified." }
  return { pp: held, confirmed: [] as AircraftTag[] }
}
