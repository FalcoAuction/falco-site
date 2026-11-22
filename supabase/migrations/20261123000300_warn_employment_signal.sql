-- Property ranking is separate from documented personal-property opportunities.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.lead_quality_reasons(public.homeowner_requests_staging)'::regprocedure);
  anchor text := '  SELECT array_remove(ARRAY[';
BEGIN
  IF position('warn_employment_notice' in definition) > 0 THEN RETURN; END IF;
  IF array_length(string_to_array(definition, anchor), 1) <> 2 THEN
    RAISE EXCEPTION 'Unexpected lead quality function structure';
  END IF;
  EXECUTE replace(definition, anchor, anchor || $rule$
    CASE WHEN s.bot_source = 'warn_notices' THEN 'warn_employment_notice' END,
$rule$);
END
$migration$;

create or replace view public.crm_visible_opportunities with (security_invoker = true) as
select o.* from public.crm_ranked_opportunities o where o.bot_source not in ('nashville_codes', 'warn_notices')
union all
select o.* from public.crm_ranked_opportunities o
cross join lateral (
  select 1 from public.homeowner_requests_staging s
  where s.id = o.staging_id and s.bot_source = 'nashville_codes' and public.nashville_code_disposition(s) = 'open'
  offset 0
) eligible where o.bot_source = 'nashville_codes';
revoke all on public.crm_visible_opportunities from public, anon, authenticated;
grant select on public.crm_visible_opportunities to service_role;
