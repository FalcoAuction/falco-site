const { test } = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const ts = require("typescript")
const vm = require("node:vm")

const api = {}
vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/land-evidence.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api, URL })

const parcel = "035 070I D 01700 000 2027"
const earlier = parcel.replace("2027", "2026")
const county = "hardeman"
const owner = "EXAMPLE ADA HEIRS & EXAMPLE B"
const row = { county, owner_name_records: owner, bot_source: "land_lane", distress_type: "HEIRS_PROPERTY" }
const source = "https://example.test/notice"
function snapshot() {
  const q = { county, parcel_namespace: "comptroller_roll", parcel_control: parcel.slice(0,-5), parcel_id: parcel, owner_of_record: owner,
    status: "corroborated_opportunity", reasons: [], sale_authority_verified: false, outreach_eligible: false,
    events: [{ county, staging_id: "notice", parcel_namespace: "comptroller_roll", parcel_id: earlier, printed_parcel: earlier.slice(0,-5),
      evidence_level: "notice_parcel", publication_date: "2026-10-29", status: "tax_suit_notice", source_url: source }] }
  return { origin: "comptroller_roll", lane: { lane: "land", land_qualification: q },
    roll: { county, owner, parcelid: parcel }, land: { county, parcel_id: parcel, owner_of_record: owner, status: "current", review_required: false, observed_on: "2025-01-01" } }
}
test("Comptroller controls preserve every field and separate provider and county", () => {
  for (const id of [parcel,"043 061    01800 000 2027","082 098    07600T000 2026"]) {
    const k = api.landParcelKey("comptroller_roll", county, id)
    assert.equal(JSON.parse(k)[2], id.slice(0,-5))
    assert.notEqual(k, api.landParcelKey("comptroller_roll", "bedford", id))
    assert.equal(JSON.parse(api.landParcelKey("county_gis", county, id))[2], id)
  }
  for (const id of [parcel.replace("000 2027","001 2027"), parcel.replace("I D","D I"), parcel.replace("00 000","00T000")])
    assert.notEqual(api.landParcelKey("comptroller_roll", county, id), api.landParcelKey("comptroller_roll", county, parcel))
  assert.equal(JSON.parse(api.landParcelKey("comptroller_roll", county, "A-2027"))[2], "A-2027")
})
test("Dated parcel notice and full recorded party match across roll versions without an ownership TTL", () => {
  const data = snapshot()
  assert.equal(api.landEvidence(row,data,"2027-07-01").corroborated,true)
  assert.equal(api.landEvidence({...row,owner_name_records:"EXAMPLE ADA"},data).corroborated,false)
  assert.equal(api.landEvidence(row,{...data,lane:"land"}).corroborated,false)
  assert.equal(api.landEvidence({bot_source:"probate",distress_type:"PROBATE"},{lane:{lane:"land"}}),null)
})
test("Assessor-only probate, expired sale, terminal outcomes and unsafe sources remain research", () => {
  for (const change of [{evidence_level:"assessor_link_only",printed_parcel:null},{status:"sold"},{status:"marked_paid"},
    {status:"withdrawn"},{sale_date:"2026-11-21"},{county:"robertson"},{parcel_namespace:"county_gis"},
    {source_url:"javascript:alert(1)"},{rejection_reason:"Superseded"},{owner:"OTHER PARTY"}]) {
    const data=snapshot()
    Object.assign(data.lane.land_qualification.events[0],change)
    const result=api.landEvidence(row,data,"2026-11-22")
    assert.equal(result.corroborated,false,JSON.stringify(change))
    assert.equal(result.events.length,1)
  }
})
