-- Lead quality scorecard. Grades every staged lead against one written
-- "launch-ready" standard and keeps a nightly per-source summary, so
-- when paid enrichment and outreach switch on we spend on leads that are
-- ready instead of discovering what is broken.
--
-- A lead is launch-ready when it has no reasons:
--   outside_focus     county is not one of the 10 Middle TN focus counties
--   no_property       no property address (business closures excepted)
--   owner_unmatched   probate decedent not matched to an assessor parcel
--   no_value          no property value (business closures excepted)
--   below_fee_floor   value under $50,000: FALCO's fee at a 10% buyer's
--                     premium and 20% share would be under the $1,000 floor
--   entity_owner      owner_classifier says LLC, church, government, etc.
--   no_contact_path   probate with no executor or attorney mailing address
--   sale_passed       trustee sale date is in the past
--   estate_over_6mo   probate notice staged more than 180 days ago
--   duplicate         same street address and county as an earlier lead
--                     (computed in refresh_lead_quality, not per row)
-- Rejected rows are not graded.
--
-- Additive. Rollback:
--   DROP FUNCTION public.refresh_lead_quality();
--   DROP FUNCTION public.lead_quality_reasons(public.homeowner_requests_staging);
--   DROP TABLE public.lead_quality_daily;
BEGIN;

-- No SET clause: a plain SQL function is inlined into the refresh query,
-- which is what keeps the nightly refresh inside the API statement timeout.
-- It references no tables, only built-in functions.
CREATE FUNCTION public.lead_quality_reasons(s public.homeowner_requests_staging) RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) NOT IN
      ('davidson','williamson','sumner','rutherford','wilson','maury','montgomery','cheatham','robertson','dickson')
      THEN 'outside_focus' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'BUSINESS_CLOSURE' AND coalesce(btrim(s.property_address), '') = ''
      THEN 'no_property' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE'
      AND NOT (jsonb_typeof(s.raw_payload->'padctn_owner_match') = 'object' OR s.raw_payload->'owner_match'->>'status' = 'matched')
      THEN 'owner_unmatched' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'BUSINESS_CLOSURE' AND coalesce(s.property_value, 0) <= 0
      THEN 'no_value' END,
    CASE WHEN coalesce(s.property_value, 0) > 0 AND s.property_value < 50000 THEN 'below_fee_floor' END,
    CASE WHEN coalesce(s.phone_metadata->>'owner_class', 'homeowner') <> 'homeowner' THEN 'entity_owner' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.raw_payload->'court_notice'->'representatives') = 'array'
          THEN s.raw_payload->'court_notice'->'representatives' ELSE '[]'::jsonb END) r
        WHERE jsonb_typeof(r->'address') = 'array' AND jsonb_array_length(r->'address') >= 2)
      AND coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(s.raw_payload->'court_notice'->'attorney'->'address') = 'array'
        THEN s.raw_payload->'court_notice'->'attorney'->'address' END), 0) < 2
      THEN 'no_contact_path' END,
    CASE WHEN s.trustee_sale_date IS NOT NULL AND s.trustee_sale_date < current_date THEN 'sale_passed' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE' AND s.staged_at < now() - interval '180 days'
      THEN 'estate_over_6mo' END
  ], NULL)
$$;

CREATE TABLE public.lead_quality_daily (
  captured_on date NOT NULL,
  bot_source text NOT NULL,
  total integer NOT NULL,
  launch_ready integer NOT NULL,
  reasons jsonb NOT NULL DEFAULT '{}'::jsonb,   -- reason -> lead count (a lead can have several)
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (captured_on, bot_source)
);
ALTER TABLE public.lead_quality_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_quality_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lead_quality_daily TO service_role;

-- Rewrites today's rows. Duplicates: the earliest-staged lead at a street
-- address + county keeps it; later ones, from any source, are duplicates.
CREATE FUNCTION public.refresh_lead_quality() RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_total integer; v_ready integer;
BEGIN
  DELETE FROM lead_quality_daily WHERE captured_on = current_date;
  WITH graded AS (
    SELECT s.bot_source,
      lead_quality_reasons(s)
        || CASE WHEN k.addr_key IS NOT NULL AND row_number() OVER (PARTITION BY k.addr_key ORDER BY s.staged_at, s.id) > 1
             THEN ARRAY['duplicate'] ELSE ARRAY[]::text[] END AS reasons
    FROM homeowner_requests_staging s
    CROSS JOIN LATERAL (SELECT nullif(lower(regexp_replace(btrim(split_part(coalesce(s.property_address, ''), ',', 1)), '\s+', ' ', 'g')), '')
      || '|' || lower(coalesce(s.county, '')) AS addr_key) k
    WHERE s.staging_status <> 'rejected'
  ), per_reason AS (
    SELECT bot_source, r, count(*) AS n FROM graded, unnest(reasons) r GROUP BY bot_source, r
  )
  INSERT INTO lead_quality_daily (captured_on, bot_source, total, launch_ready, reasons)
  SELECT current_date, g.bot_source, count(*), count(*) FILTER (WHERE cardinality(g.reasons) = 0),
    coalesce((SELECT jsonb_object_agg(p.r, p.n) FROM per_reason p WHERE p.bot_source = g.bot_source), '{}'::jsonb)
  FROM graded g GROUP BY g.bot_source;
  SELECT sum(total), sum(launch_ready) INTO v_total, v_ready FROM lead_quality_daily WHERE captured_on = current_date;
  RETURN jsonb_build_object('captured_on', current_date, 'total', v_total, 'launch_ready', v_ready);
END $$;

REVOKE ALL ON FUNCTION public.lead_quality_reasons(public.homeowner_requests_staging), public.refresh_lead_quality()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_quality_reasons(public.homeowner_requests_staging), public.refresh_lead_quality()
  TO service_role;
COMMIT;

-- Nightly refresh inside the database. The refresh reads all of staging
-- (about 400 MB with raw notice text) and takes 8-10 s, past the REST API
-- statement timeout, so it runs on pg_cron instead of from a bot. 03:30 UTC
-- is after the early pipeline run. Rollback: SELECT cron.unschedule('lead-quality-refresh');
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('lead-quality-refresh', '30 3 * * *', 'SELECT public.refresh_lead_quality()');
