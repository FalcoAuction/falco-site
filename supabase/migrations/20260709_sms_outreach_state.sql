-- Autonomous SMS campaign engine: per-lead sequence state.
--
-- One row per enrolled lead. The campaign cron
-- (/api/cron/sms-campaign) enrolls callable leads, drips a humanized
-- opener + up to two follow-ups on a jittered schedule, and retires
-- the sequence on reply, opt-out, or exhaustion. The webhook flips
-- status to 'replied'/'opted_out' the moment the homeowner engages so
-- no automated touch ever follows a live conversation.

CREATE TABLE IF NOT EXISTS sms_outreach_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_slug text NOT NULL UNIQUE,
  to_phone text NOT NULL,
  -- active   -> in the drip
  -- replied  -> homeowner responded; conversation layer owns it now
  -- opted_out-> STOP or carrier blacklist (21610)
  -- exhausted-> all steps sent, no reply
  -- paused   -> manually held
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','replied','opted_out','exhausted','paused')),
  step int NOT NULL DEFAULT 0,          -- messages sent so far
  max_steps int NOT NULL DEFAULT 3,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  angles_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_outreach_due
  ON sms_outreach_state (status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_sms_outreach_phone
  ON sms_outreach_state (to_phone);
