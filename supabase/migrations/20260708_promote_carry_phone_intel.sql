-- promote_staged_lead: carry phone intelligence through promotion.
--
-- Bug: the promote function copied `phone` but not `alternate_phones`
-- or `phone_metadata`. Everything the skiptrace pipeline learned —
-- backup numbers, name-verified vs unverified match quality, DNC
-- annotations, line types — stayed behind in staging. The 98 leads
-- promoted 2026-07-07 reached the dialer with a bare phone number and
-- no quality context.
--
-- Fix: insert path copies both columns; merge path fills
-- alternate_phones when live has none and merges phone_metadata with
-- LIVE KEYS WINNING (live rows carry dialer state like sale_status
-- and notice_tracking that must never be stomped by a staged copy).
-- Also: backfill the recently-promoted rows from their staging twins.

CREATE OR REPLACE FUNCTION public.promote_staged_lead(p_staging_id uuid, p_reviewer text DEFAULT 'system'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_staged    homeowner_requests_staging%ROWTYPE;
  v_existing_id uuid;
  v_action      text;
BEGIN
  SELECT * INTO v_staged FROM homeowner_requests_staging WHERE id = p_staging_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'staging_id_not_found');
  END IF;
  IF v_staged.staging_status = 'verified' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_verified');
  END IF;

  SELECT id INTO v_existing_id
    FROM homeowner_requests
   WHERE source = 'bot'
     AND (
       pipeline_lead_key = v_staged.pipeline_lead_key
       OR (
         v_staged.property_address IS NOT NULL
         AND lower(regexp_replace(split_part(property_address, ',', 1), '\s+', ' ', 'g'))
           = lower(regexp_replace(split_part(v_staged.property_address, ',', 1), '\s+', ' ', 'g'))
         AND substring(property_address from '\m(\d{5})\M')
           = substring(v_staged.property_address from '\m(\d{5})\M')
       )
     )
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE homeowner_requests SET
      email              = COALESCE(email, v_staged.email),
      phone              = COALESCE(phone, v_staged.phone),
      full_name          = COALESCE(full_name, v_staged.full_name),
      owner_name_records = COALESCE(owner_name_records, v_staged.owner_name_records),
      county             = COALESCE(county, v_staged.county),
      property_value     = COALESCE(property_value, v_staged.property_value),
      mortgage_balance   = COALESCE(mortgage_balance, v_staged.mortgage_balance),
      alternate_phones   = COALESCE(alternate_phones, v_staged.alternate_phones),
      -- Merge staged phone intel under live keys: staged || live means
      -- live values win on conflict, staged fills the gaps.
      phone_metadata     = COALESCE(v_staged.phone_metadata, '{}'::jsonb) || COALESCE(phone_metadata, '{}'::jsonb),
      trustee_sale_date  = CASE
        WHEN v_staged.trustee_sale_date IS NULL THEN trustee_sale_date
        WHEN trustee_sale_date IS NULL THEN v_staged.trustee_sale_date
        ELSE GREATEST(trustee_sale_date, v_staged.trustee_sale_date)
      END,
      sale_date_last_seen_at = CASE
        WHEN v_staged.trustee_sale_date IS NOT NULL THEN now()
        ELSE sale_date_last_seen_at
      END,
      distress_type      = COALESCE(distress_type, v_staged.distress_type),
      admin_notes        = COALESCE(NULLIF(admin_notes, ''), v_staged.admin_notes, ''),
      updated_at         = now()
    WHERE id = v_existing_id;
    v_action := 'merged';
  ELSE
    INSERT INTO homeowner_requests (
      pipeline_lead_key, source, status,
      property_address, county, full_name, owner_name_records,
      email, phone, property_value, mortgage_balance,
      alternate_phones, phone_metadata,
      trustee_sale_date, distress_type, admin_notes,
      sale_date_last_seen_at,
      submitted_at, updated_at
    ) VALUES (
      v_staged.pipeline_lead_key, 'bot', 'new',
      v_staged.property_address, v_staged.county, v_staged.full_name, v_staged.owner_name_records,
      v_staged.email, v_staged.phone, v_staged.property_value, v_staged.mortgage_balance,
      v_staged.alternate_phones, v_staged.phone_metadata,
      v_staged.trustee_sale_date, v_staged.distress_type, v_staged.admin_notes,
      CASE WHEN v_staged.trustee_sale_date IS NOT NULL THEN now() ELSE NULL END,
      now(), now()
    )
    RETURNING id INTO v_existing_id;
    v_action := 'inserted';
  END IF;

  UPDATE homeowner_requests_staging SET
    staging_status = 'verified',
    reviewed_by    = p_reviewer,
    reviewed_at    = now()
  WHERE id = p_staging_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', v_action,
    'live_id', v_existing_id,
    'staging_id', p_staging_id
  );
END;
$function$;

-- Backfill: re-unite recently-promoted live rows with the phone intel
-- left behind in their staging twins. Only touches rows whose live
-- phone_metadata is missing skiptrace data.
WITH intel AS (
  SELECT DISTINCT ON (s.pipeline_lead_key)
    s.pipeline_lead_key,
    s.alternate_phones,
    s.phone_metadata
  FROM homeowner_requests_staging s
  WHERE s.phone_metadata ? 'batchdata_skip_trace'
    AND s.pipeline_lead_key IS NOT NULL
  ORDER BY s.pipeline_lead_key, s.staged_at DESC
)
UPDATE homeowner_requests h
SET alternate_phones = COALESCE(h.alternate_phones, i.alternate_phones),
    phone_metadata = COALESCE(i.phone_metadata, '{}'::jsonb) || COALESCE(h.phone_metadata, '{}'::jsonb)
FROM intel i
WHERE h.source = 'bot'
  AND h.pipeline_lead_key = i.pipeline_lead_key
  AND NOT (COALESCE(h.phone_metadata, '{}'::jsonb) ? 'batchdata_skip_trace');
