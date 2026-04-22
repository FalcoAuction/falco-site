-- General inbound inquiries — anyone who doesn't fit the homeowner / buyer /
-- partner forms. Idempotent.
create table if not exists public.general_inquiries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  company text not null default '',
  topic text not null default '',
  message text not null default '',
  ip_address text,
  user_agent text,
  submitted_at timestamptz not null default now()
);

create index if not exists general_inquiries_submitted_at_idx
  on public.general_inquiries (submitted_at desc);
