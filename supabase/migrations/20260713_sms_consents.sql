-- Explicit SMS consent records. One row per opt-in event, whether
-- captured on the /sms-consent web form or logged as verbal consent
-- after a phone call. This is the audit trail the A2P registration
-- promises ("the date and manner of consent are recorded").

CREATE TABLE IF NOT EXISTS sms_consents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  property_address text NOT NULL DEFAULT '',
  method text NOT NULL DEFAULT 'web_form'
    CHECK (method IN ('web_form', 'verbal')),
  consent_text text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_consents_phone ON sms_consents (phone);
