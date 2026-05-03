-- 20260503_align_staging_live_schemas.sql
--
-- Align homeowner_requests + homeowner_requests_staging so enrichers
-- and the decision engine can query the same fields on either table.
--
-- Two missing columns surfaced during the first decision_engine
-- end-to-end test:
--   - staging missing phone_metadata (only added to live in 20260502)
--   - live missing raw_payload (only on staging where leads land)
--
-- Adding both as nullable JSONB on the table where they're absent.
-- No data migration needed; existing rows stay NULL until next
-- enrichment cycle writes to them.

ALTER TABLE homeowner_requests_staging
  ADD COLUMN IF NOT EXISTS phone_metadata jsonb,
  ADD COLUMN IF NOT EXISTS alternate_phones jsonb;

ALTER TABLE homeowner_requests
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

CREATE INDEX IF NOT EXISTS idx_hrs_phone_metadata
  ON homeowner_requests_staging USING gin (phone_metadata);

CREATE INDEX IF NOT EXISTS idx_hr_raw_payload
  ON homeowner_requests USING gin (raw_payload);

COMMENT ON COLUMN homeowner_requests_staging.phone_metadata IS
  'JSONB blob holding: phone_resolver result, owner_class, skip_trace flags, distress_stack, decision_engine action. Same shape as homeowner_requests.phone_metadata so enrichers/grader work on both tables.';

COMMENT ON COLUMN homeowner_requests.raw_payload IS
  'JSONB blob with source-bot original output (assessor scrape, notice text, etc). Copied from staging on promotion; subsequent enrichers update in place.';
