-- Outreach: one contact list, one suppression list, campaigns and a send
-- log shared by every outreach lane (community banks, estate attorneys,
-- auction firms, later landlords). Built before any mass email so that
-- CAN-SPAM duties hold from the first send: a working unsubscribe that is
-- honored on every later campaign, a physical postal address in every
-- message (enforced in src/lib/outreach.ts), and a record of who got what.
--
-- requires_license: a campaign that asks owners to sell (landlords) is
-- soliciting listings, licensed activity under TCA 62-13-102. Those
-- campaigns are forced to requires_license = true and cannot send until
-- FALCO_LICENSED=1. B2B data-services outreach (banks, attorneys, auction
-- firms) does not need it.
--
-- Additive. Rollback:
--   DROP FUNCTION public.outreach_sync_landlords();
--   DROP TABLE public.outreach_sends, public.outreach_campaigns,
--     public.outreach_suppressions, public.outreach_contacts;
BEGIN;
CREATE TABLE public.outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bank','attorney','broker','auction_firm','landlord','investor','other')),
  org_name text,
  person_name text,
  title text,
  email text CHECK (email IS NULL OR email = lower(btrim(email))),
  phone text,
  mail_line1 text,
  mail_line2 text,
  mail_city text,
  mail_state text,
  mail_zip text,
  county text,
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (org_name IS NOT NULL OR person_name IS NOT NULL)
);
-- Plain (not partial) unique keys: PostgREST upserts cannot target a
-- partial index, and NULLs stay distinct so contacts without an email or
-- source_ref do not collide.
CREATE UNIQUE INDEX outreach_contacts_email ON public.outreach_contacts (email);
CREATE UNIQUE INDEX outreach_contacts_source_ref ON public.outreach_contacts (source, source_ref);
CREATE INDEX outreach_contacts_kind ON public.outreach_contacts (kind);

CREATE TABLE public.outreach_suppressions (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  reason text NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint','manual')),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  audience_kind text NOT NULL CHECK (audience_kind IN ('bank','attorney','broker','auction_firm','landlord','investor','other')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','mail')),
  subject text,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','done')),
  requires_license boolean NOT NULL DEFAULT false,
  daily_cap integer NOT NULL DEFAULT 50 CHECK (daily_cap BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Owner audiences are listing solicitation: never without a license.
  CHECK (audience_kind <> 'landlord' OR requires_license)
);

CREATE TABLE public.outreach_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','mail')),
  to_email text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','suppressed','bounced','complained')),
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX outreach_sends_campaign_day ON public.outreach_sends (campaign_id, created_at DESC);
CREATE INDEX outreach_sends_provider ON public.outreach_sends (provider_id) WHERE provider_id IS NOT NULL;

-- Landlord portfolios -> contacts (mail only; we have no landlord emails).
-- owner_mailing is 'LINE, CITY ST ZIP'; anything else lands whole in
-- mail_line1. Re-runnable: updates the address and portfolio facts.
CREATE OR REPLACE FUNCTION public.outreach_sync_landlords()
RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO outreach_contacts (kind, org_name, person_name, mail_line1, mail_city, mail_state, mail_zip, county, source, source_ref, meta)
  SELECT 'landlord',
    CASE WHEN p.is_company THEN p.owner_name END,
    CASE WHEN NOT p.is_company THEN p.owner_name END,
    coalesce(m[1], p.owner_mailing), m[2], m[3], m[4], p.county,
    'landlord_portfolios', p.county || ':' || p.owner_name,
    jsonb_build_object('residential_count', p.residential_count, 'residential_value', p.residential_value,
      'tired_score', p.tired_score, 'signals', p.signals, 'passive', p.passive, 'out_of_area', p.out_of_area)
  FROM landlord_portfolios p
  LEFT JOIN LATERAL (SELECT regexp_match(btrim(p.owner_mailing), '^(.*),\s*(.*?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$') AS m) x ON true
  WHERE coalesce(btrim(p.owner_mailing), '') <> ''
  ON CONFLICT (source, source_ref) DO UPDATE SET
    mail_line1 = EXCLUDED.mail_line1, mail_city = EXCLUDED.mail_city, mail_state = EXCLUDED.mail_state,
    mail_zip = EXCLUDED.mail_zip, meta = outreach_contacts.meta || EXCLUDED.meta, updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_contacts, public.outreach_suppressions, public.outreach_campaigns, public.outreach_sends
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.outreach_contacts, public.outreach_suppressions, public.outreach_campaigns, public.outreach_sends TO service_role;
REVOKE ALL ON FUNCTION public.outreach_sync_landlords() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_sync_landlords() TO service_role;
COMMIT;
