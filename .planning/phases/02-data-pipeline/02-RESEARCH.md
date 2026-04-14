# Phase 02: Data Pipeline — Research

**Researched:** 2026-04-14
**Domain:** NestJS BullMQ workers, external API ingestion, Redis caching, OpenAPI snapshot CI, pg_cron monitoring
**Confidence:** HIGH (stack confirmed, APIs probed live, patterns verified)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Worker Process Topology**
- One Railway `worker` service, all BullMQ queues in one Node process
- Entry points both in `apps/api`: existing `src/main.ts` (HTTP), new `src/worker.ts` (BullMQ)
- Concurrency: 1 per queue (sequential processing)
- Retry policy: 5 attempts, linear 30-second backoff, then dead-letter + Sentry alert

**Ingestion Sources & Failover**
- queue-times.com is primary (DATA-01, every 5min)
- themeparks.wiki is secondary (DATA-02, every 6hr) for park hours + entertainment
- Conflict resolution: most recent `fetched_at` wins; source identity preserved in `wait_times_history.source`
- Outage posture: degrade gracefully; serve last-known Redis values; do NOT poll secondary out-of-schedule
- Staleness: extend TTL +10min on fetch failure; `is_stale = true` when `fetched_at > 5min ago`
- API wait payload shape: `{ minutes, fetched_at, source, is_stale }`

**Sentry Alerting**
- "Fails twice in a row" = 2 consecutive dead-lettered jobs per queue (after all 5 retries exhausted)
- Lag alert = global: freshest `fetched_at` across all WDW wait-time rows > 30min vs `now()`
- Quiet hours: suppress lag alerts 2am–6am ET
- Alert routing: Sentry → Slack channel via incoming webhook

**Crowd Index Formula (DATA-04)**
- Top 20 rides = top 5 per park × 4 parks (MK, EPCOT, HS, AK)
- 0–100 scale via percentile mapping against last 90 days of history
- Bootstrap period (first 30d): `min(100, avg_wait × 1.2)`; auto-switch on day 31+
- Emit both global and per-park indices; 5 Redis keys total, updated hourly
- Confidence metadata: `{ value, confidence: "bootstrap" | "percentile", sample_size_days }`

**Weather Integration (DATA-08)**
- Fetch trigger: on-demand, cache-aside — no worker
- Cache key: `weather:orlando:{YYYY-MM-DD}`, 6-hour TTL
- Beyond OpenWeather's 16-day horizon: skip weather field (omit from response)
- Failure handling: best-effort, return `null`, no retry, no circuit breaker
- Client payload: `{ high_f, low_f, condition, precipitation_pct, humidity_pct, uv_index }`

**OpenAPI Spec Stability**
- Hard freeze at end of Phase 2 — spec becomes `v1`
- Path-based versioning: `/v1/parks`, `/v1/trips/:id/live`, etc.
- CI snapshot: `packages/shared-openapi/openapi.v1.snapshot.json`; diff on CI fails on breaking change
- v1 surface includes: ingestion reads, Phase 3 trip/plan stubs (501), Phase 4 auth scaffolding

**Attribution (DATA-05)**
- UI-only: web footer + app About screen
- Exact text: "Data source: queue-times.com"
- Content source: `packages/content/legal/attribution.en.json`
- Plain text (not hyperlink)

**TimescaleDB Replacement**
- `wait_times_1h` is a standard materialized view + pg_cron hourly refresh + daily retention purge
- DATA-03 worker's job: verify pg_cron ran and alert if not (NOT trigger refresh)

### Claude's Discretion
- BullMQ queue names and job-name conventions
- Exact Redis key naming for sub-keys (TTL extension, last-known values)
- Which NestJS module houses which worker class
- Weather `condition` field normalization strategy
- OpenAPI response shape for trip/plan stubs (design carefully, lock in Phase 2)
- pg_cron job timing inside the hour for crowd-index rollup

### Deferred Ideas (OUT OF SCOPE)
- Per-ride wait-time staleness alerts
- Park-hours-aware alert suppression
- OpenWeather prefetch worker
- Seasonal-average weather beyond 16 days
- OpenWeather circuit breaker
- API-response attribution (header or meta field)
- Tappable attribution link
- Per-worker Railway services
- Higher worker concurrency
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | BullMQ worker `fetch_queue_times` pulls queue-times.com every 5min; writes to Redis (2min TTL) + wait_times_history | queue-times.com API probed live; field mapping documented; BullMQ upsertJobScheduler pattern verified |
| DATA-02 | BullMQ worker `fetch_themeparks_wiki_hours` pulls park hours + entertainment every 6hr | themeparks.wiki API probed live; entity IDs confirmed; /schedule and /live endpoints documented |
| DATA-03 | BullMQ worker `rollup_wait_history` verifies pg_cron ran hourly, alerts if not | pg_cron cron.job_run_details query pattern documented; Drizzle raw SQL pattern confirmed |
| DATA-04 | BullMQ worker `refresh_crowd_index` computes global crowd index hourly; writes to Redis | Percentile SQL pattern documented; bootstrap formula specified; Redis key structure defined |
| DATA-05 | queue-times.com attribution in app About + website footer | Content file pattern confirmed from disclaimer.en.json; attribution.en.json path and shape defined |
| DATA-06 | Sentry alert on 2 consecutive dead-lettered jobs or >30min wait-time lag | BullMQ failed event / @OnWorkerEvent pattern verified; Sentry captureException + Slack webhook pattern documented |
| DATA-07 | Ingestion running in production from Phase 2 day 1; 8-week accumulation clock starts | Railway worker service provisioning documented; deployment checklist from PROVISIONING_STATE.md |
| DATA-08 | OpenWeather daily forecast; cache by date in Redis 6hr TTL | OneCall 3.0 API documented; 8-day (not 16-day) horizon clarification; day_summary endpoint for future dates documented |
</phase_requirements>

---

## Summary

Phase 2 wires external data sources into Redis and Postgres using NestJS + BullMQ in a standalone worker process. The primary technical work is: (1) a separate `worker.ts` entry point using `NestFactory.createApplicationContext`, (2) three BullMQ queues with job schedulers (5min, 6hr, 1hr), (3) live API integrations against queue-times.com and themeparks.wiki, (4) an on-demand weather cache-aside pattern, (5) a crowd-index worker computing percentile-based scores from historical Postgres data, and (6) a frozen OpenAPI v1 spec with CI snapshot enforcement.

**Critical clarification discovered during research:** The CONTEXT.md says "skip beyond 16-day horizon" for weather, but OpenWeather One Call 3.0 provides only **8 days** of daily forecast. Dates 1–8 from today use the standard `/onecall` endpoint. Dates beyond day 8 can use the `/onecall/day_summary?date=YYYY-MM-DD` endpoint (historical aggregation, paid; covers +1.5 years). The planner must decide: use `day_summary` for trip dates 9–∞ days out, or cap weather at 8 days and return `null` beyond. Given the "skip beyond 16-day horizon" instruction and "best-effort null on failure" philosophy, the pragmatic choice is to **cap at 8 days** (not 16) and return `null` beyond. Flag this discrepancy for user review in the plan.

The two sources have been probed live and confirmed working. queue-times.com returns park IDs 5–8 for WDW. themeparks.wiki returns stable UUIDs that match the entity IDs needed. The `attractions.queue_times_id` and `attractions.themeparks_wiki_id` columns already exist in the seeded catalog — the worker resolves these to internal UUIDs at write time.

**Primary recommendation:** Use `BullModule.forRoot` at the `WorkerModule` level, three `WorkerHost` processors, and `queue.upsertJobScheduler()` on worker startup. Use `@OnWorkerEvent('failed')` to detect exhausted jobs and invoke Sentry + Slack directly from the worker process.

---

## Standard Stack

### Core (already in package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/bullmq` | ^11.0.0 | BullMQ integration for NestJS | Official NestJS module; DI-aware processors |
| `bullmq` | 5.73.1 | Job queue engine | Already pinned; v5 is current stable |
| `ioredis` | ^5.0.0 | Redis client for BullMQ + cache | BullMQ's required client |
| `@nestjs/swagger` | ^11.0.0 | OpenAPI spec generation | Already present; v11 required for NestJS 11 |
| `drizzle-orm` | 0.45.2 | ORM for Postgres reads/writes | Already pinned; `sql` template covers raw SQL |
| `@sentry/nestjs` | 10.47.0 | Error reporting | Already provisioned with DSN |

### New Additions Required
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| `axios` or Node 22 `fetch` | built-in / `^1.9` | HTTP calls to external APIs | Need HTTP client for queue-times.com and themeparks.wiki; Node 22 native `fetch` is sufficient |
| `@nestjs/schedule` (optional) | ^5.0.0 | Alternative to BullMQ for pg_cron check | NOT needed — use BullMQ for all scheduled work |

**No new packages required for HTTP calls** — Node 22 native `fetch` is available and stable. Use it for the external API calls to avoid dependency bloat.

### Installation
```bash
# No new runtime packages needed — all dependencies already in apps/api/package.json
# Optional: add swagger-ui-express only if serving Swagger UI (not needed for snapshot)
pnpm add -w --filter @wonderwaltz/api @types/node@^22
```

---

## Architecture Patterns

### Recommended File Structure
```
apps/api/src/
├── main.ts                          # Existing HTTP entry point
├── worker.ts                        # NEW: BullMQ worker entry point
├── app.module.ts                    # Existing (register new modules here)
├── worker.module.ts                 # NEW: imports all worker modules
├── ingestion/
│   ├── ingestion.module.ts          # BullModule.registerQueue('wait-times'), ('park-hours')
│   ├── queue-times.processor.ts     # @Processor('wait-times') extends WorkerHost
│   ├── themeparks.processor.ts      # @Processor('park-hours') extends WorkerHost
│   ├── queue-times.service.ts       # HTTP call to queue-times.com
│   └── themeparks.service.ts        # HTTP call to themeparks.wiki
├── crowd-index/
│   ├── crowd-index.module.ts        # BullModule.registerQueue('crowd-index')
│   └── crowd-index.processor.ts    # @Processor('crowd-index') extends WorkerHost
├── rollup/
│   ├── rollup.module.ts             # BullModule.registerQueue('rollup-verify')
│   └── rollup.processor.ts         # @Processor('rollup-verify') extends WorkerHost
├── weather/
│   ├── weather.module.ts
│   └── weather.service.ts          # Cache-aside, no queue
├── parks/
│   ├── parks.module.ts
│   └── parks.controller.ts         # GET /v1/parks/:parkId/waits, GET /v1/crowd-index
└── common/
    └── openapi-snapshot.ts          # Script: write spec to disk for CI
packages/
└── shared-openapi/
    └── openapi.v1.snapshot.json     # Committed snapshot; CI diffs against it
packages/content/legal/
    ├── disclaimer.en.json           # Existing
    └── attribution.en.json          # NEW: { "text": "Data source: queue-times.com" }
```

### Pattern 1: Worker Entry Point (worker.ts)
**What:** `NestFactory.createApplicationContext` starts NestJS without HTTP server; registers all processor modules.
**When to use:** Any Railway service that only processes BullMQ jobs.
**Example:**
```typescript
// apps/api/src/worker.ts
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  app.enableShutdownHooks();
}

bootstrap().catch((err) => {
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
```

### Pattern 2: BullModule Registration with Upstash TLS
**What:** Pass ioredis-compatible connection config with TLS enabled. `maxRetriesPerRequest: null` is required for BullMQ workers (not queues).
**Example:**
```typescript
// worker.module.ts
BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    tls: {},              // Required for Upstash (always TLS)
    maxRetriesPerRequest: null,  // Required for BullMQ workers
    enableReadyCheck: false,     // Recommended for Upstash
  },
})
```
Alternatively, parse `REDIS_URL` which has format `rediss://:password@host:port` — the `rediss://` scheme auto-enables TLS in ioredis.

### Pattern 3: Processor with Retry Config and Dead-Letter Detection
**What:** `WorkerHost` processor with `@OnWorkerEvent('failed')` to detect exhausted jobs.
**Example:**
```typescript
@Processor('wait-times', {
  concurrency: 1,
  settings: { backoffStrategy: (attemptsMade) => attemptsMade * 30_000 },
})
export class QueueTimesProcessor extends WorkerHost {
  async process(job: Job): Promise<void> { /* ... */ }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      // Job is dead-lettered — all retries exhausted
      Sentry.captureException(error, {
        tags: { queue: 'wait-times', jobId: job.id },
        extra: { attemptsMade: job.attemptsMade },
      });
      await this.slackAlerter.sendDeadLetter('wait-times', job.id!, error.message);
    }
  }
}
```

### Pattern 4: Job Scheduler Registration on Worker Startup
**What:** Use `queue.upsertJobScheduler()` to register repeating jobs idempotently on startup (v5.16+ pattern).
**Example:**
```typescript
// In WorkerModule's onModuleInit or processor's constructor
await this.waitTimesQueue.upsertJobScheduler(
  'fetch-wait-times-scheduler',
  { every: 5 * 60 * 1000 }, // 5 minutes in ms
  {
    name: 'fetch_queue_times',
    data: {},
    opts: { attempts: 5, backoff: { type: 'fixed', delay: 30_000 } },
  },
);
```
Note: Cron pattern alternative: `{ pattern: '*/5 * * * *' }`. Use `every` (milliseconds) for simplicity.

### Pattern 5: OpenAPI Snapshot Generation
**What:** Bootstrap the NestJS app without listening, call `SwaggerModule.createDocument`, write to disk.
**Example:**
```typescript
// scripts/generate-openapi-snapshot.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule } from '../src/app.module.js';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('WonderWaltz API')
    .setVersion('1')
    .addServer('/v1')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  fs.writeFileSync(
    'packages/shared-openapi/openapi.v1.snapshot.json',
    JSON.stringify(doc, null, 2),
  );
  await app.close();
}
generate();
```
CI script to gate on diff:
```bash
# In GitHub Actions
node scripts/generate-openapi-snapshot.ts
git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json
# exits 1 if spec changed without an explicit snapshot commit
```

### Pattern 6: pg_cron Verification via Drizzle Raw SQL
**What:** Query `cron.job_run_details` to check last run of the materialized view refresh job.
**Example:**
```typescript
// In rollup.processor.ts
const result = await this.db.execute(sql`
  SELECT status, start_time, end_time, return_message
  FROM cron.job_run_details
  WHERE command LIKE '%wait_times_1h%'
  ORDER BY start_time DESC
  LIMIT 1
`);
const lastRun = result.rows[0];
const ageMinutes = (Date.now() - new Date(lastRun.start_time).getTime()) / 60_000;
if (ageMinutes > 90 || lastRun.status !== 'succeeded') {
  Sentry.captureException(new Error('pg_cron refresh missed'), {
    extra: { lastRun, ageMinutes },
  });
}
```
The `cron.job_run_details` table columns: `jobid`, `runid`, `job_pid`, `database`, `username`, `command`, `status` (`succeeded`/`failed`), `return_message`, `start_time`, `end_time`.

### Pattern 7: Crowd Index Percentile Calculation
**What:** Drizzle `sql` template for `percentile_cont` PostgreSQL aggregate.
**Example:**
```typescript
// In crowd-index.processor.ts — percentile-based mode
const result = await this.db.execute(sql`
  WITH top_rides AS (
    SELECT a.id AS ride_id, a.park_id
    FROM attractions a
    WHERE a.queue_times_id IS NOT NULL AND a.is_active = true
      AND a.park_id IN (
        SELECT id FROM parks WHERE external_id IN (
          'magic-kingdom','epcot','hollywood-studios','animal-kingdom'
        )
      )
    ORDER BY (
      SELECT AVG(w.minutes) FROM wait_times_history w
      WHERE w.ride_id = a.id
        AND w.ts > now() - INTERVAL '90 days'
    ) DESC NULLS LAST
    LIMIT 5 -- applied per park via application logic; use RANK() in practice
  ),
  current_avg AS (
    SELECT AVG(w.minutes) AS avg_wait
    FROM wait_times_history w
    INNER JOIN top_rides tr ON tr.ride_id = w.ride_id
    WHERE w.ts > now() - INTERVAL '10 minutes'
  ),
  historical_dist AS (
    SELECT percentile_cont(0.0) WITHIN GROUP (ORDER BY hourly_avg) AS p0,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY hourly_avg) AS p50,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY hourly_avg) AS p95
    FROM (
      SELECT date_trunc('hour', ts) AS h, AVG(minutes) AS hourly_avg
      FROM wait_times_history w
      INNER JOIN top_rides tr ON tr.ride_id = w.ride_id
      WHERE ts > now() - INTERVAL '90 days'
      GROUP BY 1
    ) sub
  )
  SELECT ca.avg_wait, hd.p0, hd.p50, hd.p95
  FROM current_avg ca, historical_dist hd
`);
```
Bootstrap mode (< 30d of data): `Math.min(100, avgWait * 1.2)` — no SQL needed.

### Anti-Patterns to Avoid
- **Polling secondary source during primary outage:** Explicitly forbidden in CONTEXT.md. The 6hr schedule runs on its own clock regardless of primary status.
- **Using `keyPrefix` in ioredis options:** Incompatible with BullMQ's own prefix mechanism. Use BullMQ's `prefix` option instead if needed.
- **Calling `REFRESH MATERIALIZED VIEW CONCURRENTLY` from the worker:** DATA-03's role is to *verify* the pg_cron job ran, not to trigger it. pg_cron handles the refresh itself.
- **Serving swagger UI in worker process:** `worker.ts` must NOT call `SwaggerModule.setup()` — it has no HTTP listener.
- **Hardcoding weather field when forecast unavailable:** Return `null` / omit field. Do not synthesize a value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job retry with backoff | Custom retry loop in processor | BullMQ `attempts + backoff` job opts | BullMQ handles re-queuing, exponential/fixed delay, atomic state transitions in Redis |
| Recurring job scheduling | setInterval or cron in Node process | `queue.upsertJobScheduler()` | Idempotent upsert survives restarts; scheduler state is in Redis not in-process memory |
| Dead-letter queue infrastructure | Separate Redis list | BullMQ `failed` job set (built-in) | Jobs that exceed `attempts` automatically move to the failed set; accessible via Queue API |
| Redis TLS negotiation | Manual TLS config | `rediss://` URL or `tls: {}` | ioredis handles TLS when `rediss://` scheme or `tls` option is present |
| OpenAPI spec comparison | String diff scripts | `git diff --exit-code <file>` | Git's diff is the canonical comparison; any byte-level change fails CI |
| pg_cron scheduling | Implementing a cron runner in TypeScript | pg_cron (already configured in migration 0002) | pg_cron is already running the hourly refresh; adding another scheduler duplicates it |

**Key insight:** BullMQ + Redis already implements the full job lifecycle (queue, active, completed, failed, delayed, waiting). Never implement custom state machines for job retries or dead-letter logic.

---

## Common Pitfalls

### Pitfall 1: Upstash TLS — `maxRetriesPerRequest` Must Be `null` for Workers
**What goes wrong:** Worker hangs or throws on blocked Redis commands if `maxRetriesPerRequest` is a finite number.
**Why it happens:** BullMQ uses blocking Redis commands (BRPOP-style); ioredis's `maxRetriesPerRequest` limit applies per-command and causes premature timeout.
**How to avoid:** Set `maxRetriesPerRequest: null` in the connection options for any BullMQ worker.
**Warning signs:** Worker connects to Redis but never processes jobs; Redis timeouts in logs.

### Pitfall 2: Upstash Billing — BullMQ Polling
**What goes wrong:** Unexpected Upstash bill on Pay-As-You-Go plan.
**Why it happens:** BullMQ polls Redis continuously (queue heartbeat) even when idle.
**How to avoid:** Use Upstash Fixed pricing plan instead of Pay-As-You-Go.
**Warning signs:** Thousands of Redis commands per minute in Upstash dashboard with no queue activity.

### Pitfall 3: queue-times.com `last_updated` vs `fetched_at` Confusion
**What goes wrong:** Writing queue-times.com's `last_updated` field as `fetched_at` in Postgres. This is the time the source last updated their data, not when we fetched it.
**Why it happens:** Field name collision; `last_updated` is a source-side timestamp.
**How to avoid:** Always use `new Date()` at the moment of fetch for `fetched_at`; store `last_updated` as a separate metadata field if needed.
**Warning signs:** `fetched_at` timestamps that are stale by 5+ minutes even on a fresh fetch.

### Pitfall 4: themeparks.wiki Rate Limit (300 req/min per client)
**What goes wrong:** 429 responses from themeparks.wiki if multiple rapid calls are made.
**Why it happens:** Rate limit is 300 req/min per client IP — generous for 4 parks × 2 endpoints = 8 requests per 6hr cycle, but must not be exceeded on startup if all schedulers fire simultaneously.
**How to avoid:** Stagger startup by offsetting job schedulers: use cron patterns with offsets rather than all firing at minute 0. The 6hr cycle is well within limits.
**Warning signs:** HTTP 429 in themeparks.wiki responses.

### Pitfall 5: OpenWeather 8-day Limit (Not 16)
**What goes wrong:** Weather returns `null` for trip dates 9+ days out when using One Call 3.0 daily forecast endpoint.
**Why it happens:** One Call API 3.0 `/onecall` provides 8 days, not 16. The CONTEXT.md references 16-day horizon but this is inaccurate for the One Call 3.0 product.
**How to avoid:** Cap weather at 8 days. For dates 9–∞ days out, skip the weather field. The `/onecall/day_summary?date=YYYY-MM-DD` endpoint covers future dates via statistical aggregation but is a separate product and adds complexity.
**Warning signs:** Empty weather fields for trips less than 16 days out; user reports of missing weather.

### Pitfall 6: upsertJobScheduler Idempotency on Startup
**What goes wrong:** Multiple scheduler entries created if worker restarts frequently.
**Why it happens:** Legacy `queue.add(name, data, { repeat })` API creates new entries on every call. The new `upsertJobScheduler` API (BullMQ v5.16+) prevents this.
**How to avoid:** Always use `upsertJobScheduler` (not `queue.add` with `repeat`). The `schedulerId` string is the idempotency key.
**Warning signs:** Growing number of duplicate jobs visible in BullMQ dashboard.

### Pitfall 7: Drizzle `sql` Template and `cron` Schema Access
**What goes wrong:** `cron.job_run_details` table not accessible via Drizzle schema introspection.
**Why it happens:** pg_cron creates its tables in the `cron` schema, which is not in Drizzle's schema files.
**How to avoid:** Use `db.execute(sql`SELECT ... FROM cron.job_run_details ...`)` with raw SQL. Never try to add `cron.job_run_details` to the Drizzle schema — it's an extension-managed table.
**Warning signs:** TypeScript errors or runtime errors when trying to use Drizzle's query builder for cron tables.

---

## External API Reference

### queue-times.com API (PRIMARY SOURCE — DATA-01)

**Authentication:** None required. Free access with attribution.
**Attribution requirement:** "Powered by Queue-Times.com" in app. (CONTEXT overrides to "Data source: queue-times.com" as per DATA-05.)
**Rate limits:** Not documented; update frequency is every 5 minutes. Our 5min polling matches their refresh rate.

**WDW Park IDs (confirmed by probing parks.json):**
| Park | queue_times_id |
|------|----------------|
| EPCOT | 5 |
| Magic Kingdom | 6 |
| Hollywood Studios | 7 |
| Animal Kingdom | 8 |

These match the `parks.queue_times_id` column already seeded in the catalog.

**Endpoint:**
```
GET https://queue-times.com/parks/{id}/queue_times.json
```
No API key. No headers required.

**Response Shape (probed live against MK park_id=6):**
```json
{
  "lands": [
    {
      "id": 123,
      "name": "Adventureland",
      "rides": [
        {
          "id": 56,
          "name": "Jungle Cruise",
          "is_open": true,
          "wait_time": 40,
          "last_updated": "2026-04-14T14:05:18.000Z"
        }
      ]
    }
  ],
  "rides": []
}
```
**Field mapping:**
- `ride.id` → `attractions.queue_times_id` (integer) — look up internal UUID
- `ride.wait_time` → `wait_times_history.minutes`
- `ride.is_open` → `wait_times_history.is_open`
- `ride.last_updated` → source-side timestamp (NOT `fetched_at`)
- `source` → hardcode `"queue-times"` in the write

**Walk all 4 parks per polling cycle** (4 HTTP requests per 5-min cycle).

---

### themeparks.wiki API (SECONDARY SOURCE — DATA-02)

**Authentication:** None required.
**Rate limit:** 300 requests/minute per client. Well within our needs.
**Base URL:** `https://api.themeparks.wiki/v1`
**Documentation:** `https://api.themeparks.wiki/docs/v1/`

**WDW Entity IDs (confirmed by probing /v1/destinations):**
| Park | entityId |
|------|----------|
| Magic Kingdom Park | `75ea578a-adc8-4116-a54d-dccb60765ef9` |
| EPCOT | `47f90d2c-e191-4239-a466-5892ef59a88b` |
| Disney's Hollywood Studios | `288747d1-8b4f-4a64-867e-ea7c9b27bad8` |
| Disney's Animal Kingdom | `1c84a229-8862-4648-9c71-378ddd2c7693` |

These should be stored as configuration constants and matched against `attractions.themeparks_wiki_id` (text UUID) and `parks.themeparks_wiki_id` already in the catalog.

**Endpoints used:**

1. **Park schedule (hours + special events):**
```
GET /v1/entity/{entityId}/schedule
```
Response fields per schedule entry:
```json
{
  "date": "2026-04-14",
  "type": "OPERATING",
  "openingTime": "2026-04-14T08:30:00-04:00",
  "closingTime": "2026-04-14T22:00:00-04:00",
  "description": "Early Entry",
  "purchases": []
}
```
Type values: `"OPERATING"`, `"TICKETED_EVENT"`.

2. **Live data (wait times + showtimes):**
```
GET /v1/entity/{entityId}/live
```
Response for attractions:
```json
{
  "id": "uuid",
  "name": "Test Track",
  "entityType": "ATTRACTION",
  "status": "OPERATING",
  "lastUpdated": "2026-04-14T14:00:00-04:00",
  "queue": {
    "STANDBY": { "waitTime": 45 },
    "RETURN_TIME": { "state": "AVAILABLE", "returnStart": "...", "returnEnd": null },
    "PAID_RETURN_TIME": { "price": { "amount": 1500, "currency": "USD", "formatted": "$15.00" } }
  }
}
```
Response for shows:
```json
{
  "id": "uuid",
  "entityType": "SHOW",
  "status": "OPERATING",
  "showtimes": [
    { "type": "Performance Time", "startTime": "2026-04-14T21:00:00-04:00", "endTime": "..." }
  ]
}
```

**Field mapping:**
- `entity.id` → `attractions.themeparks_wiki_id` — look up internal UUID
- `queue.STANDBY.waitTime` → `wait_times_history.minutes` (fallback source)
- `status` `"OPERATING"` → `is_open: true`; anything else → `is_open: false`
- `source` → hardcode `"themeparks-wiki"` in the write

---

### OpenWeather One Call 3.0 API (DATA-08)

**Authentication:** API key via `appid` query parameter.
**Endpoint for 8-day forecast:**
```
GET https://api.openweathermap.org/data/3.0/onecall?lat=28.5421&lon=-81.3723&appid={KEY}&exclude=minutely,hourly,alerts
```
Orlando, FL coordinates: `lat=28.5421, lon=-81.3723`

**CRITICAL HORIZON CLARIFICATION:** One Call 3.0 provides **8 days** of daily forecast, not 16. The CONTEXT.md says "skip beyond 16-day horizon" — this should be interpreted as "skip if the date is beyond the API's capability." The actual limit is 8 days.

**For dates within 8 days:** Use the `/onecall` endpoint. The `daily` array index 0 = today, index 7 = 7 days out.

**For dates beyond 8 days:** Skip weather field entirely (return null / omit). This aligns with CONTEXT.md's "skip beyond 16-day horizon" intent.

**Alternative for dates 9+ days:** The `/onecall/day_summary?date=YYYY-MM-DD` endpoint provides statistical aggregation up to +1.5 years, but it is a separate product requiring the same API key. This is NOT recommended to implement in Phase 2 given the "best-effort null on failure" philosophy.

**Response `daily` array item fields:**
```json
{
  "dt": 1713139200,
  "temp": { "day": 82, "min": 70, "max": 88, "night": 72, "eve": 80, "morn": 71 },
  "feels_like": { "day": 85 },
  "humidity": 65,
  "uvi": 9.2,
  "clouds": 20,
  "pop": 0.35,
  "rain": 2.1,
  "weather": [{ "id": 500, "main": "Rain", "description": "light rain", "icon": "10d" }],
  "summary": "There will be partly cloudy in the morning..."
}
```

**Mapping to client payload:**
```typescript
{
  high_f: kelvinToF(day.temp.max),
  low_f: kelvinToF(day.temp.min),
  condition: day.weather[0].main,          // e.g., "Rain", "Clouds", "Clear"
  precipitation_pct: Math.round(day.pop * 100),
  humidity_pct: day.humidity,
  uv_index: Math.round(day.uvi),
}
// kelvinToF = (k) => Math.round((k - 273.15) * 9/5 + 32)
```
Note: temperatures are returned in Kelvin by default. Use `&units=imperial` to get Fahrenheit directly, which simplifies the mapping.

**Free tier:** 1,000 calls/day free; 2,000 calls/day max on free subscription. With 6hr TTL and ~100 active trips, well within free tier.

**Cache key:** `weather:orlando:{YYYY-MM-DD}` (CONTEXT-specified). The date is the target forecast date.
**Implementation note:** On an API call, fetch the full 8-day forecast in one request, then cache each day's result separately with 6hr TTL. This gives 8 cached keys per API call instead of 1 call per date.

---

## OpenAPI Snapshot Enforcement

### How the Freeze Works
1. Phase 2 includes a task to design all v1 route shapes (including 501 stubs)
2. A `generate-openapi-snapshot.ts` script writes the spec to `packages/shared-openapi/openapi.v1.snapshot.json`
3. CI runs the script and executes `git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json`
4. Any unintentional change fails the build. Intentional changes require an explicit snapshot commit.

### v1 API Surface to Design in Phase 2
The following endpoints must have fully designed request/response schemas (even if returning 501):

**Ingestion reads (live data):**
- `GET /v1/parks` — list of parks
- `GET /v1/parks/:parkId/waits` — live wait times `{ data: [{ attractionId, name, minutes, fetched_at, source, is_stale }] }`
- `GET /v1/crowd-index` — `{ data: { global: { value, confidence, sample_size_days }, parks: { ... } } }`
- `GET /v1/weather?date=YYYY-MM-DD` — `{ data: { high_f, low_f, condition, precipitation_pct, humidity_pct, uv_index } | null }`

**Phase 3 stubs (501 responses):**
- `POST /v1/trips` — request: `{ dates, parkDays, guests, preferences }`; response shape to be designed
- `GET /v1/trips/:id` — response: Trip object shape
- `POST /v1/trips/:id/generate-plan` — response: `{ plan_job_id }`
- `GET /v1/plans/:id` — response: Plan object shape with DayPlan[]
- `POST /v1/trips/:id/rethink-today` — request/response shape

**Phase 4 stubs:**
- `POST /v1/auth/anonymous` — response: `{ access_token, user_id }`
- `GET /v1/users/me` — response: User object shape

**All Phase 3/4 stub shapes must be finalized in Phase 2.** This is significant scope. The planner must allocate a dedicated task for shape design and a separate task for freezing the snapshot.

---

## Sentry + Slack Alert Architecture

### Dead-Letter Alert (DATA-06 primary)
- Triggered: when `job.attemptsMade >= job.opts.attempts` in `@OnWorkerEvent('failed')`
- Send: `Sentry.captureException(err)` + direct Slack webhook POST
- Sentry sends to Slack via native integration (Sentry Settings → Integrations → Slack → connect channel)

### Lag Alert (DATA-06 secondary)
- WHERE to run this check: inside the `fetch_queue_times` processor after each successful poll
- Logic: `SELECT MAX(fetched_at) FROM wait_times_history WHERE ts > now() - INTERVAL '1 hour'`
- If `now() - MAX(fetched_at) > 30 minutes` AND current time is NOT 2am–6am ET → alert
- Quiet hours: `const hour = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })`; suppress if 2 ≤ hour < 6

### Slack Webhook Direct POST Pattern
For lag alerts that don't originate from an exception (no error object to pass to Sentry):
```typescript
await fetch(process.env.SLACK_ALERT_WEBHOOK_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `:warning: WonderWaltz ingestion lag: last wait-time data is ${Math.round(lagMin)} minutes old`,
  }),
});
```
Slack incoming webhook payload: `{ text: string }` is sufficient. Block Kit is not needed for ops alerts.

### Sentry Alert Rule for Dead-Letter Jobs
Configure via Sentry dashboard (not programmable in Phase 2 scope):
- Create Issue Alert: "When an issue is seen more than N times" is NOT the right trigger
- Use: "When an event is received" with filter `tags[queue] is set` — this fires on each `captureException` call
- Route to: Slack channel via Slack integration

Note: "2 consecutive dead-lettered jobs" is enforced in code logic (worker counts consecutive failures per queue in Redis or in-memory), not via a Sentry alert rule. The Sentry alert fires on each dead-letter; the consecutive-count logic lives in the worker.

---

## Attribution Content File

Mirror `disclaimer.en.json` exactly:
```json
// packages/content/legal/attribution.en.json
{
  "text": "Data source: queue-times.com"
}
```
Platforms import `text` field. No `shortText` needed (single platform-agnostic string per CONTEXT.md).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `queue.add(name, {repeat})` | `queue.upsertJobScheduler()` | BullMQ v5.16 | Idempotent scheduling; no duplicate jobs on restart |
| `BullModule.registerQueue` with explicit `defaultJobOptions` | Pass opts in `upsertJobScheduler` job template | BullMQ v5+ | Cleaner separation of scheduler config vs processor config |
| TimescaleDB continuous aggregates | pg_cron + standard materialized view | Migration 0002 (project-specific) | Supabase Cloud doesn't support TimescaleDB extension |
| `queue.process()` callback (Bull v3) | `WorkerHost.process()` + `@Processor()` (BullMQ v5) | BullMQ v4+ | NestJS DI-aware; cleaner class-based processors |

**Deprecated/outdated:**
- `@nestjs/bull` (the old Bull v3 wrapper): Do NOT use. The project already has `@nestjs/bullmq` which wraps BullMQ v5.
- `BullModule.registerQueue` legacy `limiter` option: Not supported in BullMQ. Rate limiting is handled at Worker level via `concurrency`.

---

## Open Questions

1. **OpenWeather Horizon: 8 days vs 16 days**
   - What we know: One Call 3.0 provides 8 days daily forecast. The `/day_summary` endpoint covers further out.
   - What's unclear: CONTEXT.md says "skip beyond 16-day horizon" — this was written assuming a 16-day API capability that doesn't exist in One Call 3.0.
   - Recommendation: Planner should cap at 8 days and document the discrepancy. If trips beyond 8 days need weather, a future task can add the `day_summary` endpoint call. Surface this as a decision point in the plan.

2. **Consecutive Dead-Letter Counter: in-memory vs Redis**
   - What we know: "2 consecutive dead-lettered jobs" requires tracking state across job instances.
   - What's unclear: If worker restarts, in-memory counter resets. Counter in Redis is more durable.
   - Recommendation: Use Redis INCR/EXPIRE on a `dlq_consecutive:{queue_name}` key. Reset to 0 on any successful job completion.

3. **Crowd-Index Bootstrap: Percentile Trigger at Day 31**
   - What we know: Auto-switch from bootstrap to percentile when ≥30 days of data exist.
   - What's unclear: How to count "days of data" efficiently — query `MIN(ts)` from `wait_times_history`?
   - Recommendation: `SELECT COUNT(DISTINCT DATE(ts)) FROM wait_times_history` at the start of each crowd-index job. Switch when count ≥ 30.

4. **Phase 3/4 Stub Schema Design**
   - What we know: Trip, Plan, DayPlan, PlanItem, User, auth flows must be fully shaped in Phase 2.
   - What's unclear: Exact field names and types for complex nested objects (DayPlan items, etc.).
   - Recommendation: Allocate a dedicated "schema design" task. Use the solver output requirements from REQUIREMENTS.md (SOLV-03, PLAN-02) as the source of truth. This is non-trivial scope.

---

## Validation Architecture

`nyquist_validation: true` is set in `.planning/config.json`. Every DATA requirement must have at least one automated test signal.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | `apps/api/vitest.config.mts` |
| Quick run command | `pnpm --filter @wonderwaltz/api test` |
| Full suite command | `pnpm -r test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01a | queue-times.com fetch returns rides with correct field shape | unit (mock fetch) | `pnpm --filter @wonderwaltz/api test -- queue-times.service` | ❌ Wave 0 |
| DATA-01b | Worker writes `wait_times_history` row with correct source + fetched_at | integration (Vitest + test DB) | `pnpm --filter @wonderwaltz/api test -- ingestion.integration` | ❌ Wave 0 |
| DATA-01c | Redis key `wait:{ride_id}` set with 2min TTL after successful poll | unit (mock Redis) | `pnpm --filter @wonderwaltz/api test -- queue-times.service` | ❌ Wave 0 |
| DATA-01d | On fetch failure, existing Redis key TTL extended by 10min (not deleted) | unit (mock Redis) | `pnpm --filter @wonderwaltz/api test -- queue-times.service` | ❌ Wave 0 |
| DATA-02a | themeparks.wiki schedule endpoint returns opening/closing time | unit (mock fetch) | `pnpm --filter @wonderwaltz/api test -- themeparks.service` | ❌ Wave 0 |
| DATA-02b | themeparks.wiki live data maps STANDBY.waitTime to minutes | unit (mock fetch) | `pnpm --filter @wonderwaltz/api test -- themeparks.service` | ❌ Wave 0 |
| DATA-03a | pg_cron job_run_details query returns last refresh timestamp | unit (mock db.execute) | `pnpm --filter @wonderwaltz/api test -- rollup.processor` | ❌ Wave 0 |
| DATA-03b | Sentry captureException called when last refresh > 90min ago | unit (spy on Sentry) | `pnpm --filter @wonderwaltz/api test -- rollup.processor` | ❌ Wave 0 |
| DATA-04a | Bootstrap formula: `min(100, avg_wait × 1.2)` returns correct values | unit (pure function) | `pnpm --filter @wonderwaltz/api test -- crowd-index.service` | ❌ Wave 0 |
| DATA-04b | percentile-based index: given fixture history, returns value in [0,100] | unit (mock db) | `pnpm --filter @wonderwaltz/api test -- crowd-index.service` | ❌ Wave 0 |
| DATA-04c | Redis keys for 5 crowd indices (global + 4 parks) all set after worker run | unit (mock Redis) | `pnpm --filter @wonderwaltz/api test -- crowd-index.processor` | ❌ Wave 0 |
| DATA-04d | confidence metadata `{ value, confidence, sample_size_days }` present in Redis value | unit | `pnpm --filter @wonderwaltz/api test -- crowd-index.processor` | ❌ Wave 0 |
| DATA-05 | attribution.en.json exists with correct text string | unit (fs.readFileSync) | `pnpm --filter @wonderwaltz/api test -- attribution.spec` | ❌ Wave 0 |
| DATA-06a | Dead-letter handler calls Sentry.captureException when attemptsMade >= maxAttempts | unit (spy on Sentry) | `pnpm --filter @wonderwaltz/api test -- queue-times.processor` | ❌ Wave 0 |
| DATA-06b | Lag alert calls Slack webhook when lag > 30min and not in quiet hours (2am-6am ET) | unit (mock fetch, mock Date) | `pnpm --filter @wonderwaltz/api test -- lag-alert.service` | ❌ Wave 0 |
| DATA-06c | Lag alert suppressed when current time is between 2am-6am ET | unit (mock Date) | `pnpm --filter @wonderwaltz/api test -- lag-alert.service` | ❌ Wave 0 |
| DATA-07 | Smoke test: worker.ts bootstraps NestJS app context without error | integration | `pnpm --filter @wonderwaltz/api test -- worker.bootstrap` | ❌ Wave 0 |
| DATA-08a | Weather service returns null for dates beyond 8 days | unit | `pnpm --filter @wonderwaltz/api test -- weather.service` | ❌ Wave 0 |
| DATA-08b | Cache-aside: Redis cache hit returns cached value without HTTP call | unit (mock Redis, mock fetch) | `pnpm --filter @wonderwaltz/api test -- weather.service` | ❌ Wave 0 |
| DATA-08c | Cache-aside: Redis miss triggers OpenWeather call and caches result with 6hr TTL | unit (mock Redis, mock fetch) | `pnpm --filter @wonderwaltz/api test -- weather.service` | ❌ Wave 0 |
| DATA-08d | OpenWeather failure returns null without throwing | unit (mock fetch → reject) | `pnpm --filter @wonderwaltz/api test -- weather.service` | ❌ Wave 0 |
| API-spec | OpenAPI v1 snapshot matches committed JSON | snapshot (CI gate) | `node scripts/generate-openapi-snapshot.ts && git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @wonderwaltz/api test` (unit tests for affected service)
- **Per wave merge:** `pnpm -r test` (full suite)
- **Phase gate:** Full suite green + OpenAPI snapshot CI gate passing before `/gsd:verify-work`

### Wave 0 Gaps
All test files are missing — the test infrastructure exists (Vitest 4.1.3 in devDependencies) but no test files have been created for Phase 2 code yet.

- [ ] `apps/api/src/ingestion/queue-times.service.spec.ts` — DATA-01a, 01c, 01d
- [ ] `apps/api/src/ingestion/themeparks.service.spec.ts` — DATA-02a, 02b
- [ ] `apps/api/src/rollup/rollup.processor.spec.ts` — DATA-03a, 03b
- [ ] `apps/api/src/crowd-index/crowd-index.service.spec.ts` — DATA-04a, 04b, 04c, 04d
- [ ] `apps/api/src/weather/weather.service.spec.ts` — DATA-08a, 08b, 08c, 08d
- [ ] `apps/api/src/ingestion/lag-alert.service.spec.ts` — DATA-06b, 06c
- [ ] `apps/api/src/ingestion/queue-times.processor.spec.ts` — DATA-06a
- [ ] `apps/api/src/worker.bootstrap.spec.ts` — DATA-07
- [ ] `packages/content/src/attribution.spec.ts` — DATA-05
- [ ] `scripts/generate-openapi-snapshot.ts` — API-spec (script, not test file)
- [ ] Framework install: Already present (`vitest@4.1.3` in devDependencies) — no additional install needed

---

## Sources

### Primary (HIGH confidence)
- queue-times.com live API probe (`/parks.json`, `/parks/6/queue_times.json`) — park IDs and response shape confirmed 2026-04-14
- themeparks.wiki live API probe (`/v1/destinations`, `/v1/entity/.../live`, `/v1/entity/.../schedule`) — entity IDs and response shapes confirmed 2026-04-14
- openweathermap.org/api/one-call-3 — endpoint URL, fields, 8-day limit confirmed
- BullMQ docs (docs.bullmq.io/guide/nestjs, docs.bullmq.io/guide/job-schedulers) — upsertJobScheduler API, connection options
- Upstash docs (upstash.com/docs/redis/integrations/bullmq) — TLS config, billing gotcha
- `apps/api/package.json` — confirmed existing dependency versions
- `packages/db/src/schema/timeseries.ts` — `wait_times_history` schema confirmed
- `packages/db/src/schema/catalog.ts` — `queue_times_id` and `themeparks_wiki_id` columns confirmed
- `packages/db/migrations/0002_timescale_continuous_agg.sql` — pg_cron job names and `wait_times_1h` view confirmed

### Secondary (MEDIUM confidence)
- pg_cron `cron.job_run_details` schema — from multiple cloud provider docs (AWS, Supabase) confirming table columns
- OpenWeather `day_summary` endpoint — from openweathermap.org/api/one-call-3 docs; not probed directly
- NestJS `NestFactory.createApplicationContext` worker pattern — from NestJS standalone apps docs + community articles (2024–2025)
- BullMQ `maxRetriesPerRequest: null` requirement — from Upstash docs + community reports; not from official BullMQ docs directly

### Tertiary (LOW confidence — validate before implementing)
- Upstash billing with BullMQ polling behavior — from Upstash docs (authoritative source), flagged because pricing plans change
- Sentry alert rule for "2 consecutive dead-letters" — research found no direct "consecutive" trigger; recommended implementing counter in Redis instead

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in package.json, versions confirmed
- Architecture: HIGH — NestJS standalone worker pattern well-documented and probed
- External API shapes: HIGH — queue-times.com and themeparks.wiki probed live; OpenWeather docs verified
- Pitfalls: HIGH for ioredis/Upstash; MEDIUM for OpenWeather horizon (needs user decision)
- OpenAPI snapshot pattern: HIGH — standard fs.writeFileSync + git diff approach, no special tooling

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (90 days — external APIs stable; BullMQ/NestJS versions pinned)
