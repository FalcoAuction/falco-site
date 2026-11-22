-- Read the publisher's sale date on this notice; never classify the sale outcome.
create or replace function public.herald_elapsed_sale_date(s public.homeowner_requests_staging)
returns date language plpgsql stable set search_path = pg_catalog as $$
declare
  printed text;
  advertised date;
begin
  if s.bot_source is distinct from 'hamilton_county_herald'
     or s.distress_type is distinct from 'PRE_FORECLOSURE' then return null; end if;
  printed := coalesce(nullif(s.raw_payload->>'notice_sale_date',''), s.raw_payload->>'advertised_auction_date');
  if printed is null or printed !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  advertised := printed::date;
  if advertised < (current_timestamp at time zone 'America/New_York')::date then return advertised; end if;
  return null;
exception when datetime_field_overflow or invalid_datetime_format then return null;
end $$;

do $migration$
declare
  definition text := pg_get_functiondef('public.lead_quality_reasons(public.homeowner_requests_staging)'::regprocedure);
  anchor text := '  SELECT array_remove(ARRAY[';
begin
  if position('herald_advertised_date_elapsed' in definition) > 0 then return; end if;
  if array_length(string_to_array(definition, anchor),1) <> 2 then raise exception 'Unexpected quality function'; end if;
  execute replace(definition, anchor, anchor || $rule$
    CASE WHEN s.bot_source = 'hamilton_county_herald' AND public.herald_elapsed_sale_date(s) IS NOT NULL THEN 'herald_advertised_date_elapsed' END,
$rule$);
end $migration$;

create or replace view public.crm_visible_opportunities with (security_invoker = true) as
select o.* from public.crm_ranked_opportunities o
where o.bot_source not in ('nashville_codes', 'warn_notices', 'hamilton_county_herald')
union all
select o.* from public.crm_ranked_opportunities o
cross join lateral (
  select 1 from public.homeowner_requests_staging s
  where s.id = o.staging_id and s.bot_source = 'nashville_codes' and public.nashville_code_disposition(s) = 'open'
  offset 0
) eligible where o.bot_source = 'nashville_codes'
union all
select o.* from public.crm_ranked_opportunities o
cross join lateral (
  select 1 from public.homeowner_requests_staging s
  where s.id = o.staging_id and s.bot_source = 'hamilton_county_herald'
    and public.herald_elapsed_sale_date(s) is null
  offset 0
) eligible where o.bot_source = 'hamilton_county_herald';
revoke all on public.crm_visible_opportunities from public, anon, authenticated;
grant select on public.crm_visible_opportunities to service_role;
notify pgrst, 'reload schema';
