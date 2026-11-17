-- Auctionable leads only. The ranked CRM list (lead_opportunities) now
-- keeps a lead only when all three hold:
--   1. A reason to sell now: foreclosure, estate, tax sale, court sale,
--      a bankruptcy event that frees the lender (dismissal, stay relief,
--      abandonment), or a code case where the structure itself is
--      failing. New bankruptcy filings (the trustee or the court controls
--      the house) and nuisance tickets (junk, grass, parked cars, fences,
--      signs, permits) no longer qualify, even once they reach court.
--   2. An auctionable asset: privately owned, $150k to $5M, with equity
--      when the loan balance is known.
--   3. A reachable owner from free data: a named owner plus a mailing
--      address or a phone. Foreclosure, tax and court notices name the
--      owner at the property, which is enough to mail. Phones come from
--      paid skip tracing later; the ranked list is the queue to spend
--      that budget on.
-- Recreated from the live definitions on 2026-11-17 (refresh_lead_quality
-- is identical to 20261116_bankruptcy_events_lead_quality.sql).

-- 'severe' when the structure itself is failing (dilapidated, unsafe,
-- open to entry, condemned, fire damaged, vacant and boarded), else
-- 'nuisance' (junk, grass, parked cars, fences, signs, permits; even once
-- they reach environmental court they are not a reason to sell). NULL
-- for leads that are not code cases.
CREATE OR REPLACE FUNCTION public.lead_code_severity(s homeowner_requests_staging)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN upper(coalesce(s.distress_type, '')) NOT IN ('CODE_VIOLATION', 'DEMOLITION') THEN NULL
    WHEN upper(concat_ws(' ',
        s.raw_payload->'nashville_codes'->>'Violations_Noted',
        s.raw_payload->'nashville_codes'->>'Reported_Problem',
        CASE WHEN s.raw_payload->>'state' = 'FL' THEN concat_ws(' ', s.raw_payload->>'case_type', s.raw_payload->>'case_name') END,
        s.raw_payload->'issue'->>'summary',
        s.raw_payload->'issue'->>'description'))
      ~ '(DILAPIDATED (?!SIGN)|STRUCTURAL|UNSAFE|OPEN AND ACCESSIBLE|OPEN & ACCESSIBLE|CONDEMN|UNFIT FOR|UNINHABIT|FIRE DAMAGE|FIRE-DAMAGE|DEMOLI|COLLAPS|BOARD UP|BOARDED|DERELICT|VACANT (HOUSE|HOME|BUILDING|STRUCTURE|DWELLING)|VACANT AND OPEN|ABANDONED (HOUSE|HOME|BUILDING|STRUCTURE|DWELLING))'
      THEN 'severe'
    ELSE 'nuisance' END
$function$;

CREATE OR REPLACE FUNCTION public.lead_quality_reasons(s homeowner_requests_staging)
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT array_remove(ARRAY[
    CASE WHEN lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) NOT IN
      ('davidson','williamson','sumner','rutherford','wilson','maury','montgomery','cheatham','robertson','dickson')
      AND NOT (s.raw_payload->>'state' = 'FL' AND lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) IN
        ('miami-dade','broward','palm beach','hillsborough','orange','pinellas','duval','lee','collier','sarasota'))
      THEN 'outside_focus' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'BUSINESS_CLOSURE' AND coalesce(btrim(s.property_address), '') = ''
      THEN 'no_property' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE'
      AND NOT (jsonb_typeof(s.raw_payload->'padctn_owner_match') = 'object' OR s.raw_payload->'owner_match'->>'status' = 'matched'
               OR jsonb_typeof(s.raw_payload->'fl_parcel') = 'object')
      THEN 'owner_unmatched' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'BUSINESS_CLOSURE' AND coalesce(s.property_value, 0) <= 0
      THEN 'no_value' END,
    CASE WHEN coalesce(s.property_value, 0) > 0 AND s.property_value < 150000 THEN 'below_fee_floor' END,
    -- Owner classifier flag, or (outside probate, where family trusts are
    -- normal) a company word in the owner of record from any source.
    CASE WHEN coalesce(s.phone_metadata->>'owner_class', 'homeowner') <> 'homeowner'
      OR (upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND upper(coalesce(s.raw_payload->'metro_parcel'->>'owner',
            s.raw_payload->'padctn'->>'owner', s.raw_payload->'fl_parcel'->>'owner', s.owner_name_records, s.full_name, '')) ~
          '\m(LLC|L L C|INC|CORP|CORPORATION|COMPANY|LP|LLP|LTD|TRUST|TRUSTEES?|PARTNERS|PARTNERSHIP|HOLDINGS?|PROPERTIES|PROPERTY|INVESTMENTS?|APARTMENTS|ASSOCIATION|ASSN|CHURCH|MINISTRIES|BANK|FUND|REIT|AUTHORITY|DEVELOPMENT|ENTERPRISES|GROUP|VENTURES|REALTY|CAPITAL|EQUITIES|HOUSING|METROPOLITAN GOVERNMENT|CITY OF|STATE OF)\M')
      THEN 'entity_owner' END,
    -- FL roll use codes 070-099: churches, schools, hospitals, government,
    -- utilities. Never a private seller.
    CASE WHEN s.raw_payload->'fl_parcel'->>'use_code' >= '070' THEN 'public_or_institutional' END,
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
      AND NOT (s.raw_payload->>'source' = 'hillsclerk_daily' AND coalesce(s.raw_payload->>'petitioner', '') <> ''
               AND coalesce(s.raw_payload->>'petitioner_address', '') <> '')
      THEN 'no_contact_path' END,
    -- Code cases: only a failing structure is a reason to sell.
    CASE WHEN lead_code_severity(s) = 'nuisance' THEN 'nuisance_violation' END,
    -- A new bankruptcy filing puts the house under the trustee or the
    -- court, not the owner. The bankruptcy_events types (dismissed, stay
    -- relief, abandoned) are when it comes back into play.
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'BANKRUPTCY' THEN 'bankruptcy_filing_only' END,
    -- Known loan at 90%+ of value: an auction would only pay the lender.
    CASE WHEN coalesce(s.mortgage_balance, 0) > 0 AND coalesce(s.property_value, 0) > 0
      AND s.mortgage_balance >= s.property_value * 0.9 THEN 'no_equity' END,
    -- Someone to reach for free: a named owner, plus a mailing address or
    -- a phone. Foreclosure, tax and court notices name the owner at the
    -- property, which is enough to mail. Estates are covered below.
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND (
        coalesce(btrim(coalesce(s.full_name, s.owner_name_records, s.raw_payload->'metro_parcel'->>'owner',
          s.raw_payload->'comptroller_parcel'->>'owner', s.raw_payload->'fl_parcel'->>'owner')), '') = ''
        OR (upper(coalesce(s.distress_type, '')) NOT IN ('PRE_FORECLOSURE', 'TRUSTEE_NOTICE', 'FORECLOSURE', 'LIS_PENDENS', 'TAX_LIEN', 'COURT_SALE')
          AND coalesce(btrim(s.phone), '') = ''
          AND coalesce(s.raw_payload->'metro_parcel'->>'owner_mailing', s.raw_payload->'comptroller_parcel'->>'owner_mailing',
            s.raw_payload->'fl_parcel'->>'mailing_address', '') = ''))
      THEN 'no_owner_contact' END,
    CASE WHEN s.trustee_sale_date IS NOT NULL AND s.trustee_sale_date < current_date THEN 'sale_passed' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE' AND s.staged_at < now() - interval '180 days'
      THEN 'estate_over_6mo' END
  ], NULL)
$function$;

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
    coalesce(s.raw_payload->'metro_parcel'->>'owner_mailing', s.raw_payload->'comptroller_parcel'->>'owner_mailing',
      s.raw_payload->'fl_parcel'->>'mailing_address') AS owner_mailing,
    upper(coalesce(s.raw_payload->'metro_parcel'->>'land_use', s.raw_payload->'padctn_owner_match'->>'land_use',
      -- DOR use codes: 000-009 residential except 003 (10+ unit apartments).
      CASE WHEN s.raw_payload->'fl_parcel'->>'use_code' IN ('000','001','002','004','005','006','007','008','009') THEN 'RESIDENTIAL'
           -- not 'NONRESIDENTIAL': the fit regex would match its RESIDENTIAL
           WHEN jsonb_typeof(s.raw_payload->'fl_parcel') = 'object' THEN 'COMMERCIAL OR INSTITUTIONAL' END, '')) AS land_use,
    coalesce(s.raw_payload->>'state', 'TN') = 'FL' AS fl,
    nullif(concat_ws(', ', s.raw_payload->>'petitioner', s.raw_payload->>'petitioner_address'), '') AS fl_petitioner,
    upper(coalesce(s.raw_payload->'nashville_codes'->>'Violations_Noted', '') || ' ' ||
          coalesce(s.raw_payload->'nashville_codes'->>'Reported_Problem', '') || ' ' ||
          -- FL code cases: Miami-Dade 'Unsafe Structure', Orlando case names.
          CASE WHEN s.raw_payload->>'state' = 'FL'
            THEN coalesce(s.raw_payload->>'case_type', '') || ' ' || coalesce(s.raw_payload->>'case_name', '') ELSE '' END) AS violations,
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
        -- Only failing-structure code cases get this far (lead_quality_reasons).
        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.land_use <> ''
          AND g.land_use !~ '(SINGLE|DUPLEX|TRIPLEX|QUADPLEX|RESIDENTIAL|VACANT|CONDO|MOBILE|ZERO LOT|FARM|RURAL|HOUSEHOLD)' THEN 0.4
        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') THEN 0.7
        -- Bankruptcy events (bankruptcy_events bot): a dismissed chapter 13 or
        -- lifted stay frees the lender to restart the foreclosure.
        WHEN g.dt IN ('BK_DISMISSED', 'BK_STAY_RELIEF') THEN 0.9
        WHEN g.dt = 'BK_DISMISSAL_MOTION' THEN 0.8
        WHEN g.dt = 'BK_ABANDONED' THEN 0.7
        ELSE 0.6 END AS fit,
      CASE
        WHEN g.dt = 'PROBATE' AND g.profile_tier IN ('land', 'multi_parcel', 'commercial') THEN 'Estate with land or several parcels'
        WHEN g.dt = 'COURT_SALE' THEN 'Court-ordered sale'
        WHEN g.dt = 'PROBATE' THEN 'Estate home'
        WHEN g.dt = 'TAX_LIEN' THEN 'Tax sale'
        WHEN g.dt IN ('PRE_FORECLOSURE', 'TRUSTEE_NOTICE', 'FORECLOSURE', 'REO')
          THEN CASE WHEN g.trustee_sale_date IS NOT NULL AND g.trustee_sale_date < current_date + 14 THEN 'Foreclosure, sale within 14 days' ELSE 'Foreclosure' END
        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') AND g.land_use <> ''
          AND g.land_use !~ '(SINGLE|DUPLEX|TRIPLEX|QUADPLEX|RESIDENTIAL|VACANT|CONDO|MOBILE|ZERO LOT|FARM|RURAL|HOUSEHOLD)' THEN 'Code violation, commercial'
        WHEN g.dt IN ('CODE_VIOLATION', 'DEMOLITION') THEN 'Code violation, structural or vacant'
        WHEN g.dt = 'BK_DISMISSED' THEN 'Bankruptcy dismissed'
        WHEN g.dt = 'BK_DISMISSAL_MOTION' THEN 'Bankruptcy, dismissal requested'
        WHEN g.dt = 'BK_STAY_RELIEF' THEN 'Bankruptcy, lender stay relief'
        WHEN g.dt = 'BK_ABANDONED' THEN 'Bankruptcy, trustee abandoned'
        ELSE initcap(lower(g.dt)) END AS fit_label,
      round(g.property_value * 0.90 * 0.10 * 0.20, 2) AS expected_fee,
      CASE WHEN g.dt = 'PROBATE' AND g.fl THEN coalesce('Petitioner ' || g.fl_petitioner, 'Owner at property')
        WHEN g.dt = 'PROBATE' THEN coalesce(
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
  -- rank is part of the primary key: TN keeps 1..1000, FL takes 100001..
  SELECT current_date, rk + CASE WHEN fl THEN 100000 ELSE 0 END, id, bot_source, dt, county,
    property_address, owner_name, property_value, expected_fee, fit, fit_label, round(expected_fee * fit, 2),
    trustee_sale_date, contact
  FROM (SELECT ready.*, row_number() OVER (PARTITION BY fl ORDER BY expected_fee * fit DESC, id) AS rk FROM ready) x
  WHERE rk <= 1000;
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
