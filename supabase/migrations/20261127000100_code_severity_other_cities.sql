-- Code-case severity reads every city's violation text (2026-11-26).
--
-- lead_code_severity only read the fields the Nashville bot writes (plus the
-- Florida and legacy "issue" fields), so every Memphis, Chattanooga, Knoxville,
-- Johnson City and new Mt. Juliet case was labeled nuisance whatever it said:
-- a Memphis "CE-Substandard,Derelict Struc" request carried nuisance_violation.
--
-- The original test is unchanged, so no Nashville, Florida or demolition row
-- changes label. Added after it:
--   * a Knoxville Public Officer Hearing case and a Johnson City Board of
--     Dwelling Standards hearing are severe (unfit-structure proceedings);
--   * Memphis request type, Chattanooga cited sections, the Mt. Juliet review
--     excerpt and Johnson City violations are tested against the same terms
--     plus DANGEROUS STRUCTURE, BOARDING and BURNOUT. Those three are applied
--     to these fields only ("boarding house" is a zoning term in Nashville).
--
-- Measured on production before applying, old label against new: 179 rows
-- move nuisance to severe (Memphis 99, Chattanooga 44, Knoxville 28, Johnson
-- City 7, Mt. Juliet 1); none move the other way; 1,576 Nashville rows are
-- unchanged. No row becomes eligible for the ranked list: 178 still carry
-- outside_focus and the other still carries below_fee_floor.

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
    -- A Knoxville Public Officer Hearing case and a Johnson City Board of Dwelling
    -- Standards hearing are unfit-structure proceedings by definition.
    WHEN s.raw_payload ? 'poh_section' THEN 'severe'
    WHEN s.raw_payload->'johnson_city_bdsr'->>'stage' = 'hearing_listed' THEN 'severe'
    -- Memphis, Chattanooga, Mt. Juliet and Johnson City keep their violation text
    -- in their own fields, which the test above never read.
    WHEN upper(concat_ws(' ',
        s.raw_payload->'memphis_311'->>'REQUEST_TYPE',
        (s.raw_payload->'chattanooga_codes'->'descriptions')::text,
        s.raw_payload->'mt_juliet_issue_review'->>'condition_excerpt',
        s.raw_payload->'johnson_city_bdsr'->>'violations'))
      ~ '(DILAPIDATED (?!SIGN)|STRUCTURAL|UNSAFE|OPEN AND ACCESSIBLE|OPEN & ACCESSIBLE|CONDEMN|UNFIT FOR|UNINHABIT|FIRE DAMAGE|FIRE-DAMAGE|DEMOLI|COLLAPS|BOARD UP|BOARDED|DERELICT|VACANT (HOUSE|HOME|BUILDING|STRUCTURE|DWELLING)|VACANT AND OPEN|ABANDONED (HOUSE|HOME|BUILDING|STRUCTURE|DWELLING)|DANGEROUS STRUCTURE|BOARDING|BURNOUT)'
      THEN 'severe'
    ELSE 'nuisance' END
$function$;
