-- Local fixture only. Use an isolated database with the site functions installed.
begin;
do $test$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  legacy_key text := a::text;
  held jsonb := '{"trustee_notice_review":{"reason":"stale_notice","detail":"missing_from_current_report","updated_by":"mackie_wolf_trustee"}}';
  s public.homeowner_requests_staging;
begin
  insert into public.homeowner_requests_staging
    (id,pipeline_lead_key,bot_source,distress_type,trustee_sale_date,phone_metadata,staging_status,staged_at,property_address)
    values (a,legacy_key,'mackie_wolf_trustee','TRUSTEE_NOTICE',current_date+3,null,'pending',now(),'100 TEST ST, TEST TN 37000'),
           (b,b::text,'mackie_wolf_trustee','TRUSTEE_NOTICE',current_date+30,null,'pending',now(),'200 TEST ST, TEST TN 37000'),
           (c,c::text,'mackie_wolf_trustee','TRUSTEE_NOTICE',current_date+2,held,'pending',now(),'300 TEST ST, TEST TN 37000'),
           (d,d::text,'other','TRUSTEE_NOTICE',current_date+7,held,'pending',now(),'100 TEST ST, TEST TN 37000');
  insert into public.lead_opportunities(captured_on,rank,staging_id,bot_source,fit_label,property_value,expected_fee,fit,score,sale_date)
    select current_date,-row_number() over (order by id),id,bot_source,'Foreclosure',1,1,1,1,
      case when id=a then current_date+45 else current_date+1 end
    from public.homeowner_requests_staging where id in (a,b,c,d);
  assert (select count(*)=2 from public.crm_ranked_opportunities where staging_id in (a,b,c,d) and sale_date between current_date and current_date+14);
  assert (select sale_date=current_date+3 and fit_label='Foreclosure, sale within 14 days' from public.crm_ranked_opportunities where staging_id=a);
  assert (select sale_date=current_date+30 and fit_label='Foreclosure' from public.crm_ranked_opportunities where staging_id=b);
  assert (select sale_date=current_date+1 from public.crm_ranked_opportunities where staging_id=d);
  assert not exists(select from public.crm_ranked_opportunities where staging_id=c);
  select * into s from public.homeowner_requests_staging where id=c;
  assert 'stale_notice'=any(public.lead_quality_reasons(s));
  assert (public.promote_staged_lead(c,'test')->>'error')='mackie_notice_on_hold';
  s.phone_metadata := '{"sale_status":{"status":"postponed"}}'; assert public.mackie_notice_hold(s) is null;
  s.trustee_sale_date := current_date-1; assert public.mackie_notice_hold(s)='sale_date_requires_review';
  s.phone_metadata := '{"sale_status":{"status":"cancelled","updated_by":"trustee_status_reaper"}}';
  assert public.mackie_notice_hold(s)='stale_notice';
  s.bot_source := 'other'; assert public.mackie_notice_hold(s) is null;
  insert into public.homeowner_requests (id,source,pipeline_lead_key,property_address,trustee_sale_date,phone_metadata)
    values (a,'bot',legacy_key,'100 TEST ST, TEST TN 37000',current_date+8,'{"sale_status":{"status":"postponed"}}'),
           (d,'bot',d::text,'100 TEST ST, TEST TN 37000',current_date+8,null);
  assert not exists(select from public.crm_ranked_opportunities where staging_id=a);
  perform public.sync_sale_dates();
  assert (select trustee_sale_date=current_date+8 and sale_date_last_seen_at is null from public.homeowner_requests where id=a);
  assert (select trustee_sale_date=current_date+7 from public.homeowner_requests where id=d);
  update public.homeowner_requests set phone_metadata='{"sale_status":{"status":"reinstated"}}' where id=a;
  select * into s from public.homeowner_requests_staging where id=a;
  assert public.mackie_notice_hold(s)='reinstated';
  update public.homeowner_requests set phone_metadata=null where id=a;
  update public.homeowner_requests_staging set phone_metadata=null where id=c;
  assert exists(select from public.crm_ranked_opportunities where staging_id=c);
  assert not has_table_privilege('anon','public.crm_ranked_opportunities','select');
  assert has_table_privilege('service_role','public.crm_ranked_opportunities','select');
end $test$;
rollback;
