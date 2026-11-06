-- Signal leads for one county without a full scan of staging.
-- County values in staging vary ('davidson', 'Davidson County',
-- 'Davidson'); an ILIKE filter through the REST API cannot use an index,
-- so for sparse counties (Rutherford, Montgomery) the read scanned most of
-- the 400 MB table and hit the statement timeout. An expression index on
-- the normalized county plus this function returns only that county's rows
-- and only the few JSON fields the portfolio bot needs.
--
-- Additive. Rollback:
--   DROP FUNCTION public.staged_county_leads(text, uuid, integer);
--   DROP INDEX public.homeowner_requests_staging_county_norm;
BEGIN;
CREATE INDEX IF NOT EXISTS homeowner_requests_staging_county_norm
  ON public.homeowner_requests_staging ((lower(regexp_replace(coalesce(county, ''), '\s+county$', '', 'i'))));

-- Paged by id (keyset): the REST API returns at most 1,000 rows per call.
CREATE OR REPLACE FUNCTION public.staged_county_leads(p_county text, p_after uuid DEFAULT NULL, p_limit integer DEFAULT 1000)
RETURNS TABLE (id uuid, property_address text, distress_type text, bot_source text,
  metro_owner text, sub text, status text, case_nbr text)
LANGUAGE sql STABLE SET search_path = public AS $$
  -- Pick the page of ids first, then extract JSON only for those rows:
  -- extracting before the sort detoasted every Davidson row (11k) and hit
  -- the statement timeout.
  WITH page AS (
    SELECT s.id FROM homeowner_requests_staging s
    WHERE lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) = lower(p_county)
      AND s.staging_status <> 'rejected'
      AND coalesce(btrim(s.property_address), '') <> ''
      AND (upper(coalesce(s.distress_type, '')) IN
             ('PROBATE','PRE_FORECLOSURE','TRUSTEE_NOTICE','FORECLOSURE','REO','LIS_PENDENS','COURT_SALE','TAX_LIEN','BANKRUPTCY')
           OR s.bot_source = 'nashville_codes')
      AND (p_after IS NULL OR s.id > p_after)
    ORDER BY s.id
    LIMIT least(greatest(coalesce(p_limit, 1000), 1), 1000)
  )
  SELECT s.id, s.property_address, s.distress_type, s.bot_source,
    s.raw_payload->'metro_parcel'->>'owner',
    s.raw_payload->'nashville_codes'->>'Subtype_Description',
    s.raw_payload->'nashville_codes'->>'Status',
    s.raw_payload->'nashville_codes'->>'Request_Nbr'
  FROM page JOIN homeowner_requests_staging s USING (id)
  ORDER BY s.id
$$;
REVOKE ALL ON FUNCTION public.staged_county_leads(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staged_county_leads(text, uuid, integer) TO service_role;
COMMIT;
