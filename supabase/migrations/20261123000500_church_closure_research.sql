-- This collector records congregational closures. An exact parcel or listing
-- observation does not establish an auction opportunity. Independent sources
-- retain their own eligibility, including records for the same property.
do $migration$
declare
  definition text := pg_get_functiondef('public.lead_quality_reasons(public.homeowner_requests_staging)'::regprocedure);
  anchor text := '  SELECT array_remove(ARRAY[';
  rule text := 'CASE WHEN s.bot_source = ''church_closure'' THEN ''church_closure_research'' END,';
begin
  if strpos(definition, rule) = 0 then
    if array_length(string_to_array(definition, anchor), 1) <> 2 then
      raise exception 'Unexpected lead_quality_reasons definition';
    end if;
    execute replace(definition, anchor, anchor || chr(10) || '    ' || rule);
  end if;
end $migration$;

-- Apply the hold to old snapshots immediately. Preserve the columns, owner,
-- ACLs and source-specific branches of the existing security-invoker view.
do $migration$
declare
  definition text := pg_get_viewdef('public.crm_visible_opportunities'::regclass, true);
  anchor text := '''hamilton_county_herald''::text])';
  replacement text := '''hamilton_county_herald''::text, ''church_closure''::text])';
begin
  if strpos(definition, replacement) = 0 then
    if array_length(string_to_array(definition, anchor), 1) <> 2 then
      raise exception 'Unexpected crm_visible_opportunities source exclusions';
    end if;
    execute 'create or replace view public.crm_visible_opportunities with (security_invoker=true) as '
            || replace(definition, anchor, replacement);
  end if;
end $migration$;

notify pgrst, 'reload schema';
