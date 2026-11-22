-- Run after the migration. Both snapshots refer to the same property.
begin;
set local plpgsql.check_asserts = on;
do $test$
declare
  closure_id uuid := gen_random_uuid();
  tax_id uuid := gen_random_uuid();
begin
  insert into public.homeowner_requests_staging(id,bot_source,distress_type,property_address,county,staging_status,raw_payload)
  values (closure_id,'church_closure','CHURCH_CLOSURE','1 CONTROL RD','Shelby','pending',
          '{"church_parcel_lookup":{"status":"parcel_identified"},"church_disposition_observation":{"disposition":"active_broker_listing"}}'),
         (tax_id,'shelby_tax_sale','TAX_LIEN','1 CONTROL RD','Shelby','pending','{}');
  insert into public.lead_opportunities(captured_on,rank,staging_id,bot_source,fit_label,property_value,expected_fee,fit,score)
    select current_date,-200-row_number() over(order by id),id,bot_source,'Test',1,1,1,1
    from public.homeowner_requests_staging where id in (closure_id,tax_id);
  assert (select 'church_closure_research'=any(public.lead_quality_reasons(s))
          from public.homeowner_requests_staging s where id=closure_id);
  assert (select not ('church_closure_research'=any(public.lead_quality_reasons(s)))
          from public.homeowner_requests_staging s where id=tax_id);
  assert not exists(select from public.crm_visible_opportunities where staging_id=closure_id);
  assert exists(select from public.crm_visible_opportunities where staging_id=tax_id);
  assert (select reloptions @> array['security_invoker=true'] from pg_class
          where oid='public.crm_visible_opportunities'::regclass);
  assert has_table_privilege('service_role','public.crm_visible_opportunities','select');
  assert not has_table_privilege('anon','public.crm_visible_opportunities','select');
  assert not has_table_privilege('authenticated','public.crm_visible_opportunities','select');
end $test$;
rollback;
