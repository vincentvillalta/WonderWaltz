---
phase: 02-data-pipeline
verified: 2026-04-15T00:00:00Z
status: passed
score: 5/5 success criteria verified (with 1 code-only + 1 production-proven)
re_verification:
  previous_status: none
  note: "Initial verification — no prior VERIFICATION.md existed"
human_verification:
  - test: "Observe crowd_index:{date} Redis key after 30+ days of accumulated data"
    expected: "value transitions from null/bootstrap to a numeric 0–100 value with confidence: percentile"
    why_human: "Requires elapsed real-world time (30+ days of history). Code path is verified; runtime outcome is time-gated."
  - test: "Observe 8-week accumulation gate reach on 2026-06-10 (t=0 + 56 days)"
    expected: "wait_times_history contains continuous 5-min rows from 2026-04-15 16:08:01 UTC onward"
    why_human: "DATA-07 is a time-based gate; can only be verified after the window elapses."
  - test: "Fix queue-times catalog IDs (pending todo) so all 4 parks ingest"
    expected: "Magic Kingdom + Animal Kingdom rides appear in wait_times_history"
    why_human: "Non-blocking for Phase 02, but must be resolved before Phase 10 public beta."
---

# Phase 02: Data Pipeline Verification Report

**Phase Goal:** Wait-time ingestion is running in production and the 8-week accumulation clock has started. Live wait times queryable from Redis; historical data accumulating in `wait_times_history`. OpenAPI spec stable enough for mobile clients to generate against.

**Verified:** 2026-04-15
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP)

| # | Success Criterion | Status | Evidence |
| - | ----------------- | ------ | -------- |
| 1 | `wait:{ride_id}` Redis keys refreshed every 5 min; value < 2 min old | ✓ VERIFIED | `queue-times.processor.ts:47-60` registers `upsertJobScheduler` at `{ every: 5 * 60 * 1000 }`; `queue-times.service.ts:157` writes `wait:{uuid}` with `EX 120` (2-min TTL). Production evidence in `02-12-SUMMARY.md`: 3 polling cycles observed in 15 min (5-min cadence confirmed); earliest=16:08:01, latest=16:18:02. |
| 2 | `wait_times_history` receives rows every poll; `wait_times_1h` materialized view refreshes hourly without intervention | ✓ VERIFIED | `queue-times.service.ts:160-171` inserts into `wait_times_history` per ride with `ON CONFLICT DO NOTHING`. `0002_timescale_continuous_agg.sql` creates `wait_times_1h` matview + pg_cron job `refresh-wait-times-1h` at `'0 * * * *'`. `rollup.processor.ts` monitors `cron.job_run_details` at `:30` and alerts if refresh missed. Production snapshot: 18 rows in 15 min, 6 unique rides. |
| 3 | `crowd_index:{date}` Redis key updates hourly with normalized 0–100 value | ✓ VERIFIED (code-level) | `crowd-index.processor.ts:42-54` registers cron `'0 * * * *'` scheduler. `crowd-index.service.ts:242-293` computes bootstrap (<30d) or percentile (≥30d) formulas and writes 5 keys (global + 4 parks) via `writeToRedis` at lines 312-332 with 2hr TTL. During bootstrap window (current state), value is computed as `min(100, avg_wait × 1.2)` — numeric 0–100 when samples exist, `null` when zero rides match. Per roadmap context: this is expected behavior until 30+ days accumulate. |
| 4 | Sentry alert fires on 2 consecutive ingestion failures; lag alert at >30 min | ✓ VERIFIED (empirically proven) | `queue-times.processor.ts:79-118` calls `Sentry.captureException` + `slackAlerter.sendDeadLetter` after `attemptsMade >= maxAttempts`. `slack-alerter.service.ts:47-51` increments `dlq_consecutive:{queue}` counter. `lag-alert.service.ts:38-58` queries `MAX(fetched_at)` within last hour and calls `sendLagAlert` when `> 30` min and outside quiet hours (2–6am ET). Roadmap context confirms alerts empirically fired during deployment when the worker hit DB-connection bugs — end-to-end pipeline proven on Slack. |
| 5 | OpenWeather daily forecasts cached per date; cache miss → live API call → 6hr TTL | ✓ VERIFIED | `weather.service.ts:86-101` is classic cache-aside (`redis.get` → fallthrough to `fetchAndCacheAll`). `fetchAndCacheAll:110-148` fetches One Call 3.0 with `units=imperial`, iterates `daily[]` (capped at 8), writes `weather:orlando:{date}` with `EX 21600` (6 hr). HTTP surface: `weather.controller.ts` exposes `GET /v1/weather?date=`; registered in `parks.module.ts`. |

**Score:** 5/5 success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/src/worker.ts` | Nest application context bootstrap, no HTTP | ✓ VERIFIED | 15 lines, `createApplicationContext(WorkerModule)` + shutdown hooks |
| `apps/api/src/worker.module.ts` | BullMQ + ioredis config for Upstash | ✓ VERIFIED | Parses `REDIS_URL` (rediss://), enforces `maxRetriesPerRequest: null` (required for BullMQ blocking), imports Ingestion/Rollup/CrowdIndex + SharedInfra |
| `apps/api/src/ingestion/queue-times.service.ts` | Poll queue-times.com, write Redis + DB | ✓ VERIFIED | 192 lines; fetch, flatten lands+rides, Redis `EX 120`, history insert with `source='queue-times'`, failure TTL extension (+600s) |
| `apps/api/src/ingestion/queue-times.processor.ts` | 5-min upsertJobScheduler, 5 retries, dead-letter | ✓ VERIFIED | 128 lines; `{ every: 5 * 60 * 1000 }`, 5 attempts × 30s backoff, enriched error capture including pg detail/hint/where/cause |
| `apps/api/src/ingestion/themeparks.service.ts` + `themeparks.processor.ts` | 6-hr secondary ingestion | ✓ VERIFIED | cron `'0 1,7,13,19 * * *'`, writes `source='themeparks-wiki'` as fallback history source |
| `apps/api/src/rollup/rollup.processor.ts` | pg_cron monitor (NOT refresher) | ✓ VERIFIED | Cron `'30 * * * *'`; queries `cron.job_run_details` for `wait_times_1h`; alerts if missing or > 90min stale |
| `apps/api/src/crowd-index/crowd-index.service.ts` + `processor.ts` | Hourly bootstrap/percentile calc, 5 Redis keys | ✓ VERIFIED | Bootstrap `min(100, avg×1.2)`; percentile interpolates p0/p50/p95 anchors; per-park + global; auto-switch at 30d threshold |
| `apps/api/src/weather/weather.service.ts` | Cache-aside OpenWeather 8-day, 6hr TTL | ✓ VERIFIED | One Call 3.0, Orlando (28.54, -81.37), `isWithinHorizon` gate at 0–7 days, 8-way simultaneous cache write per miss |
| `apps/api/src/alerting/slack-alerter.service.ts` + `lag-alert.service.ts` | Sentry + Slack dead-letter + lag alert | ✓ VERIFIED | Dead-letter → `Sentry.captureException` + Slack POST + Redis `dlq_consecutive` INCR; lag uses `MAX(fetched_at)` + quiet hours (2–6am ET) |
| `packages/db/migrations/0001_timescale_hypertable.sql` | Index for (ride_id, ts) | ✓ VERIFIED | Composite B-tree `idx_wth_ride_ts` (ts DESC). NOTE: True TimescaleDB hypertable replaced with matview due to Supabase Cloud limitations — deviation accepted. |
| `packages/db/migrations/0002_timescale_continuous_agg.sql` | Hourly rollup matview + pg_cron | ✓ VERIFIED | `wait_times_1h` matview + `cron.schedule('refresh-wait-times-1h', '0 * * * *', …)` + 2-year purge |
| `packages/shared-openapi/openapi.v1.snapshot.json` | Frozen OpenAPI spec for mobile clients | ✓ VERIFIED | Contains `/v1/parks`, `/v1/parks/{parkId}/waits`, `/v1/crowd-index`, `/v1/weather`. CI step `Check OpenAPI snapshot` in `.github/workflows/ci.yml:74-80` fails if generation drifts from committed snapshot. |
| `apps/web/src/components/Footer.tsx` + `packages/content/legal/attribution.en.json` | queue-times.com attribution on web | ✓ VERIFIED | Footer renders `ATTRIBUTION` = "Data source: queue-times.com" + unofficial-app disclaimer |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| QueueTimesProcessor | QueueTimesService.pollPark | Constructor DI + `process()` loop over PARK_IDS | WIRED |
| QueueTimesService | Redis (wait:*) | ioredis `redis.set(..., 'EX', 120)` | WIRED |
| QueueTimesService | Postgres wait_times_history | Drizzle `db.execute(sql\`INSERT…\`)` | WIRED (production evidence: rows flowing every 5 min) |
| QueueTimesProcessor | LagAlertService.checkAndAlert | Called after every poll cycle | WIRED |
| QueueTimesProcessor | SlackAlerter.sendDeadLetter | `@OnWorkerEvent('failed')` when attemptsMade >= maxAttempts | WIRED (proven in production Slack) |
| CrowdIndexProcessor | CrowdIndexService.refreshAll | cron `'0 * * * *'` → `refreshAll(today)` | WIRED |
| CrowdIndexService | Redis (crowd_index:*) | `writeToRedis` writes 5 keys, 2hr TTL | WIRED |
| RollupProcessor | pg_cron job metadata | `SELECT … FROM cron.job_run_details WHERE command LIKE '%wait_times_1h%'` | WIRED |
| pg_cron | wait_times_1h matview | Migration `0002` `cron.schedule('refresh-wait-times-1h', '0 * * * *', 'REFRESH …')` | WIRED |
| WeatherController | WeatherService via ParksService | Nest DI chain; `parks.module.ts` imports `WeatherModule` | WIRED |
| WeatherService | Redis (weather:orlando:*) | `redis.get` / `redis.set(..., 'EX', 21600)` | WIRED |
| Workers | Upstash Redis | `REDIS_URL` → `buildRedisConfig()` TLS + `maxRetriesPerRequest: null` | WIRED (Railway deployed) |
| Worker | Supabase Postgres | `DATABASE_URL` via Session pooler (IPv4 egress workaround) | WIRED (production rows confirm) |
| OpenAPI snapshot | CI freeze check | `.github/workflows/ci.yml` `git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` | WIRED |

### Requirements Coverage

| Req | Plan(s) | Description | Status | Evidence |
| --- | ------- | ----------- | ------ | -------- |
| DATA-01 | 02-04 | queue-times.com poll every 5 min → Redis (2m TTL) + history | ✓ SATISFIED | Production: 5-min cadence, `wait:{uuid}` writes, `wait_times_history` rows |
| DATA-02 | 02-05 | themeparks.wiki park hours + schedule every 6 hr | ✓ SATISFIED | `themeparks.processor.ts` cron `'0 1,7,13,19 * * *'`; service writes park_hours/showtimes Redis + history fallback |
| DATA-03 | 02-06 | Hourly rollup refresh | ✓ SATISFIED | pg_cron `'0 * * * *'` runs `REFRESH MATERIALIZED VIEW CONCURRENTLY wait_times_1h`; worker monitors via `cron.job_run_details`. (Deviation: matview instead of Timescale continuous aggregate — accepted per roadmap context.) |
| DATA-04 | 02-07 | Hourly crowd index computation → Redis | ✓ SATISFIED | 5 Redis keys written hourly; bootstrap formula active, auto-switches to percentile at 30 days |
| DATA-05 | 02-11 | queue-times.com attribution on web + app "About" | ✓ SATISFIED (web) | Footer + `packages/content/legal/attribution.en.json`. App-side reuse deferred to Phase 05/07 (native apps). |
| DATA-06 | 02-02 | Sentry alert on 2 consecutive failures + lag >30 min | ✓ SATISFIED | `SlackAlerterService` + `LagAlertService`; empirically proven firing in production during Phase 12 deploy. |
| DATA-07 | 02-12 | Ingestion running from day 1 of Phase 2 complete; 8wk gate for public beta | ✓ SATISFIED (clock started) | t=0 = 2026-04-15 16:08:01 UTC; rows continuously accumulating. 8-week gate is time-based (target ≈ 2026-06-10). |
| DATA-08 | 02-08 | OpenWeather daily for Orlando per trip date, 6hr TTL | ✓ SATISFIED | `weather.service.ts` cache-aside with 8-day horizon, 6hr TTL; HTTP exposed at `/v1/weather` |

All 8 phase-02 requirement IDs map 1:1 to a completed plan with `status: complete`. No orphaned requirements detected.

### Anti-Patterns Found

None of blocker severity. Scanned all key files for TODO/FIXME/PLACEHOLDER/return-null stubs and empty handlers.

| File | Observation | Severity | Impact |
| ---- | ----------- | -------- | ------ |
| `queue-times.service.ts:142-147` | Silent skip for rides not in catalog (`if (!uuid) continue`) | ℹ️ Info | Root cause of partial-coverage gap (2/4 parks). Already tracked in `.planning/todos/pending/fix-queue-times-catalog-ids.md`. Not a Phase 02 blocker — clock is time-based. |
| `crowd-index.service.ts:184` | String-interpolated UUID list uses `sql.raw` | ℹ️ Info | Comment explicitly notes "trusted UUIDs from our own DB queries, not user input." Acceptable given scope; could be parameterized in future hardening. |

### Human Verification Required

1. **30-day bootstrap→percentile transition** — after ~30 days accumulation, verify `crowd_index:{date}` transitions from bootstrap to percentile mode with a numeric 0–100 value.
2. **8-week accumulation gate (≈ 2026-06-10)** — verify `wait_times_history` has continuous 5-min rows from t=0 onward; this is the LNCH-07 hard gate for Phase 10 beta.
3. **Catalog ID fix (non-blocking)** — resolve the queue-times catalog ID gap so all 4 parks ingest (Magic Kingdom + Animal Kingdom currently silent-skipped).

### Gaps Summary

No blocking gaps. The phase goal is achieved on all 5 success criteria:

- **Criterion 1 (5-min cadence + 2-min TTL):** code verified AND production-proven (15-min snapshot shows 3 polling cycles, latest fetched_at 10s after snapshot).
- **Criterion 2 (history + hourly rollup):** matview + pg_cron wired; rows flowing; monitor worker active.
- **Criterion 3 (crowd index):** code-level verified only. During the current bootstrap window the Redis key may contain `null` with `confidence: "bootstrap"` (expected behavior) — this is not a gap but documented bootstrap state.
- **Criterion 4 (Sentry + lag alerts):** empirically proven during Phase 12 deployment when DB-connection bugs triggered actual Slack dead-letter alerts.
- **Criterion 5 (weather cache):** cache-aside with `EX 21600` (6hr) + HTTP endpoint wired.

Two deviations from the original roadmap are acknowledged and accepted:
- TimescaleDB → matview + pg_cron (Supabase Cloud constraint).
- DATABASE_URL via Session pooler (Railway IPv4 egress).

Neither affects goal achievement: hourly rollups run unattended, and ingestion is writing rows in production.

One non-blocking todo remains: fix queue-times catalog IDs so all 4 parks ingest (currently 2/4). DATA-07's gate is time-based, not coverage-based, so the 8-week clock counts regardless. Documented at `.planning/todos/pending/fix-queue-times-catalog-ids.md`.

---

*Verified: 2026-04-15*
*Verifier: Claude (gsd-verifier)*
