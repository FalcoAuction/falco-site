-- Close public anon access by enabling RLS on every internal table.
--
-- Supabase's exposed PostgREST endpoint serves all public-schema tables to
-- anon/authenticated by default. Tables WITH RLS enabled and ZERO policies
-- effectively block anon (PostgREST returns []), while tables with RLS
-- DISABLED return rows to anyone with the anon key. The service-role key
-- bypasses RLS unconditionally, so enabling RLS does NOT break any
-- server-side code in this repo (all Supabase calls go through
-- supabaseAdmin in src/lib/supabase-admin.ts using
-- SUPABASE_SERVICE_ROLE_KEY).
--
-- Pre-migration audit (2026-05-06): the 11 tables below had RLS disabled
-- and were returning row data to the anon key. Most contain PII (owner
-- names, phones, addresses, mortgage data) or internal workflow state.

ALTER TABLE public.homeowner_requests_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_acceptances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_bad_phones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_lead_workflow      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_qualified_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_field_provenance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_acceptances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_access_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_approvals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_listings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_todos               ENABLE ROW LEVEL SECURITY;

-- Note: We are NOT adding any policies. Service role bypasses RLS, and we
-- want zero anon/authenticated access to these tables. If client-side code
-- ever needs to read one of these, add a narrowly-scoped policy at that
-- time — don't open the table back up.
