-- Auction-partner inquiries — TN auction companies opening a partnership conversation.
-- Idempotent.
create table if not exists public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  company text not null default '',
  phone text not null default '',
  county_coverage text not null default '',
  deals_per_year integer,
  years_in_business integer,
  fee_structure text not null default '',  -- "buyer's premium", "seller commission", "hybrid"
  notes text not null default '',
  ip_address text,
  user_agent text,
  submitted_at timestamptz not null default now(),
  unique (email)
);

create index if not exists partner_inquiries_submitted_at_idx
  on public.partner_inquiries (submitted_at desc);
