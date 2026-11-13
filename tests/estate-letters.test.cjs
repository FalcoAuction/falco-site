// node --test tests/estate-letters.test.cjs   (synthetic names only)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load() {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/estate-letters.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports })
  return exports
}
const lib = load()

const notice = (over = {}) => ({
  docket: '26P0001', decedent: 'Norma Example', county: 'davidson', date_of_death: '1/2/2026',
  letters_type: 'testamentary', letters_date: 'October 1',
  representatives: [{ name: 'Pat Executor -', role: 'executor', address: ['1 Example Ct', 'Nashville, TN 37201'] }],
  attorney: { names: ['Ann Counsel', 'Counsel Law PLLC'], address: ['2 Law Sq', 'Nashville, TN 37201'] },
  ...over,
})
const row = (over = {}, raw = {}) => ({
  id: over.id || 'row-1', county: 'davidson', property_address: '1 EXAMPLE AVE, NASHVILLE, 37206',
  property_value: 300000, ...over,
  raw_payload: { court_notice: notice(), padctn_owner_match: { owner: 'EXAMPLE, NORMA', parcel: '001 00 0 001.00' }, ...raw },
})

test('a matched, valued notice with an executor address becomes a letter', () => {
  const e = lib.estateFromStaging(row())
  assert.deepEqual(Array.from(e.recipient.lines), ['Pat Executor', '1 Example Ct', 'Nashville, TN 37201'])
  assert.equal(e.recipient.role, 'Executor')
  assert.equal(e.recipient.careOfAttorney, false)
  assert.equal(e.property.address, '1 EXAMPLE AVE, NASHVILLE, TN 37206')
  assert.equal(e.county, 'Davidson')
})

test('no executor address: addressed to the executor in care of the attorney', () => {
  const e = lib.estateFromStaging(row({}, { court_notice: notice({ representatives: [{ name: 'Pat Executor', role: 'executor', address: [] }] }) }))
  assert.deepEqual(Array.from(e.recipient.lines),
    ['Pat Executor', 'c/o Ann Counsel', 'Counsel Law PLLC', '2 Law Sq', 'Nashville, TN 37201'])
  assert.equal(e.recipient.careOfAttorney, true)
})

test('unmatched, unvalued, unaddressable or unstructured rows never produce a letter', () => {
  assert.equal(lib.estateFromStaging(row({}, { padctn_owner_match: undefined })), null)
  assert.equal(lib.estateFromStaging(row({}, { padctn_owner_match: undefined, owner_match: { status: 'ambiguous' } })), null)
  assert.ok(lib.estateFromStaging(row({}, { padctn_owner_match: undefined, owner_match: { status: 'matched', primary: { parcel: 'M1' } } })))
  assert.equal(lib.estateFromStaging(row({ property_value: null })), null)
  assert.equal(lib.estateFromStaging(row({ property_address: '' })), null)
  assert.equal(lib.estateFromStaging(row({}, { court_notice: undefined, excerpt: 'NOTICE TO CREDITORS ...' })), null)
  assert.equal(lib.estateFromStaging(row({}, { court_notice: notice({ representatives: [], attorney: null }) })), null)
  assert.equal(lib.estateFromStaging(row({}, { court_notice: notice({ representatives: [{ name: 'Pat', address: [] }], attorney: { names: ['A'], address: [] } }) })), null)
})

test('one letter per docket, highest-value parcel; printed estates are flagged', () => {
  const a = lib.estateFromStaging(row({ id: 'a', property_value: 100000 }))
  const b = lib.estateFromStaging(row({ id: 'b', property_value: 250000 }))
  const c = lib.estateFromStaging(row({ id: 'c' }, { court_notice: notice({ docket: '26P0002' }), estate_letter: { generated_at: '2026-11-05T00:00:00Z' } }))
  const out = lib.dedupeEstates([a, b, c])
  assert.deepEqual(Array.from(out.map(e => e.stagingId)).sort(), ['b', 'c'])
  assert.equal(out.find(e => e.stagingId === 'c').alreadyGenerated, true)
})

test('names and addresses clean up', () => {
  assert.equal(lib.cleanName('Andrea Lewis -Co'), 'Andrea Lewis')
  assert.equal(lib.cleanName('Bob  Cox'), 'Bob Cox')
  assert.equal(lib.cleanName('Janice Mann -'), 'Janice Mann')
  assert.equal(lib.withState('107 BEECH ST, Montgomery County, TN'), '107 BEECH ST, Montgomery County, TN')
  assert.equal(lib.withState('2 OAK RD'), '2 OAK RD, TN')
})

test('copy: no em dashes, no cost stated early, compensation disclosed honestly', () => {
  const e = lib.estateFromStaging(row())
  const letter = lib.letterParagraphs(e).join('\n')
  const report = JSON.stringify(lib.reportSections(e)) + JSON.stringify(lib.REPORT_NOTES)
  for (const text of [letter, report, lib.DISCLOSURE]) assert.doesNotMatch(text, /—/)
  assert.match(lib.letterParagraphs(e)[2], /free/)
  assert.match(letter, /no cost to you/)
  assert.match(letter, /attorney/)
  assert.match(lib.DISCLOSURE, /not a real estate broker or an auctioneer/)
  assert.match(lib.DISCLOSURE, /buyer's premium/)
  assert.match(lib.DISCLOSURE, /no part of any commission you pay/)
  assert.match(lib.DISCLOSURE, /stop mail/)
  assert.doesNotMatch(letter, /guarantee|market value of|we will sell/i)
})
