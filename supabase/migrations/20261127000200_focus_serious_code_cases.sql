-- County focus no longer holds back a serious Tennessee code case (2026-11-26).
--
-- outside_focus keeps tax and code leads outside the 41 Middle Tennessee
-- counties off the ranked list. It was written when every code case outside
-- Nashville read as nuisance. Migration 20261127000100 fixed that label, and
-- Patrick decided a serious case (derelict or dangerous structure, or an
-- unfit-structure hearing) should count wherever in Tennessee it is. A
-- nuisance case, a tax lead and a Florida record are held by the focus rule
-- exactly as before; every other reason still applies.
--
-- Measured on production under a temporary function name before applying,
-- over all 4,032 code rows from Memphis, Chattanooga, Knoxville, Johnson City,
-- Mt. Juliet and Nashville: 178 rows lose outside_focus and nothing else
-- changes on any row. 6 of them have no reason left (4 Chattanooga, 2 Johnson
-- City); 141 still need a value or an owner.
-- Built from the live function text; only that one condition differs.

CREATE OR REPLACE FUNCTION public.lead_quality_reasons(s homeowner_requests_staging)
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT array_remove(ARRAY[
    CASE WHEN s.raw_payload->'pilot_review'->>'version' = 'pilot-review-1' AND s.raw_payload->'pilot_review'->>'route' = 'removed' THEN 'pilot_removed' END,
    CASE WHEN s.bot_source = 'church_closure' THEN 'church_closure_research' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'NOTICE_RESEARCH' THEN 'notice_research' END,
    CASE WHEN s.bot_source = 'hamilton_county_herald' AND public.herald_elapsed_sale_date(s) IS NOT NULL THEN 'herald_advertised_date_elapsed' END,

    CASE WHEN s.bot_source = 'warn_notices' THEN 'warn_employment_notice' END,

    CASE WHEN s.bot_source = 'mackie_wolf_trustee' THEN public.mackie_notice_hold(s) END,
    CASE WHEN s.bot_source = 'nashville_codes' THEN
      'nashville_code_' || nullif(public.nashville_code_disposition(s),'open') END,

    CASE WHEN s.bot_source = 'bankruptcy_events' AND s.distress_type = 'BK_ABANDONED'
      AND NOT coalesce(
        s.raw_payload->'abandonment_review'->>'status' = 'verified_sale_opportunity'
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'asset_reference', '')) <> ''
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'authorized_seller', '')) <> ''
        AND btrim(coalesce(s.raw_payload->'abandonment_review'->>'verification_source', '')) <> '',
        false)
      THEN 'abandonment_requires_asset_and_authority' END,

    -- Contractor changes alone are watchlist prospects, not proof of distress.
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'STALLED_BUILD' AND NOT coalesce((
      coalesce(s.raw_payload->'stalled_review'->>'status', '') = 'corroborated'
      AND coalesce(s.raw_payload->'stalled_review'->>'parcel_id', '') <> ''
      AND s.raw_payload->'stalled_review'->>'parcel_id' = s.raw_payload->'metro_parcel'->>'apn'
      AND s.raw_payload->'stalled_review'->>'owner' = s.raw_payload->'metro_parcel'->>'owner'
      AND s.raw_payload->'stalled_review'->>'permit' = s.raw_payload->'permit'->>'Permit__'
      AND jsonb_array_length(CASE WHEN jsonb_typeof(s.raw_payload->'stalled_review'->'evidence') = 'array'
          THEN s.raw_payload->'stalled_review'->'evidence' ELSE '[]'::jsonb END) > 0
    ), false) THEN 'contractor_change_only' END,

    CASE WHEN NOT coalesce(s.raw_payload->'pilot_review'->>'version' = 'pilot-review-1' AND s.raw_payload->'pilot_review'->>'route' = 'first_trace_review', false)
      -- A serious Tennessee code case (derelict or dangerous structure, unfit-structure
      -- hearing) is not held back by the county focus; a nuisance case still is.
      AND NOT coalesce(coalesce(s.raw_payload->>'state', 'TN') <> 'FL' AND upper(coalesce(s.distress_type, '')) = 'CODE_VIOLATION'
                       AND public.lead_code_severity(s) = 'severe', false)
      AND NOT (
        (coalesce(s.raw_payload->>'state', 'TN') <> 'FL' AND ((upper(coalesce(s.distress_type, '')) NOT IN ('CODE_VIOLATION', 'TAX_LIEN') AND coalesce(btrim(s.county), '') <> '') OR lower(regexp_replace(coalesce(s.county, ''), '\s+county$', '', 'i')) IN
          ('bedford','cannon','cheatham','clay','coffee','davidson','dekalb','de kalb','dickson','fentress','franklin',
           'giles','grundy','hickman','houston','humphreys','jackson','lawrence','lewis','lincoln','macon','marshall',
           'maury','montgomery','moore','overton','perry','pickett','putnam','robertson','rutherford','sequatchie',
           'smith','stewart','sumner','trousdale','van buren','vanburen','warren','wayne','white','williamson','wilson')))
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
    CASE WHEN upper(coalesce(s.distress_type, '')) NOT IN ('CHURCH_CLOSURE', 'STALLED_BUILD')
      AND coalesce(s.raw_payload->'property_lane'->>'lane', '') NOT IN ('commercial', 'land') AND (coalesce(s.phone_metadata->>'owner_class', 'homeowner') <> 'homeowner'
      OR (upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND upper(coalesce(s.raw_payload->'metro_parcel'->>'owner',
            s.raw_payload->'padctn'->>'owner', s.raw_payload->'fl_parcel'->>'owner', s.raw_payload->'comptroller_parcel'->>'owner',
            s.owner_name_records, s.full_name, '')) ~
          '\m(LLC|L L C|INC|CORP|CORPORATION|COMPANY|LP|LLP|LTD|TRUST|TRUSTEES?|PARTNERS|PARTNERSHIP|HOLDINGS?|PROPERTIES|PROPERTY|INVESTMENTS?|APARTMENTS|ASSOCIATION|ASSN|CHURCH|MINISTRIES|BANK|FUND|REIT|AUTHORITY|DEVELOPMENT|ENTERPRISES|GROUP|VENTURES|REALTY|CAPITAL|EQUITIES|HOUSING|METROPOLITAN GOVERNMENT|CITY OF|STATE OF)\M')
      ) THEN 'entity_owner' END,
    -- FL roll use codes 070-099: churches, schools, hospitals, government,
    -- utilities. Never a private seller.
    CASE WHEN s.raw_payload->'fl_parcel'->>'use_code' >= '070' THEN 'public_or_institutional' END,
    -- A $5M+ building is not a FALCO auction lead (institutional sale).
    CASE WHEN coalesce(s.property_value, 0) >
      CASE WHEN s.raw_payload->'property_lane'->>'lane' = 'commercial' THEN 20000000 ELSE 5000000 END
      THEN 'above_scope' END,
    -- Commercial and land leads the property-lane tagger excluded (tenant
    -- personal-property tax, owner mismatch, government owner, a code
    -- ticket alone, sale passed, no contact path, outside the value band).
    CASE WHEN s.raw_payload->'property_lane'->>'lane' IN ('commercial', 'land')
      AND coalesce(s.raw_payload->'property_lane'->>'exclude_reason', '') <> '' THEN 'lane_excluded' END,
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
    -- A named owner is enough: the phone comes from skip trace or a
    -- lookup, so no mailing address is required (2026-11-20). Estates are
    -- covered below.
    CASE WHEN upper(coalesce(s.distress_type, '')) <> 'PROBATE' AND
        coalesce(btrim(coalesce(s.full_name, s.owner_name_records, s.raw_payload->'metro_parcel'->>'owner',
          s.raw_payload->'comptroller_parcel'->>'owner', s.raw_payload->'fl_parcel'->>'owner')), '') = ''
      THEN 'no_owner_contact' END,
    CASE WHEN s.trustee_sale_date IS NOT NULL AND s.trustee_sale_date < current_date THEN 'sale_passed' END,
    CASE WHEN upper(coalesce(s.distress_type, '')) = 'PROBATE' AND s.staged_at < now() - interval '180 days'
      THEN 'estate_over_6mo' END
  ], NULL)
$function$;
