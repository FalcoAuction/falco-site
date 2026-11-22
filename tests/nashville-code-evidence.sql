-- Execute after the candidate migration in a disposable database. Inserts are unnecessary.
begin;
set local plpgsql.check_asserts = on;
do $test$
declare
  s public.homeowner_requests_staging;
  original public.homeowner_requests_staging;
  attrs jsonb := '{"Request_Nbr":"26-123","Property_Address":"100 FARM RD","Property_APN":"00102003000","Status":"OPEN","Subtype_Description":"Codes Housing Request","Violations_Noted":"UNSAFE STRUCTURE","Reported_Problem":"Vacant building"}';
  review jsonb := '{"case_number":"26-123","checked_on":"2026-01-01","official_status":"OPEN","status":"open","property_apn":"00102003000","property_address":"100 FARM RD","violations_noted":"UNSAFE STRUCTURE","current_code_signal":true,"source_url":"https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Property_Standards_Violations_2/FeatureServer/0/query?f=json&where=Request_Nbr%3D%2726-123%27"}';
  v text;
begin
  s.bot_source := 'nashville_codes'; s.distress_type := 'CODE_VIOLATION';
  s.property_address := '100 FARM RD, Nashville, TN'; s.county := 'Davidson County';
  s.property_value := 250000; s.owner_name_records := 'Test Owner'; s.staging_status := 'pending';
  s.raw_payload := jsonb_build_object('nashville_codes',attrs,'nashville_codes_review',review);
  original := s;
  assert public.nashville_code_disposition(s) = 'open';
  assert cardinality(public.lead_quality_reasons(s)) = 0, public.lead_quality_reasons(s)::text;

  foreach v in array array['DONE','CLOSED'] loop
    s.raw_payload := jsonb_build_object('nashville_codes',attrs || jsonb_build_object('Status',v),
      'nashville_codes_review',review || jsonb_build_object('official_status',v,'status','inactive','current_code_signal',false));
    assert public.nashville_code_disposition(s) = lower(v);
    assert ('nashville_code_' || lower(v)) = any(public.lead_quality_reasons(s));
  end loop;
  foreach v in array array['ambiguous_case','identity_mismatch','not_found','unrecognized'] loop
    s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,status}',to_jsonb(v));
    assert public.nashville_code_disposition(s) = v;
  end loop;
  s.raw_payload := original.raw_payload - 'nashville_codes_review';
  assert public.nashville_code_disposition(s) = 'unverified_case';
  s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,case_number}','"26-124"');
  assert public.nashville_code_disposition(s) = 'unverified_case';
  s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,source_url}','"https://example.test/26-123"');
  assert public.nashville_code_disposition(s) = 'unverified_case';
  foreach v in array array['2026-02-30','2999-01-01','not dated'] loop
    s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,checked_on}',to_jsonb(v));
    assert public.nashville_code_disposition(s) = 'unverified_case';
  end loop;
  s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,property_apn}','"102003000"');
  assert public.nashville_code_disposition(s) = 'identity_mismatch';
  s := original; s.property_address := '101 FARM RD, Nashville, TN';
  assert public.nashville_code_disposition(s) = 'identity_mismatch';
  s := original; s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes,Violations_Noted}','""');
  assert public.nashville_code_disposition(s) = 'condition_unverified';
  s.raw_payload := jsonb_set(original.raw_payload,'{nashville_codes_review,current_code_signal}','false');
  assert public.nashville_code_disposition(s) = 'condition_unverified';
  s := original; s.staging_status := 'rejected';
  assert public.nashville_code_disposition(s) = 'staging_rejected';

  s := original; s.bot_source := 'other_metro_producer'; s.raw_payload := original.raw_payload - 'nashville_codes_review';
  assert public.nashville_code_disposition(s) is null;
  assert cardinality(public.lead_quality_reasons(s)) = 0;
  s := original; s.property_value := 0;
  assert 'no_value' = any(public.lead_quality_reasons(s));
  assert not has_function_privilege('authenticated','public.nashville_code_disposition(public.homeowner_requests_staging)','execute');
  assert has_function_privilege('service_role','public.nashville_code_disposition(public.homeowner_requests_staging)','execute');
end $test$;
rollback;
