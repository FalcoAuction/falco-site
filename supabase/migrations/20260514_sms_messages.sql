-- sms_messages: unified log of all SMS in/out across leads.
-- Powers the AI brain's conversation_history reader + the (future)
-- approval inbox UI. Distinct from dialer_activities, which is
-- channel-agnostic and lossier (notes blob, no structured fields).
--
-- Inbound: from_phone = homeowner's number, to_phone = FALCO Twilio
-- number. listing_slug nullable until we match the lead (rare gap).
-- Outbound: from_phone = FALCO Twilio number, to_phone = homeowner's.
-- Always has listing_slug + body + angle.

CREATE TABLE IF NOT EXISTS sms_messages (
  id          BIGSERIAL PRIMARY KEY,
  listing_slug TEXT,                        -- homeowner_requests.pipeline_lead_key (nullable for unmatched inbound)
  direction   TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  from_phone  TEXT NOT NULL,                -- E.164
  to_phone    TEXT NOT NULL,                -- E.164
  body        TEXT NOT NULL,
  twilio_sid  TEXT,                         -- Twilio Message SID
  twilio_status TEXT,                       -- queued / sent / delivered / failed / undelivered
  angle       TEXT,                         -- outbound only: OutreachAngle that drafted it
  sent_at     TIMESTAMPTZ,                  -- outbound: when sent via Twilio
  received_at TIMESTAMPTZ,                  -- inbound: when Twilio webhook received it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookups by lead (most common — conversation history reader)
CREATE INDEX IF NOT EXISTS sms_messages_listing_slug_idx
  ON sms_messages (listing_slug, created_at DESC);

-- Lookups by phone (inbound webhook lead matching, when slug is null)
CREATE INDEX IF NOT EXISTS sms_messages_from_phone_idx
  ON sms_messages (from_phone, created_at DESC);

-- Lookups by direction for analytics
CREATE INDEX IF NOT EXISTS sms_messages_direction_created_at_idx
  ON sms_messages (direction, created_at DESC);

-- RLS: service role only (the API routes use supabaseAdmin which
-- bypasses RLS). No public read access.
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
