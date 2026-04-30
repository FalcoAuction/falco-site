-- Dialer hardening migration.
--
-- 1. Add `phone_refreshed_at` to homeowner_requests so the daily skip-trace
--    cron can stop stomping `updated_at` on every touch (which puts the
--    50 most-recently-traced rows in a hot loop and starves the rest).
--
-- 2. Atomic activity-log helper. The current TS code does
--    read-modify-write of attempt_count / rpc_count / status, which loses
--    increments under concurrent calls. This RPC uses a single UPDATE
--    with arithmetic increment so two concurrent dialer activities can't
--    overwrite each other.

ALTER TABLE homeowner_requests
  ADD COLUMN IF NOT EXISTS phone_refreshed_at timestamptz;

-- Backfill: existing leads with phones get the fallback "we touched this
-- recently" signal so they don't all become re-trace candidates on day 1.
UPDATE homeowner_requests
   SET phone_refreshed_at = COALESCE(updated_at, submitted_at, now())
 WHERE phone_refreshed_at IS NULL
   AND phone IS NOT NULL
   AND phone <> '';

CREATE INDEX IF NOT EXISTS idx_hr_phone_refreshed
  ON homeowner_requests (phone_refreshed_at NULLS FIRST);

-- Atomic dialer counter increment. Returns the new workflow row.
CREATE OR REPLACE FUNCTION dialer_increment_counters(
  p_listing_slug text,
  p_attempt_delta int,
  p_rpc_delta int,
  p_last_outcome text,
  p_last_outcome_at timestamptz,
  p_status text,
  p_next_action_at timestamptz
)
RETURNS dialer_lead_workflow
LANGUAGE plpgsql AS $$
DECLARE
  result dialer_lead_workflow;
BEGIN
  INSERT INTO dialer_lead_workflow (
    listing_slug, attempt_count, rpc_count,
    last_outcome, last_outcome_at, status, next_action_at, updated_at
  ) VALUES (
    p_listing_slug,
    GREATEST(0, p_attempt_delta),
    GREATEST(0, p_rpc_delta),
    p_last_outcome, p_last_outcome_at, p_status, p_next_action_at, now()
  )
  ON CONFLICT (listing_slug) DO UPDATE SET
    attempt_count    = dialer_lead_workflow.attempt_count + GREATEST(0, p_attempt_delta),
    rpc_count        = dialer_lead_workflow.rpc_count     + GREATEST(0, p_rpc_delta),
    last_outcome     = COALESCE(EXCLUDED.last_outcome, dialer_lead_workflow.last_outcome),
    last_outcome_at  = COALESCE(EXCLUDED.last_outcome_at, dialer_lead_workflow.last_outcome_at),
    status           = COALESCE(EXCLUDED.status, dialer_lead_workflow.status),
    next_action_at   = COALESCE(EXCLUDED.next_action_at, dialer_lead_workflow.next_action_at),
    updated_at       = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$;
