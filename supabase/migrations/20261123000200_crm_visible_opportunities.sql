-- Compose the independent source gates before the dashboard count and first-page limit.
create or replace view public.crm_visible_opportunities with (security_invoker = true) as
select o.* from public.crm_ranked_opportunities o where o.bot_source <> 'nashville_codes'
union all
select o.* from public.crm_ranked_opportunities o
cross join lateral (
  select 1 from public.homeowner_requests_staging s
  where s.id = o.staging_id and s.bot_source = 'nashville_codes' and public.nashville_code_disposition(s) = 'open'
  offset 0
) eligible where o.bot_source = 'nashville_codes';
revoke all on public.crm_visible_opportunities from public, anon, authenticated;
grant select on public.crm_visible_opportunities to service_role;
