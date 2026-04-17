# Dialer console setup

The `/dialer` route is a caller-facing CRM for the auction-disposition pilot.
Separate auth from `/operator`. Caller sees vault leads + workflow status + activity log.

## 1. Run the migration

In Supabase SQL editor (or psql), run:

```sh
cat scripts/supabase/dialer_tables.sql | psql "$SUPABASE_DB_URL"
```

This creates two tables:
- `dialer_lead_workflow` — one row per lead (status, next action, Parkes booking, summary notes)
- `dialer_activities` — append-only log of every call/text/voicemail/note

Both tables key off `listing_slug` (matches `vault_listings.slug`).

## 2. Set the dialer password

In Vercel project env vars (or `.env.local` for local dev):

```
FALCO_DIALER_PASSWORD=<choose-something>
```

Falls back to `FALCO_OPERATOR_PASSWORD` if not set, but you should set a separate one
so the caller can't accidentally end up in `/operator`.

## 3. Deploy

Push to main (or merge `feat/dialer` to main). Vercel builds and ships automatically.

## 4. Hand off to the caller

Send him:
- URL: `https://<your-domain>/dialer`
- Password (whatever you set in step 2)
- His name (he picks this on login — appears in activity attribution)

He logs in with name + password. Session is 24 hours.

## What he can do

- See queue of all active vault leads, sorted by sale date
- Filter by status (Open / New / In Progress / Booked / Closed / All)
- Tap a lead → see all FALCO data + tap-to-call phones
- Update status (New → Attempting Contact → RPC Made → Parkes Booked → Listing Signed → Auction Live → Closed Won/Lost)
- Set next action + when
- Set Parkes call date when booked
- Maintain rolling summary notes per lead
- Log every call/text/voicemail with channel + outcome + notes
- See full activity history per lead

## What you (operator) see

The dialer data lives in Supabase tables you can query directly. To surface it
in `/operator`, query `dialer_lead_workflow` joined with `vault_listings` (or
`dialer_activities` for the full audit trail). Optional v2 add-on, not built yet.

## Removing access

Either rotate `FALCO_DIALER_PASSWORD` or `truncate public.dialer_lead_workflow`.
The activity log is append-only — preserve for audit.
