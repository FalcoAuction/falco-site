// node --test tests/outreach-trustee.test.cjs   (synthetic cases only)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, deps = {}) {
  const exports = {}
  const req = (m) => deps[m] ?? require(m)
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: req })
  return exports
}
const signals = load('src/lib/outreach-signals.ts')
const lib = load('src/lib/outreach-trustee.ts', { './outreach-signals': signals })

const row = (over = {}, raw = {}) => ({
  owner_name_records: 'JOHN A DOE; JANE B DOE', full_name: 'John A Doe',
  property_address: '123 MAIN ST, NASHVILLE, 37211', property_value: '245000', property_value_source: 'comptroller_parcel',
  raw_payload: { chapter: '7', trustee: 'Weiner, Robin R', court_id: 'tnmb', case_number: '3:26-bk-01234',
    comptroller_parcel: { confidence: 'joint' }, ...raw },
  ...over,
})

test('trustee names flip to first-last and key like contacts', () => {
  assert.equal(lib.trusteeDisplayName('Weiner, Robin R'), 'Robin R Weiner')
  assert.equal(lib.trusteeDisplayName('MICHAEL GIGANDET'), 'Michael Gigandet')
  assert.equal(lib.trusteeDisplayName(''), null)
  assert.equal(lib.trusteeDisplayName('ROGERS, DAVID G.'), 'David G. Rogers')
  assert.equal(lib.trusteeKey('Weiner, Robin R'), signals.nameKey('Robin Weiner'))
})

test('facts require chapter 7, a trustee, an address and value over the floor', () => {
  assert.ok(lib.trusteeFacts(row()))
  assert.equal(lib.trusteeFacts(row({}, { chapter: '13' })), null)
  assert.equal(lib.trusteeFacts(row({}, { trustee: null })), null)
  assert.equal(lib.trusteeFacts(row({ property_address: null })), null)
  assert.equal(lib.trusteeFacts(row({ property_value: '90000' })), null)
  assert.equal(JSON.stringify(lib.trusteeFacts(row()).debtors), JSON.stringify(['John A Doe', 'Jane B Doe']))
})

test('draft says what records show, no equity claim, no em dash', () => {
  const d = lib.trusteeDraft(lib.trusteeFacts(row()))
  assert.match(d.subject, /^In re John A Doe, 3:26-bk-01234: 123 Main St/)
  assert.match(d.body, /^Dear Robin,/)
  assert.match(d.body, /Bankr\. M\.D\. Tenn\. 3:26-bk-01234/)
  assert.match(d.body, /under both debtors' names/)
  assert.match(d.body, /appraised by the county at about \$245,000/)
  assert.match(d.body, /not an equity finding/)
  assert.ok(!d.body.includes('—'))
  assert.ok(!/commission/i.test(d.body))
})

test('single-name match is worded as a match, not ownership', () => {
  const d = lib.trusteeDraft(lib.trusteeFacts(row({ owner_name_records: 'JOHN A DOE' }, { comptroller_parcel: { confidence: 'name' } })))
  assert.match(d.body, /a name matching the debtor/)
})

test('all-caps debtor with a Jr. suffix still gets title case', () => {
  const f = lib.trusteeFacts(row({ owner_name_records: 'ALBERT WAYNE FISHER, Jr.' }))
  assert.equal(f.debtors[0], 'Albert Wayne Fisher, Jr.')
})
