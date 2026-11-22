-- The collector retains the last date on removal. Silence is a review hold.
create or replace function public.mackie_notice_hold(s public.homeowner_requests_staging)
returns text language plpgsql stable security invoker set search_path = pg_catalog as $$
declare
  flag text;
  live record;
begin
  if s.bot_source is distinct from 'mackie_wolf_trustee' then return null; end if;
  flag := s.phone_metadata->'sale_status'->>'status';
  if s.staging_status = 'rejected' then return 'notice_rejected'; end if;
  for live in select h.trustee_sale_date, h.phone_metadata from public.homeowner_requests h
      where h.source = 'bot' and h.pipeline_lead_key = s.pipeline_lead_key loop
    if live.phone_metadata->'sale_status'->>'status' in ('cancelled','ran','reinstated') then
      if live.phone_metadata->'sale_status'->>'status' = 'cancelled' and live.phone_metadata->'sale_status'->>'updated_by' = 'trustee_status_reaper' then return 'stale_notice'; end if;
      return live.phone_metadata->'sale_status'->>'status';
    end if;
    if live.phone_metadata->'sale_status'->>'status' = 'postponed' then
      if live.trustee_sale_date is distinct from s.trustee_sale_date then return 'postponement_date_requires_review'; end if;
    elsif live.phone_metadata->'trustee_notice_review'->>'reason' = 'stale_notice' then return 'stale_notice';
    end if;
  end loop;
  if flag in ('cancelled','ran','reinstated') then
    if flag = 'cancelled' and s.phone_metadata->'sale_status'->>'updated_by' = 'trustee_status_reaper' then return 'stale_notice'; end if;
    return flag;
  end if;
  if flag is distinct from 'postponed' and s.phone_metadata->'trustee_notice_review'->>'reason' = 'stale_notice' then return 'stale_notice'; end if;
  if s.trustee_sale_date is null or s.trustee_sale_date < current_date then return 'sale_date_requires_review'; end if;
  return null;
end $$;
revoke all on function public.mackie_notice_hold(public.homeowner_requests_staging) from public, anon, authenticated;
grant execute on function public.mackie_notice_hold(public.homeowner_requests_staging) to service_role;

-- Filter on the effective date before ORDER, LIMIT, and dashboard counts.
create or replace view public.crm_ranked_opportunities with (security_invoker = true) as
select o.captured_on,o.rank,o.staging_id,o.bot_source,o.distress_type,o.county,o.property_address,
       o.owner_name,o.property_value,o.expected_fee,o.fit_label,o.score,o.sale_date,o.contact
from public.lead_opportunities o where o.bot_source <> 'mackie_wolf_trustee'
union all
select o.captured_on,o.rank,o.staging_id,o.bot_source,o.distress_type,o.county,o.property_address,
       o.owner_name,o.property_value,o.expected_fee,
       case when s.trustee_sale_date < current_date + 14 then 'Foreclosure, sale within 14 days' else 'Foreclosure' end,
       o.score,s.trustee_sale_date,o.contact
from public.lead_opportunities o
cross join lateral (
  -- Keep the review lookup behind the ranked staging ID even for dashboard counts.
  select s.trustee_sale_date from public.homeowner_requests_staging s
  where s.id = o.staging_id and s.bot_source = o.bot_source and public.mackie_notice_hold(s) is null
  offset 0
) s where o.bot_source = 'mackie_wolf_trustee';
revoke all on public.crm_ranked_opportunities from public, anon, authenticated;
grant select on public.crm_ranked_opportunities to service_role;

-- Preserve independently shipped changes to the common functions. Fail on drift.
do $migration$
declare
  item record;
  definition text;
begin
  for item in select * from (values
    ('public.lead_quality_reasons(public.homeowner_requests_staging)', '  SELECT array_remove(ARRAY[',
      '  SELECT array_remove(ARRAY[' || chr(10) || '    CASE WHEN s.bot_source = ''mackie_wolf_trustee'' THEN public.mackie_notice_hold(s) END,'),
    ('public.promote_staged_lead(uuid,text)', '  IF v_staged.staging_status = ''verified'' THEN',
      '  IF v_staged.bot_source = ''mackie_wolf_trustee'' AND public.mackie_notice_hold(v_staged) IS NOT NULL THEN
    RETURN jsonb_build_object(''ok'', false, ''error'', ''mackie_notice_on_hold'');
  END IF;
  IF v_staged.staging_status = ''verified'' THEN'),
    ('public.sync_sale_dates()', '  WHERE s.trustee_sale_date IS NOT NULL',
      '  WHERE s.bot_source IS DISTINCT FROM ''mackie_wolf_trustee'' AND s.trustee_sale_date IS NOT NULL'),
    ('public.sync_sale_dates()', '  WHERE h.source = ''bot'';',
      '  WHERE h.source = ''bot'' AND NOT EXISTS (
    SELECT 1 FROM public.homeowner_requests_staging mw
    WHERE mw.pipeline_lead_key = h.pipeline_lead_key AND mw.bot_source = ''mackie_wolf_trustee''
  );')
  ) edits(signature,anchor,replacement) loop
    definition := pg_get_functiondef(item.signature::regprocedure);
    if strpos(definition,item.replacement) > 0 then continue; end if;
    if array_length(string_to_array(definition,item.anchor),1) <> 2 then raise exception 'Unexpected function body: %',item.signature; end if;
    execute replace(definition,item.anchor,item.replacement);
  end loop;
end $migration$;
