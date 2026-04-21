-- Buyer-side registrations — cash buyers / investors who want first look
-- at FALCO distressed auction inventory. Idempotent.
create table if not exists public.buyer_registrations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  company text not null default '',

  -- Buy box
  price_min integer,
  price_max integer,
  counties text not null default '',        -- free-text list for now
  property_types text not null default '',  -- free-text list
  strategies text not null default '',      -- "flip, buy-hold, subto, etc"
  cash_ready boolean not null default false,
  funding_source text not null default '',  -- cash / lender name / HELOC / etc
  close_speed_days integer,                 -- typical days they can close

  notes text not null default '',
  referrer text not null default '',        -- "LinkedIn", "BP group", etc.

  -- Audit
  ip_address text,
  user_agent text,
  registered_at timestamptz not null default now(),

  -- Keep emails unique — return a graceful "already registered" if someone resubmits
  unique (email)
);

create index if not exists buyer_registrations_registered_at_idx
  on public.buyer_registrations (registered_at desc);

create index if not exists buyer_registrations_cash_ready_idx
  on public.buyer_registrations (cash_ready) where cash_ready = true;
