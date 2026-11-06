-- Index for the CRM "High-value assets" view: leads whose owner holds a
-- TN-registered aircraft, tagged by the bots faa_aircraft bot in
-- raw_payload.aircraft (a handful of ~50k staging rows).
--
-- Without it the view's not-null filter would seq-scan the ~400 MB
-- staging table on every page load; heavy staging scans saturated disk IO
-- once (2026-11-05). Same pattern as
-- 20261106_staging_property_lane_index.sql.
--
-- Additive; revert with:
--   drop index if exists public.homeowner_requests_staging_aircraft_idx;

create index if not exists homeowner_requests_staging_aircraft_idx
  on public.homeowner_requests_staging (id)
  where (raw_payload -> 'aircraft') is not null;
