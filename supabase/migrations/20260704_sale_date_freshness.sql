-- Sale-date freshness tracking.
--
-- Problem: TN trustee sales get postponed ("continued") constantly.
-- Bots re-scrape sources daily and pick up republished notices with
-- new dates, but promote_staged_lead used COALESCE(existing, staged)
-- so the OLD date always won on merge. Result: /admin and the dialer
-- showed stale sale dates, and 149 live leads had past-dated sales
-- with no signal whether they ran, were postponed, or were cancelled.
--
-- Fix, four parts:
--   1. homeowner_requests.sale_date_last_seen_at — when a bot last saw
--      a notice carrying this lead's sale date. Backfilled from
--      phone_metadata.notice_tracking.last_seen_at (bots already
--      maintain this on re-scrape) and matching staging rows.
--   2. promote_staged_lead: later sale date wins on merge (sales move
--      forward when continued, never backward), and last-seen is
--      stamped on both merge and insert.
--   3. sync_sale_dates(): set-based cross-check that pulls the
--      freshest staged notice per live lead (matched by lead key OR
--      normalized address+zip) and updates the live row's date +
--      last-seen. Called by /api/cron/sale-date-sync after bot runs.
--      Leads with a manual sale_status (cancelled/reinstated/ran set
--      by Patrick) are left untouched.
--   4. Indexes so the recurring sync stays cheap.

-- ── 1. Column ─────────────────────────────────────────────────────────
ALTER TABLE homeowner_requests
  ADD COLUMN IF NOT EXISTS sale_date_last_seen_at timestamptz;

-- Indexes for the sync joins (staging is 20k+ rows and growing)
CREATE INDEX IF NOT EXISTS idx_hrs_lead_key
  ON homeowner_requests_staging (pipeline_lead_key);
CREATE INDEX IF NOT EXISTS idx_hr_bot_lead_key
  ON homeowner_requests (pipeline_lead_key) WHERE source = 'bot';

-- Backfill: bots' notice_tracking touch → newest matching staging row
-- → promotion time as the floor.
UPDATE homeowner_requests h
SET sale_date_last_seen_at = COALESCE(
  (h.phone_metadata->'notice_tracking'->>'last_seen_at')::timestamptz,
  (
    SELECT MAX(GREATEST(
      s.staged_at,
      COALESCE((s.phone_metadata->'notice_tracking'->>'last_seen_at')::timestamptz, s.staged_at)
    ))
    FROM homeowner_requests_staging s
    WHERE s.pipeline_lead_key = h.pipeline_lead_key
  ),
  h.submitted_at
)
WHERE h.source = 'bot' AND h.sale_date_last_seen_at IS NULL;

-- ── 2. promote_staged_lead: newer date wins ───────────────────────────
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

  -- Look for existing live row by lead_key OR address match
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
      -- Sale date: LATER date wins. Continuances always push the sale
      -- forward; a republished notice with a later date is the truth.
      -- (Old behavior kept the stale original date forever.)
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
      -- Final COALESCE to '' guards the NOT NULL constraint: live rows
      -- with empty-string notes merging a NULL-notes staged row used to
      -- blow up the whole merge (silent failures in auto-promote).
      admin_notes        = COALESCE(NULLIF(admin_notes, ''), v_staged.admin_notes, ''),
      updated_at         = now()
    WHERE id = v_existing_id;
    v_action := 'merged';
  ELSE
    INSERT INTO homeowner_requests (
      pipeline_lead_key, source, status,
      property_address, county, full_name, owner_name_records,
      email, phone, property_value, mortgage_balance,
      trustee_sale_date, distress_type, admin_notes,
      sale_date_last_seen_at,
      submitted_at, updated_at
    ) VALUES (
      v_staged.pipeline_lead_key, 'bot', 'new',
      v_staged.property_address, v_staged.county, v_staged.full_name, v_staged.owner_name_records,
      v_staged.email, v_staged.phone, v_staged.property_value, v_staged.mortgage_balance,
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

-- ── 3. sync_sale_dates(): cross-check live leads vs freshest notices ──
CREATE OR REPLACE FUNCTION public.sync_sale_dates()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_dates_updated int := 0;
  v_seen_bumped   int := 0;
  v_skipped_manual int := 0;
BEGIN
  -- Freshest staged notice per live bot lead. "Seen" = staged_at or the
  -- bots' notice_tracking touch, whichever is newer. Match by lead key
  -- OR normalized street line + zip (different sources hash different
  -- keys for the same property).
  CREATE TEMP TABLE _freshest ON COMMIT DROP AS
  WITH staging_norm AS (
    SELECT
      s.pipeline_lead_key,
      lower(regexp_replace(split_part(s.property_address, ',', 1), '\s+', ' ', 'g')) AS addr_line,
      substring(s.property_address from '\m(\d{5})\M') AS zip5,
      s.trustee_sale_date,
      GREATEST(
        s.staged_at,
        COALESCE((s.phone_metadata->'notice_tracking'->>'last_seen_at')::timestamptz, s.staged_at)
      ) AS seen_at
    FROM homeowner_requests_staging s
    WHERE s.trustee_sale_date IS NOT NULL
      AND s.property_address IS NOT NULL
  ),
  live AS (
    SELECT
      h.id,
      h.pipeline_lead_key,
      lower(regexp_replace(split_part(h.property_address, ',', 1), '\s+', ' ', 'g')) AS addr_line,
      substring(h.property_address from '\m(\d{5})\M') AS zip5,
      (h.phone_metadata->'sale_status'->>'status') AS manual_status
    FROM homeowner_requests h
    WHERE h.source = 'bot'
  ),
  matched AS (
    SELECT
      l.id AS live_id,
      l.manual_status,
      sn.trustee_sale_date AS staged_date,
      sn.seen_at,
      ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY sn.seen_at DESC) AS rn
    FROM live l
    JOIN staging_norm sn
      ON sn.pipeline_lead_key = l.pipeline_lead_key
      OR (
        l.addr_line IS NOT NULL AND l.addr_line <> ''
        AND sn.addr_line = l.addr_line
        AND sn.zip5 IS NOT NULL AND sn.zip5 = l.zip5
      )
  )
  SELECT live_id, manual_status, staged_date, seen_at
  FROM matched WHERE rn = 1;

  -- Count leads we deliberately leave alone (Patrick set a manual
  -- sale_status like reinstated/cancelled — don't stomp his call).
  SELECT COUNT(*) INTO v_skipped_manual
  FROM _freshest f
  JOIN homeowner_requests h ON h.id = f.live_id
  WHERE f.manual_status IN ('cancelled', 'reinstated', 'ran')
    AND h.trustee_sale_date IS DISTINCT FROM f.staged_date;

  -- Date changed: update date + last-seen.
  WITH upd AS (
    UPDATE homeowner_requests h
    SET trustee_sale_date = f.staged_date,
        sale_date_last_seen_at = f.seen_at,
        updated_at = now()
    FROM _freshest f
    WHERE h.id = f.live_id
      AND COALESCE(f.manual_status, '') NOT IN ('cancelled', 'reinstated', 'ran')
      AND f.seen_at > COALESCE(h.sale_date_last_seen_at, '-infinity'::timestamptz)
      AND h.trustee_sale_date IS DISTINCT FROM f.staged_date
    RETURNING h.id
  )
  SELECT COUNT(*) INTO v_dates_updated FROM upd;

  -- Same date, fresher sighting: bump last-seen only.
  WITH bump AS (
    UPDATE homeowner_requests h
    SET sale_date_last_seen_at = f.seen_at
    FROM _freshest f
    WHERE h.id = f.live_id
      AND f.seen_at > COALESCE(h.sale_date_last_seen_at, '-infinity'::timestamptz)
      AND h.trustee_sale_date IS NOT DISTINCT FROM f.staged_date
    RETURNING h.id
  )
  SELECT COUNT(*) INTO v_seen_bumped FROM bump;

  RETURN jsonb_build_object(
    'dates_updated', v_dates_updated,
    'last_seen_bumped', v_seen_bumped,
    'skipped_manual_status', v_skipped_manual,
    'ran_at', now()
  );
END;
$function$;
