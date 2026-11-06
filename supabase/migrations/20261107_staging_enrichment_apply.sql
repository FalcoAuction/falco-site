-- Batch enrichment writes for homeowner_requests_staging that never read
-- or resend raw_payload from the client. Staging rows carry full notice
-- text (about 400 MB in total), so the read-modify-write pattern every
-- enricher used (select raw_payload, merge in Python, update) moved that
-- text over the API twice per row and helped saturate disk IO on
-- 2026-11-05.
--
-- apply_staging_enrichment(p_rows): p_rows is a JSON array of
--   {"id": uuid,
--    "property_value": number,         -- set only when the row has none
--    "property_value_source": text,
--    "property_value_as_of": date,
--    "raw_patch": {...},               -- merged into raw_payload (top-level keys)
--    "meta_patch": {...}}              -- merged into phone_metadata
-- Never overwrites an existing value. Returns rows updated. At most 500
-- entries per call.
--
-- Additive. Rollback: DROP FUNCTION public.apply_staging_enrichment(jsonb);
BEGIN;

CREATE FUNCTION public.apply_staging_enrichment(p_rows jsonb) RETURNS integer
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'p_rows must be an array of at most 500 entries' USING ERRCODE = '22023';
  END IF;
  WITH input AS (
    SELECT (e->>'id')::uuid AS id,
      CASE WHEN jsonb_typeof(e->'property_value') = 'number' AND (e->>'property_value')::numeric > 0
        THEN (e->>'property_value')::numeric END AS value,
      nullif(e->>'property_value_source', '') AS value_source,
      nullif(e->>'property_value_as_of', '')::date AS value_as_of,
      CASE WHEN jsonb_typeof(e->'raw_patch') = 'object' THEN e->'raw_patch' ELSE '{}'::jsonb END AS raw_patch,
      CASE WHEN jsonb_typeof(e->'meta_patch') = 'object' THEN e->'meta_patch' ELSE '{}'::jsonb END AS meta_patch
    FROM jsonb_array_elements(p_rows) e
  )
  UPDATE homeowner_requests_staging s SET
    property_value = CASE WHEN coalesce(s.property_value, 0) <= 0 AND i.value IS NOT NULL THEN i.value ELSE s.property_value END,
    property_value_source = CASE WHEN coalesce(s.property_value, 0) <= 0 AND i.value IS NOT NULL
      THEN coalesce(i.value_source, s.property_value_source) ELSE s.property_value_source END,
    property_value_as_of = CASE WHEN coalesce(s.property_value, 0) <= 0 AND i.value IS NOT NULL
      THEN coalesce(i.value_as_of, s.property_value_as_of) ELSE s.property_value_as_of END,
    raw_payload = CASE WHEN i.raw_patch = '{}'::jsonb THEN s.raw_payload
      ELSE coalesce(s.raw_payload, '{}'::jsonb) || i.raw_patch END,
    phone_metadata = CASE WHEN i.meta_patch = '{}'::jsonb THEN s.phone_metadata
      ELSE coalesce(s.phone_metadata, '{}'::jsonb) || i.meta_patch END
  FROM input i WHERE s.id = i.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.apply_staging_enrichment(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_staging_enrichment(jsonb) TO service_role;
COMMIT;
