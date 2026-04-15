# External Service Provisioning — Current State

**As of:** 2026-04-16 (Phase 03 Engine — plan 03-02: Anthropic SDK installed)
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

## 3. Railway — ✓ Provisioned

- API service: assumed provisioned (web-facing HTTP surface).
- **Worker service: deployed and running.** Dockerfile-based build
  (`node dist/src/worker.js`). All 5 required env vars set.
- **DATABASE_URL uses the Supabase Session pooler** (port 5432 at
  `aws-*.pooler.supabase.com`) because Direct (`db.*.supabase.co`) is
  IPv6-only and Railway's egress is IPv4.
- **Ingestion clock start (t=0 for DATA-07 / LNCH-07 8-week gate):**
  **2026-04-15 16:08:01 UTC** (first row in `wait_times_history`)
- ⚠ **Catalog coverage gap:** Only 2 of 4 parks are ingesting because
  many seed-file `queue_times_id` values don't match current queue-times.com
  live IDs. Ingestion still counts for DATA-07 — the 8-week clock continues
  from t=0 regardless. Fix tracked at
  `.planning/todos/pending/fix-queue-times-catalog-ids.md`.

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

## 8. Anthropic (Claude API) — ○ Not yet provisioned

- **Required for Phase 03 (Engine):** `NarrativeModule` calls Claude
  Messages API for plan narrative generation (LLM-01..08).
- **Env var:** `ANTHROPIC_API_KEY` — required in Railway **worker** service
  env (the `plan-generation` BullMQ processor is the only consumer) **and**
  `.env.local` for local development / integration tests.
- **Where to obtain:** https://console.anthropic.com → **Settings → API Keys**
  → Create Key. Scope: workspace-wide is fine for dev; create a
  per-environment key for production.
- **Pinned model IDs** (decision locked 2026-04-16, see `03-RESEARCH.md`):
  - `claude-sonnet-4-6` — initial plan generation
  - `claude-haiku-4-5` — rethink-my-day + free-tier teaser + budget fallback
  - Both must be stored as env vars (`ANTHROPIC_SONNET_MODEL`,
    `ANTHROPIC_HAIKU_MODEL`) so model bumps don't require code changes.
  - Never use `-latest` aliases — nightly smoke test validates pinned ID
    responds with a valid Messages payload.
- **Budget guardrail:** $0.50 per-trip lifetime circuit breaker (LLM-07).
  Enforced in code; no Anthropic-side rate-limit config required.
- **Tests run without the key:** plan 03-02 ships a deterministic mock
  harness (`apps/api/tests/anthropic-mock.ts`) so CI never touches the real
  API. Only production + manual integration smoke tests require the key.

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

## Phase 03 Prerequisites

Phase 03 (Engine) adds one new external dependency:

- [ ] `ANTHROPIC_API_KEY` set in Railway **worker** service env vars
- [ ] `ANTHROPIC_API_KEY` set in local `.env.local` (for integration tests
      that hit the real API; unit + mock-harness tests do not need it)
- [ ] `ANTHROPIC_SONNET_MODEL=claude-sonnet-4-6` (env default)
- [ ] `ANTHROPIC_HAIKU_MODEL=claude-haiku-4-5` (env default)

All four are runtime-only for the worker process. The HTTP `api` service
does not call Anthropic directly — it enqueues BullMQ jobs that the worker
consumes.

---

_This file is committed. `.env.local` is NOT committed._
_Update this file whenever a service moves between states._
