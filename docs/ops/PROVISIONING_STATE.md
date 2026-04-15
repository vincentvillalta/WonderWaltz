# External Service Provisioning — Current State

**As of:** 2026-04-14 (Phase 02 Data Pipeline — worker deploy pending)
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

## 3. Railway — ◆ Worker service pending deploy

- API service: assumed provisioned and running (Phase 02 built against it).
- **Worker service: pending deploy** — code is complete; worker service must
  be created in the Railway dashboard with `node dist/worker.js` start command.
- See `docs/ops/PHASE2-DEPLOYMENT.md` for the full deployment runbook.
- **Required env vars not yet set (worker service):**
  - `OPENWEATHER_API_KEY` — required for weather cache (GET /v1/weather). Source: [openweathermap.org](https://home.openweathermap.org/api_keys) → My API Keys
  - `SLACK_ALERT_WEBHOOK_URL` — required for Sentry alert routing. Source: Slack workspace → Apps → Incoming Webhooks → Add to Slack
- Shared env vars to copy from `api` service to `worker` service: `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN_API`
- **Status moves to ✓ Provisioned** after checkpoint passes (ingestion rows confirmed in wait_times_history)
- Ingestion clock start: ******\_\_\_\_****** (fill in when worker verified running)

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

Phase 02 code is complete. Deployment gate remaining:

- [x] Supabase project + migrations applied (including wait_times_1h materialized view + pg_cron)
- [x] Upstash Redis connection string in `.env.local`
- [x] Sentry API DSN in `.env.local`
- [x] PostHog key in `.env.local`
- [x] Seed script run against live DB (idempotency confirmed — plan 02-11)
- [x] Phase 02 code complete: BullMQ worker, all 4 processors, live API endpoints, OpenAPI v1 snapshot frozen
- [ ] Railway `worker` service created + start command set to `node dist/worker.js`
- [ ] `OPENWEATHER_API_KEY` set in Railway worker service env vars
- [ ] `SLACK_ALERT_WEBHOOK_URL` set in Railway worker service env vars
- [ ] Worker deployed and verified: wait_times_history receiving rows (spot-check SQL passing)
- [ ] Ingestion clock start timestamp recorded (t=0 for 8-week Phase 10 gate)
- [ ] PostHog blocked properties configured (Dashboard → Data Management → Property definitions)

---

_This file is committed. `.env.local` is NOT committed._
_Update this file whenever a service moves between states._
