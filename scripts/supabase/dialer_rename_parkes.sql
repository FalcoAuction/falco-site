-- Rename dialer_lead_workflow.parkes_call_at -> auction_call_at
-- and replace 'parkes_booked' / 'hand_to_parkes' enum values
-- with 'auction_booked' / 'hand_to_auction'.
--
-- Safe to run multiple times.

-- 1. Add new column if missing
alter table public.dialer_lead_workflow
  add column if not exists auction_call_at timestamptz;

-- 2. Backfill from old column (no-op if column already gone)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dialer_lead_workflow'
      and column_name = 'parkes_call_at'
  ) then
    update public.dialer_lead_workflow
       set auction_call_at = parkes_call_at
     where auction_call_at is null and parkes_call_at is not null;
    alter table public.dialer_lead_workflow drop column parkes_call_at;
  end if;
end$$;

-- 3. Drop old check constraints (the CHECK constraints in the original
--    table are anonymous; PostgreSQL auto-named them with the full enum
--    list embedded). We re-create them under stable names below after
--    dropping any prior constraint that doesn't match the new enums.
do $$
declare
  r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.dialer_lead_workflow'::regclass
       and contype = 'c'
  loop
    execute format('alter table public.dialer_lead_workflow drop constraint %I', r.conname);
  end loop;
end$$;

-- 4. Migrate data values: parkes_booked -> auction_booked, hand_to_parkes -> hand_to_auction
update public.dialer_lead_workflow set status = 'auction_booked' where status = 'parkes_booked';
update public.dialer_lead_workflow set next_action = 'hand_to_auction' where next_action = 'hand_to_parkes';

-- 5. Re-add check constraints with the new enum values (named so future migrations are easier)
alter table public.dialer_lead_workflow
  add constraint dialer_lead_workflow_status_chk
    check (status in (
      'new', 'attempting_contact', 'rpc_made', 'auction_booked',
      'listing_signed', 'auction_live', 'closed_won', 'closed_lost'
    ));

alter table public.dialer_lead_workflow
  add constraint dialer_lead_workflow_next_action_chk
    check (next_action in ('call', 'text', 'wait_callback', 'hand_to_auction', 'drop', 'none'));
