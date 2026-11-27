const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(path, imports) {
  const exports = {}
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { fileName: path, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInNewContext(output, { exports, require: key => imports[key] ?? require(key), URL, URLSearchParams, console })
  return exports
}

test('researchHeld releases only a ranked row from the four city code sources', () => {
  const { researchHeld, researchOnlySources, rankedCodeCaseSources, alwaysResearchSources } =
    load('src/lib/chattanooga-research.ts', { 'server-only': {}, '@/lib/supabase-admin': {} })
  const ranked = new Set(['a'])
  assert.deepEqual([...rankedCodeCaseSources].sort(), ['johnson_city_bdsr', 'knoxville_poh', 'memphis_codes', 'mtn_cities_codes'])
  assert.deepEqual([...alwaysResearchSources].sort(), ['church_closure', 'hud_reo'])
  assert.equal(researchOnlySources.length, 6)
  for (const source of rankedCodeCaseSources) {
    assert.equal(researchHeld(source, 'a', ranked), false)
    assert.equal(researchHeld(source, 'b', ranked), true)
    assert.equal(researchHeld(source, null, ranked), true)
  }
  for (const source of alwaysResearchSources) assert.equal(researchHeld(source, 'a', ranked), true)
  for (const source of ['nashville_codes', 'chattanooga_codes', 'mackie_wolf_trustee', null, undefined]) {
    assert.equal(researchHeld(source, 'b', ranked), false)
  }
})

test('ranked serious code cases are active in lists, counters, workflow and the lead page; unranked rows stay research', async () => {
  const today = new Date().toISOString().slice(0, 10)
  // Rows come from another vm realm, so compare by value.
  const same = (actual, expected) => assert.equal(JSON.stringify([...actual].sort()), JSON.stringify([...expected].sort()))
  const id = n => '00000000-0000-4002-8000-' + String(n).padStart(12, '0')
  const base = { county: 'shelby', phone: '9015550100', trustee_sale_date: today, mackie_notice_hold: null, raw_payload: {} }
  const packet = 'https://johnsoncitytn.civicweb.net/document/1234/agenda.pdf'
  const rows = {
    foreclosure: { ...base, id: id(1), bot_source: 'mackie_wolf_trustee', pipeline_lead_key: 'fc', property_address: 'Foreclosure Address' },
    memphisRanked: { ...base, id: id(2), bot_source: 'memphis_codes', pipeline_lead_key: 'memphis-ranked', property_address: 'Ranked Memphis Address',
      raw_payload: { memphis_311: { INCIDENT_NUMBER: '123' } } },
    memphisUnranked: { ...base, id: id(3), bot_source: 'memphis_codes', pipeline_lead_key: 'memphis-unranked', property_address: 'Unranked Memphis Address',
      raw_payload: { memphis_311: { INCIDENT_NUMBER: '456' } } },
    knox: { ...base, id: id(4), county: 'knox', bot_source: 'knoxville_poh', pipeline_lead_key: 'knox-ranked', property_address: 'Ranked Knoxville Address',
      raw_payload: { poh_section: 'boarding' } },
    johnson: { ...base, id: id(5), county: 'washington', bot_source: 'johnson_city_bdsr',
      pipeline_lead_key: createHash('sha1').update('johnson_city_bdsr|CEPM202400123').digest('hex'),
      property_address: '132 Spring St, Johnson City, TN', owner_name_records: null,
      raw_payload: { johnson_city_bdsr: { address: '132 Spring St', case_number: 'CEPM202400123', meeting_on: '2026-02-26', source_url: packet } } },
    mtJuliet: { ...base, id: id(6), county: 'Wilson County', bot_source: 'mtn_cities_codes', pipeline_lead_key: 'mj-ranked', property_address: 'Ranked Mt Juliet Address' },
    hud: { ...base, id: id(7), bot_source: 'hud_reo', pipeline_lead_key: 'hud', property_address: 'HUD Address' },
    church: { ...base, id: id(8), bot_source: 'church_closure', pipeline_lead_key: 'church', property_address: 'Church Address' },
  }
  const staged = Object.values(rows)
  const rankedRows = [rows.foreclosure, rows.memphisRanked, rows.knox, rows.johnson, rows.mtJuliet, rows.hud, rows.church]
  const opportunity = (s, i) => ({ ...s, staging_id: s.id, captured_on: today, sale_date: today, rank: i + 1, owner_name: 'Roll Owner',
    property_value: 200000, expected_fee: 3600, fit_label: s.bot_source === 'mackie_wolf_trustee' ? 'Foreclosure' : 'Code violation' })
  const tables = {
    homeowner_requests_staging: staged, lead_opportunities: rankedRows.map(opportunity),
    crm_visible_opportunities: rankedRows.map(opportunity),
    dialer_lead_workflow: staged.map(s => ({ listing_slug: s.pipeline_lead_key, status: 'attempting_contact', next_action: 'call', next_action_at: today })),
    dialer_activities: staged.map((s, i) => ({ id: 'act' + i, listing_slug: s.pipeline_lead_key, occurred_at: today, channel: 'note', outcome: 'note_only' })),
  }
  const list = v => v.slice(1, -1).split(',').map(x => x.replace(/"/g, ''))
  const db = { from(name) {
    let data = tables[name] ?? []
    const query = { select() { return this },
      eq(k, v) { data = data.filter(r => r[k] === v); return this }, in(k, v) { data = data.filter(r => v.includes(r[k])); return this },
      not(k, op, v) { if (op === 'in' && (k === 'bot_source' || k === 'county')) data = data.filter(r => !list(v).includes(r[k])); return this },
      ilike(k, v) { data = data.filter(r => String(r[k] ?? '').toLowerCase().startsWith(v.replace(/%$/, '').toLowerCase())); return this },
      gte(k, v) { if (k === 'sale_date') data = data.filter(r => r[k] && r[k] >= v); return this },
      lte(k, v) { if (k === 'sale_date') data = data.filter(r => r[k] && r[k] <= v); return this },
      or() { return this }, order() { return this }, limit(n) { data = data.slice(0, n); return this }, range(lo, hi) { data = data.slice(lo, hi + 1); return this },
      maybeSingle() { return { data: data[0] ?? null } }, then(done) { return Promise.resolve({ data, count: data.length, error: null }).then(done) } }
    return query
  } }
  const imports = { 'server-only': {}, react: { ...React, cache: f => f }, '@/lib/supabase-admin': { supabaseAdmin: db },
    '@/lib/crm-land': {}, '@/lib/land-evidence': { landEvidence: () => null },
    '@/lib/dialer-data': { getWorkflow: () => ({ status: 'attempting_contact', nextAction: 'none', nextActionAt: null }), listActivities: () => [] } }
  for (const name of ['dialer-types', 'trustee-notice', 'chattanooga-research', 'memphis-research', 'knoxville-research', 'mt-juliet-research', 'nashville-codes', 'warn-evidence', 'aircraft-evidence', 'memphis-valuation', 'estate-trustee-notices', 'pilot-review', 'crm-data']) {
    imports['@/lib/' + name] = load('src/lib/' + name + '.ts', imports)
  }
  const crm = imports['@/lib/crm-data']
  const research = imports['@/lib/chattanooga-research']
  const active = ['Ranked Memphis Address', 'Ranked Knoxville Address', '132 Spring St, Johnson City, TN', 'Ranked Mt Juliet Address']
  const hidden = ['Unranked Memphis Address', 'HUD Address', 'Church Address']
  const addresses = result => result.rows.map(r => r.property_address)

  // Ranked list and its counters agree.
  const all = await crm.listLeads('all')
  for (const address of [...active, 'Foreclosure Address']) assert.ok(addresses(all).includes(address), address + ' missing from the ranked list')
  for (const address of hidden) assert.ok(!addresses(all).includes(address), address + ' leaked into the ranked list')
  const counts = await crm.viewCounts(today)
  assert.equal(counts.all, all.rows.length)
  const code = await crm.listLeads('code')
  same(addresses(code).sort(), [...active].sort())
  assert.equal(counts.code, code.rows.length)

  // A hearing or case date is never a sale date: no sale pill, no sale-date views.
  for (const row of all.rows) assert.equal(row.sale_date, row.bot_source === 'mackie_wolf_trustee' ? today : null)
  const soon = await crm.listLeads('soon')
  same(addresses(soon), ['Foreclosure Address'])
  assert.equal(counts.soon, soon.rows.length)

  // In progress list, its counter and callbacks due agree.
  const working = await crm.listLeads('working')
  same(addresses(working).sort(), [...active, 'Foreclosure Address'].sort())
  for (const row of working.rows) if (row.bot_source !== 'mackie_wolf_trustee') assert.equal(row.sale_date, null)
  const todayData = await crm.getToday()
  assert.equal(todayData.counts.working, working.rows.length)
  assert.equal(todayData.counts.leads, all.rows.length)
  same(todayData.due.map(d => d.address).sort(), [...active, 'Foreclosure Address'].sort())
  same(todayData.sales.map(s => s.property_address), ['Foreclosure Address'])
  same(todayData.recent.map(r => r.address).sort(), [...active, 'Foreclosure Address'].sort())

  // Workflow holds: ranked code cases release, everything else holds as before.
  const slugs = staged.map(s => s.pipeline_lead_key)
  const holds = await research.cityCodeWorkflowHolds(slugs)
  same([...holds].sort(), ['church', 'hud', 'memphis-unranked'])
  same([...await research.cityCodeWorkflowHolds(slugs, async () => new Set())].sort(),
    ['church', 'hud', 'memphis-unranked', 'memphis-ranked', 'knox-ranked', 'mj-ranked', rows.johnson.pipeline_lead_key].sort())
  same([...await research.rankedCodeCaseIds()].sort(), [rows.memphisRanked, rows.knox, rows.johnson, rows.mtJuliet].map(r => r.id).sort())

  // Lead page.
  imports['@/lib/crm-data'] = { ...crm, mathSheetIdFor: () => assert.fail('a code case must not load a math sheet') }
  imports['@/app/crm/ui'] = load('src/app/crm/ui.tsx', imports)
  Object.assign(imports, { 'next/link': { default: ({ href, children }) => React.createElement('a', { href }, children) },
    'next/navigation': { notFound: () => assert.fail('Missing lead') }, '@/app/crm/icons': { Icon: () => null },
    './contents-form': { ContentsForm: () => null }, './log-form': { LogForm: () => React.createElement('form') }, './sheet-thumb': {},
    '@/app/crm/math-sheet/[id]/math-sheet-content': {}, '@/app/crm/math-sheet/[id]/load-snapshot': {} })
  for (const name of ['hearing-record', 'johnson-hearing-record', 'closure-receiver-record', 'pilot-review-card']) {
    imports['@/app/crm/' + name] = load('src/app/crm/' + name + '.tsx', imports)
  }
  const page = load('src/app/crm/(app)/leads/[id]/page.tsx', imports).default
  const screen = async row => renderToStaticMarkup(await page({ params: Promise.resolve({ id: row.id }) }))

  const johnson = await screen(rows.johnson)
  assert.match(johnson, /Board of Dwelling Standards and Review/)
  assert.match(johnson, /Hearing listed/)
  assert.match(johnson, /Sale authority unverified\./)
  assert.match(johnson, /It is not authority to sell and it is not a sale date or a deadline\./)
  assert.match(johnson, /<dt>Deadline<\/dt><dd>None set<\/dd>/)
  assert.match(johnson, /<dt>FALCO fee<\/dt><dd>\$3,600/)
  assert.match(johnson, /Roll Owner/)
  assert.match(johnson, /href="tel:\+19015550100"/)
  assert.match(johnson, /<form/)
  assert.match(johnson, /<span class="pill">Code violation<\/span>/)
  assert.doesNotMatch(johnson, /Sale in |Sale today|Sale passed|<dt>Sale date<\/dt>|auction ready|Math sheet|—/i)

  const memphis = await screen(rows.memphisRanked)
  assert.match(memphis, /A service request documents a reported condition\. Ownership, sale authority and a dated sale opportunity require independent evidence\./)
  assert.match(memphis, /<form/)
  assert.doesNotMatch(memphis, /Sale in |Sale today|Sale passed|<dt>Sale date<\/dt>/)
  const knox = await screen(rows.knox)
  assert.match(knox, /Historical or unverified hearing record/)
  assert.match(knox, /<form/)
  assert.doesNotMatch(knox, /Sale in |Sale today|Sale passed/)
  const mtJuliet = await screen(rows.mtJuliet)
  assert.match(mtJuliet, /Historical complaint\. No current qualifying building-condition report verified\./)
  assert.doesNotMatch(mtJuliet, /Sale in |Sale today|Sale passed/)

  // Unranked: the research-only page, exactly as before.
  const unranked = await screen(rows.memphisUnranked)
  assert.match(unranked, /Memphis 311 research/)
  assert.match(unranked, /A service request documents a reported condition/)
  assert.doesNotMatch(unranked, /href="(?:tel:|sms:|mailto:)|<form|FALCO fee|<dt>Owner<\/dt>|crm-record/)
  // hud_reo stays research only even with a ranked row.
  const hud = await screen(rows.hud)
  assert.match(hud, /Historical HUD inventory/)
  assert.doesNotMatch(hud, /href="(?:tel:|sms:|mailto:)|<form|FALCO fee/)

  // A case that drops off the ranked snapshot goes back to research everywhere.
  tables.crm_visible_opportunities = tables.crm_visible_opportunities.filter(o => o.staging_id !== rows.johnson.id)
  assert.ok(!addresses(await crm.listLeads('all')).includes(rows.johnson.property_address))
  assert.ok(!addresses(await crm.listLeads('working')).includes(rows.johnson.property_address))
  assert.equal((await crm.viewCounts(today)).all, all.rows.length - 1)
  assert.equal((await crm.getToday()).counts.working, working.rows.length - 1)
  const dropped = await screen(rows.johnson)
  assert.match(dropped, /Board of Dwelling Standards and Review/)
  assert.doesNotMatch(dropped, /href="(?:tel:|sms:|mailto:)|<form|FALCO fee|crm-record/)
})
