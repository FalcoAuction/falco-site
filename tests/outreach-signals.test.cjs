// node --test tests/outreach-signals.test.cjs   (synthetic estates only)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(path = 'src/lib/outreach-signals.ts', imports = require) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: imports })
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
  assert.equal(lib.estateFacts(lead({ county: 'fulton' })), null)
  assert.equal(lib.estateFacts(lead({ property_value: 90000 })), null)
  assert.equal(lib.estateFacts(lead({ property_address: null })), null)
  assert.equal(lib.estateFacts(lead({ raw_payload: {} })), null)
})

test('draft copy: short, the estate by name, FALCO routes, no em dashes, no listing ask', () => {
  const e = lib.estateFacts(lead())
  const d = lib.estateDraft({ ...e.facts, attorney: 'GREGORY HAZELWOOD' })
  assert.equal(d.subject, 'Wise estate')
  assert.match(d.body, /^Gregory,/)
  assert.match(d.body, /Saw you're handling the Elizabeth Anna Wise estate\./)
  assert.match(d.body, /I run FALCO here in Nashville\./)
  assert.match(d.body, /one company to call instead of a handful of auction houses/)
  assert.equal(lib.estateDraft({ ...e.facts, decedent: 'JOHN MCKAIN ROLFE JR', attorney: 'A B' }).subject, 'Rolfe estate')
  assert.ok(!d.body.includes('â€”'), 'no em dashes')
  assert.ok(!/list (it|the house|with)/i.test(d.body), 'does not ask to list')
  assert.ok(d.body.split(/\s+/).length < 120, 'stays short')
})

test('seller authority hold preserves attorney draft with complete appointment evidence', () => {
  const row = lead()
  Object.assign(row.raw_payload.court_notice, { county: 'davidson', representatives: [{ name: 'Jane Roe', role: 'executor' }] })
  const review = row.raw_payload.probate_review = { stage: 'appointment_reported', estate_key: 'davidson|26P1969',
    contact_hold: true, sale_authority_verified: false, attorney_draft_status: 'requires_verification' }
  assert.ok(lib.estateFacts(row))
  for (const stage of ['sale_advertised', 'sale_interrupted', 'estate_inactive_reported', 'unrecognized']) {
    assert.equal(lib.estateFacts({ ...row, raw_payload: { ...row.raw_payload, probate_review: { ...review, stage } } }), null)
  }
  for (const evidence of [{ court_sale_review: { stage: 'sale_already_arranged' } },
    { probate_match_attempt: { result: 'ambiguous' } }, { probate_review: { ...review, attorney_draft_status: 'hold' } }]) {
    assert.equal(lib.estateFacts({ ...row, raw_payload: { ...row.raw_payload, ...evidence } }), null)
  }
})

test('stale trustee notice and legacy inference suppress active queue; manual disposition wins', () => {
  const notice = load('src/lib/trustee-notice.ts')
  const inventory = load('src/lib/dialer-inventory.ts', key => key.endsWith('trustee-notice') ? notice : {})
  const stale = { trustee_notice_review: { reason: 'stale_notice' } }
  assert.equal(notice.trusteeNoticeHold(stale), 'stale_notice')
  assert.equal(notice.trusteeNoticeHold({ sale_status: { status: 'cancelled', updated_by: 'trustee_status_reaper' } }), 'stale_notice')
  assert.equal(notice.trusteeNoticeHold({}), null)
  assert.equal(notice.trusteeNoticeHold({ ...stale, sale_status: { status: 'postponed' } }), null)
  for (const status of ['ran', 'reinstated', 'cancelled']) {
    assert.equal(notice.trusteeNoticeHold({ ...stale, sale_status: { status } }), status)
  }
  const active = { ownerPhonePrimary: '6155550100', distressType: 'TRUSTEE_NOTICE' }
  assert.equal(inventory.isLeadActive(active), true)
  assert.equal(inventory.isLeadActive({ ...active, saleStatus: 'stale_notice' }), false)
})

test('a companion arranged sale blocks an existing attorney draft at verification', async () => {
  const row = { ...lead(), staging_status: 'pending' }
  const draft = { signal: 'probate_notice', staging_id: 'test-id', recipient_key: 'gregory|hazelwood', facts: lib.estateFacts(row).facts }
  let companion = []
  const db = { from() {
    return { select() { return this }, eq() { return this }, in() { return this }, order() { return this },
      maybeSingle: async () => ({ data: row }), range: async () => ({ data: companion }) }
  } }
  const verify = load('src/lib/estate-draft-review.ts', key =>
    key.endsWith('/supabase-admin') ? { supabaseAdmin: db } : lib)
  assert.equal(await verify.estateDraftBlock(draft), null)
  companion = [{ docket: '26P1969', court: { stage: 'sale_already_arranged' } }]
  assert.ok(await verify.estateDraftBlock(draft))
  companion = []
  assert.ok(await verify.estateDraftBlock({ ...draft, recipient_key: 'different|attorney' }))
  assert.equal(await verify.estateDraftBlock({ signal: 'trustee_case' }), null)
})

test('asset views split held prospects and retain separate assets at the same address', async () => {
  const rows = [
    { id: '1', pp: { routable: true } }, { id: '2', pp: { routable: true } },
    { id: '3', pp: { routable: false, prospect: true, dedupe_key: 'plane-A' } },
    { id: '4', pp: { routable: false, prospect: true, dedupe_key: 'plane-A' } },
    { id: '5', pp: { routable: false, prospect: false } },
  ].map(row => ({ ...row, property_address: '100 TEST ST', county: 'davidson' }))
  const db = { from(table) {
    let result = table === 'homeowner_requests_staging' ? [...rows] : []
    return { select(cols) {
      if (cols.startsWith('id,routable:')) result = result.map(r => ({
        id: r.id, routable: String(r.pp.routable), prospect: String(r.pp.prospect), key: r.pp.dedupe_key,
      }))
      return this
    }, not() { return this }, order() { return this }, limit() { return this },
      or(expr) { assert.ok(!expr.includes('routable'), 'routing filter before ID lookup'); return this },
      eq(field) { assert.ok(!field.includes('personal_property'), 'qualification before ID lookup'); return this },
      in(field, ids) { result = result.filter(r => ids.includes(r[field])); return this },
      range() { return this }, then(done) { return Promise.resolve({ data: result }).then(done) } }
  } }
  const crm = load('src/lib/crm-data.ts', key => key === 'react' ? { cache: f => f } :
    key.endsWith('supabase-admin') ? { supabaseAdmin: db } : {})
  for (const [args, ids] of [[{}, ['1', '2']], [{ research: true }, ['3', '5']],
    [{ research: true, prospects: true }, ['3']]]) {
    const res = await crm.listBucket('assets', args)
    assert.deepEqual(Array.from(res.rows, r => r.staging_id), ids)
  }
})
