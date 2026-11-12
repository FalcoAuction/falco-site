-- Model auctions at 90% of assessed value, not 100%.
--
-- FALCO's fee is locked at 20% of a 10% buyer's premium. The expected
-- fee used to assume the property sells at its full assessed value. 110
-- auction sales matched to county sale records (107 Parks, 2023-2026) sold
-- at a median 92.5% of county value; homes 89.7%, metro counties 90.7%;
-- 65% sold under county value. Until partner results are modeled per asset,
-- expected fee = assessed value x 0.90 x 0.10 x 0.20 (1.8% of value).
--
-- Only the expected_fee line of refresh_lead_quality changes; ranking order
-- is unchanged because every fee scales by the same factor. Today's rows are
-- rescaled in place so the CRM matches before the nightly run.
-- Rollback: re-run this file with 0.90 removed and divide today's rows by 0.9.
BEGIN;
CREATE OR REPLACE FUNCTION public.refresh_lead_quality()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

DECLARE v_total integer; v_ready integer; v_opps integer; v_attorneys integer;

BEGIN

  -- One pass over staging; everything below reads this temp table.

  CREATE TEMP TABLE _graded ON COMMIT DROP AS

  SELECT s.id, s.bot_source, upper(coalesce(s.distress_type, '')) AS dt,

    lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) AS county,

    s.property_address, coalesce(s.full_name, s.owner_name_records) AS owner_name,

    s.property_value, s.trustee_sale_date, s.staged_at,

    s.raw_payload->'asset_profile'->>'tier' AS profile_tier,

    s.raw_payload->'court_notice' AS notice,

    s.raw_payload->'metro_parcel'->>'owner_mailing' AS owner_mailing,

    upper(coalesce(s.raw_payload->'metro_parcel'->>'land_use', s.raw_payload->'padctn_owner_match'->>'land_use', '')) AS land_use,

    upper(coalesce(s.raw_payload->'nashville_codes'->>'Violations_Noted', '') || ' ' ||

          coalesce(s.raw_payload->'nashville_codes'->>'Reported_Problem', '')) AS violations,

    lead_quality_reasons(s)

      || CASE WHEN k.addr_key IS NOT NULL AND row_number() OVER (PARTITION BY k.addr_key ORDER BY s.staged_at, s.id) > 1

           THEN ARRAY['duplicate'] ELSE ARRAY[]::text[] END AS reasons

  FROM homeowner_requests_staging s

  CROSS JOIN LATERAL (SELECT nullif(lower(regexp_replace(btrim(split_part(coalesce(s.property_address, ''), ',', 1)), '\s+', ' ', 'g')), '')

    || '|' || lower(coalesce(s.county, '')) AS addr_key) k

  WHERE s.staging_status <> 'rejected';



  DELETE FROM lead_quality_daily WHERE captured_on = current_date;

  WITH per_reason AS (

    SELECT bot_source, r, count(*) AS n FROM _graded, unnest(reasons) r GROUP BY bot_source, r

  )

  INSERT INTO lead_quality_daily (captured_on, bot_source, total, launch_ready, reasons)

  SELECT current_date, g.bot_source, count(*), count(*) FILTER (WHERE cardinality(g.reasons) = 0),

    coalesce((SELECT jsonb_object_agg(p.r, p.n) FROM per_reason p WHERE p.bot_source = g.bot_source), '{}'::jsonb)

  FROM _graded g GROUP BY g.bot_source;



  DELETE FROM lead_opportunities WHERE captured_on = current_date;

  WITH ready AS (

    SELECT g.*,

      CASE

        WHEN g.dt = 'PROBATE' AND g.profile_tier IN ('land', 'multi_parcel', 'commercial') THEN 1.5

        WHEN g.dt = 'COURT_SALE' THEN 1.4

        WHEN g.dt = 'PROBATE' THEN 1.2

        WHEN g.dt = 'TAX_LIEN' THEN 1.0

        WHEN g.dt IN ('PRE_FORECLOSURE', 'TRUSTEE_NOTICE', 'FORECLOSURE', 'REO')

          THEN CASE WHEN g.trustee_sale_date IS NOT NULL AND g.trustee_sale_date < current_date + 14 THEN 0.5 ELSE 0.9 END

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.land_use <> ''

          AND g.land_use !~ '(SINGLE|DUPLEX|TRIPLEX|QUADPLEX|RESIDENTIAL|VACANT|CONDO|MOBILE|ZERO LOT|FARM|RURAL)' THEN 0.3

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.violations ~ '(STRUCTURAL|UNSAFE|VACANT|OPEN AND ACCESSIBLE|CONDEMN|UNFIT|FIRE DAMAGE)' THEN 0.7

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') THEN 0.4

        ELSE 0.6 END AS fit,

      CASE

        WHEN g.dt = 'PROBATE' AND g.profile_tier IN ('land', 'multi_parcel', 'commercial') THEN 'Estate with land or several parcels'

        WHEN g.dt = 'COURT_SALE' THEN 'Court-ordered sale'

        WHEN g.dt = 'PROBATE' THEN 'Estate home'

        WHEN g.dt = 'TAX_LIEN' THEN 'Tax sale'

        WHEN g.dt IN ('PRE_FORECLOSURE', 'TRUSTEE_NOTICE', 'FORECLOSURE', 'REO')

          THEN CASE WHEN g.trustee_sale_date IS NOT NULL AND g.trustee_sale_date < current_date + 14 THEN 'Foreclosure, sale within 14 days' ELSE 'Foreclosure' END

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.land_use <> ''

          AND g.land_use !~ '(SINGLE|DUPLEX|TRIPLEX|QUADPLEX|RESIDENTIAL|VACANT|CONDO|MOBILE|ZERO LOT|FARM|RURAL)' THEN 'Code violation, commercial'

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.violations ~ '(STRUCTURAL|UNSAFE|VACANT|OPEN AND ACCESSIBLE|CONDEMN|UNFIT|FIRE DAMAGE)' THEN 'Code violation, structural or vacant'

        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') THEN 'Code violation, housing'

        ELSE initcap(lower(g.dt)) END AS fit_label,

      round(g.property_value * 0.90 * 0.10 * 0.20, 2) AS expected_fee,

      CASE WHEN g.dt = 'PROBATE' THEN coalesce(

          (SELECT r->>'name' || ', ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(r->'address')), ', ')

           FROM jsonb_array_elements(CASE WHEN jsonb_typeof(g.notice->'representatives') = 'array' THEN g.notice->'representatives' ELSE '[]'::jsonb END) r

           WHERE jsonb_typeof(r->'address') = 'array' AND jsonb_array_length(r->'address') >= 2 LIMIT 1),

          'Executor c/o ' || (g.notice->'attorney'->'names'->>0) || ', ' ||

            array_to_string(ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(g.notice->'attorney'->'address') = 'array'

              THEN g.notice->'attorney'->'address' ELSE '[]'::jsonb END)), ', '))

        ELSE coalesce('Owner mail: ' || g.owner_mailing, 'Owner at property') END AS contact

    FROM _graded g WHERE cardinality(g.reasons) = 0 AND g.property_value > 0

  )

  INSERT INTO lead_opportunities (captured_on, rank, staging_id, bot_source, distress_type, county, property_address,

    owner_name, property_value, expected_fee, fit, fit_label, score, sale_date, contact)

  SELECT current_date, row_number() OVER (ORDER BY expected_fee * fit DESC, id), id, bot_source, dt, county,

    property_address, owner_name, property_value, expected_fee, fit, fit_label, round(expected_fee * fit, 2),

    trustee_sale_date, contact

  FROM ready ORDER BY expected_fee * fit DESC, id LIMIT 1000;



  DELETE FROM estate_attorneys_daily WHERE captured_on = current_date;

  INSERT INTO estate_attorneys_daily (captured_on, attorney_name, county, estates, valued_estates, latest_docket, office_address, last_seen)

  SELECT current_date, a.name, g.county, count(DISTINCT coalesce(g.notice->>'docket', g.id::text)),

    count(DISTINCT coalesce(g.notice->>'docket', g.id::text)) FILTER (WHERE g.property_value > 0),

    (array_agg(g.notice->>'docket' ORDER BY g.staged_at DESC))[1],

    (array_agg(array_to_string(ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(g.notice->'attorney'->'address') = 'array'

        THEN g.notice->'attorney'->'address' ELSE '[]'::jsonb END)), ', ') ORDER BY

        jsonb_array_length(CASE WHEN jsonb_typeof(g.notice->'attorney'->'address') = 'array' THEN g.notice->'attorney'->'address' ELSE '[]'::jsonb END) DESC,

        g.staged_at DESC))[1],

    max(g.staged_at)::date

  FROM _graded g

  CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(g.notice->'attorney'->'names') = 'array'

    THEN g.notice->'attorney'->'names' ELSE '[]'::jsonb END) AS a(name)

  WHERE g.dt = 'PROBATE' AND NOT ('outside_focus' = ANY (g.reasons)) AND length(a.name) BETWEEN 3 AND 80

  GROUP BY a.name, g.county;



  SELECT sum(total), sum(launch_ready) INTO v_total, v_ready FROM lead_quality_daily WHERE captured_on = current_date;

  SELECT count(*) INTO v_opps FROM lead_opportunities WHERE captured_on = current_date;

  SELECT count(*) INTO v_attorneys FROM estate_attorneys_daily WHERE captured_on = current_date;

  RETURN jsonb_build_object('captured_on', current_date, 'total', v_total, 'launch_ready', v_ready,

    'opportunities', v_opps, 'attorneys', v_attorneys);

END $function$;
UPDATE public.lead_opportunities SET expected_fee = round(expected_fee * 0.90, 2), score = round(score * 0.90, 2)
  WHERE captured_on = (SELECT max(captured_on) FROM public.lead_opportunities);
UPDATE public.landlord_portfolios SET expected_fee = round(expected_fee * 0.90, 2);
COMMIT;
