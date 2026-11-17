-- Trustee signal: Chapter 7 cases where the debtor appears on record as the
-- owner of real property, drafted to the case's panel trustee. Drafts only;
-- email outreach is on hold.

BEGIN;

ALTER TABLE public.outreach_drafts DROP CONSTRAINT outreach_drafts_signal_check;
ALTER TABLE public.outreach_drafts ADD CONSTRAINT outreach_drafts_signal_check
  CHECK (signal IN ('probate_notice', 'trustee_case'));

-- The signal job reads bankruptcy leads that have a property address. Without
-- this the filtered read scans the whole staging table and hits the 8s timeout.
CREATE INDEX IF NOT EXISTS homeowner_requests_staging_bk_with_property
  ON public.homeowner_requests_staging (staged_at DESC)
  WHERE distress_type = 'BANKRUPTCY' AND property_address IS NOT NULL;

INSERT INTO public.outreach_campaigns (slug, name, audience_kind, channel, subject, body_text, status, requires_license, daily_cap)
VALUES ('trustee-signal', 'Chapter 7 trustees: cases with real property', 'trustee', 'email',
        '(written per draft)', '(written per draft)', 'draft', false, 15)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
