-- Shared by lead_quality_reasons and the authenticated CRM (PostgREST computed field).
create or replace function public.nashville_code_disposition(s public.homeowner_requests_staging)
returns text language plpgsql stable security invoker set search_path = pg_catalog as $$
declare
  record jsonb := s.raw_payload->'nashville_codes';
  review jsonb := s.raw_payload->'nashville_codes_review';
  request_no text := btrim(record->>'Request_Nbr');
  official text := upper(btrim(review->>'official_status'));
  street text := upper(btrim(record->>'Property_Address'));
  checked date;
  bytes bytea;
  encoded_case text;
begin
  if s.bot_source is distinct from 'nashville_codes' then return null; end if;
  if s.distress_type is distinct from 'CODE_VIOLATION' or coalesce(request_no,'') = ''
     or review->>'case_number' is distinct from request_no then return 'unverified_case'; end if;
  if (review->>'checked_on') is null or review->>'checked_on' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'unverified_case'; end if;
  begin
    checked := (review->>'checked_on')::date;
  exception when datetime_field_overflow or invalid_datetime_format then return 'unverified_case';
  end;
  if checked > (now() at time zone 'UTC')::date then return 'unverified_case'; end if;

  -- Match the producer's URL-quoted Request_Nbr filter, including SQL-literal escaping.
  bytes := convert_to(replace(request_no,'''',''''''),'UTF8');
  select string_agg(case when chr(b) ~ '^[A-Za-z0-9_.~-]$' then chr(b)
                         else '%' || upper(lpad(to_hex(b),2,'0')) end, '' order by i)
    into encoded_case from generate_series(0,length(bytes)-1) i
    cross join lateral (select get_byte(bytes,i) as b) v;
  if review->>'source_url' is distinct from
     ('https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Property_Standards_Violations_2/FeatureServer/0/query?f=json&where=Request_Nbr%3D%27' || encoded_case || '%27')
     then return 'unverified_case'; end if;
  if review->>'status' in ('not_found','ambiguous_case','identity_mismatch','unrecognized') then return review->>'status'; end if;
  if lower(btrim(coalesce(s.county,''))) not in ('davidson','davidson county')
     or coalesce(street,'') = ''
     or upper(btrim(review->>'property_address')) is distinct from street
     or upper(btrim(split_part(s.property_address,',',1))) is distinct from street
     or nullif(btrim(review->>'property_apn'),'') is distinct from nullif(btrim(record->>'Property_APN'),'')
     then return 'identity_mismatch'; end if;
  if upper(btrim(record->>'Status')) is distinct from official then return 'unverified_case'; end if;
  if review->>'status' = 'inactive' and official in ('DONE','CLOSED') then return lower(official); end if;
  if review->>'status' is distinct from 'open' or official is distinct from 'OPEN' then return 'unverified_case'; end if;
  if coalesce(btrim(record->>'Violations_Noted'),'') = ''
     or btrim(review->>'violations_noted') is distinct from btrim(record->>'Violations_Noted')
     or review->'current_code_signal' is distinct from 'true'::jsonb
     or public.lead_code_severity(s) is distinct from 'severe' then return 'condition_unverified'; end if;
  if s.staging_status = 'rejected' then return 'staging_rejected'; end if;
  return 'open';
end
$$;
revoke all on function public.nashville_code_disposition(public.homeowner_requests_staging) from public,anon,authenticated;
grant execute on function public.nashville_code_disposition(public.homeowner_requests_staging) to service_role;

-- Keep concurrent changes to other lanes. Abort on an unrecognized function body.
do $migration$
declare
  definition text := pg_get_functiondef('public.lead_quality_reasons(public.homeowner_requests_staging)'::regprocedure);
  anchor text := '  SELECT array_remove(ARRAY[';
begin
  if position('public.nashville_code_disposition(s)' in definition) > 0 then return; end if;
  if array_length(string_to_array(definition, anchor),1) <> 2 then
    raise exception 'Unexpected lead_quality_reasons body';
  end if;
  execute replace(definition,anchor,anchor || $rule$
    CASE WHEN s.bot_source = 'nashville_codes' THEN
      'nashville_code_' || nullif(public.nashville_code_disposition(s),'open') END,
$rule$);
end
$migration$;
