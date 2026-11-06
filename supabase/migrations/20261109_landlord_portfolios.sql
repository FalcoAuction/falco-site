-- Tired-landlord portfolios: owners with Codes housing cases, joined to
-- every Davidson parcel they own (Metro's public parcel layer). One owner
-- with several rentals and repeated habitability cases is a portfolio
-- auction candidate: one sale, several properties.
--
-- Written by the bots landlord_portfolio_bot (upsert on owner + county).
-- tired_score is a starting judgment, not a model:
--   open housing cases x 3, + residential parcels (capped at 10),
--   + years owned / 5 (capped at 4), + 2 when the owner mails from outside
--   the county. expected_fee = total residential value x 10% x 20%.
--
-- Additive. Rollback: DROP TABLE public.landlord_portfolios;
BEGIN;
CREATE TABLE public.landlord_portfolios (
  owner_name text NOT NULL,
  county text NOT NULL DEFAULT 'davidson',
  parcel_count integer NOT NULL,
  residential_count integer NOT NULL,
  total_value numeric NOT NULL,
  residential_value numeric NOT NULL,
  owner_mailing text,
  out_of_area boolean NOT NULL DEFAULT false,
  owned_since date,
  housing_cases integer NOT NULL,
  open_cases integer NOT NULL,
  case_numbers text[] NOT NULL DEFAULT '{}',
  parcels jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_company boolean NOT NULL DEFAULT false,
  tired_score numeric NOT NULL,
  expected_fee numeric NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_name, county)
);
CREATE INDEX landlord_portfolios_rank ON public.landlord_portfolios (tired_score DESC);
ALTER TABLE public.landlord_portfolios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.landlord_portfolios FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.landlord_portfolios TO service_role;
COMMIT;
