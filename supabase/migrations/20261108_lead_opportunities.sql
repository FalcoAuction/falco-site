-- Ranked auction opportunities and the estate attorney call list, built by
-- the same nightly pg_cron job as the lead quality scorecard so admin pages
-- read small tables instead of scanning staging.
--
-- lead_opportunities: launch-ready leads only (no lead_quality_reasons, not
-- a duplicate), ranked by score = expected FALCO fee x auction fit.
--   expected fee = value x 10% buyer's premium x 20% FALCO share
--   auction fit (how naturally the situation ends in an auction):
--     estate holding land, several parcels or commercial  1.5
--     court-ordered sale (partition, judicial, C&M)        1.4
--     estate, single home                                  1.2
--     tax sale / delinquent tax suit                       1.0
--     foreclosure with 14+ days to the sale, or no date    0.9
--     foreclosure inside 14 days                           0.5
--     code violation, structural or vacant                 0.7
--     code violation, housing                              0.4
--     code violation on a commercial parcel                0.3
-- New reasons: entity_owner by owner name (non-probate), above_scope (> $5M),
-- weak_signal (demolition permits and nuisance code cases).
--   Fit weights are a judgment call to start from; revisit once real
--   conversions exist.
-- estate_attorneys_daily: attorneys named on probate notices in the focus
-- counties, by estate count, with the latest office address and how many
-- of their estates are matched to a valued property.
--
-- Additive (replaces refresh_lead_quality with a superset). Rollback:
--   DROP TABLE public.lead_opportunities, public.estate_attorneys_daily;
--   then re-run 20261106_lead_quality_scorecard.sql's refresh_lead_quality.
BEGIN;

CREATE TABLE public.lead_opportunities (
  captured_on date NOT NULL,
  rank integer NOT NULL,
  staging_id uuid NOT NULL,
  bot_source text NOT NULL,
  distress_type text,
  county text,
  property_address text,
  owner_name text,
  property_value numeric NOT NULL,
  expected_fee numeric NOT NULL,
  fit numeric NOT NULL,
  fit_label text NOT NULL,
  score numeric NOT NULL,
  sale_date date,
  contact text,
  PRIMARY KEY (captured_on, rank)
);
CREATE TABLE public.estate_attorneys_daily (
  captured_on date NOT NULL,
  attorney_name text NOT NULL,
  county text NOT NULL,
  estates integer NOT NULL,
  valued_estates integer NOT NULL,
  latest_docket text,
  office_address text,
  last_seen date,
  PRIMARY KEY (captured_on, attorney_name, county)
);
ALTER TABLE public.lead_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_attorneys_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_opportunities, public.estate_attorneys_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lead_opportunities, public.estate_attorneys_daily TO service_role;

-- Grading additions: company owners caught by name (owner_classifier only
-- flags rows it has seen; the first ranking was topped by $50M+ apartment
-- complexes owned by out-of-state LLCs) and an above_scope reason for
-- values over $5M. Still inlineable: no SET clause.
CREATE OR REPLACE FUNCTION public.lead_quality_reasons(s public.homeowner_requests_staging) RETURNS text[]
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
    -- Owner classifier flag, or (outside probate, where family trusts are
    -- normal) a company word in the owner of record from any source.
    CASE WHEN coalesce(s.phone_metadata->>'owner_class', 'homeowner') <> 'homeowner'
      OR (upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND upper(coalesce(s.raw_payload->'metro_parcel'->>'owner',
            s.raw_payload->'padctn'->>'owner', s.owner_name_records, s.full_name, '')) ~
          '\m(LLC|L L C|INC|CORP|CORPORATION|COMPANY|LP|LLP|LTD|TRUST|TRUSTEES?|PARTNERS|PARTNERSHIP|HOLDINGS?|PROPERTIES|PROPERTY|INVESTMENTS?|APARTMENTS|ASSOCIATION|ASSN|CHURCH|MINISTRIES|BANK|FUND|REIT|AUTHORITY|DEVELOPMENT|ENTERPRISES|GROUP|VENTURES|REALTY|CAPITAL|EQUITIES|HOUSING|METROPOLITAN GOVERNMENT|CITY OF|STATE OF)\M')
      THEN 'entity_owner' END,
    -- A $5M+ building is not a FALCO auction lead (institutional sale).
    CASE WHEN coalesce(s.property_value, 0) > 5000000 THEN 'above_scope' END,
    -- Signals that are not a reason to sell: demolition permits are owners
    -- redeveloping voluntarily; grass, sign, short-term rental, home
    -- business, right-of-way, tree and audit cases are nuisance tickets.
    -- Codes housing cases (habitability) and landlord violations stay.
    CASE WHEN s.bot_source = 'davidson_demolition'
      OR (s.bot_source = 'nashville_codes' AND coalesce(s.raw_payload->'nashville_codes'->>'Subtype_Description', '')
          NOT IN ('Codes Housing Request', 'CA Codes Case', 'Landlord Registration Violation'))
      THEN 'weak_signal' END,
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

CREATE OR REPLACE FUNCTION public.refresh_lead_quality() RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
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
      round(g.property_value * 0.10 * 0.20, 2) AS expected_fee,
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
END $$;
COMMIT;
