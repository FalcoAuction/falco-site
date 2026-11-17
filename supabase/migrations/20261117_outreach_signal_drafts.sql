-- Signal-based outreach drafts. One draft per event (a new probate notice,
-- later trustee and court events) per recipient, written from the facts of
-- that event, reviewed in the CRM before anything is sent.
--
-- outreach_sends was one row per (campaign, contact): right for broadcast
-- campaigns, wrong here, where one estate attorney can be counsel on several
-- estates. Draft sends carry draft_id and are unique per draft; campaign sends
-- keep the old one-per-contact rule through a partial unique index.

BEGIN;

CREATE TABLE public.outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal text NOT NULL CHECK (signal IN ('probate_notice')),
  staging_id uuid NOT NULL,
  recipient_key text NOT NULL,                 -- normalized first|last
  recipient_name text NOT NULL,
  recipient_firm text,
  recipient_address text,
  contact_id uuid REFERENCES public.outreach_contacts(id) ON DELETE SET NULL,
  to_email text CHECK (to_email IS NULL OR to_email = lower(btrim(to_email))),
  subject text NOT NULL,
  body_text text NOT NULL,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('needs_email', 'draft', 'approved', 'sent', 'skipped')),
  send_id uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal, staging_id, recipient_key)
);
CREATE INDEX outreach_drafts_status ON public.outreach_drafts (status, created_at DESC);
CREATE INDEX outreach_drafts_email ON public.outreach_drafts (to_email) WHERE to_email IS NOT NULL;
ALTER TABLE public.outreach_drafts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.outreach_sends ADD COLUMN draft_id uuid REFERENCES public.outreach_drafts(id) ON DELETE SET NULL;
ALTER TABLE public.outreach_sends DROP CONSTRAINT outreach_sends_campaign_id_contact_id_key;
CREATE UNIQUE INDEX outreach_sends_campaign_contact ON public.outreach_sends (campaign_id, contact_id) WHERE draft_id IS NULL;
CREATE UNIQUE INDEX outreach_sends_draft ON public.outreach_sends (draft_id) WHERE draft_id IS NOT NULL;
CREATE INDEX outreach_sends_to_email_day ON public.outreach_sends (to_email, created_at DESC) WHERE to_email IS NOT NULL;

ALTER TABLE public.outreach_drafts
  ADD CONSTRAINT outreach_drafts_send_fk FOREIGN KEY (send_id) REFERENCES public.outreach_sends(id) ON DELETE SET NULL;

-- The campaign that draft sends are filed under (gates, daily cap, stats).
-- Business audience: an estate attorney, not the owner. It does not ask
-- anyone to list with FALCO, and FALCO takes no fee on the real estate, so
-- it is not listing solicitation (requires_license stays false).
INSERT INTO public.outreach_campaigns (slug, name, audience_kind, channel, subject, body_text, status, requires_license, daily_cap)
VALUES ('estate-attorney-signal', 'Estate attorneys: new probate notices', 'attorney', 'email',
        '(written per draft)', '(written per draft)', 'draft', false, 25)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
