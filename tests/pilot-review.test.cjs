const { test } = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const ts = require("typescript")
const vm = require("node:vm")

const api = {}
vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/pilot-review.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api, Intl, Date, Map, Number, Math, Object, Array })

const src = { label: "County tax bill", url: "https://example.test/bill", date: "2026-11-22" }
function card(over = {}) {
  return { pilot_review: {
    version: "pilot-review-1", lane: "pre_foreclosure", route: "first_trace_review", route_reason: "Advertised sale, owner on the bill.",
    owner_group_key: "tn|shelby|P:REED V", property_key: "tn|shelby|p:07504200012",
    event: { what: "Trustee sale advertised", status: "postponed", checked_on: "2026-11-22", source: src },
    asset: { description: "Home", parcel: "075042 00012", address: "1 Woodland Brook Ln", tie: "Deed of trust on this parcel", source: src },
    decider: { name: "REED VIDA L", role: "owner of record", basis: "2026 county tax bill", verified: true, source: src },
    economics: { deadline: "2027-01-05", deadline_kind: "trustee sale", value: 210000, value_basis: "assessment / ratio", value_is_estimate: true,
      value_source: src, known_debt: [{ kind: "mortgage_original", amount: 150000, as_of: "2018-05-01", source: src, note: "" }], unknowns: ["payoff"] },
    availability: { evidence: "No transfer found", checked_on: "2026-11-22", conflicts: [], first_call_question: "Has the lender quoted a reinstatement?", verify_next: [] },
    reviewed_by: "lane_bot", reviewed_at: "2026-11-22T20:00:00+00:00", ...over } }
}
const wl = (id, over) => ({ id, county: "shelby", review: api.pilotReview(card(over)) })
const now = new Date("2026-11-22T18:00:00Z")

test("parses a complete card", () => {
  const r = api.pilotReview(card())
  assert.equal(r.route, "first_trace_review")
  assert.equal(r.economics.knownDebt[0].kind, "mortgage_original")
  assert.equal(r.event.source.url, "https://example.test/bill")
  assert.equal(api.runwayDays(r.economics.deadline, now), 44)
  assert.equal(api.fullDate(r.economics.deadline), "Jan 5, 2027")
})

test("rejects a missing, wrong-version or unknown-route card", () => {
  assert.equal(api.pilotReview({}), null)
  assert.equal(api.pilotReview(null), null)
  assert.equal(api.pilotReview(card({ version: "x" })), null)
  assert.equal(api.pilotReview(card({ route: "call_now" })), null)
  assert.equal(api.pilotReview(card({ lane: "boats" })), null)
})

test("never renders a non-http link", () => {
  const r = api.pilotReview(card({ event: { what: "x", status: "active", source: { label: "Bad", url: "javascript:alert(1)" } } }))
  assert.equal(r.event.source.url, null)
  assert.equal(r.event.source.label, "Bad")
})

test("same owner and property across lanes is one group and one asset", () => {
  const g = api.dedupeWorklist([wl("a"), wl("b", { lane: "tax" })], now)
  assert.equal(g.length, 1)
  assert.equal(g[0].assets.length, 1)
  assert.deepEqual(Array.from(g[0].lanes), ["pre_foreclosure", "tax"])
})

test("second property stays under the same owner; unknown owners never merge", () => {
  const g = api.dedupeWorklist([wl("a"), wl("b", { property_key: "tn|shelby|p:999999" })], now)
  assert.equal(g.length, 1)
  assert.equal(g[0].assets.length, 2)
  assert.equal(api.dedupeWorklist([wl("a", { owner_group_key: null }), wl("b", { owner_group_key: null })], now).length, 2)
})

test("soonest deadline first, undated last", () => {
  const far = card().pilot_review.economics
  const g = api.dedupeWorklist([
    wl("u", { owner_group_key: "k1", economics: { ...far, deadline: null } }),
    wl("late", { owner_group_key: "k2", economics: { ...far, deadline: "2027-04-13" } }),
    wl("soon", { owner_group_key: "k3", economics: { ...far, deadline: "2026-12-10" } }),
  ], now)
  assert.deepEqual(Array.from(g, (x) => x.assets[0].cards[0].id), ["soon", "late", "u"])
})
