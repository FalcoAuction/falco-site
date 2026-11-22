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
    not(){return this}, or(){return this},order(){return this}, limit(n){rows=rows.slice(0,n);return this},range(lo,hi){rows=rows.slice(lo,hi+1);return this},
    gte(){return this},lte(){return this},maybeSingle(){return {data:rows[0]??null}},then(done){return Promise.resolve({data:rows,count:rows.length}).then(done)}}
    return query
  }}
  const imports = {'server-only':{},react:{...React,cache:f=>f},'@/lib/supabase-admin':{supabaseAdmin:db},
    '@/lib/crm-land':{},'@/lib/land-evidence':{ landEvidence:()=>null },'@/lib/dialer-data':{getWorkflow:()=>null,listActivities:()=>[]}}
  for (const name of ['dialer-types','trustee-notice','chattanooga-research','nashville-codes','warn-evidence','crm-data']) {
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
  const crm = imports['@/lib/crm-data']
  const baseline = await crm.getToday()
  const baselineWorking = (await crm.listLeads('working')).rows.map(r => r.slug).sort().join(',')
  const statuses = ['closed','litigation_review','ambiguous','not_found','identity_mismatch','corrected',null]
  for(let i=0;i<28;i++) {
    const slug='chatt-held-'+i, status=statuses[i%statuses.length]
    const review=status ? {status,official_statuses:['C'],checked_on:today} : null
    const row={...staged[0], id:'00000000-0000-4001-8000-'+String(i).padStart(12,'0'),
      pipeline_lead_key:slug,bot_source:'chattanooga_codes',property_address:'Held Chattanooga '+i,
      mackie_notice_hold:null,review,city_review:review}
    staged.push(row)
    tables.dialer_lead_workflow.unshift({listing_slug:slug,status:'working',next_action_at:today})
  }
  const after=await crm.getToday()
  assert.equal(after.counts.working,baseline.counts.working)
  assert.equal(after.due.length,baseline.due.length,'held callbacks must not consume the first 25 slots')
  assert.ok(after.due.every(row=>!row.slug.startsWith('chatt-held-')))
  assert.equal((await crm.listLeads('working')).rows.map(r=>r.slug).sort().join(','),baselineWorking)
  const detail=await render('leads/[id]/',{params:Promise.resolve({id:'00000000-0000-4001-8000-000000000000'})})
  assert.match(detail,/<dt>City case status<\/dt><dd>Closed<\/dd>/)
  assert.match(detail,/<dt>City status codes<\/dt><dd>C<\/dd>/)

})

test('Chattanooga research binds the city case and uses only the matching county review', () => {
  const { createHash } = require('node:crypto')
  const { chattanoogaGroups, chattanoogaParcel, assessorSource, cityCsv } = load('src/lib/chattanooga-research.ts', {
    'server-only':{}, '@/lib/supabase-admin':{},
  })
  function example(case_number) {
    const street = '404 TUNNEL BLVD'
    return { id:case_number, bot_source:'chattanooga_codes', property_address:street+', Chattanooga, TN',
      pipeline_lead_key:createHash('sha1').update('chattanooga_codes|'+case_number+'|'+street).digest('hex'),
      county:'Hamilton County', case_number, staging_status:'pending', property_value:9900000,
      parcelReview:{ case_number, property_address:street, county_file_stamp:'roll v1', source_url:assessorSource,
        status:'exact_county_address',parcel:'147I-K-028.01',recorded_owner:'County owner',county_appraisal:6685000 },
      review:{case_number,property_address:street,checked_on:'2026-11-22',source_modified_on:'2026-11-20',
        source_sha256:'a'.repeat(64),source_url:cityCsv,record_ids:['3'],official_statuses:['INPR'],status:'active',
        serious_active_count:1,current_code_signal:true,active_descriptions:['Unsafe roof'],
        serious_active_records:[{record_id:'3',status:'INPR',description:'Unsafe roof',flag_dangerous:'true'}]}}
  }
  const a=example('CE1'), b=example('CE2')
  const [group]=chattanoogaGroups([a,b])
  assert.equal(group.cases.length,2)
  assert.equal(chattanoogaGroups([a,{...a,id:'duplicate'}])[0].cases.length,1)
  const clipped={...a,review:{...a.review,evidence_truncated:true,record_ids:[],active_descriptions:[],serious_active_count:3}}
  assert.equal(chattanoogaGroups([clipped])[0].cases[0].seriousCount,3)
  assert.equal(chattanoogaGroups([{...clipped,review:{...clipped.review,serious_active_records:[]}}]).length,0)
  assert.equal(group.assessor.value,6685000)
  assert.equal(group.cases[0].records[0].dangerous,true)
  for(const status of ['closed','litigation_review','corrected','ambiguous','not_found']) {
    assert.equal(chattanoogaGroups([{...a,review:{...a.review,status}}]).length,0)
  }
  for(const patch of [{pipeline_lead_key:'wrong'},{county:'Other'},{case_number:'CE3'}]) {
    assert.equal(chattanoogaGroups([{...a,...patch}]).length,0)
    assert.equal(chattanoogaParcel({...a,...patch}).assessor,null)
  }
  for(const parcelReview of [null,{...a.parcelReview,status:'ambiguous_address'},
      {...a.parcelReview,status:'no_exact_address'},{...a.parcelReview,case_number:'CE2'}]) {
    assert.equal(chattanoogaGroups([{...a,parcelReview}])[0].assessor,null)
  }
})
