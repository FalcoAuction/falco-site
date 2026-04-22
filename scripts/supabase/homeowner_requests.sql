-- Homeowner inbound — distressed sellers requesting a 15-min call.
-- Idempotent. Server-side writes via service-role key.
create table if not exists public.homeowner_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  property_address text not null default '',
  county text not null default '',
  trustee_sale_date date,
  mortgage_balance integer,
  best_callback text not null default '',  -- "morning", "tonight", "weekday after 5", etc
  situation_notes text not null default '',
  referrer text not null default '',
  ip_address text,
  user_agent text,
  submitted_at timestamptz not null default now(),
  unique (email, property_address)
);

create index if not exists homeowner_requests_submitted_at_idx
  on public.homeowner_requests (submitted_at desc);

create index if not exists homeowner_requests_trustee_sale_date_idx
  on public.homeowner_requests (trustee_sale_date)
  where trustee_sale_date is not null;
