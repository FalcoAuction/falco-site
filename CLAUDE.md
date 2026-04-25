# falco-site Project Context

Next.js 16 App Router site. Public-facing marketing + admin dashboard + dialer interface + lead intake APIs.

## Tech stack

- **Framework:** Next.js 16.1.6 App Router (route groups, layouts, server components)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + PostgREST)
- **Email:** Resend
- **Hosting:** Vercel
- **Package manager:** npm

## Repo layout

```
src/
  app/
    (forms)/        — public-facing forms route group
    admin/          — admin dashboard (auth-gated)
    api/            — API routes (REST endpoints)
    dialer/         — Chris's dialer interface (per-lead UX)
    v2/             — current homepage (v2 redesign)
    pilot/          — pilot partner pages (e.g., pilot/parks/term-sheet)
    team/           — internal docs (e.g., team/dialer for Chris onboarding)
    homeowners/     — homeowner request flow
    buyers/         — buyer registration flow
    partners/       — auction partner pages
    request-access/ — legacy access flow
    vault/          — DEPRECATED — vault is no longer used (don't add features here)
    operator/       — DEPRECATED — operator dashboard no longer used
  lib/
    admin-leads.ts          — unified lead fetching for /admin (5 LeadKinds: homeowner, pipeline, buyer, partner, inquiry)
    admin-session.ts        — admin auth
    supabase-admin.ts       — service-role Supabase client
    inbound-digest.ts       — daily lead digest email via Resend
    dialer-*.ts             — dialer state, inventory, metrics
    math-sheet.ts           — math sheet calculation engine
    home-metrics.ts         — homepage metrics
    home/                   — homepage section components
  components/               — shared React components
```

## Key tables (Supabase)

- `homeowner_requests` — unified leads table. `source` column distinguishes:
  - `source = 'form'` → form-submitted homeowner (kind: `homeowner`)
  - `source = 'bot'` → FALCO-pipeline-pulled (kind: `pipeline`)
- `buyer_registrations` — buyer kind
- `partner_inquiries` — partner kind
- `general_inquiries` — inquiry kind
- `dialer_lead_workflow` — dialer state per lead
- `dialer_activities` — call/note/status-change log per lead

## Commands

```bash
# Dev server
npm run dev

# Type check (use this to verify before committing)
npx tsc --noEmit

# Build (production check)
npm run build

# Supabase
supabase db query --linked --file path/to/query.sql

# GitHub
gh pr create --title "..." --body "..."

# Vercel
vercel ls
vercel inspect --logs <deployment-url>
```

## Conventions

- **Server components by default.** Only use `"use client"` when interactivity requires it.
- **`force-dynamic`** for routes that hit Supabase (prevents build-time prerender failures).
- **Admin routes** check `getAdminSession(req)` first. Return 401 if missing.
- **Print styles:** Use `print:hidden` to hide chrome on print pages (math sheet, dialer).
- **No emoji in files** unless explicitly requested.
- **No new docs** unless explicitly requested.

## Recent major changes

- 2026-04-23: Unified leads migration. 91 dialer + vault leads moved into `homeowner_requests` with source='bot'. Pipeline tab added to /admin.
- 2026-04-22: Math sheet refinements. Worst-case auction column, scenario-aware wholesaler model, property-aware defaults.
- 2026-04-22: Dialer math sheet route added at `/dialer/[slug]/math-sheet` (reuses MathSheetContent component).

## Things NOT to touch unless explicitly asked

- Vault routes (`src/app/vault/`, `src/app/vault-routing/`) — DEPRECATED, don't add features
- Operator routes (`src/app/operator/`) — DEPRECATED
- Homepage hero video / video player setup — fragile, fix only if explicitly broken
- Scroll-snap on homepage — already tuned (snap-proximity, FAQ exempt)
- `src/lib/access-workflow.ts` and vault-related libs — deprecated path

## Known issues

- `.env.local` has concat bug — `SUPABASE_SERVICE_ROLE_KEY` runs into `FALCO_APPROVAL_SECRET` without newline. Working around via supabase CLI auth instead of supabase-js client. Fix needed when convenient.

## Active worktrees

Check `git worktree list` from any falco-site dir. Worktrees live in adjacent directories like `falco-site-admin/`, `falco-site-public/`. Don't work in main checkout if a worktree is active for that domain.
