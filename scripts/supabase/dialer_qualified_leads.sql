-- Dialer Qualified Leads — billable delivery records to Parks under the
-- FALCO × Parks Data Services Agreement.
--
-- A "Qualified Lead" is a lead delivered to Parks with:
--   (1) verified owner contact
--   (2) documented distress
--   (3) FALCO math sheet shared with homeowner
--   (4) confirmed appointment with a Parks-affiliated licensed real estate professional
--
-- Each row represents a billable event. The fee is fixed at delivery time
-- per the ARV-based tier schedule in Exhibit B of the Data Services Agreement.
--
-- Idempotent: safe to re-run.

create table if not exists public.dialer_qualified_leads (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,

  -- Tier classification, locked at delivery time per the Parks contract
  tier text not null
    check (tier in ('T0', 'T1', 'T2', 'T3')),
  fee_usd integer not null check (fee_usd > 0),

  -- ARV used for tier classification (snapshot at delivery time)
  avm_at_delivery integer,

  -- Delivery audit trail
  delivered_at timestamptz not null default now(),
  delivered_by text not null default '',  -- caller name from session
  appointment_at timestamptz,             -- the seller's confirmed appointment with Parks

  -- Lifecycle status
  status text not null default 'delivered'
    check (status in (
      'delivered',   -- delivered to Parks, awaiting acceptance/rejection
      'accepted',    -- Parks accepted (default after 10-business-day refund window)
      'rejected',    -- Parks rejected within window — refund triggered
      'replaced',    -- rejected lead replaced with substitute (FALCO option)
      'closed_won',  -- the underlying transaction ultimately closed
      'closed_lost'  -- the underlying transaction did not close
    )),
  rejected_at timestamptz,
  rejected_reason text,

  -- Invoice tracking
  invoice_number text,
  invoice_sent_at timestamptz,
  invoice_paid_at timestamptz,
  invoice_voided_at timestamptz,

  -- Free-form delivery notes (e.g., the appointment context, special instructions)
  notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dialer_qualified_leads_listing_slug_idx
  on public.dialer_qualified_leads (listing_slug);

create index if not exists dialer_qualified_leads_status_idx
  on public.dialer_qualified_leads (status);

create index if not exists dialer_qualified_leads_delivered_at_idx
  on public.dialer_qualified_leads (delivered_at desc);

-- Maintain updated_at on row updates
create or replace function public.dialer_qualified_leads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dialer_qualified_leads_updated_at_trg
  on public.dialer_qualified_leads;

create trigger dialer_qualified_leads_updated_at_trg
before update on public.dialer_qualified_leads
for each row execute function public.dialer_qualified_leads_set_updated_at();
