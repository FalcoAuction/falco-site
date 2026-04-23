-- ============================================================================
-- Pipeline → admin sync columns
-- ----------------------------------------------------------------------------
-- Adds property-data + source columns to homeowner_requests so the bot
-- pipeline (falco-distress-bots) can push enriched leads directly into the
-- admin inbox. Form-submitted leads keep working unchanged (source defaults
-- to 'form').
--
-- Idempotent. Run once in Supabase SQL Editor.
-- ============================================================================

-- Drop NOT NULL on email so bot-discovered leads (no homeowner contact yet)
-- can be inserted. Form-submitted leads will continue to require email at
-- the application layer (see src/lib/inbound-forms.ts validation).
alter table public.homeowner_requests
  alter column email drop not null;

alter table public.homeowner_requests
  add column if not exists source text not null default 'form',
  add column if not exists owner_name_records text,
  add column if not exists distress_type text,
  add column if not exists property_value integer,
  add column if not exists property_value_source text,
  add column if not exists property_value_as_of date,
  add column if not exists beds smallint,
  add column if not exists baths real,
  add column if not exists sqft integer,
  add column if not exists year_built smallint,
  add column if not exists last_sale_date date,
  add column if not exists last_sale_price integer,
  add column if not exists lien_position text,
  add column if not exists pipeline_score integer,
  add column if not exists pipeline_lead_key text;

-- Source can be: 'form' (homeowner submitted), 'bot' (pipeline-discovered),
-- 'manual' (admin-entered)
alter table public.homeowner_requests
  drop constraint if exists homeowner_requests_source_check;
alter table public.homeowner_requests
  add constraint homeowner_requests_source_check
  check (source in ('form', 'bot', 'manual'));

-- Index on source so /admin can filter quickly
create index if not exists homeowner_requests_source_idx
  on public.homeowner_requests (source);

-- Index on pipeline_lead_key so the bot sync can dedupe on UPSERT
-- (one row per distinct distress filing from the pipeline)
create unique index if not exists homeowner_requests_pipeline_lead_key_idx
  on public.homeowner_requests (pipeline_lead_key)
  where pipeline_lead_key is not null;

-- Index on property_address so we can dedupe / merge form + bot leads later
create index if not exists homeowner_requests_property_address_idx
  on public.homeowner_requests (lower(property_address))
  where property_address is not null and property_address <> '';

-- Comment columns for clarity
comment on column public.homeowner_requests.source is
  'How the lead arrived: form (homeowner submitted), bot (pipeline-discovered), manual (admin-entered)';
comment on column public.homeowner_requests.pipeline_lead_key is
  'Stable identifier from the bot pipeline (e.g. county + parcel + filing date) used to dedupe bot pushes';
comment on column public.homeowner_requests.property_value is
  'After-repair value estimate in dollars; source recorded in property_value_source';
comment on column public.homeowner_requests.property_value_source is
  'Where the AVM came from: ATTOM_AVM, MANUAL, ZILLOW, REDFIN, etc.';
comment on column public.homeowner_requests.distress_type is
  'Type of distress filing: TRUSTEE_NOTICE, LIS_PENDENS, NOD, TAX_LIEN, PROBATE, etc.';

-- ============================================================================
-- Done. Verify with:
--   select source, count(*) from public.homeowner_requests group by source;
--   \d public.homeowner_requests   (or use Supabase Table Editor)
-- ============================================================================
