create table if not exists public.operator_intake_reviews (
  lead_key text primary key,
  decision text not null check (decision in ('promote', 'hold', 'needs_more_info')),
  note text not null default '',
  acted_by text not null default '',
  decided_at timestamptz not null default now()
);

create table if not exists public.operator_task_history (
  task_id text primary key,
  title text not null,
  detail text not null default '',
  section text not null check (section in ('intake', 'approvals', 'routing', 'vault')),
  completed_by text not null default '',
  completed_at timestamptz not null default now()
);

create table if not exists public.vault_pursuit_requests (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  email text not null,
  full_name text not null default '',
  message text not null default '',
  status text not null check (status in ('pursuit_requested', 'pursuit_reserved', 'pursuit_declined', 'pursuit_released')),
  acted_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_slug, email)
);

create index if not exists vault_pursuit_requests_listing_slug_idx
  on public.vault_pursuit_requests (listing_slug);

create table if not exists public.vault_validation_records (
  listing_slug text primary key,
  outcome text not null check (outcome in ('validated_execution_path', 'needs_more_info', 'no_real_control_path', 'low_leverage', 'dead_lead')),
  execution_lane text not null check (execution_lane in ('borrower_side', 'lender_trustee', 'auction_only', 'mixed', 'unclear')),
  note text not null default '',
  acted_by text not null default '',
  county text not null default '',
  distress_type text not null default '',
  contact_path_quality text not null default '',
  control_party text not null default '',
  owner_agency text not null default '',
  intervention_window text not null default '',
  lender_control_intensity text not null default '',
  influenceability text not null default '',
  execution_posture text not null default '',
  workability_band text not null default '',
  sale_status text not null default '',
  source_lead_key text not null default '',
  submitted_at timestamptz not null default now()
);

create table if not exists public.vault_partner_feedback (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  email text not null,
  partner_name text not null default '',
  outcome text not null check (outcome in ('validated_execution_path', 'needs_more_info', 'no_real_control_path', 'low_leverage', 'dead_lead')),
  execution_lane text not null check (execution_lane in ('borrower_side', 'lender_trustee', 'auction_only', 'mixed', 'unclear')),
  note text not null default '',
  feedback_signals jsonb not null default '[]'::jsonb,
  contact_attempted boolean not null default false,
  acted_by text not null default '',
  county text not null default '',
  distress_type text not null default '',
  contact_path_quality text not null default '',
  control_party text not null default '',
  owner_agency text not null default '',
  intervention_window text not null default '',
  lender_control_intensity text not null default '',
  influenceability text not null default '',
  execution_posture text not null default '',
  workability_band text not null default '',
  sale_status text not null default '',
  source_lead_key text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_slug, email)
);

create index if not exists vault_partner_feedback_listing_slug_idx
  on public.vault_partner_feedback (listing_slug);
