-- Contact types for the B2B lists beyond banks and attorneys: bankruptcy
-- trustees (DOJ panel list), airports (FAA records) and marinas.
--
-- Additive: widens two CHECK constraints. Rollback requires removing or
-- reclassifying rows of the new kinds, then restoring the old lists from
-- 20261112_outreach.sql.
BEGIN;
ALTER TABLE public.outreach_contacts DROP CONSTRAINT outreach_contacts_kind_check;
ALTER TABLE public.outreach_contacts ADD CONSTRAINT outreach_contacts_kind_check
  CHECK (kind IN ('bank','attorney','broker','auction_firm','landlord','investor','trustee','airport','marina','other'));
ALTER TABLE public.outreach_campaigns DROP CONSTRAINT outreach_campaigns_audience_kind_check;
ALTER TABLE public.outreach_campaigns ADD CONSTRAINT outreach_campaigns_audience_kind_check
  CHECK (audience_kind IN ('bank','attorney','broker','auction_firm','landlord','investor','trustee','airport','marina','other'));
COMMIT;
