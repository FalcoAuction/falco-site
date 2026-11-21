DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.lead_quality_reasons(public.homeowner_requests_staging)'::regprocedure);
  anchor text := '  SELECT array_remove(ARRAY[';
BEGIN
  IF position('abandonment_requires_asset_and_authority' in definition) > 0 THEN RETURN; END IF;
  IF array_length(string_to_array(definition, anchor), 1) <> 2 THEN
    RAISE EXCEPTION 'Unexpected lead quality function structure';
  END IF;
  EXECUTE replace(definition, anchor, anchor || $rule$
    CASE WHEN s.bot_source = 'bankruptcy_events' AND s.distress_type = 'BK_ABANDONED'
      AND NOT coalesce(
        s.raw_payload->'abandonment_review'->>'status' = 'verified_sale_opportunity'
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'asset_reference', '')) <> ''
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'authorized_seller', '')) <> ''
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'verification_source', '')) <> '',
        false)
      THEN 'abandonment_requires_asset_and_authority' END,
$rule$);
END
$migration$;
