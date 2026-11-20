-- Middle Tennessee focus = all 41 counties of the Middle grand division, not 10.
-- Also: CHURCH_CLOSURE leads (the seller is the UMC Conference Trustees, an
-- organization by definition) skip the entity-owner and owner-contact rules;
-- STALLED_BUILD (spec builders, usually LLCs) skips the entity-owner rule.
-- The 10-county list kept 1,043 leads a quarter out of the ranked list.
-- Built from the live lead_quality_reasons() definition (2026-11-20); only
-- the outside_focus test changes. Tennessee counties now only count for
-- non-Florida leads, because Florida has a Putnam, Jackson and Franklin too.

BEGIN;

CREATE OR REPLACE FUNCTION public.lead_quality_reasons(s homeowner_requests_staging)
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT array_remove(ARRAY[
    CASE WHEN NOT (
        (coalesce(s.raw_payload->>'state', 'TN') <> 'FL' AND lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) IN
          ('bedford','cannon','cheatham','clay','coffee','davidson','dekalb','de kalb','dickson','fentress','franklin',
           'giles','grundy','hickman','houston','humphreys','jackson','lawrence','lewis','lincoln','macon','marshall',
           'maury','montgomery','moore','overton','perry','pickett','putnam','robertson','rutherford','sequatchie',
           'smith','stewart','sumner','trousdale','van buren','vanburen','warren','wayne','white','williamson','wilson'))
        OR (s.raw_payload->>'state' = 'FL' AND lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) IN
          ('miami-dade','broward','palm beach','hillsborough','orange','pinellas','duval','lee','collier','sarasota')))
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
    CASE WHEN upper(coalesce(s.distress_type, '')) NOT IN ('CHURCH_CLOSURE', 'STALLED_BUILD') AND (coalesce(s.phone_metadata->>'owner_class', 'homeowner') <> 'homeowner'
      OR (upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND upper(coalesce(s.raw_payload->'metro_parcel'->>'owner',
            s.raw_payload->'padctn'->>'owner', s.raw_payload->'fl_parcel'->>'owner', s.raw_payload->'comptroller_parcel'->>'owner',
            s.owner_name_records, s.full_name, '')) ~
          '\m(LLC|L L C|INC|CORP|CORPORATION|COMPANY|LP|LLP|LTD|TRUST|TRUSTEES?|PARTNERS|PARTNERSHIP|HOLDINGS?|PROPERTIES|PROPERTY|INVESTMENTS?|APARTMENTS|ASSOCIATION|ASSN|CHURCH|MINISTRIES|BANK|FUND|REIT|AUTHORITY|DEVELOPMENT|ENTERPRISES|GROUP|VENTURES|REALTY|CAPITAL|EQUITIES|HOUSING|METROPOLITAN GOVERNMENT|CITY OF|STATE OF)\M')
      ) THEN 'entity_owner' END,
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
        OR (upper(coalesce(s.distress_type, '')) NOT IN ('PRE_FORECLOSURE', 'TRUSTEE_NOTICE', 'FORECLOSURE', 'LIS_PENDENS', 'TAX_LIEN', 'COURT_SALE', 'CHURCH_CLOSURE')
          AND coalesce(btrim(s.phone), '') = ''
          AND coalesce(s.raw_payload->'metro_parcel'->>'owner_mailing', s.raw_payload->'comptroller_parcel'->>'owner_mailing',
            s.raw_payload->'fl_parcel'->>'mailing_address', '') = ''))
      THEN 'no_owner_contact' END,
    CASE WHEN s.trustee_sale_date IS NOT NULL AND s.trustee_sale_date < current_date THEN 'sale_passed' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE' AND s.staged_at < now() - interval '180 days'
      THEN 'estate_over_6mo' END
  ], NULL)
$function$;

COMMIT;
