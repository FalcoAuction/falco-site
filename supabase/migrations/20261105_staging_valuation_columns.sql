-- Staging was missing three valuation columns that the live table has and
-- that eleven enrichers write when they update a staging row:
--   davidson/williamson/rutherford/shelby/hamilton assessors, tpad,
--   bankruptcy and probate property enrichers, decision_engine,
--   stale_regrade, xref_avm.
-- PostgREST rejects an update naming an unknown column (PGRST204), the bots
-- catch the error and log a warning, so every valuation they found for a
-- staging row was discarded. Verified 2026-11-05: an update with
-- property_value_source fails, the same update without it succeeds.
--
-- Additive and nullable; nothing is backfilled or removed. Rollback:
--   ALTER TABLE public.homeowner_requests_staging
--     DROP COLUMN property_value_source, DROP COLUMN property_value_as_of,
--     DROP COLUMN year_built;
BEGIN;
ALTER TABLE public.homeowner_requests_staging
  ADD COLUMN IF NOT EXISTS property_value_source text,
  ADD COLUMN IF NOT EXISTS property_value_as_of date,
  ADD COLUMN IF NOT EXISTS year_built smallint;
COMMIT;
