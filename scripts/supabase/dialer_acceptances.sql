-- One row per caller email — records signed NDA + non-circumvention agreement.
-- Idempotent.
create table if not exists public.dialer_acceptances (
  email text primary key,
  caller_name text not null default '',
  nda_version text not null default 'v1',
  noncirc_version text not null default 'v1',
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create index if not exists dialer_acceptances_accepted_at_idx
  on public.dialer_acceptances (accepted_at desc);
