-- Index for the CRM "High-value assets" view: leads the bots
-- personal_property_lane bot tagged as a high-value estate, business
-- liquidation, seizure or owner-asset auction (raw_payload.personal_property,
-- a few dozen of ~50k staging rows).
--
-- Same pattern and reason as 20261113_staging_aircraft_index.sql: without it
-- the not-null filter seq-scans the ~400 MB staging table on every load.
--
-- Additive; revert with:
--   drop index if exists public.homeowner_requests_staging_personal_property_idx;

create index if not exists homeowner_requests_staging_personal_property_idx
  on public.homeowner_requests_staging (id)
  where (raw_payload -> 'personal_property') is not null;
