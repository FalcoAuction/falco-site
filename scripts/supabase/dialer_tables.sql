-- Dialer (caller-facing CRM) tables
-- Owner: FALCO ops. Used by /dialer route.

-- One row per lead: current status, next action, Parkes booking,
-- and rolling summary notes the caller maintains.
create table if not exists public.dialer_lead_workflow (
  listing_slug text primary key,
  status text not null default 'new'
    check (status in (
      'new',                  -- not yet attempted
      'attempting_contact',   -- dialed but no RPC yet
      'rpc_made',             -- right-party contact made, conversation in progress
      'parkes_booked',        -- handed to Parkes / call scheduled
      'listing_signed',       -- Parkes signed listing agreement
      'auction_live',         -- listed, marketing or running
      'closed_won',           -- auction closed, deal done
      'closed_lost'           -- dead / not pursuing
    )),
  next_action text not null default 'call'
    check (next_action in ('call', 'text', 'wait_callback', 'hand_to_parkes', 'drop', 'none')),
  next_action_at timestamptz,
  parkes_call_at timestamptz,
  closed_lost_reason text,
  summary_notes text not null default '',
  last_contact_at timestamptz,
  attempt_count integer not null default 0,
  rpc_count integer not null default 0,
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists dialer_lead_workflow_status_idx
  on public.dialer_lead_workflow (status);

create index if not exists dialer_lead_workflow_next_action_at_idx
  on public.dialer_lead_workflow (next_action_at);

-- One row per touchpoint (call, text, voicemail, internal note).
-- Append-only audit trail. Caller and operator both read this.
create table if not exists public.dialer_activities (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  occurred_at timestamptz not null default now(),
  channel text not null
    check (channel in ('call', 'text', 'voicemail', 'email', 'note')),
  outcome text not null default 'connected'
    check (outcome in (
      'connected',          -- live conversation
      'voicemail_left',
      'no_answer',
      'wrong_number',
      'hung_up',
      'booked',             -- agreed to Parkes call
      'callback_requested',
      'not_interested',
      'do_not_call',
      'note_only'           -- internal note, not a contact attempt
    )),
  notes text not null default '',
  next_action text,
  next_action_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists dialer_activities_listing_slug_idx
  on public.dialer_activities (listing_slug, occurred_at desc);

create index if not exists dialer_activities_created_at_idx
  on public.dialer_activities (created_at desc);
