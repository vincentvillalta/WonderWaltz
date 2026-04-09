# Architecture Research

**Domain:** Travel planner with real-time data, AI generation, offline-first mobile
**Researched:** 2026-04-09
**Confidence:** HIGH (based on authoritative project plan + established patterns for this class of product)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────────┐  │
│  │  iOS (SwiftUI)   │  │ Android (Compose) │  │   Web (Next.js App Router)    │  │
│  │  SwiftData cache │  │  Room cache       │  │   SSR + ISR, Vercel           │  │
│  │  StoreKit 2      │  │  Play Billing     │  │   Admin panel (gated route)   │  │
│  │  APNs push       │  │  FCM push         │  └───────────────────────────────┘  │
│  └────────┬─────────┘  └────────┬──────────┘            │                       │
└───────────┼────────────────────┼────────────────────────┼───────────────────────┘
            │                    │                         │
            └────────────────────┼─────────────────────────┘
                         HTTPS / REST + JSON (OpenAPI)
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                       API LAYER  (NestJS on Railway)                             │
│                                                                                  │
│  AuthModule          TripModule          CatalogModule          PlanModule       │
│  (Supabase Auth,     (trips, guests,     (parks, attractions,   (orchestrates    │
│   anon→real merge)    prefs CRUD)         dining read-only)      generation)     │
│                                                                                  │
│  EntitlementModule   NotificationModule  AffiliateModule        AdminModule      │
│  (RevenueCat webhook  (APNs + FCM jobs)  (packing list,         (internal only)  │
│   + REST)                                 affiliate URLs)                        │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  SCHEDULER SUBSYSTEM  (pure TypeScript package, imported by PlanModule)   │   │
│  │                                                                            │   │
│  │   ForecastModule        SchedulerModule           NarrativeModule          │   │
│  │   (predict wait at      (deterministic solver,    (Claude API calls,       │   │
│  │    ride × ts)            greedy + local search)    prompt caching, Haiku)  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  WORKER LAYER  (separate Railway worker process, same codebase)           │   │
│  │                                                                            │   │
│  │   IngestionWorker (BullMQ)         NotificationScheduler (BullMQ)         │   │
│  │   fetch_queue_times  5 min          ll_booking_window  event-driven        │   │
│  │   fetch_wiki_hours   6 hr           walk_to_x_now      event-driven        │   │
│  │   rollup_wait_1h     hourly                                                │   │
│  │   refresh_crowd_idx  hourly                                                │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼──────────────────────┐
         │                         │                       │
┌────────▼────────┐   ┌───────────▼───────────┐   ┌───────▼──────────┐
│  Supabase       │   │  Upstash Redis         │   │  External APIs   │
│  - Postgres     │   │  - live wait cache     │   │  - Claude API    │
│  - TimescaleDB  │   │    (2-min TTL)         │   │  - queue-times   │
│  - Supabase Auth│   │  - BullMQ queues       │   │  - themeparks    │
│  - Supabase     │   │  - rate-limit counters │   │    .wiki         │
│    Storage      │   └───────────────────────┘   │  - OpenWeather   │
└─────────────────┘                               │  - RevenueCat    │
                                                  └──────────────────┘
```

---

## Component Boundaries — Detailed

### (a) Catalog + Ingestion

**CatalogModule** (API process) owns:
- Read-only REST endpoints for parks, attractions, dining, shows, resorts, walking_graph
- ETag + Cache-Control headers so mobile clients can conditional-GET
- No write path; only the seed command and admin routes mutate catalog data

**IngestionModule** (Worker process, NOT the API process) owns:
- BullMQ job definitions: fetch_queue_times, fetch_wiki_hours, rollup_wait_1h, refresh_crowd_index
- Writes raw wait observations to Timescale `wait_times_history`
- Writes current wait snapshot to Redis with 2-min TTL keyed `wait:{ride_id}`
- Does NOT expose HTTP endpoints; communicates results only via Redis + Postgres

**Boundary rule:** The API process reads from Redis (live waits) and Postgres (catalog, history). The worker process writes to both. The two processes share Drizzle schema definitions via a `packages/db` workspace package but never call each other directly.

**Why separate processes:** Ingestion has a different failure domain (upstream API timeouts, rate limiting) and different scaling needs (CPU-bound during rollups) from the HTTP API. Railway lets you run multiple services from the same repo with different start commands.

### (b) Forecast

**ForecastModule** lives inside the API process (not the worker). It is a pure query layer:
- `predictWait(ride_id: UUID, targetTs: Date): { minutes: number, confidence: 'high' | 'medium' | 'low' }`
- Reads from the Timescale continuous aggregate `wait_times_1h`
- Receives `crowd_level_bucket` from a Redis key refreshed hourly by the worker
- No side effects, no queuing — synchronous Postgres query, latency ~5ms

The worker's `refresh_crowd_index` job updates Redis key `crowd_index:{date}` so ForecastModule reads it without touching Timescale on the hot path.

### (c) Solver

**SchedulerModule** is a pure TypeScript package (`packages/solver`) imported by PlanModule:
- Zero NestJS dependencies — plain functions over plain data structures
- Input: `SolverInput` (trip definition, catalog snapshot, forecast data, walking graph)
- Output: `DayPlan[]` with time blocks, reasoning metadata, alternate items
- All side effects (DB reads/writes) happen in PlanModule before/after calling solver
- Fully unit-testable with fixture inputs; snapshot tests lock output

**Decision:** The solver is NOT a separate HTTP service. It runs in the API process as a library import. The 1-3s runtime is acceptable for a BullMQ job (plan generation is async). Separating it into a microservice adds a network hop and serialization overhead with no benefit at this scale.

**Walking graph consumption:** SchedulerModule receives a pre-loaded `Map<string, Map<string, number>>` (from_node → to_node → seconds) built from `walking_graph` rows. PlanModule loads this from Postgres at plan-generation time and caches it in process memory (the graph is ~static, changes only on catalog updates). PostGIS is used for spatial queries during catalog seeding (computing the graph from raw lat/lon) but NOT on the hot solver path. The solver sees only the precomputed adjacency structure.

### (d) Narrative / LLM

**NarrativeModule** lives in the API process:
- Called by PlanModule after the solver produces a `DayPlan[]`
- Constructs Claude prompts: static catalog context (prompt-cached) + solver output per day
- Uses Anthropic's prompt caching header for the ~15-25k token catalog context block
- Model selection: Claude Sonnet for initial full generation, Claude Haiku for "rethink my day" re-narration
- Writes to `llm_costs` table on every call (model, input_tok, cached_read_tok, output_tok, usd_cents)
- Returns structured `NarrativeOutput` (day intro, per-item tips, budget hacks, packing deltas)

**Prompt cache lifecycle:** The catalog context block (attraction descriptions, dining details, park-specific tips) is compiled once per park set and stored as a cached prompt prefix. Cache TTL is 5 minutes on Anthropic's end with beta caching enabled — this means sequential calls within a plan generation hit the cache. Across separate user requests the cache may cold-miss, but the cost delta is acceptable (see cost model in plan doc).

### (e) Plan Orchestration

**PlanModule** is the coordinator:
- Receives `POST /trips/:id/generate-plan`
- Validates entitlement (free tier: one full generation per trip, subsequent re-gens allowed)
- Enqueues a `generate_plan` BullMQ job (async, not inline — see data flow section)
- The BullMQ job executes: load trip + guests + prefs → load catalog snapshot → fetch forecasts for each day → call SchedulerModule → call NarrativeModule → persist plan rows → update trip.status → push notification to mobile client
- Exposes `GET /plans/:id` with entitlement-based projection (Day 1 full, Days 2-N blurred for free tier)

**Plan versioning:** Each generation creates a new `plans` row with an incremented `version`. Mobile clients cache the latest version. The `solver_input_hash` field lets us detect when a re-generation would produce identical results (skip LLM if hash unchanged and user hasn't changed trip).

### (f) Entitlement

**EntitlementModule** is thin and RevenueCat-authoritative:
- Webhook receiver: `POST /webhooks/revenuecat` — receives INITIAL_PURCHASE, REFUND, PRODUCT_CHANGE events
- Validates webhook HMAC signature from RevenueCat
- On INITIAL_PURCHASE: creates `entitlements` row, updates `trips.entitlement_state = 'unlocked'`
- On REFUND/REVOKE: sets `trips.entitlement_state = 'free'`, revokes offline token
- REST endpoint `GET /entitlements/check` called by mobile on app foreground — delegates to RevenueCat SDK customer lookup (not a local DB lookup, to stay in sync)
- Does NOT validate StoreKit 2 / Play receipts directly — RevenueCat is the single validation layer

**Boundary:** Mobile apps call RevenueCat SDK for purchase initiation and local entitlement state. The backend webhook is the authoritative sync. Never trust mobile-reported entitlement for server-side blurring — always check `trips.entitlement_state` set by the webhook.

### (g) Notifications

**NotificationModule** lives in the API process but its jobs run in the Worker process:
- Module defines job processors for `send_ll_booking_window` and `send_walk_to_x_now`
- Jobs are scheduled by PlanModule when a plan is generated or updated: for each plan_item of type `lightning_lane_book` or `walk`, enqueue a delayed BullMQ job firing `item.start_time - 5min`
- Job processor calls APNs (iOS) or FCM (Android) HTTP v1 API with the push token stored in `users.push_token`
- Live Activities (iOS) receive updates via APNs push-to-start + update payloads; token management is the mobile app's responsibility

### (h) Affiliate

**AffiliateModule** is stateless:
- Called by PlanModule after plan generation as a last step
- Reads `affiliate_items` rows matching trip context conditions (rain_prob from weather, min_temp, guest_age_lt, months)
- Rewrites `url_template` with Amazon Associates tracking tag from env var
- Writes `packing_list_items` linking plan to ranked affiliate items
- No external API calls at generation time — all data is in Postgres

---

## Data Flows

### 1. Generate a Plan

```
Mobile: POST /trips/:id/generate-plan
            │
            ▼
  PlanModule.generatePlan()
  1. Check entitlement (trips.entitlement_state)
  2. Return 202 Accepted + jobId immediately
  3. Enqueue BullMQ job: generate_plan:{tripId}
            │
            ▼  [Worker process, BullMQ job]
  PlanModule job processor:
  4. Load trip + guests + prefs from Postgres
  5. Load catalog snapshot (parks, attractions, dining,
     walking_graph) from Postgres → build adjacency map
  6. Fetch weather for each trip day from OpenWeather API
     → cache result in Redis key weather:{tripId}:{date} TTL 6hr
  7. For each park day:
     ForecastModule.predictWait(rideId, hour) × N attractions
     → reads wait_times_1h aggregate + Redis crowd_index
  8. SchedulerModule.solve(SolverInput) → DayPlan[]
     → pure function, ~500ms typical
  9. NarrativeModule.narrate(DayPlan[], tripContext) → NarrativeOutput
     → Claude API call (Sonnet), prompt caching
     → write llm_costs row
  10. AffiliateModule.resolvePackingList(planId, tripContext)
      → write packing_list_items rows
  11. Persist: plans, plan_days, plan_items rows
  12. Update trip.status = 'active', plan.version++
  13. Push silent notification to mobile (new plan ready)
            │
            ▼
  Mobile: poll GET /trips/:id/plan-status until status=ready
          or receive silent push notification
          → GET /plans/:id (entitlement projection applied)
          → write to SwiftData / Room offline cache
```

**Caching hierarchy:**
- Live wait times: Redis, 2-min TTL (written by ingestion worker)
- Weather: Redis, 6-hr TTL (written by PlanModule job on first fetch)
- Forecast aggregates: Timescale continuous aggregate (refreshed hourly by worker)
- Crowd index: Redis key, refreshed hourly by worker
- Generated plan: Postgres (permanent); mobile cache: SwiftData/Room (until trip ends + 30 days)

**Retry policy:** BullMQ job retries 3× with exponential backoff. Claude API failures retry 2× in NarrativeModule before bubbling as a job failure. A failed job leaves trip.status = 'error'; mobile polls see this and surface a "try again" CTA.

### 2. View Plan Offline

```
Mobile (no network):
  → SwiftData/Room query for trip planItems where plan.version = latestCached
  → Render timeline from local data
  → Live wait times: show last-known from cache with staleness indicator
  → "Rethink my day": disabled, shows "Requires connection" tooltip
  → Packing list: fully offline from cached packing_list_items
```

**What is bulk-synced after purchase (offline package):**
- Full plan (all days, all items, narrative text, tips)
- Catalog subset: only attractions/dining/shows referenced in plan_items
- Walking graph: only edges involving selected park's nodes
- Static park map image (Supabase Storage URL → downloaded to device cache)
- Packing list items with affiliate URLs

**What is fetched on-demand:**
- Live wait times (opportunistic, 2-min poll when app is active and on a trip day)
- Plan regeneration (requires network)
- Entitlement check (on app foreground)

**What is polled during trip:**
- Live waits: 2-min poll when plan view is active and trip date = today
- Background sync: every 2 hours via WorkManager (Android) / BGAppRefreshTask (iOS) to refresh plan if updated on server

### 3. Rethink My Day

```
User taps "Rethink my day":
  Mobile → POST /trips/:id/rethink-day
           { currentTime, completedItemIds, parkId }
            │
            ▼
  PlanModule.rethinkDay():
  1. Validate entitlement (trip must be unlocked)
  2. Return 202 + jobId
  3. Enqueue BullMQ job: rethink_day:{tripId}:{dayDate}
            │
            ▼  [Worker, BullMQ job]
  4. Load remaining plan items (not in completedItemIds)
  5. Load current live waits from Redis (wait:{rideId})
  6. SchedulerModule.solveRemaining(...)
     → same solver with currentTime as new window start
     → ~300-800ms (partial day, smaller candidate set)
  7. NarrativeModule.narrateDay(dayPlan, tripContext)
     → Claude Haiku (not Sonnet) — cheaper, faster
     → write llm_costs row (model=haiku)
  8. Update plan_day + plan_items for today only (new version)
  9. Push silent notification to mobile
            │
            ▼
  Mobile: receives silent push or polls GET /trips/:id/today-plan
          → replace today's items in SwiftData/Room
          → animate transition in timeline view
```

**Latency budget:**
- Solver for remaining day: 300-800ms
- Claude Haiku narration: 800ms-2s (p95)
- DB writes: ~50ms
- Total BullMQ job: ~1.5-3s end to end

**Pattern:** Async with polling, NOT sync HTTP. The 1.5-3s total time is fine as an async job. The mobile shows a spinner on the "Rethink my day" card and resolves via either silent push or a 2-second polling loop on the today endpoint. This is more resilient than holding an HTTP connection open.

### 4. Purchase Unlock

```
Mobile (iOS example):
  1. User taps "Unlock Trip" in paywall
  2. StoreKit 2 purchase flow → Apple payment sheet
  3. RevenueCat SDK receives StoreKit 2 transaction
  4. RevenueCat validates receipt with Apple
  5. RevenueCat fires webhook to backend:
     POST /webhooks/revenuecat  { event: INITIAL_PURCHASE, ... }
            │
            ▼
  EntitlementModule.handleWebhook():
  6. Verify HMAC signature
  7. Insert entitlements row
  8. UPDATE trips SET entitlement_state='unlocked' WHERE id=tripId
  9. Return 200
            │
            ▼
  Mobile (RevenueCat SDK):
  10. SDK CustomerInfo updated → callback fires
  11. App calls GET /entitlements/check (server confirmation)
  12. Unlock UI state: show full plan, enable rethink
  13. Trigger offline sync of full plan package
```

**Failure handling:** If webhook arrives before RevenueCat SDK callback, or vice versa, both paths converge on the same `entitlement_state` column. The mobile should trust the server's entitlement check (`GET /entitlements/check`) as authoritative for gating, not local SDK state alone.

### 5. Create Trip (no purchase yet)

```
Mobile:
  1. Onboarding: app creates anon Supabase auth session silently
  2. Trip wizard: POST /trips with dates, guests, prefs
     → trip.entitlement_state = 'free'
  3. POST /trips/:id/generate-plan
     → generates Day 1 fully, Days 2-N with solver output but
       narrative is generated for all days (cost is low with Haiku)
     → GET /plans/:id returns Day 1 full, Days 2-N as blurred stubs
  4. User sees teaser; conversion funnel starts
```

---

## Monorepo Structure

```
WonderWaltz/
├── apps/
│   ├── api/                    # NestJS app (Railway deploy)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── trip/
│   │   │   │   ├── catalog/
│   │   │   │   ├── plan/       # orchestration only
│   │   │   │   ├── forecast/
│   │   │   │   ├── narrative/
│   │   │   │   ├── entitlement/
│   │   │   │   ├── notification/
│   │   │   │   ├── affiliate/
│   │   │   │   └── admin/
│   │   │   └── workers/        # BullMQ job processors
│   │   │       ├── ingestion/
│   │   │       └── notification/
│   │   └── Dockerfile          # two Railway services: api and worker
│   ├── web/                    # Next.js App Router (Vercel)
│   │   ├── app/
│   │   │   ├── (marketing)/    # landing, guides, pricing, legal
│   │   │   └── admin/          # gated admin panel
│   ├── ios/                    # Xcode project (SwiftUI)
│   │   └── WonderWaltz/
│   │       ├── Core/           # WWCore: networking, auth, models
│   │       ├── DesignSystem/   # WWDesignSystem: tokens, components
│   │       ├── Offline/        # WWOffline: SwiftData sync
│   │       ├── Paywall/        # WWPaywall: StoreKit 2 + RevenueCat
│   │       └── Features/       # screens by feature
│   └── android/                # Android Studio project (Compose)
│       └── app/src/main/
│           ├── core/           # networking, DI, models
│           ├── designsystem/   # tokens, Compose components
│           ├── offline/        # Room, WorkManager sync
│           ├── paywall/        # Play Billing + RevenueCat
│           └── features/       # screens by feature
├── packages/
│   ├── solver/                 # Pure TS solver (no NestJS deps)
│   │   ├── src/
│   │   │   ├── types.ts        # SolverInput, DayPlan, PlanItem
│   │   │   ├── solver.ts       # main entry: solve(input): DayPlan[]
│   │   │   ├── scoring.ts      # enjoyment_weight / time+wait+walk cost
│   │   │   └── ll-optimizer.ts # Lightning Lane assignment pass
│   │   └── tests/
│   │       └── fixtures/       # canonical trip scenarios
│   ├── db/                     # Drizzle schema + migrations (shared)
│   │   ├── schema/
│   │   └── migrations/
│   ├── shared-openapi/         # OpenAPI spec (auto-generated from NestJS)
│   │   └── openapi.json        # single source of truth
│   └── content/
│       └── wdw/                # YAML/JSON catalog seed data
│           ├── parks.yaml
│           ├── attractions.yaml
│           ├── dining.yaml
│           └── walking-graph/
```

---

## Integration Seams (Third-Party)

### Claude / Anthropic

| Concern | Decision | Notes |
|---------|----------|-------|
| Call location | NarrativeModule in API process, inside BullMQ job | Never on the HTTP request thread |
| Model selection | Sonnet for initial generation, Haiku for rethink | Enforced in NarrativeModule, not caller's choice |
| Prompt caching | Beta header enabled; static catalog block marked for caching | Catalog block compiled at module init, reused across calls |
| Retry | 2× with 1s backoff on 529/overloaded; bubble failure to job | Jobs retry at BullMQ level |
| Cost telemetry | Every Claude call writes llm_costs row with input/cached/output tokens | Usage API response headers → parse and persist |
| Circuit breaker | If llm_costs p95 > $0.50/trip, NarrativeModule returns cached narrative stub | Alert fires to Sentry; admin can override |

### RevenueCat

| Concern | Decision | Notes |
|---------|----------|-------|
| Receipt validation | Fully delegated to RevenueCat | Never validate StoreKit/Play receipts directly |
| Entitlement source of truth | RevenueCat webhook → Postgres entitlements table | Mobile SDK gives local state; server webhook gives canonical state |
| Webhook security | HMAC signature verification on every webhook call | Secret stored in Railway env var |
| Refund handling | REFUND webhook revokes entitlement_state + notifies mobile via silent push | Mobile disables rethink, keeps cached plan readable (grace UX) |

### queue-times.com

| Concern | Decision | Notes |
|---------|----------|-------|
| Polling | Every 5 min via BullMQ repeatable job | Conservative; their public terms allow this |
| Failure handling | If 3 consecutive fetches fail, Sentry alert fires; Redis keys retain last-good values until TTL (2 min) expires | After TTL expiry, show "waits unavailable" in UI |
| Attribution | "Wait time data from queue-times.com" on About screen | Required by their terms |
| Fallback | themeparks.wiki polled every 6 hr; used as fallback if queue-times fails | Worker detects staleness and switches source |

### themeparks.wiki

| Concern | Decision | Notes |
|---------|----------|-------|
| Polling | Every 6 hr for hours + scheduled entertainment | Lower cadence than waits |
| Purpose | Park hours, show schedules, attraction metadata enrichment | Primary catalog seeding source |
| Fallback role | Also serves as wait-time fallback if queue-times fails | Worker has `WaitTimeSource` enum to track which source is active |

### OpenWeather

| Concern | Decision | Notes |
|---------|----------|-------|
| Call location | PlanModule job, on plan generation | Not on the live request path |
| Caching | Redis key weather:{tripId}:{date} with 6-hr TTL | Re-fetched on rethink-day only if forecast date is within 48h |
| Feed to solver | WeatherContext object: { date, highF, lowF, rainProbPct, conditions } | Solver uses rainProbPct > 40 to activate rain contingencies |
| Free tier limits | 1,000 calls/day on free tier; each plan generation uses N calls (1 per trip day) | Upgrade to $40/mo plan before public launch |

### Supabase Auth

| Concern | Decision | Notes |
|---------|----------|-------|
| Anon accounts | Created silently on first app launch | Device-local JWT; no email required |
| Upgrade path | Apple/Google sign-in merges anon → real user in a single transaction | TripModule moves trips to new user_id; old anon row soft-deleted |
| JWT verification | NestJS AuthGuard validates Supabase JWT on every request | Public key fetched from Supabase JWKS endpoint at startup |
| Session storage | Mobile apps store JWT in Keychain (iOS) / EncryptedSharedPreferences (Android) | Never store in UserDefaults or SharedPreferences |

---

## Walking Graph and PostGIS

**Modeling:**
- `attractions.location_point` is a PostGIS `geometry(Point, 4326)` column (lat/lon WGS84)
- `dining.location_point` same
- `walking_graph(from_node UUID, to_node UUID, seconds INT)` is a precomputed edge table

**Seeding the graph:**
- During catalog seeding, run a one-time computation: for each pair of nodes within 2km in the same park, compute Euclidean time at 1.2 m/s (pedestrian speed) using PostGIS `ST_Distance`
- Add manual overrides in the seed YAML for paths that are physically indirect (e.g., Fantasyland → Tomorrowland requires going through the hub) — these override the Euclidean estimate
- Mobility modifier: the seed YAML includes `mobility_multiplier` per edge for wheelchair/ECV routes

**Hot path (solver):**
- PlanModule loads walking graph once per job, builds `Map<UUID, Map<UUID, number>>` in Node.js memory
- Solver calls `walkCost(fromId, toId): number` — pure map lookup, no DB query during solve
- PostGIS is NOT queried during plan generation; it is a seeding-time tool only

**Update cadence:** Walking graph is static for v1 (WDW layout doesn't change). Re-seed only when attractions open/close (rare). No online PostGIS queries needed.

---

## Environment Boundaries

**Two environments: dev + prod (plus Vercel branch previews)**

The plan's decision to skip staging is correct for a solo founder. The risk of staging drift (config, data, third-party test credentials) outweighs the safety benefit at this team size. The mitigation is:

| Risk | Mitigation |
|------|-----------|
| Breaking prod with untested code | Feature flags via PostHog; deploy to prod but gate behind flag |
| RevenueCat webhook testing | RevenueCat's sandbox environment + test purchases (separate project in RevenueCat) |
| Push notification testing | APNs sandbox cert for dev, production cert for prod |
| Database migrations | Drizzle migrations in CI before Railway deploy; rollback plan for each migration |

**Secret management:**

| App | Secret Store | Local Dev |
|-----|-------------|-----------|
| api (Railway) | Railway environment variables | .env.local + direnv |
| web (Vercel) | Vercel environment variables | .env.local |
| ios | Xcode build config + GitHub Actions secrets | .xcconfig files gitignored |
| android | gradle.properties + GitHub Actions secrets | local.properties gitignored |

**Shared config between apps:**
- OpenAPI spec in `packages/shared-openapi/openapi.json` is the contract; generated clients enforce it
- Design tokens in `packages/tokens/tokens.json` → Swift/Kotlin/CSS generated at build time
- No runtime shared config — each app reads its own env vars; no config service needed at this scale

**Secret scope per app:**
- API: `DATABASE_URL`, `REDIS_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `OPENWEATHER_API_KEY`, `APNS_KEY`, `FCM_SERVER_KEY`, `AMAZON_ASSOCIATES_TAG`
- Web: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (admin panel only), `NEXT_PUBLIC_API_URL`
- iOS: RevenueCat public SDK key, Supabase anon key, API base URL (all non-secret, in build config)
- Android: same as iOS equivalents

---

## Architectural Patterns

### Pattern 1: Async Plan Generation via BullMQ

**What:** All plan generation (initial and rethink) runs as a BullMQ job in the worker process, not as an inline HTTP handler.
**When to use:** Any operation that takes >500ms or calls external APIs (Claude, OpenWeather).
**Trade-offs:** Adds polling complexity on mobile; eliminates HTTP timeout failures; enables retry without user action; decouples API latency from LLM latency.

```typescript
// PlanModule: enqueue immediately, return job handle
async generatePlan(tripId: string): Promise<{ jobId: string }> {
  const job = await this.planQueue.add('generate_plan', { tripId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
  return { jobId: job.id };
}
```

### Pattern 2: Solver as Pure Package

**What:** The scheduling solver is a pure TypeScript package with no framework dependencies, zero side effects, and deterministic output.
**When to use:** Any computation that must be unit-tested in isolation and cached based on input hash.
**Trade-offs:** Requires PlanModule to orchestrate all I/O before calling solver; prevents solver from "reaching out" for data on its own.

```typescript
// packages/solver/src/solver.ts
export function solve(input: SolverInput): DayPlan[] {
  // No DB calls, no HTTP, no randomness unless seeded
  // Input is a fully-hydrated snapshot of all needed data
}
```

### Pattern 3: Entitlement Projection at API Layer

**What:** The `GET /plans/:id` endpoint applies entitlement blurring at the API layer, not in the DB and not on the mobile client.
**When to use:** Whenever the same data must be presented differently based on purchase state.
**Trade-offs:** Mobile never receives unblurred data for unpurchased days; prevents client-side bypass; simpler DB schema.

```typescript
// PlanModule: apply projection before serializing
function projectPlan(plan: Plan, entitlementState: string): PlanDTO {
  if (entitlementState === 'unlocked') return plan;
  return {
    ...plan,
    days: plan.days.map((day, i) =>
      i === 0 ? day : { ...day, items: [], narrative: null, isBlurred: true }
    ),
  };
}
```

### Pattern 4: Offline-First with Server-Authoritative Sync

**What:** Mobile writes to local SwiftData/Room as the primary read source. Server pushes updates via silent push notifications; app syncs on foreground and on silent push receipt.
**When to use:** Any data the user must see without network (plan, packing list, catalog subset).
**Trade-offs:** Requires a sync coordinator that handles conflicts (server always wins for plan data; mobile is read-only for plans).

---

## Anti-Patterns

### Anti-Pattern 1: Calling Claude on the HTTP Request Thread

**What people do:** `POST /generate-plan` calls Claude inline and awaits the response before returning.
**Why it's wrong:** 2-8s Claude latency + mobile network timeouts = bad UX and high failure rate under load. HTTP connections drop on mobile on park cell service.
**Do this instead:** Enqueue BullMQ job, return 202 with jobId, poll or silent push for completion.

### Anti-Pattern 2: Validating App Store Receipts Directly

**What people do:** Parse StoreKit 2 JWS transactions or call Apple's verifyReceipt endpoint directly in the backend.
**Why it's wrong:** Platform-specific, breaks on edge cases (family sharing, refunds, subscription changes), requires separate Apple/Google implementations, misses RevenueCat's normalization layer.
**Do this instead:** RevenueCat webhook is the only entitlement write path. RevenueCat handles all receipt validation complexity.

### Anti-Pattern 3: Running the Solver as a Separate HTTP Microservice

**What people do:** Extract the solver into a separate service, call it via HTTP from PlanModule.
**Why it's wrong:** Adds network latency, serialization overhead, and a separate deployment target for a pure CPU computation that runs for <2s. At this scale (solo, one Railway project), it's pure complexity tax.
**Do this instead:** Import the solver as a TypeScript package. It's already isolated by being in `packages/solver` with no framework dependencies. Promote to separate service only if Railway CPU contention becomes measurable.

### Anti-Pattern 4: Storing Entitlement State Only in Mobile

**What people do:** Trust the RevenueCat SDK's local CustomerInfo as the source of truth for gating content.
**Why it's wrong:** SKD state can be stale; receipt validation happens async; a malicious client can spoof local state; server-side blurring requires server-side truth.
**Do this instead:** Backend's `trips.entitlement_state` (set by RevenueCat webhook) is the gate for all API responses. Mobile state controls UI optimistically but server always has the last word.

### Anti-Pattern 5: Querying PostGIS on the Plan Generation Hot Path

**What people do:** During solver execution, call PostGIS `ST_Distance` or shortest-path functions to compute walking costs.
**Why it's wrong:** Each plan generation might compute hundreds of edge lookups; PostGIS queries add round-trip latency; solver becomes I/O-bound, not CPU-bound.
**Do this instead:** Precompute all edges into `walking_graph` table at seed time; load into a Node.js `Map` at job start; solver does pure in-memory lookups.

---

## Build Order (Component Dependencies)

Components must be built in dependency order. This maps to the phased plan but makes dependencies explicit:

```
Phase 0: Repo + CI + Infrastructure
  → Monorepo scaffold, Railway/Supabase/Vercel/Upstash provisioned
  → No component dependencies; just tooling

Phase 1: packages/db + CatalogModule + IngestionModule
  → packages/db (Drizzle schema) must exist before any module
  → CatalogModule: depends on packages/db only
  → IngestionModule: depends on packages/db + Upstash Redis
  → Both modules before any solver or plan work

Phase 2: ForecastModule
  → Depends on: IngestionModule having populated wait_times_history
  → Depends on: packages/db Timescale hypertable + continuous aggregate
  → Note: start ingestion worker ASAP in Phase 1 so data accumulates during build

Phase 3: AuthModule + TripModule + EntitlementModule
  → AuthModule: depends on Supabase Auth only
  → TripModule: depends on AuthModule + packages/db
  → EntitlementModule: depends on TripModule + RevenueCat webhook
  → OpenAPI spec generated from this phase onward; mobile clients generated here

Phase 4: packages/solver + SchedulerModule (within PlanModule)
  → packages/solver: depends on nothing (pure TS)
  → SchedulerModule: depends on packages/solver + ForecastModule + CatalogModule
  → Snapshot tests with fixture trips validate solver before LLM layer

Phase 5: NarrativeModule + AffiliateModule + full PlanModule
  → NarrativeModule: depends on packages/solver output types + Anthropic API
  → AffiliateModule: depends on packages/db affiliate tables
  → PlanModule: depends on all of the above; final orchestration wiring

Phase 6: NotificationModule
  → Depends on: PlanModule (job scheduling) + APNs/FCM credentials
  → Can be stubbed in Phase 4-5 with a no-op notifier

Phase 6: iOS app
  → Depends on: complete OpenAPI spec from Phases 3-5
  → Uses generated Swift client from packages/shared-openapi

Phase 7: Android app
  → Depends on: iOS app complete (parity review baseline)
  → Same OpenAPI spec → generated Kotlin client

Phase 8: Web (Next.js marketing + admin)
  → Admin panel depends on: AdminModule in API (added alongside Phase 5)
  → Marketing site has no API dependency for static content

Phase 9: Live Activities + Rethink My Day UI
  → Depends on: NotificationModule + full plan API from Phase 5
  → iOS Live Activities depend on Phase 6 foundation
```

**Critical path insight:** Start the ingestion worker (Phase 1) as early as possible. The forecast model (Phase 2) and solver quality both depend on accumulated historical data. Every day of Phase 1 delay is a day of forecast data lost. Target 8+ weeks of history before public launch (plan calls this out as a risk).

---

## Scaling Considerations

| Scale | Architecture Adjustment |
|-------|------------------------|
| 0-1k users | Monolith is correct. One Railway API service, one Railway worker service. Single Supabase project. |
| 1k-10k users | First bottleneck: ingestion worker competes with plan generation for BullMQ/Redis. Split into dedicated worker services per queue group (ingestion queue vs plan-generation queue) on Railway. |
| 10k-100k users | Second bottleneck: Postgres read load from catalog + forecast queries. Add a Postgres read replica (Supabase supports this); route ForecastModule and CatalogModule reads to replica. |
| 100k+ users | Third bottleneck: Claude API concurrency limits. Rate-limit queue concurrency to stay under Anthropic's limits; add a Claude request rate limiter in NarrativeModule. Consider caching identical solver inputs → same narrative (many trips to same park on same dates). |

The monolith is not the bottleneck until well past initial launch. Do not split into microservices preemptively.

---

## Open Questions (Plan Left Unresolved)

1. **Walking graph source of truth for complex inter-land paths.** The plan mentions PostGIS + lat/lon but doesn't specify who provides the accurate walking-time overrides for the hub-spoke park layout. Recommend: hand-tuned YAML in `packages/content/wdw/walking-graph/overrides.yaml`, validated by running test trips and comparing to real park experience during beta.

2. **Plan generation for free-tier users (cost exposure).** Free users trigger a full solver + LLM generation (Days 2-N are blurred but the LLM still runs). At $0.03/day × 5 days = $0.15, a free user who never converts costs money. Resolution needed before public launch: either run Haiku-only for free tier (cheaper but lower quality narrative, which hurts conversion) or run Sonnet for Day 1 only and Haiku stubs for Days 2-N until unlock. Recommend the latter.

3. **Crowd-level bucket for future dates.** The plan describes a "rolling calendar heuristic" for estimating future crowd_level_bucket but doesn't specify the data structure. This is needed by ForecastModule before Phase 4. Recommend: a `crowd_calendar_overrides(date, crowd_level_bucket, notes)` table maintained in admin, with a static seed for known WDW crowd patterns (marathon weekends, school breaks, EPCOT festivals) for the first year.

4. **Silent push for plan-ready notification.** Both iOS and Android require a stored push token for silent notifications. The plan mentions push tokens but doesn't specify the registration flow. Token must be stored in a `user_push_tokens(user_id, platform, token, updated_at)` table. Tokens rotate (especially on iOS after reinstall); each app launch should re-register.

5. **Solver determinism with live wait times vs. forecast.** The "rethink my day" flow uses live wait times from Redis (not forecast) for remaining-day items. This is correct but means the rethink output is not reproducible if replayed later. For debugging, the solver input to each job should be serialized to a `plan_solver_inputs` table (JSONB) so support can replay and inspect any generated plan. This is not in the current schema.

6. **Affiliate link compliance.** Amazon Associates requires disclosure near every affiliate link. The plan doesn't specify where this disclosure lives in the mobile UI. Must be resolved before Phase 5 ships the packing list feature.

---

## Sources

- WonderWaltz PROJECT.md — project requirements and constraints (authoritative)
- WonderWaltz lazy-scribbling-dusk.md — high-level architecture and scheduling engine spec (authoritative)
- NestJS docs: module structure, BullMQ integration, Guards/Interceptors (HIGH confidence)
- Anthropic prompt caching docs: beta header usage, 5-min TTL behavior (HIGH confidence — verified via official Anthropic docs pattern for server-side caching)
- RevenueCat webhook documentation: HMAC signature, event types, entitlement sync patterns (HIGH confidence)
- BullMQ docs: delayed jobs, retry with backoff, repeatable jobs (HIGH confidence)
- PostGIS ST_Distance + pedestrian graph patterns (MEDIUM confidence — well-established GIS pattern, specific WDW topology overrides require manual validation)
- SwiftData offline sync patterns with background refresh (MEDIUM confidence — iOS 17+ SwiftData is relatively new, sync coordinator patterns are in flux)

---
*Architecture research for: WonderWaltz — Disney trip planner with real-time data, AI generation, offline-first mobile*
*Researched: 2026-04-09*
