-- Landlord portfolios beyond Davidson. Outside Davidson there is no code
-- case feed, so a portfolio is any owner with 2 to 40 residential parcels
-- (county parcel layers) who has at least one distress signal we already
-- stage at one of those parcels (foreclosure, tax, probate, court sale,
-- bankruptcy, housing code case), or an aging passive landlord (5+
-- rentals, mails from out of state, held 15+ years).
--
-- signals: {"foreclosure": n, "tax": n, "probate": n, "court_sale": n,
--           "bankruptcy": n, "code_housing": n}
-- passive: true when the row qualifies only as an aging passive landlord.
--
-- Additive. Rollback:
--   ALTER TABLE public.landlord_portfolios DROP COLUMN signals,
--     DROP COLUMN signal_count, DROP COLUMN passive;
BEGIN;
ALTER TABLE public.landlord_portfolios
  ADD COLUMN signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN signal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN passive boolean NOT NULL DEFAULT false;
CREATE INDEX landlord_portfolios_county_rank ON public.landlord_portfolios (county, tired_score DESC);
COMMIT;
