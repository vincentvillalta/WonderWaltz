# External Service Provisioning — Current State

**As of:** 2026-04-14 (end of Phase 01 Foundation)
**Source of truth:** `.env.local` (git-ignored) + this document

For the full provisioning _guide_ see `docs/ops/SERVICES.md`. This document
records the current _state_ of each service — what's actually provisioned
vs. what's still pending.

## Status Legend

- ✓ Provisioned, credentials in `.env.local`
- ◆ Partially provisioned (account created, resources not yet configured)
- ○ Not yet provisioned

## 1. Supabase — ✓ Provisioned

- Project exists; credentials populated in `.env.local`:
  `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Extensions enabled: `postgis`, `uuid-ossp`, `pg_cron`, `pgcrypto`, `pg_graphql`,
  `pg_stat_statements`, `supabase_vault`
- Migrations applied (via Supabase MCP):
  - `0000_create_types_and_tables` — 21 tables, 5 enums, all FKs
  - `0001_wait_times_index` — composite `(ride_id, ts DESC)` index
  - `0002_wait_times_hourly_agg` — `wait_times_1h` materialized view + pg_cron
    hourly refresh + daily 2-year purge
  - `0003_rls_policies` — RLS enabled on all 21 tables, owner policies on
    user-owned tables, catalog tables locked (no policy = blocked by default)
- **Manual step still pending:** enable anonymous sign-ins
  (Dashboard → Authentication → Providers → Anonymous → Enable)
  — blocks Phase 04 auth flows, not Phase 01 completion

## 2. Upstash Redis — ✓ Provisioned

- `REDIS_URL` populated in `.env.local`
- No application data yet; first write happens in Phase 02 ingestion workers

## 3. Railway — ○ Not yet provisioned

- Not blocking Phase 01. API + worker services will be created at the start
  of Phase 02 when the ingestion workers are ready to deploy.
- `apps/api` runs locally against `.env.local` for now.

## 4. Vercel — ◆ Partially provisioned

- Web project exists and auto-deploys from the repo.
- `TURBO_TOKEN` / `TURBO_TEAM` still not populated — Turbo remote cache is
  disabled. Non-blocking; builds work fine without it. Revisit when Vercel
  team slug is confirmed.

## 5. RevenueCat — ○ Not yet provisioned

- Deferred to Phase 04 (Entitlements & Accounts). Webhook endpoint does not
  exist yet, so there is nothing to wire to.

## 6. Sentry — ✓ Provisioned

- `SENTRY_DSN_API` and `SENTRY_DSN_WEB` populated in `.env.local`
- iOS + Android DSNs set up in `.env.local` but not yet wired into native
  projects (Phase 05 / Phase 07)

## 7. PostHog — ✓ Provisioned

- `POSTHOG_KEY` and `POSTHOG_HOST` populated in `.env.local`
- LEGL-07 property-blocking (`age_bracket`, `guest_age`, etc.) will be
  configured in the PostHog dashboard during Phase 02 when events start firing.

## Phase 02 Readiness Checklist

To unblock Phase 02 data ingestion:

- [x] Supabase project + migrations applied
- [x] Upstash Redis connection string in `.env.local`
- [x] Sentry API DSN in `.env.local`
- [x] PostHog key in `.env.local`
- [ ] Seed script run against live DB (idempotency test) — see README/seed docs
- [ ] Railway project + `api` and `worker` services created
- [ ] PostHog blocked properties configured

---

_This file is committed. `.env.local` is NOT committed._
_Update this file whenever a service moves between states._
