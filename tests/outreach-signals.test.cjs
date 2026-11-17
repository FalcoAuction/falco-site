// node --test tests/outreach-signals.test.cjs   (synthetic estates only)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load() {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/outreach-signals.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require })
  return exports
}
const lib = load()

const lead = (over = {}) => ({
  county: 'davidson', property_address: '637 VINSON DR, NASHVILLE, 37217', property_value: '332500',
  property_value_source: 'metro_parcel',
  raw_payload: { court_notice: { decedent: 'ELIZABETH ANNA WISE', docket: '26P1969',
    attorney: { names: ['Gregory Hazelwood', 'One Belle Meade Place'], address: ['4400 Harding Pike, Suite 402', 'Nashville, TN 37205'] } } },
  ...over,
})

test('attorney lines: people kept, buildings and firms dropped', () => {
  assert.equal(JSON.stringify(lib.attorneyPeople(['Gregory Hazelwood', 'One Belle Meade Place', 'Smith Law, PLLC', '214 2nd Ave N'])), JSON.stringify(['Gregory Hazelwood']))
  assert.equal(JSON.stringify(lib.attorneyPeople(['William Warner McNeilly III'])), JSON.stringify(['William Warner McNeilly III']))
  assert.equal(lib.attorneyFirm(['Jane Roe', 'Roe Law, PLLC']), 'Roe Law, PLLC')
  assert.equal(lib.attorneyPeople(null).length, 0)
})

test('name keys ignore middles and suffixes', () => {
  assert.equal(lib.nameKey('William Warner McNeilly III'), 'william|mcneilly')
  assert.equal(lib.nameKey('Jordan B. Osborn'), 'jordan|osborn')
  assert.equal(lib.nameKey('Cher'), null)
})

test('contact index prefers a contact with an email', () => {
  const idx = lib.contactIndex([
    { id: 'a', person_name: 'Jordan Osborn', org_name: null, email: null },
    { id: 'b', person_name: 'Jordan B. Osborn', org_name: 'Firm', email: 'jordan@firm.test' },
  ])
  assert.equal(idx.get('jordan|osborn').id, 'b')
})

test('estate facts filter: focus county, value floor, notice with a person', () => {
  const e = lib.estateFacts(lead())
  assert.equal(e.people[0], 'Gregory Hazelwood')
  assert.equal(e.facts.docket, '26P1969')
  assert.equal(e.officeAddress, '4400 Harding Pike, Suite 402, Nashville, TN 37205')
  assert.equal(lib.estateFacts(lead({ county: 'shelby' })), null)
  assert.equal(lib.estateFacts(lead({ property_value: 90000 })), null)
  assert.equal(lib.estateFacts(lead({ property_address: null })), null)
  assert.equal(lib.estateFacts(lead({ raw_payload: {} })), null)
})

test('draft copy: specific, value source stated, no em dashes, no listing ask', () => {
  const e = lib.estateFacts(lead())
  const d = lib.estateDraft({ ...e.facts, attorney: 'Gregory Hazelwood' })
  assert.equal(d.subject, 'Estate of Elizabeth Anna Wise: 637 Vinson Dr')
  assert.match(d.body, /^Dear Gregory,/)
  assert.match(d.body, /Davidson County Probate 26P1969/)
  assert.match(d.body, /County records list 637 Vinson Dr, Nashville under Elizabeth Anna Wise's name/)
  assert.equal(lib.estateDraft({ ...e.facts, decedent: 'JOHN MCKAIN ROLFE', attorney: 'A B' }).subject.split(':')[0], 'Estate of John McKain Rolfe')
  assert.match(d.body, /appraised by the county at about \$332,500/)
  assert.ok(!d.body.includes('—'), 'no em dashes')
  assert.ok(!/list (it|the house|with)/i.test(d.body), 'does not ask to list')
  const est = lib.estateDraft({ ...e.facts, valueSource: 'xref_avm_enricher', attorney: 'Gregory Hazelwood' })
  assert.match(est.body, /estimated at about \$332,500/)
})
