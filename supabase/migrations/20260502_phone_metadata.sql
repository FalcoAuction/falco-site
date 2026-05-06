-- Phone metadata storage so we can validate via Twilio Lookup BEFORE
-- the caller dials. Stops the "80% of dialed numbers are disconnected"
-- failure mode.
--
-- phone_metadata JSONB shape (from Twilio Lookup v2 with line_type_intelligence):
--   {
--     valid: bool,
--     line_type: "mobile" | "landline" | "voip" | "fixedVoip" | "nonFixedVoip" | "personal" | "tollFree",
--     carrier_name: string,
--     country_code: "US",
--     checked_at: ISO timestamp,
--     mobile_country_code: string,
--     mobile_network_code: string
--   }
--
-- alternate_phones JSONB ARRAY for storing the OTHER phones BatchData
-- returned that we currently throw away. Each element has the same
-- shape as phone_metadata + a `number` field.

ALTER TABLE homeowner_requests
  ADD COLUMN IF NOT EXISTS phone_metadata jsonb,
  ADD COLUMN IF NOT EXISTS alternate_phones jsonb;

CREATE INDEX IF NOT EXISTS idx_hr_phone_line_type
  ON homeowner_requests USING gin (phone_metadata);
