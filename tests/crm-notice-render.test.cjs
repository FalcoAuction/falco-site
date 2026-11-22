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
  vm.runInNewContext(output, { exports, require: key => imports[key] ?? require(key), URL, URLSearchParams, console })
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
    neq(k,v){rows=rows.filter(r=>r[k]!==v);return this},not(k,op,v){if(k==='bot_source' && op==='in') rows=rows.filter(r=>!v.slice(1,-1).split(',').includes(r[k]));return this}, or(){return this},order(){return this}, limit(n){rows=rows.slice(0,n);return this},range(lo,hi){rows=rows.slice(lo,hi+1);return this},
    gte(){return this},lte(){return this},maybeSingle(){return {data:rows[0]??null}},then(done){return Promise.resolve({data:rows,count:rows.length}).then(done)}}
    return query
  }}
  const imports = {'server-only':{},react:{...React,cache:f=>f},'@/lib/supabase-admin':{supabaseAdmin:db},
    '@/lib/crm-land':{},'@/lib/land-evidence':{ landEvidence:()=>null },'@/lib/dialer-data':{getWorkflow:()=>null,listActivities:()=>[]}}
  for (const name of ['dialer-types','trustee-notice','chattanooga-research','memphis-research','knoxville-research','mt-juliet-research','nashville-codes','warn-evidence','crm-data']) {
    imports['@/lib/'+name]=load('src/lib/'+name+'.ts',imports)
  }
  imports['@/lib/crm-data']={...imports['@/lib/crm-data'],bucketCounts:()=>({assets:0,commercial:0}),mathSheetIdFor:()=>null}
  imports['@/app/crm/ui']=load('src/app/crm/ui.tsx',imports)
  Object.assign(imports,{'next/link':{default:({href,children})=>React.createElement('a',{href},children)},
    'next/navigation':{notFound:()=>assert.fail('Missing lead')},'@/app/crm/icons':{Icon:()=>null},
    '@/app/crm/row-link':{RowLink:({children})=>React.createElement('tr',null,children)},
    './contents-form':{ContentsForm:()=>null},'./log-form':{},'./sheet-thumb':{},'@/app/crm/math-sheet/[id]/math-sheet-content':{},
    '@/app/crm/math-sheet/[id]/load-snapshot':{}})
  imports['@/app/crm/hearing-record']=load('src/app/crm/hearing-record.tsx',imports)
  imports['@/app/crm/johnson-hearing-record']=load('src/app/crm/johnson-hearing-record.tsx',imports)
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

  const memphis={...staged[0],id:'00000000-0000-4001-8000-000000000100',pipeline_lead_key:'memphis-workflow',
    bot_source:'memphis_codes',property_address:'Research-only Memphis address',raw_payload:{memphis_311:{INCIDENT_NUMBER:'123'}}}
  staged.push(memphis)
  tables.dialer_lead_workflow.unshift({listing_slug:memphis.pipeline_lead_key,status:'working',next_action_at:today})
  tables.crm_visible_opportunities.push(opportunity(memphis))
  const readOnly=await render('leads/[id]/',{params:Promise.resolve({id:memphis.id})})
  assert.match(readOnly,/Awaiting a bound city review/)
  assert.doesNotMatch(readOnly,/href="(?:tel:|sms:|mailto:)|<form|FALCO fee|<dt>Owner<\/dt>/)
  for(const path of ['', 'leads/']) assert.doesNotMatch(await render(path,{searchParams:Promise.resolve({})}),/Research-only Memphis address/)
  assert.equal((await crm.getToday()).counts.working,baseline.counts.working)
  assert.equal((await crm.listLeads('working')).rows.map(r=>r.slug).sort().join(','),baselineWorking)

  const knox = {...memphis, id:'00000000-0000-4001-8000-000000000101',pipeline_lead_key:'historical-knox',
    property_address:'Historical Knoxville address',bot_source:'knoxville_poh',raw_payload:{poh_section:'boarding'}}
  staged.push(knox)
  tables.dialer_lead_workflow.unshift({listing_slug:knox.pipeline_lead_key,status:'working',next_action_at:today})
  tables.crm_visible_opportunities.push(opportunity(knox))
  const legacy = await render('leads/[id]/',{params:Promise.resolve({id:knox.id})})
  assert.match(legacy,/Historical or unverified hearing record/)
  assert.doesNotMatch(legacy,/href="(?:tel:|sms:|mailto:)|<form|FALCO fee/)
  for (const path of ['', 'leads/']) assert.doesNotMatch(await render(path,{searchParams:Promise.resolve({})}),/Historical Knoxville address/)
  const cityPacket = 'https://johnsoncitytn.civicweb.net/document/1234/agenda.pdf'
  const johnson = {...knox, id:'00000000-0000-4001-8000-000000000102', bot_source:'johnson_city_bdsr',
    pipeline_lead_key:require('node:crypto').createHash('sha1').update('johnson_city_bdsr|CEPM202400123').digest('hex'),
    property_address:'132 Spring St, Johnson City, TN', raw_payload:{johnson_city_bdsr:{address:'132 Spring St',
      case_number:'CEPM202400123',meeting_on:'2026-02-26',stage:'docket_removal_reported',source_url:cityPacket,
      minutes_evidence:{meeting_on:'2026-03-26',source_url:cityPacket}}}}
  staged.push(johnson)
  tables.dialer_lead_workflow.unshift({listing_slug:johnson.pipeline_lead_key,status:'working',next_action_at:today})
  tables.crm_visible_opportunities.push(opportunity(johnson))
  const herald = {...staged[0], id:'00000000-0000-4001-8000-000000000098', bot_source:'hamilton_county_herald',
    pipeline_lead_key:'herald-expired', herald_elapsed_sale_date:'2026-10-01', source_url:'https://www.hamiltoncountyherald.com/ViewNotice.aspx?id=1'}
  staged.push(herald)
  const expired = await render('leads/[id]/',{params:Promise.resolve({id:herald.id})})
  assert.match(expired,/Herald advertised sale date elapsed/)
  assert.match(expired,/2026-10-01/)
  assert.doesNotMatch(expired,/tel:|sms:|<form|hand_to_auction/)
  const removed = await render('leads/[id]/',{params:Promise.resolve({id:johnson.id})})
  assert.match(removed,/Docket removal recorded 2026-03-26/)
  assert.doesNotMatch(removed,/href="(?:tel:|sms:|mailto:)|<form|FALCO fee/)
  for (const path of ['', 'leads/']) assert.doesNotMatch(await render(path,{searchParams:Promise.resolve({})}),/132 Spring St/)
  assert.equal((await crm.getToday()).counts.working,baseline.counts.working)
  assert.equal((await crm.listLeads('working')).rows.map(r=>r.slug).sort().join(','),baselineWorking)

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

test('Memphis requires the bound city incident, a current structural review and the reported address', () => {
  const { memphisEvidence } = load('src/lib/memphis-research.ts',{'server-only':{},'@/lib/supabase-admin':{}})
  const attrs={INCIDENT_NUMBER:'123',Location_Address:'10 Main Street',Unit_Address:'Unit B',CITY:'Memphis',STATE:'TN',ZipCode:'38103',PARCEL_ID:' 045059  00009C ',REPORTED_DATE:123000}
  const review={finding:'structural_request',checked_on:'2026-11-19',incident_number:'123',request_type:'CE-Dilapidated',
    request_status:'Open',department:'Code Enforcement',reported_at_ms:123000,closed_at_ms:null,resolved_at_ms:null,resolution_code:null,parcel_as_reported:' 045059  00009C ',
    source_url:"https://311.memphistn.gov/server/rest/services/311/311_Request_Map_PROD/FeatureServer/0/query?where=INCIDENT_NUMBER%3D%27123%27&f=json"}
  const row={bot_source:'memphis_codes',county:'Shelby County',pipeline_lead_key:require('node:crypto').createHash('sha1').update('memphis_codes|123').digest('hex'),
    property_address:'10 Main Street, Unit B, Memphis, TN 38103',staging_status:'pending'}
  const read=(change={},stage={})=>memphisEvidence({...row,...stage,raw_payload:{memphis_311:attrs,memphis_codes_review:{...review,...change}}},'2026-11-22')
  assert.equal(read().eligible,true)
  assert.equal(read().parcel,'045059  00009C')
  assert.equal(read({parcel_as_reported:'045059 00009C'}).eligible,false)
  const link=new URL(read().url)
  assert.equal(link.searchParams.get('outFields'),'OBJECTID,INCIDENT_NUMBER,INCIDENT_ID,DEPARTMENT,REQUEST_TYPE,REQUEST_STATUS,Request_Sub_Status,Location_Address,Unit_Address,CITY,STATE,ZipCode,PARCEL_ID,REPORTED_DATE,last_edited_date,Closed_Date,RESOLVED_DATE,RESOLUTION_CODE,RESOLUTION_SUMMARY')
  assert.equal(link.searchParams.get('where'),"INCIDENT_NUMBER='123'")
  assert.equal(read({request_status:'Pending Litigation'}).eligible,true)
  for(const change of [{checked_on:'2026-11-18'},{checked_on:'2026-11-23'},{checked_on:'2026-02-31'},{checked_on:''},
    {incident_number:'456'},{source_url:review.source_url.replace('123','456')},{source_url:review.source_url.replace('311.memphistn.gov','example.test')},
    {request_type:'CE-Code Miscellaneous'},{request_status:'Closed'},{resolution_code:'Closed'},{closed_at_ms:125000},
    {reported_at_ms:12},{department:'Solid Waste'},{parcel_as_reported:'1 B'},...['terminal_request','ambiguous','identity_conflict','not_returned','disposition_review'].map(finding=>({finding}))]) assert.equal(read(change).eligible,false)
  for(const stage of [{staging_status:'rejected'},{county:'Other'},{pipeline_lead_key:'bad'},{property_address:'10 Main Street, Unit A, Memphis, TN 38103'}]) assert.equal(read({},stage).eligible,false)
  assert.match(read({finding:'terminal_request',request_status:'Closed'}).disposition,/Closed/)
})

test('Knoxville separates the petition, dated complaint and exact county bill', () => {
  const {knoxvilleEvidence: read} = load('src/lib/knoxville-research.ts',{'server-only':{},'@/lib/supabase-admin':{}})
  const address='2208 Adair Avenue, Knoxville, TN', parcel='070PK007', number='CE-26-006926'
  const city={case_number:number,parcel_id:parcel,source_url:'https://knoxvilleworksearch.knoxvilletn.gov/recorddetails.html?RecordID='+number,
    status:'In Violation',status_date:'2026-10-21',checked_on:'2026-11-22'}
  const review={case_number:number,parcel_id:parcel,property_address:address,violations:'STRUCTURAL',document_kind:'poh_agenda',
    status:'agenda_outcome_unverified',meeting_cancelled:false,hearing_date:'2026-10-30',checked_on:'2026-11-22',source_sha256:'b'.repeat(64),
    source_page_url:'https://www.knoxvilletn.gov/173/Better-Building-Board-Public-Officer-Hea',
    source_url:'https://www.knoxvilletn.gov/DocumentCenter/View/1255', city_record:city}
  const roll={case_number:number,parcel_id:parcel,property_address:address,owner:'COOTS JIMMY L & DONNA A',appraised_value:111000,
    tax_year:2026,checked_on:'2026-11-22',source_url:'https://propertytax.knoxcountytn.gov/property-tax/bill/070PK-007/2026'}
  const raw={poh_section:'case',parcel_id:parcel,case_number:number,knoxville_hearing_review:review,knox_assessor:roll}
  const row={bot_source:'knoxville_poh',county:'Knox County',pipeline_lead_key:'a70580656630c313a8eafa56d9351a03a246a245',
    property_address:address,knoxville_review:review,raw_payload:raw}
  const check=(patch={})=>read({...row,...patch},'2026-11-22')
  const evidence=check()
  assert.equal(evidence.complaint.statusDate,'2026-10-21')
  assert.equal(evidence.hearing,'2026-10-30')
  assert.equal(evidence.assessor.value,111000)
  assert.equal(evidence.caseUrl,city.source_url)
  const {HearingRecord}=load('src/app/crm/hearing-record.tsx',{})
  const html=renderToStaticMarkup(HearingRecord({evidence}))
  assert.match(html,/Published petition/)
  assert.match(html,/In Violation as of 2026-10-21/)
  assert.match(html,/Hearing outcome unverified/)
  assert.match(html,/111,000/)
  for (const change of [{case_number:'other'},{parcel_id:'other'},{source_url:city.source_url+'0'},
    {status_date:'2026-11-23'},{checked_on:'2026-11-23'}]) {
    const e=check({knoxville_review:{...review,city_record:{...city,...change}}})
    assert.ok(e.agenda)
    assert.equal(e.complaint,null)
  }
  for (const change of [{case_number:'other'},{parcel_id:'other'},{property_address:'other'},
    {appraised_value:0},{source_url:roll.source_url+'0'},{checked_on:'2026-11-23'}]) {
    assert.equal(check({raw_payload:{...raw,knox_assessor:{...roll,...change}}}).assessor,null)
  }
  const ruling = {case_number:number,parcel_id:parcel,hearing_date:review.hearing_date,
    source_url:'https://archive.org/details/public-officer-r-1744-261030',offset_seconds:94,
    action:'repair',days:90,checked_on:'2026-11-22'}
  const ruled = (patch={}) => check({raw_payload:{...raw,knoxville_oral_ruling:{...ruling,...patch}}})
  const oralHtml=renderToStaticMarkup(HearingRecord({evidence:ruled()}))
  assert.match(oralHtml,/Oral ruling/)
  assert.match(oralHtml,/Repair within 90 days/)
  assert.match(oralHtml,/Play ruling at 1:34/)
  assert.match(oralHtml,/mp4#t=94/)
  assert.match(oralHtml,/Written order not verified/)
  assert.doesNotMatch(oralHtml,/Hearing outcome unverified|Deadline|<form/)
  assert.equal(ruled({action:'repair_or_demolish'}).oral.action,'Repair or demolish')
  for (const patch of [{case_number:'other'},{parcel_id:'other'},{hearing_date:'2026-10-29'},
    {source_url:ruling.source_url+'/other'},{offset_seconds:-1},{offset_seconds:2444},{days:0},
    {action:'demolish'},{checked_on:'2026-10-29'},{checked_on:'2026-11-23'}]) {
    assert.equal(ruled(patch).oral,null)
    assert.ok(ruled(patch).agenda)
  }
  assert.equal(check({pipeline_lead_key:'legacy'}),null)
  for (const change of [{case_number:'other'},{parcel_id:'other'},{property_address:'other'},
    {source_url:'https://example.org/doc'},{status:'published_result_review'},{meeting_cancelled:true}])
    assert.equal(check({knoxville_review:{...review,...change}}),null)
  assert.equal(check({knoxville_review:{...review,document_kind:'poh_results',status:'published_result_review'}}).agenda,false)
  assert.ok(check({knoxville_review:null}).agenda)
  assert.equal(check({knoxville_review:null}).complaint,null)
})

test('only a recently reviewed matching Mt. Juliet building complaint is displayed', () => {
  const { mtJulietEvidence } = load('src/lib/mt-juliet-research.ts', {'server-only':{}, '@/lib/supabase-admin':{}})
  const review = {issue_id:123,status:'Open',finding:'reported_building_condition',source_url:'https://seeclickfix.com/issues/123',
    checked_on:new Date().toISOString().slice(0,10),reported_on:'2025-06-01',condition_excerpt:'walls are detaching',
    organization:'Mt. Juliet, TN - Codes Enforcement',reported_address:'123 Main St'}
  const row = {bot_source:'mtn_cities_codes',county:'Wilson County',raw_payload:{issue:{id:123},mt_juliet_issue_review:review},
    pipeline_lead_key:require('node:crypto').createHash('sha1').update('mtn_cities_codes|MJ-SCF-123').digest('hex')}
  assert.equal(mtJulietEvidence(row).issue,123)
  for (const change of [{status:'Archived'},{issue_id:456},{checked_on:'2000-01-01'},{finding:'other_request'}]) {
    assert.equal(mtJulietEvidence({...row, mt_review:{...review,...change}}),null)
  }
})
