alter table if exists public.listing_acceptances
  add column if not exists full_name text not null default '',
  add column if not exists nda_version text not null default 'v1.0',
  add column if not exists non_circ_version text not null default 'v1.0',
  add column if not exists user_agent text not null default 'unknown';
