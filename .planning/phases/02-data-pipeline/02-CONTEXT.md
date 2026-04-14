# Phase 2: Data Pipeline — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Wait-time ingestion is running in production and the 8-week accumulation clock
has started. Live wait times are queryable from Redis; historical data is
accumulating in the `wait_times_history` table (materialized-view rollups via
pg_cron, not TimescaleDB). Crowd index and weather are cached. Sentry alerts
fire on ingestion failures. The `v1` OpenAPI spec is hard-frozen at the end
of this phase — mobile clients generate their networking code against it.

Requirements in scope: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06,
DATA-07, DATA-08.

Not in this phase (explicit): auth implementation (Phase 4), solver engine
(Phase 3), LLM narrative (Phase 3), entitlements (Phase 4), mobile apps
(Phase 5+).

</domain>

<decisions>
## Implementation Decisions

### Worker Process Topology

- **One Railway `worker` service**, all BullMQ queues in one Node process.
  Deployed separately from the `api` HTTP service but shares the `apps/api`
  codebase.
- **Entry points both in `apps/api`**: existing `src/main.ts` (HTTP),
  new `src/worker.ts` (BullMQ). Same NestJS modules imported by both.
- **Concurrency: 1 per queue** (BullMQ default, sequential processing).
  No parallel workers — easier to reason about, no race conditions.
- **Retry policy: 5 attempts, linear 30-second backoff, then dead-letter
  + Sentry alert.** Total window: ~2.5 min before a job is considered
  fully failed.

### Ingestion Sources & Failover

- **queue-times.com** is the primary wait-time source (DATA-01, every 5min).
- **themeparks.wiki** is the secondary source (DATA-02, every 6hr) for park
  hours + scheduled entertainment. Can also provide wait times as fallback.
- **Conflict resolution: most recent `fetched_at` wins** when both sources
  report for the same ride. Source identity is preserved in
  `wait_times_history.source`.
- **Outage posture: degrade gracefully.** When a polling cycle fails entirely,
  the API serves last-known Redis values rather than erroring. Do NOT
  out-of-schedule-poll the secondary source just because the primary is down.
- **Staleness mechanic: extend TTL on fetch failure.** Failed polling bumps
  existing `wait:{ride_id}` Redis keys' TTL by +10 minutes, so the 2-min
  default TTL doesn't evict data during an outage.
- **API wait payload shape**:
  `{ minutes, fetched_at, source, is_stale }` — clients can render
  "Updated Nm ago" and flag stale values in UI.
  - `is_stale = true` when `fetched_at > 5 minutes ago`
  - `source` is `"queue-times"` or `"themeparks-wiki"`.

### Sentry Alerting

- **"Fails twice in a row" (DATA-06)** = 2 consecutive **dead-lettered**
  jobs per queue (after all 5 retries have exhausted). NOT 2 consecutive
  attempts — that would be too noisy given the aggressive retry policy.
- **Lag alert (DATA-06, 30-min threshold)** is **global**: compare the
  freshest `fetched_at` across all WDW wait-time rows to `now()`. Alerts
  when global freshest > 30 minutes old.
- **Quiet hours: suppress lag alerts 2am–6am ET.** Parks are closed
  overnight in practice; a crude time window is cheaper than a
  park-hours-aware rule and has negligible precision loss.
- **Alert routing: Sentry → Slack channel** via incoming webhook.
  No PagerDuty, no on-call rotation — pre-launch solo-founder posture.

### Crowd Index Formula (DATA-04)

- **"Top 20 rides" = top 5 rides per park × 4 parks** (Magic Kingdom, EPCOT,
  Hollywood Studios, Animal Kingdom). Ranked by historical baseline wait
  time within each park. Park-balanced, so MK's many headliners don't
  dominate the global signal.
- **0–100 scale via percentile mapping against last 90 days of history.**
  Current average wait across the 20 rides → which percentile of the
  trailing-90d distribution does it fall in?
  - p0 → 0, p50 → 50, p95 → 95, etc.
- **Bootstrap period (first 30 days): use `min(100, avg_wait × 1.2)`**
  as a stopgap formula. Auto-switch to percentile-based calculation the
  moment 30+ days of `wait_times_history` rows exist. The switchover is
  automatic based on data-window coverage, not manual.
- **Emit both global and per-park indices.** Redis keys:
  - `crowd_index:{date}` (global)
  - `crowd_index:magic-kingdom:{date}`, `crowd_index:epcot:{date}`,
    `crowd_index:hollywood-studios:{date}`, `crowd_index:animal-kingdom:{date}`
  - 5 keys total, all updated hourly.
- **Confidence metadata** travels with every crowd-index response:
  `{ value: 0-100 | null, confidence: "bootstrap" | "percentile",
  sample_size_days }`. Clients can label early-life values honestly.

### Weather Integration (DATA-08)

- **Fetch trigger: on-demand, cache-aside.** No worker, no prefetch.
  API endpoint checks Redis; if miss, calls OpenWeather, caches, returns.
- **Cache key: `weather:orlando:{YYYY-MM-DD}`**, 6-hour TTL.
- **Beyond OpenWeather's 8-day horizon: skip the weather field entirely.**
  API response omits the field; does not attempt a seasonal-average
  synthetic value.
- **Failure handling: best-effort, return `null`, no retry, no circuit
  breaker.** Weather is a secondary feature — a plan request never fails
  because of a weather API problem.
- **Client payload shape**:
  ```
  {
    high_f:           number,
    low_f:            number,
    condition:        string,  // OpenWeather "main" field
    precipitation_pct: number,
    humidity_pct:     number,
    uv_index:         number
  }
  ```
  Sized for trip UI: one-line summary, precipitation prompt, UV/sunscreen
  nudge. Does NOT pass through OpenWeather's raw payload (brittle coupling).

### OpenAPI Spec Stability

- **Hard freeze at end of Phase 2 — spec becomes `v1`.** All routes use
  path-based versioning: `/v1/parks`, `/v1/trips/:id/live`, etc.
- **CI snapshot enforcement**: commit
  `packages/shared-openapi/openapi.v1.snapshot.json`. A CI job diffs the
  live generated spec against the snapshot; any breaking change fails the
  build. Snapshot updates require explicit commit + review.
- **v1 surface in Phase 2 includes**:
  1. **Ingestion reads (live)** — wait times, crowd index, weather.
     Example: `GET /v1/parks/:parkId/waits`, `GET /v1/crowd-index`,
     `GET /v1/weather?date=…`.
  2. **Phase 3 trip/plan endpoints as stubs returning 501 Not Implemented**
     — `POST /v1/trips`, `GET /v1/trips/:id`,
     `POST /v1/trips/:id/generate-plan`, `GET /v1/plans/:id`. Shapes are
     designed and frozen in Phase 2; bodies filled in Phase 3.
  3. **Phase 4 auth scaffolding** — `POST /v1/auth/anonymous`,
     `GET /v1/users/me`. Real or stub as appropriate; shapes frozen.
- **Implication for planning**: Phase 2 planning MUST include response/request
  shape design for Phase 3 and Phase 4 endpoints, because the snapshot freeze
  binds them. The Phase 2 planner cannot defer shape decisions to later phases.

### Attribution (DATA-05)

- **Placement: UI surfaces only** — web footer + app About screen. The
  API does NOT carry a separate attribution header or `meta.attribution`
  field. (The per-ride `source` field from Area 2 is structural, not
  attribution.)
- **Exact text: "Data source: queue-times.com"** — minimal, no marketing
  language. Same string on all three platforms.
- **Content source of truth**:
  `packages/content/legal/attribution.en.json`. Mirrors the
  `disclaimer.en.json` pattern from Phase 1. Platforms import this, never
  hardcode.
- **Plain text on all platforms — not a hyperlink.** No link-out friction;
  mention alone satisfies DATA-05.

### Claude's Discretion

- BullMQ queue names and job-name conventions (no preference expressed).
- Exact Redis key naming for wait times (`wait:{ride_id}` is from the
  roadmap; any sub-keys for TTL extension / last-known values are up to
  the implementer).
- Which NestJS module houses which worker class.
- Weather's `condition` field normalization (map OpenWeather's "main"
  string to a canonical set, or pass through — planner decides).
- OpenAPI response shape for trip/plan stubs — Phase 2 planner designs
  these carefully and locks them; user will review when plan is ready.
- pg_cron job timing inside the hour for crowd-index rollup.

</decisions>

<specifics>
## Specific Ideas

- **Bootstrap vs percentile auto-switch** (Area 4, Q4.3 revision) — the
  flip is automatic based on history window, not a manual toggle. First 30
  days use simple formula; from day 31 onwards, percentile-based runs.
  Both formulas must be implemented; the worker picks which one to apply
  at runtime.
- **Per-park crowd indices** (Area 4, Q4.4) — not in DATA-04's literal
  wording but a free use of already-sampled data. Figma Make
  `Itinerary.tsx` is park-scoped and will need park-level crowd labels
  in Phase 5.
- **Stub endpoints return 501** (Area 6) — real HTTP 501 Not Implemented,
  with OpenAPI documentation for the intended shape. Mobile generates
  client code against the shape; runtime calls return 501 until Phase 3/4
  fill them in.
- **Design shapes forward into Phase 3/4** (Area 6) — the Phase 2 planner
  must produce OpenAPI schemas for `Trip`, `Plan`, `DayPlan`, `PlanItem`,
  `User`, auth flows, etc., even though their routes return 501. This is
  non-trivial scope for Phase 2 planning and should be called out to the
  planner agent.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`apps/api/src/app.module.ts`** — NestJS module skeleton. New modules
  (`IngestionModule`, `QueueModule`, `WeatherModule`, `CrowdIndexModule`)
  plug in here.
- **`apps/api/src/common/interceptors/response-envelope.interceptor.ts`**
  — already wraps responses in `{ data, meta: { disclaimer } }` and adds
  `X-WW-Disclaimer` header. Phase 2 endpoints inherit this for free.
  Attribution decided NOT to join the envelope (Area 7 Q7.1).
- **`apps/api/src/common/decorators/api-enveloped-response.decorator.ts`**
  — use this on every new endpoint so OpenAPI spec reflects envelope shape.
- **`packages/db/src/schema/timeseries.ts`** — `wait_times_history` table
  exists. Composite index on `(ride_id, ts DESC)` present. Workers write
  here.
- **`packages/db/src/schema/catalog.ts`** — `parks`, `attractions`, `shows`,
  `dining`, `resorts`, `walking_graph` all seeded. Rides carry
  `queue_times_id` and `themeparks_wiki_id` → the ingestion worker resolves
  these to internal UUIDs at write time.
- **`packages/content/legal/disclaimer.en.json`** — attribution file
  follows the same pattern.
- **`.env.local`** — `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN_API`,
  `POSTHOG_KEY` already populated. OpenWeather key + Slack webhook URL
  are new additions.

### Established Patterns

- **Supabase connection**: direct Postgres via `DATABASE_URL` (port 5432,
  not the pooler). Service-role bypasses RLS.
- **Materialized view refresh**: pg_cron handles `wait_times_1h` hourly
  refresh. Ingestion workers do NOT trigger rollup themselves; DATA-03
  `rollup_wait_history` worker's job becomes "verify pg_cron ran and
  alert if not" rather than "refresh the view."
- **Pre-commit hooks**: husky + commitlint + lint-staged. Commit messages
  follow conventional-commits (feat/fix/docs/test/chore/refactor...).

### Integration Points

- New NestJS modules registered in `apps/api/src/app.module.ts`.
- New Drizzle schema files (if any — unlikely for Phase 2) go in
  `packages/db/src/schema/` and are re-exported from `index.ts`.
- OpenAPI snapshot lives at `packages/shared-openapi/openapi.v1.snapshot.json`.
- Ingestion worker entry: new file `apps/api/src/worker.ts`. Railway
  `worker` service's start command: `node dist/worker.js`.
- Content files: `packages/content/legal/attribution.en.json` joins
  `disclaimer.en.json`.

</code_context>

<deferred>
## Deferred Ideas

Captured here so they're not lost. Reconsider in Phase 3+ or later.

- **Per-ride wait-time staleness alerts** — rejected (Q3.2 Option 1) for
  noise. Revisit if individual ride outages become a support-load issue.
- **Park-hours-aware alert suppression** — rejected (Q3.3 Option 2) in
  favor of a crude 2am–6am ET window. Revisit if precision matters.
- **OpenWeather prefetch worker** — rejected (Q5.1) in favor of
  on-demand caching. Revisit if API rate limits bite or latency becomes
  a UX problem.
- **Seasonal-average weather beyond 8 days** — rejected (Q5.2). Revisit
  if users report "why is there no weather for my October trip" feedback.
- **OpenWeather circuit breaker** — rejected (Q5.3) for simplicity.
  Revisit if third-party weather outages start cascading.
- **API-response attribution (header or meta field)** — rejected (Q7.1)
  as over-engineering DATA-05. Revisit if a partner or app-store review
  raises it.
- **Tappable attribution link** — rejected (Q7.4). Revisit only if
  queue-times.com's terms request it explicitly.
- **Per-worker Railway services** — rejected (Q1.1) for cost. Revisit
  if one worker's failure keeps taking others down.
- **Higher worker concurrency** — rejected (Q1.2) for simplicity.
  Revisit if polling-cycle latency becomes an issue.

## Prerequisites (not Phase 2 work, but must exist before Phase 2 ships)

- Slack workspace + incoming webhook URL in `.env.local`
  (`SLACK_ALERT_WEBHOOK_URL`)
- OpenWeather API key in `.env.local` (`OPENWEATHER_API_KEY`)
- Railway `worker` service provisioned (currently only `api` service plan
  exists; tracked in `docs/ops/PROVISIONING_STATE.md`)

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-04-14*
