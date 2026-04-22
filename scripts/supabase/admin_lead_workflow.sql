-- ============================================================================
-- /admin lead workflow columns
-- ----------------------------------------------------------------------------
-- Adds status / notes / next_action_at / last_contacted_at to all 4 inbound
-- lead tables so the admin dashboard can act as a real pipeline tool, not
-- just an inbox. Idempotent.
-- ============================================================================

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'homeowner_requests',
    'buyer_registrations',
    'partner_inquiries',
    'general_inquiries'
  ]
  loop
    -- Workflow columns. Note: `admin_notes` (not `notes`) — buyer_registrations
    -- and partner_inquiries already have a `notes` column for user-submitted
    -- form input. Admin pipeline notes get their own column to avoid clobbering.
    execute format($f$
      alter table public.%I
        add column if not exists status text not null default 'new',
        add column if not exists admin_notes text not null default '',
        add column if not exists next_action_at timestamptz,
        add column if not exists last_contacted_at timestamptz,
        add column if not exists updated_at timestamptz not null default now()
    $f$, tbl);

    -- Indexes
    execute format(
      'create index if not exists %I on public.%I (status)',
      tbl || '_status_idx', tbl
    );
    execute format(
      'create index if not exists %I on public.%I (next_action_at) where next_action_at is not null',
      tbl || '_next_action_idx', tbl
    );
  end loop;
end $$;

-- Status check constraint — six allowed values across all 4 tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'homeowner_requests',
    'buyer_registrations',
    'partner_inquiries',
    'general_inquiries'
  ]
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      tbl, tbl || '_status_check'
    );
    execute format(
      $f$alter table public.%I add constraint %I
         check (status in ('new','contacted','qualified','listed','closed','lost'))$f$,
      tbl, tbl || '_status_check'
    );
  end loop;
end $$;

-- ============================================================================
-- Done. Verify with:
--   select status, count(*) from public.homeowner_requests group by status;
-- ============================================================================
