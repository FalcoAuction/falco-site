-- 20260503_priority_score_and_provenance.sql
--
-- Two changes for the autonomous decision engine + per-field audit trail:
--
-- 1. priority_score column on homeowner_requests + homeowner_requests_staging
--    - 0-100 integer, computed by decision_engine_bot
--    - drives dialer queue ordering and skip-trace prioritization
--    - default NULL (not-yet-graded), populated on every decision_engine run
--
-- 2. lead_field_provenance table — per-field source/timestamp/confidence audit
--    trail so the dialer can show which source filled which value, and
--    operators can compare per-source quality over time.
--    - lead_id REFERENCES homeowner_requests(id) (UUID)
--    - confidence 0.0-1.0, strict-match enrichers write 1.0
--    - latest-per-field exposed via lead_field_provenance_latest view
--
-- This is the production Postgres schema. The bot pipeline's local SQLite
-- store has its own provenance table at src/db/migrations/009_*.sql with a
-- different schema; these two are intentionally distinct.

-- ─── Part 1: priority_score column ────────────────────────────────────

ALTER TABLE homeowner_requests
  ADD COLUMN IF NOT EXISTS priority_score smallint
    CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100));

ALTER TABLE homeowner_requests_staging
  ADD COLUMN IF NOT EXISTS priority_score smallint
    CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100));

CREATE INDEX IF NOT EXISTS idx_hr_priority_score
  ON homeowner_requests(priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_hrs_priority_score
  ON homeowner_requests_staging(priority_score DESC NULLS LAST);

COMMENT ON COLUMN homeowner_requests.priority_score IS
  '0-100 score from decision_engine_bot. Drives dialer queue order. NULL = not yet graded.';

-- ─── Part 2: lead_field_provenance table ─────────────────────────────

CREATE TABLE IF NOT EXISTS lead_field_provenance (
    id BIGSERIAL PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES homeowner_requests(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    value TEXT,
    source TEXT NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 1.0
        CHECK (confidence >= 0.0 AND confidence <= 1.0),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS lead_field_provenance_lead_idx
    ON lead_field_provenance(lead_id);
CREATE INDEX IF NOT EXISTS lead_field_provenance_field_idx
    ON lead_field_provenance(lead_id, field_name);
CREATE INDEX IF NOT EXISTS lead_field_provenance_source_idx
    ON lead_field_provenance(source);
CREATE INDEX IF NOT EXISTS lead_field_provenance_fetched_at_idx
    ON lead_field_provenance(fetched_at DESC);

CREATE OR REPLACE VIEW lead_field_provenance_latest AS
SELECT DISTINCT ON (lead_id, field_name)
    lead_id, field_name, value, source, confidence, fetched_at, metadata
FROM lead_field_provenance
ORDER BY lead_id, field_name, fetched_at DESC;

COMMENT ON TABLE lead_field_provenance IS
    'Per-field source/timestamp/confidence audit trail for every enriched homeowner_requests field. Multi-source agreement increases confidence; strict-1-match enrichers write 1.0; ambiguous-match enrichers do not write.';

COMMENT ON COLUMN lead_field_provenance.confidence IS
    '0.0..1.0. Strict-match enrichers write 1.0. Heuristic enrichers (excerpt-based parse, owner-classifier) write 0.5..0.9. Unverified/legacy sources write 0.3..0.5.';
