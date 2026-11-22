-- Both source reviews may change after the same nightly ranking.
begin;
set local plpgsql.check_asserts = on;
do $test$
declare
  metro uuid := gen_random_uuid();
  trustee uuid := gen_random_uuid();
  held jsonb := '{"trustee_notice_review":{"reason":"stale_notice","updated_by":"mackie_wolf_trustee"}}';
  attrs jsonb := '{"Request_Nbr":"26-123","Property_Address":"100 FARM RD","Property_APN":"0001","Status":"OPEN","Subtype_Description":"Codes Housing Request","Violations_Noted":"UNSAFE STRUCTURE"}';
  review jsonb := jsonb_build_object('case_number','26-123','checked_on',current_date,'official_status','OPEN',
    'status','open','property_apn','0001','property_address','100 FARM RD','violations_noted','UNSAFE STRUCTURE',
    'current_code_signal',true,'source_url','https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Property_Standards_Violations_2/FeatureServer/0/query?f=json&where=Request_Nbr%3D%2726-123%27');
begin
  insert into public.homeowner_requests_staging(id,bot_source,distress_type,raw_payload,property_address,county,staging_status,trustee_sale_date)
  values (metro,'nashville_codes','CODE_VIOLATION',jsonb_build_object('nashville_codes',attrs,'nashville_codes_review',review),'100 FARM RD, Nashville, TN','Davidson','pending',null),
         (trustee,'mackie_wolf_trustee','TRUSTEE_NOTICE','{}','200 FARM RD','Davidson','pending',current_date+2);
  insert into public.lead_opportunities(captured_on,rank,staging_id,bot_source,fit_label,property_value,expected_fee,fit,score,sale_date)
    select current_date,-row_number() over(order by id),id,bot_source,'Snapshot',1,1,1,1,current_date+45
    from public.homeowner_requests_staging where id in (metro,trustee);
  assert (select count(*)=2 from public.crm_visible_opportunities where staging_id in (metro,trustee));
  assert (select sale_date=current_date+2 from public.crm_visible_opportunities where staging_id=trustee);
  update public.homeowner_requests_staging set phone_metadata=held where id=trustee;
  update public.homeowner_requests_staging set raw_payload=jsonb_build_object('nashville_codes',attrs||'{"Status":"DONE"}',
    'nashville_codes_review',review||'{"status":"inactive","official_status":"DONE","current_code_signal":false}') where id=metro;
  assert not exists(select from public.crm_visible_opportunities where staging_id in (metro,trustee));
  assert (select 'nashville_code_done'=any(public.lead_quality_reasons(s)) from public.homeowner_requests_staging s where id=metro);
  assert (select 'stale_notice'=any(public.lead_quality_reasons(s)) from public.homeowner_requests_staging s where id=trustee);
  assert not has_table_privilege('authenticated','public.crm_visible_opportunities','select');
end $test$;
rollback;
