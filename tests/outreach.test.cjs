// node --test tests/outreach.test.cjs   (synthetic contacts only)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load() {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/outreach.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require, Buffer })
  return exports
}
const lib = load()

const ENV = { OUTREACH_UNSUBSCRIBE_SECRET: 'test-secret', FALCO_POSTAL_ADDRESS: '1 Example St, Nashville, TN 37201', FALCO_SITE_URL: 'https://example.test/' }
const campaign = (over = {}) => ({
  id: 'c1', slug: 'bank-oreo-intro', audience_kind: 'bank', channel: 'email', subject: 'OREO in {{county}} County',
  body_text: '{{greeting}}\n\nA note for {{org_name}}.', status: 'active', requires_license: false, daily_cap: 25, ...over,
})
const contact = (over = {}) => ({ id: 'k1', kind: 'bank', org_name: 'Example Bank & Trust', person_name: 'Pat Example', title: null,
  email: 'Pat@Example.Bank', county: 'davidson', ...over })

test('unsubscribe tokens round-trip and reject tampering', () => {
  const t = lib.unsubscribeToken('Pat@Example.Bank', ENV)
  assert.equal(lib.verifyUnsubscribeToken(t, ENV), 'pat@example.bank')
  const [p, s] = t.split('.')
  const other = Buffer.from('someone@else.test').toString('base64').replace(/=+$/, '')
  assert.equal(lib.verifyUnsubscribeToken(`${other}.${s}`, ENV), null)
  assert.equal(lib.verifyUnsubscribeToken(`${p}.AAAA`, ENV), null)
  assert.equal(lib.verifyUnsubscribeToken(t, { ...ENV, OUTREACH_UNSUBSCRIBE_SECRET: 'other' }), null)
  assert.equal(lib.verifyUnsubscribeToken(t, { FALCO_APPROVAL_SECRET: 'test-secret' }), 'pat@example.bank', 'falls back to approval secret')
  assert.throws(() => lib.unsubscribeToken('x@y.test', {}))
})

test('render fills variables and refuses missing ones', () => {
  assert.equal(lib.render('{{greeting}} {{org_name}}', lib.templateVars(contact())), 'Hi Pat, Example Bank & Trust')
  assert.equal(lib.templateVars(contact({ person_name: null })).greeting, 'Hello,')
  assert.throws(() => lib.render('Dear {{person_name}}', lib.templateVars(contact({ person_name: null }))), /person_name/)
})

test('email has CAN-SPAM footer, escaped html and one-click headers', () => {
  const m = lib.buildEmail(campaign(), contact(), ENV)
  assert.equal(m.subject, 'OREO in Davidson County')
  assert.match(m.text, /FALCO LLC, 1 Example St, Nashville, TN 37201/)
  assert.match(m.text, /Unsubscribe: https:\/\/example\.test\/unsubscribe\?t=/)
  assert.match(m.html, /Example Bank &amp; Trust/)
  assert.match(m.headers['List-Unsubscribe'], /^<https:\/\/example\.test\/api\/outreach\/unsubscribe\?t=.+>$/)
  assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.throws(() => lib.buildEmail(campaign(), contact(), { ...ENV, FALCO_POSTAL_ADDRESS: '' }), /FALCO_POSTAL_ADDRESS/)
  assert.throws(() => lib.buildEmail(campaign(), contact({ email: null }), ENV), /email/)
})

test('gates: send switch, address, status, license for owner audiences, daily cap', () => {
  const on = { ...ENV, OUTREACH_SEND_ENABLED: '1' }
  assert.equal(lib.sendGate(campaign(), on).send, true)
  assert.equal(lib.sendGate(campaign(), ENV).send, false)
  assert.equal(lib.sendGate(campaign({ status: 'draft' }), on).send, false)
  assert.equal(lib.sendGate(campaign(), { ...on, FALCO_POSTAL_ADDRESS: '' }).send, false)
  const owners = campaign({ audience_kind: 'landlord', requires_license: false })
  assert.match(lib.sendGate(owners, on).reasons.join(' '), /62-13-102/)
  assert.equal(lib.sendGate(owners, { ...on, FALCO_LICENSED: '1' }).send, true)
  assert.equal(lib.remainingToday(campaign(), 20, 100), 5)
  assert.equal(lib.remainingToday(campaign(), 30, 100), 0)
  assert.equal(lib.remainingToday(campaign(), 0, 3), 3)
})

test('svix signatures verify and reject tampering or stale timestamps', () => {
  const key = crypto.randomBytes(24)
  const secret = 'whsec_' + key.toString('base64')
  const body = '{"type":"email.bounced"}'
  const now = 1790000000
  const sign = (b, ts) => 'v1,' + crypto.createHmac('sha256', key).update(`msg_1.${ts}.${b}`).digest('base64')
  const h = { id: 'msg_1', timestamp: String(now), signature: `v1,bogus ${sign(body, now)}` }
  assert.equal(lib.verifySvix(body, h, secret, now), true)
  assert.equal(lib.verifySvix(body + ' ', h, secret, now), false)
  assert.equal(lib.verifySvix(body, h, secret, now + 301), false)
  assert.equal(lib.verifySvix(body, h, undefined, now), false)
  assert.deepEqual({ ...lib.webhookOutcome('email.complained') }, { status: 'complained', reason: 'complaint' })
  assert.equal(lib.webhookOutcome('email.delivered'), null)
})

test('csv import rows validate and keep extra columns in meta', () => {
  const rows = lib.parseCsv('bank,hq_county,cert\r\n"First Example, N.A.",Wilson,123\n')
  assert.equal(rows[0].bank, 'First Example, N.A.')
  const ok = lib.toContactRow({ org_name: 'X Bank', email: ' A@B.Test ', cert: '9' }, { kind: 'bank', source: 'fdic' })
  assert.equal(ok.email, 'a@b.test')
  assert.equal(ok.source, 'fdic')
  assert.equal(ok.meta.cert, '9')
  assert.match(lib.toContactRow({ org_name: 'X' }, {}), /bad kind/)
  assert.match(lib.toContactRow({ kind: 'bank' }), /org_name/)
  assert.match(lib.toContactRow({ kind: 'bank', org_name: 'X', email: 'nope' }), /bad email/)
})
