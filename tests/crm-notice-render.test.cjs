const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(path, imports) {
  const exports = {}
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { fileName: path, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInNewContext(output, { exports, require: key => imports[key] ?? require(key), URLSearchParams, console })
  return exports
}

test('Today, ranked list and lead detail render both current notice decisions', async () => {
  const today = new Date().toISOString().slice(0, 10)
  const staged = ['mackie_wolf_trustee','nashville_codes','mackie_wolf_trustee','nashville_codes'].map((bot_source,i) => ({
    id: '00000000-0000-4000-8000-00000000000'+i, bot_source, county:'Davidson',
    pipeline_lead_key:'file'+i, property_address:['Removed Address','Closed Address','Listed Address','Cited Address'][i],
    phone:'6155550100', trustee_sale_date:today, mackie_notice_hold:i===0?'stale_notice':null,
    nashville_code_disposition: i===1?'done':i===3?'open':null,
    raw_payload: bot_source==='nashville_codes'?{nashville_codes:{Request_Nbr:'26-123', Status:i===1?'DONE':'OPEN'}}:{},
  }))
  staged.push({ ...staged[3], bot_source:"warn_notices", id:"00000000-0000-4000-8000-000000000005",
    full_name:"Akzo Nobel", property_address:"20 Culvert Street", nashville_code_disposition:null,
    raw_payload:{warn:{company:"Akzo Nobel",effective:"2099-01-01",worksite_parcel_status:"previous_observation",worksite_parcel:{checked_on:"2026-11-01",
      county:"davidson",match_basis:"exact_worksite_address",parcel_id:"10508026600",property_address:"20 CULVERT ST",
      recorded_owner:"AKZO NOBEL COATINGS INC",county_appraisal:9648500,land_use:"HEAVY MANUFACTURING",
      source_url:"https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0/query"}}}})
  const opportunity = s => ({...s, staging_id:s.id, captured_on:today, sale_date:today, fit_label:'Foreclosure', rank:1})
  const tables = {
    homeowner_requests_staging: staged, lead_opportunities:staged.map(opportunity),
    crm_visible_opportunities:staged.slice(2).map(opportunity),
    dialer_lead_workflow:staged.map(s=>({listing_slug:s.pipeline_lead_key,status:'working', next_action_at:today})),
  }
  const db = {from(name) {
    let rows = tables[name] ?? []
    const query = {select(cols) {
      if(name==='lead_opportunities') assert.equal(cols,'captured_on','raw ranking used outside snapshot-day lookup')
      return this
    }, eq(k,v){rows=rows.filter(r=>r[k]===v);return this}, in(k,v){rows=rows.filter(r=>v.includes(r[k]));return this},
    not(){return this}, or(){return this},order(){return this}, limit(){return this},range(){return this},
    gte(){return this},lte(){return this},maybeSingle(){return {data:rows[0]??null}},then(done){return Promise.resolve({data:rows,count:rows.length}).then(done)}}
    return query
  }}
  const imports = {'server-only':{},react:{...React,cache:f=>f},'@/lib/supabase-admin':{supabaseAdmin:db},
    '@/lib/crm-land':{},'@/lib/land-evidence':{ landEvidence:()=>null },'@/lib/dialer-data':{getWorkflow:()=>null,listActivities:()=>[]}}
  for (const name of ['dialer-types','trustee-notice','nashville-codes','warn-evidence','crm-data']) {
    imports['@/lib/'+name]=load('src/lib/'+name+'.ts',imports)
  }
  imports['@/lib/crm-data']={...imports['@/lib/crm-data'],bucketCounts:()=>({assets:0,commercial:0}),mathSheetIdFor:()=>null}
  imports['@/app/crm/ui']=load('src/app/crm/ui.tsx',imports)
  Object.assign(imports,{'next/link':{default:({href,children})=>React.createElement('a',{href},children)},
    'next/navigation':{notFound:()=>assert.fail('Missing lead')},'@/app/crm/icons':{Icon:()=>null},
    '@/app/crm/row-link':{RowLink:({children})=>React.createElement('tr',null,children)},
    './contents-form':{ContentsForm:()=>null},'./log-form':{},'./sheet-thumb':{},'@/app/crm/math-sheet/[id]/math-sheet-content':{},
    '@/app/crm/math-sheet/[id]/load-snapshot':{}})
  const render = async (path,props) => renderToStaticMarkup(await load('src/app/crm/(app)/'+path+'page.tsx',imports).default(props))
  for (const html of [await render('',{}),await render('leads/',{searchParams:Promise.resolve({})})]) {
    assert.doesNotMatch(html,/Removed Address|Closed Address/)
    assert.match(html,/Listed Address/)
    assert.match(html,/Cited Address/)
  }
  for (const [i,s] of staged.entries()) {
    const html = await render('leads/[id]/',{params:Promise.resolve({id:s.id})})
    assert.match(html,new RegExp(s.property_address))
    if(i<2) {
      assert.doesNotMatch(html,/href="(?:tel|sms):/)
      assert.match(html,i===0?/Stale trustee notice/:/Metro case marked DONE/)
    } else if (s.bot_source === "warn_notices") {
      assert.match(html,/Employment notice date\(s\).*2099-01-01/)
      assert.match(html,/County appraisal.*9,648,500/)
      assert.match(html,/Recorded property owner.*AKZO NOBEL COATINGS INC/)
      assert.match(html,/10508026600/)
      assert.match(html,/Previous parcel observation.*2026-11-01/)
      assert.doesNotMatch(html,/href="(?:tel|sms):|Routes to |<dt>Deadline<\/dt>|<dt>FALCO fee<\/dt>/)
    } else assert.match(html,/href="tel:/)
  }
})
