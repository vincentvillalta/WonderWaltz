# Phase 3: Engine - Research

**Researched:** 2026-04-15
**Domain:** Deterministic scheduling solver + Claude narrative + async BullMQ plan generation
**Confidence:** HIGH on stack & APIs; MEDIUM on algorithm tuning (calibrated via fixtures)

## Summary

Phase 3 assembles three interlocking subsystems on top of the Phase 2 data pipeline: (1) a pure-TypeScript scheduling solver in `packages/solver` with deterministic output, (2) a `NarrativeModule` that wraps `@anthropic-ai/sdk` with prompt caching and Zod-validated structured output, and (3) a BullMQ `plan-generation` processor that orchestrates forecast hydration → solve → narrate → persist within a 30s end-to-end budget. All integration surfaces (BullMQ processor shape, `SharedInfraModule` DB/Redis globals, Slack dead-letter, response envelope, OpenAPI snapshot) already exist from Phase 2 and must be reused verbatim.

The dominant risks are (a) LLM cost telemetry accuracy from call #1 (circuit breaker cannot be retrofit), (b) snapshot stability of the solver across Node versions, timezones, and fixture date drift, and (c) Anthropic cache hit rate meeting the ≥70% gate — which requires the static catalog+BRAND prefix to be held **byte-stable** and placed before the `cache_control` breakpoint on every request.

**Primary recommendation:** Build Wave 0 as (1) install `@anthropic-ai/sdk`, (2) schema migrations (`crowd_calendar`, `llm_cost_incidents`, `trips.current_plan_id`, `trips.llm_budget_cents`, `plans(trip_id, solver_input_hash)` index, `attractions.baseline_wait_minutes` + `lightning_lane_type` + `is_headliner` YAML columns), (3) OpenAPI v1 amendment (FullDayPlan|LockedDayPlan discriminated union + warnings + RethinkRequestDto + PlanBudgetExhaustedDto), (4) test scaffolding for six solver snapshot fixtures. Then Wave 1 in parallel: `ForecastModule`, pure-TS solver kernel, `NarrativeModule` prompt+cache scaffolding. Wave 2: `PlanGenerationProcessor` that wires them; HTTP controllers. Wave 3: rate limits, circuit breaker alerting, rethink endpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Solver Algorithm Shape (SOLV-01..13)**
- **Construction (greedy):** Must-do attractions placed first as **hard pins** in their optimal time windows, then greedy fills remaining slots by score.
- **Score function:** `score = enjoyment_weight / (time_cost + wait_cost + walk_cost)` with **equal weights** (each cost multiplier = 1.0). Baseline; can calibrate later via fixture outcomes.
- **Local search:** **Adjacent-pair swap only** — try swapping order of any 2 adjacent items in the day; keep if total score improves. No 2-opt, no insert/remove moves.
- **Runtime budget:** Solver pass must complete in **≤ 15 seconds**. Leaves ~10-15s for narrative within the 30s end-to-end budget.
- **Determinism (SOLV-11):**
  - `solver_input_hash` = hash of `{ trip, guests, preferences, date }`. Forecasts NOT part of hash.
  - Cache storage: **DB only** via indexed `plans.solver_input_hash` lookup. No Redis cache layer.
  - Cache hit → return stored plan as-is. Zero LLM cost. User runs "Rethink my day" for fresh narrative.
  - Each new hash produces a **new `plan` row** (history preserved). `trips.current_plan_id` tracks active plan.

**Forecast Model (FC-01..05)**
- **Low-confidence fallback:** When confidence = `low` (default for first 4 weeks post-2026-04-15), use hardcoded `baseline_wait_minutes` from `attractions.yaml` instead of empty/noisy bucketed-median. Solver penalizes `low`-confidence buckets with `wait_cost × 1.2`.
- **Crowd calendar (FC-02):** Hybrid: **rule-based defaults** (weekends, federal holidays, school breaks at runtime) + **DB override table** (`crowd_calendar` with `(date, bucket, reason)`). `packages/content/wdw/calendar-rules.ts` is the pure rule engine. `crowd_calendar` seeded empty.
- **Confidence label surfacing:** Always included on every forecasted wait from `ForecastModule.predictWait()`. Client UI renders `low` as "Beta Forecast" until 8+ weeks of history exist.

**LLM Prompt & Caching (LLM-01..08)**
- **Cache boundary (LLM-02):** Cached prefix ~5-8K tokens = WDW catalog (51 attractions + 38 dining + 30 resorts) + BRAND voice guide with examples + tone rules. Dynamic suffix = guest context + solver output. Target ≥70% hit rate (LLM-06 alert).
- **Model selection (LLM-03):** **Sonnet** for initial plan generation. **Haiku** for "Rethink my day" AND as fallback when Sonnet budget is exhausted mid-generation.
- **Zod validation (LLM-04):** Narrative output validated against Zod schema. Narrative never references a ride not in solver output (contract test). On failure: **retry once, then persist plan with empty narrative** + `narrative_available: false` flag.
- **Rethink-my-day (PLAN-04):** Solver re-runs on remaining items (Haiku does NOT re-order). Haiku writes **intro only** (shifted arc: "Since you're done with X…"); per-item tips unchanged.
- **Rate limits (LLM-08):** 15 rethinks/day unlocked, 5/day free-tier. Enforced at endpoint layer, per-user-per-day.

**Free-tier "Blur" Semantics (PLAN-02)**
- `Plan.days` is a **discriminated union**: `Array<FullDayPlan | LockedDayPlan>` tagged by `type`.
- `LockedDayPlan`: `{ type: "locked", dayIndex: int, park: string, totalItems: int, headline: string, unlockTeaser: string }`.
- `totalItems` counts **everything** (rides + meals + shows + rest blocks).
- `headline` **templated from solver output** — no LLM call. Example: `"Your {park} {budget_tier} day centers on {top_scored_item}."`

**Rethink-my-day API Contract (PLAN-04)**
- Request body: `{ current_time: ISO8601, completed_item_ids: uuid[], active_ll_bookings: [{ attraction_id, return_window_start, return_window_end }] }`
- **In-progress inference:** if `current_time` falls within a scheduled item's window AND not in `completed_item_ids`, it's in-progress and pinned.
- **LL bookings:** `active_ll_bookings[]` is client-authoritative. Each becomes a hard pin.

**Lightning Lane Allocation (SOLV-04, SOLV-10)**
- **Selection rule:** Filter to **top-N scored rides** in the plan, then assign LL slots to the **longest-wait rides** within that filtered set.
- **LL type distinction:** Each attraction in `attractions.yaml` has `lightning_lane_type: "multi_pass" | "single_pass" | "none"`. LLMP budget = per-day cap (3 default). LLSP budget scaled by tier (Pixie=0, Fairy=0-1, Royal=0-2).
- **Must-do without LL budget:** Schedule standby in the low-wait window. Emit `warnings: string[]` on plan response with conversion nudge text.
- **Return window (pre-park):** **Fixed 90-minute offset** from booking time. Real bookings flow via rethink's `active_ll_bookings`.

**Cost Circuit Breaker (LLM-07)**
- **Scope:** Per-trip lifetime $0.50 cap. Default `trip.llm_budget_cents = 50`.
- **Mid-generation:** When `trip_spent + projected_call_cost > budget` AND current model is Sonnet, **swap to Haiku**. If Haiku also fails (Zod etc.), fall through to "persist without narrative".
- **Over-budget new request:** `402 Payment Required` with `{ error: "trip_budget_exhausted", spent_cents, budget_cents, resetOptions: [{ type: "top_up", sku, usd_cents }, ...] }`. Phase 4 wires the RevenueCat SKU.
- **Telemetry:** Every breaker event → three sinks: Sentry (captured exception with trip context), Slack (aggregated hourly), `llm_cost_incidents` table.

### Claude's Discretion

- Exact score-weight calibration from fixture outcomes (baseline equal weights; may tune within snapshot tolerance).
- LLM prompt phrasing, retry backoff, Zod schema structure.
- `crowd_calendar` rule engine edge cases (weeks before/after a holiday, etc.).
- Exact templated-headline wording for locked days; deterministic from solver output.
- `llm_cost_incidents` schema fields beyond `{ trip_id, event, model, spent_cents, timestamp }`.

### Deferred Ideas (OUT OF SCOPE)

- **Phase 4:** Paid top-up IAP product for extending `trip.llm_budget_cents`. Paywall UI for 402 response.
- **Phase 9:** On-device local LLM inference for offline rethink narrative fallback.
- **Rejected for Phase 3:** Cached LLM re-run on hit for fresh tips; Redis cache layer in front of `plans.solver_input_hash`; 2-opt or insert/remove local search moves; LL selection by "longest predicted wait" alone; per-day $0.50 budget.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FC-01 | `ForecastModule.predictWait(ride_id, target_ts)` returns `{ minutes, confidence }` from bucketed median of `wait_times_history` grouped by `(ride_id, dow, hour_of_day, crowd_level_bucket)` | Pitfall §3 (bucket SQL), Stack §Forecast (percentile_cont on `wait_times_1h`), Pattern 1 |
| FC-02 | Crowd level bucket from rolling calendar heuristic + admin-editable override table | Stack §`packages/content/wdw/calendar-rules.ts` + `crowd_calendar` Drizzle schema; `@js-temporal/polyfill` or native `Temporal` for date math; `date-holidays` NPM for US federal holidays |
| FC-03 | Confidence label `high` (8+ weeks, >50 samples) / `medium` (4-8 weeks) / `low` (<4 weeks); always returned | Pattern 2 (confidence computation); decision: use sample-count + weeks-of-history gate |
| FC-04 | Forecast accuracy unit tests cover fixture history and canonical ride/day combinations | Vitest fixture patterns (see Validation Architecture) |
| FC-05 | UI displays "Beta Forecast" framing on every forecasted wait before public beta is 8+ weeks old | Contract: `meta.forecast_disclaimer: "Beta Forecast"` in response envelope for any plan with any `low` bucket |
| SOLV-01 | Pure TypeScript package `packages/solver` with `solve(SolverInput): DayPlan[]`; zero NestJS deps, zero I/O | Scaffold already present; extend with concrete types |
| SOLV-02 | Filter per guest constraints: height/mobility/sensory/dietary | Pattern 3 (filtering), discrete predicate chain |
| SOLV-03 | Greedy + local-search with must-do pinning | Algorithm §Solver construction + adjacent-swap |
| SOLV-04 | LLMP up to 3/day + LLSP 0-2/day scaled to budget tier | Stack §LL allocation (top-N × longest-wait rule) |
| SOLV-05 | Meals: table-service as hard constraints, quick-service in rides-free windows | Pattern 3 (meal insertion after ride pin) |
| SOLV-06 | Parades/fireworks/shows as optional scored blocks | Same scoring function; `showType` from schema |
| SOLV-07 | Child fatigue: toddler peak 12:30-14:00, young kids 13:00-15:00; rest blocks scale with age distribution + tier | Algorithm §Fatigue model (age-bracket weighted rest insertion) |
| SOLV-08 | DAS constraint: when `trip.has_das === true`, DAS return windows modeled as LL-equivalent resource | Algorithm §DAS-as-LL (same `Resource` pool, different label + narrative) |
| SOLV-09 | On-property Early Entry (+30 min), Extended Evening Hours for Deluxe/Deluxe Villa | Algorithm §Park-hour expansion based on `trip.lodgingType` |
| SOLV-10 | Budget tier rules (Pixie/Fairy/Royal) control LL + rest + dining tier | Stack §Budget tier constants in `packages/solver/src/rules.ts` (NOT `packages/content` — tier rules are algorithm, not catalog) |
| SOLV-11 | Deterministic: same input → byte-identical `DayPlan[]`; `solver_input_hash` caches | Pattern 4 (canonical JSON + SHA-256 hash); no `Math.random`, no `Date.now` |
| SOLV-12 | Snapshot test suite: 6 fixture trips | Vitest `toMatchSnapshot()`; see Validation Architecture |
| SOLV-13 | Walking graph preloaded from PG + PostGIS into process memory at worker startup | Pattern 5 (Floyd-Warshall on `Map<nodeId, Map<nodeId, seconds>>` at `onModuleInit`); 32 edges → O(V³) trivial |
| LLM-01 | `NarrativeModule` sends solver output + trip context to Claude; returns intro + per-item tips + budget hacks + contingency + packing delta | Stack §Anthropic SDK + structured output |
| LLM-02 | Anthropic prompt caching: static catalog context before cache boundary, dynamic after; `cache_control` header correct | Pattern 6 (ephemeral 5-min cache; 1024-token minimum; up to 4 breakpoints) |
| LLM-03 | Sonnet (pinned ID) for initial; Haiku (pinned ID) for rethink + free-tier teaser narration | Stack §Model IDs `claude-sonnet-4-6` / `claude-haiku-4-5` |
| LLM-04 | Zod-validated structured output; narrative never references ride not in solver output | Pattern 7 (extract ride ID set → validate ⊆ solver item IDs) |
| LLM-05 | `llm_costs` row per call: `trip_id`, `plan_id`, `model`, `input_tok`, `cached_read_tok`, `output_tok`, `usd_cents`, `created_at` | Stack §Cost calculation from `usage` block of Messages response |
| LLM-06 | Sentry alert when cache hit rate `cached_read_tok / input_tok` drops below 70% over 1-hour window | Pattern 8 (rolling query of `llm_costs` in background cron) |
| LLM-07 | Per-trip lifetime $0.50 circuit breaker; Sonnet→Haiku fallback; 402 with resetOptions | Locked decisions; emits to 3 sinks (Sentry, Slack, `llm_cost_incidents`) |
| LLM-08 | 15/day unlocked, 5/day free-tier rethink cap | Pattern 9 (Redis `INCR` + `EXPIRE` at UTC day boundary) |
| PLAN-01 | `POST /trips/:id/generate-plan` enqueues BullMQ job, returns 202 with `{ plan_job_id }`; never synchronous | Stack §BullMQ processor pattern (copy from `QueueTimesProcessor`) |
| PLAN-02 | `GET /plans/:id` with entitlement projection: free = Day 1 items + blurred Days 2+ | Locked decision: discriminated union; projection runs in controller based on `trips.entitlement_state` |
| PLAN-03 | Job: load trip → hydrate (catalog, walking graph, forecasts, weather) → solve → narrate → persist → update `trips.plan_status` | Pattern 10 (orchestration with explicit phases + timing budget guardrails) |
| PLAN-04 | `POST /trips/:id/rethink-today` takes `{ current_time, completed_item_ids, active_ll_bookings }`; regenerates remaining day with Haiku | Locked decision: Haiku writes intro only |
| PLAN-05 | Free-tier: 3 free plans/lifetime per anonymous user; enforced in middleware | Pattern 9 (Redis `plans_generated:{user_id}` counter, no expiry) |
| PLAN-06 | Packing list per plan: solver + weather + temperature + guest ages; affiliate tag rewritten server-side at read time | Pattern 11 (derived from plan + weather; stored in `packing_list_items` table); affiliate rewrite happens at `GET /plans/:id` serialization |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.65.0` (install in Wave 0 — **not yet in `apps/api/package.json`**) | Claude Messages API client; prompt caching; token usage reporting | Official SDK; natively supports `cache_control` breakpoints, streaming, structured output |
| `zod` | `4.3.6` (already installed) | Runtime validation of Claude narrative response | Shared across monorepo; `nestjs-zod` integration present |
| `bullmq` | `5.73.1` (installed) | Async plan-generation job queue | Phase 2 pattern; `@nestjs/bullmq` 11 wiring established |
| `drizzle-orm` | `0.45.2` (installed) | Postgres queries (forecast buckets, plan persistence, cost logs) | Phase 1 schema + Phase 2 `postgres-js` execute pattern already proven |
| `ioredis` | `^5.0.0` (installed) | Rate-limit counters, (already live wait cache from Phase 2) | Existing `REDIS_CLIENT_TOKEN` global from `SharedInfraModule` |
| `@sentry/nestjs` | `10.47.0` (installed) | LLM circuit-breaker exception capture, low-cache-hit-rate alerts | Phase 2 pattern; `Sentry.captureException` with tags |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-holidays` | `^3.23.x` | US federal holidays enumeration for `calendar-rules.ts` | Lightweight, zero-deps, no API calls — suits "keep light" constraint |
| `js-yaml` | existing | Parse `attractions.yaml` additions (`baseline_wait_minutes`, `lightning_lane_type`, `is_headliner`) | Phase 1 `@wonderwaltz/content` already uses it |
| `uuidv7` | `^0.6.0` (installed) | Deterministic-ish IDs where new rows needed; NOT for `plan_items.id` inside solver output (solver must emit stable IDs derived from content hash) | Already in package |
| Node built-in `crypto.createHash('sha256')` | - | `solver_input_hash` computation | No new dep needed; canonical JSON serialization required first |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `date-holidays` | Hand-rolled federal holiday table | Self-maintained date math on Easter, MLK Day floating dates is error-prone; `date-holidays` is small and battle-tested |
| `@anthropic-ai/sdk` | Direct `fetch` to Messages API | SDK handles streaming, retries, error typing, `cache_control` schema; no reason to hand-roll |
| SHA-256 of JSON | MD5 / fnv1a | SHA-256 is fast enough (sub-ms at this scale) and collision-safe for cache keys |
| Floyd-Warshall all-pairs | Per-query Dijkstra | 32 edges × V³ is <1ms precomputed once; lookups become O(1) Map access. Dijkstra is overkill for this size |

**Installation (Wave 0):**
```bash
pnpm --filter @wonderwaltz/api add @anthropic-ai/sdk
pnpm --filter @wonderwaltz/api add date-holidays
```

## Architecture Patterns

### Recommended Project Structure

```
packages/solver/src/
├── index.ts             # public: solve(SolverInput): DayPlan[]
├── types.ts             # SolverInput, DayPlan, PlanItem, Resource types
├── rules.ts             # budget-tier constants (Pixie/Fairy/Royal rule tables)
├── score.ts             # score function — pure, snapshot-tested
├── construct.ts         # greedy + must-do hard pinning
├── localSearch.ts       # adjacent-pair swap
├── fatigue.ts           # age-bracket → rest-block insertion
├── resources.ts         # LLMP/LLSP/DAS Resource pool (shared allocator)
├── walkingGraph.ts      # load + Floyd-Warshall + shortestPath(nodeA, nodeB): seconds
├── hash.ts              # canonicalJson + sha256 → solver_input_hash
└── __fixtures__/        # 6 canonical fixture inputs + snapshots

apps/api/src/
├── forecast/
│   ├── forecast.module.ts
│   ├── forecast.service.ts       # predictWait(rideId, ts): { minutes, confidence }
│   └── calendar.service.ts       # crowd bucket from date + crowd_calendar table
├── narrative/
│   ├── narrative.module.ts
│   ├── narrative.service.ts      # callClaude() + Zod validate + retry-once
│   ├── prompt.ts                 # static cached prefix builder (catalog + BRAND)
│   ├── schema.ts                 # Zod schema for narrative response
│   └── cost.ts                   # cost calc from usage block + llm_costs insert
├── plan-generation/
│   ├── plan-generation.module.ts
│   ├── plan-generation.processor.ts  # BullMQ processor (mirror QueueTimesProcessor)
│   ├── plan-generation.service.ts    # orchestration: hydrate→solve→narrate→persist
│   └── circuit-breaker.service.ts    # per-trip spend check + 3-sink alerting
├── plans/
│   ├── plans.module.ts
│   ├── plans.controller.ts           # GET /v1/plans/:id with entitlement projection
│   └── plans.service.ts              # projection logic (Full vs Locked)
└── trips/
    └── trips.controller.ts           # fill in generatePlan + rethinkToday bodies

packages/content/wdw/
├── calendar-rules.ts                # pure rule engine: (date) → crowd bucket (before DB override)
├── attractions.yaml                 # + baseline_wait_minutes, lightning_lane_type, is_headliner
└── brand-voice.ts                   # BRAND guide text as literal — stable byte-identical for cache

packages/db/migrations/
├── 0007_crowd_calendar.sql
├── 0008_llm_cost_incidents.sql
├── 0009_trips_current_plan_id_and_budget.sql
└── 0010_plans_solver_input_hash_index.sql
```

### Pattern 1: ForecastModule bucketed median query

**What:** Query `wait_times_1h` (Timescale continuous aggregate from Phase 2 DATA-03) bucketed by `(ride_id, dow, hour, crowd_bucket)`, return median with confidence label.

**When to use:** Every call inside the solver's `wait_cost` calculation.

**Example:**
```typescript
// apps/api/src/forecast/forecast.service.ts
async predictWait(rideId: string, targetTs: Date): Promise<{ minutes: number; confidence: 'high' | 'medium' | 'low' }> {
  const dow = targetTs.getUTCDay();
  const hour = targetTs.getUTCHours();
  const bucket = await this.calendarService.getCrowdBucket(targetTs);

  // Use percentile_cont on continuous aggregate — Timescale handles the rollup
  const sql = `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_minutes) AS p50,
      COUNT(*) AS sample_count,
      MAX(bucket_ts) AS latest_ts
    FROM wait_times_1h
    WHERE ride_id = $1
      AND EXTRACT(DOW FROM bucket_ts)  = $2
      AND EXTRACT(HOUR FROM bucket_ts) = $3
      AND crowd_bucket = $4
  `;
  const rows = (await this.db.execute(sql, [rideId, dow, hour, bucket])) as unknown as Row[];
  const { p50, sample_count, latest_ts } = rows[0] ?? {};

  if (!p50 || sample_count < 50) {
    // Fallback: attractions.baseline_wait_minutes
    const baseline = await this.getBaselineWait(rideId);
    return { minutes: baseline, confidence: 'low' };
  }

  const weeksOfData = weeksBetween(earliestTs, latest_ts);
  const confidence = weeksOfData >= 8 && sample_count > 50 ? 'high'
                   : weeksOfData >= 4 ? 'medium' : 'low';
  return { minutes: Math.round(p50), confidence };
}
```

**Notes:**
- Drizzle `postgres-js` returns `RowList` NOT `{ rows: [] }` — use `(await db.execute<T>(...)) as unknown as T[]` (Phase 2 lesson).
- Memoize per-plan-generation run (same `(ride, target_ts)` may be queried twice during local search).
- Add composite index `wait_times_history (ride_id, bucket_ts)` if query plan shows sequential scan — existing `(ride_id, ts DESC)` index should be sufficient but verify with `EXPLAIN ANALYZE` during Wave 0.

### Pattern 2: Confidence label computation

Confidence = min over inputs (weeks-of-history, sample-count). Both must clear the bar:

| Confidence | Weeks of history | Sample count |
|------------|------------------|--------------|
| `high` | ≥ 8 | > 50 |
| `medium` | 4–8 | > 50 |
| `low` | < 4 OR ≤ 50 samples | any |

Implementation: compute `weeksOfData = ceil((now - earliest_ts) / 7 days)` in the same query; degrade to lower label on either axis.

### Pattern 3: Solver construction (greedy with must-do pinning)

```typescript
// packages/solver/src/construct.ts
export function constructDay(input: DayInput): DayPlan {
  const park = input.park;
  const dayStart = applyEarlyEntryBonus(input.parkHours.open, input.lodging);
  const dayEnd = applyExtendedEveningBonus(input.parkHours.close, input.lodging);

  // 1. Place must-dos as HARD PINS in their optimal windows
  const mustDoBlocks = pinMustDos(input.preferences.mustDoAttractionIds, input.forecasts);

  // 2. Reserve meal slots (table-service = hard, quick-service = flexible)
  const mealBlocks = scheduleMeals(input.guests, input.preferences.budgetTier);

  // 3. Reserve fatigue rest blocks
  const restBlocks = scheduleFatigueRests(input.guests, input.preferences.budgetTier);

  // 4. Allocate LL resources (top-N scored filter, then longest-wait assignment)
  const llAllocations = allocateLightningLanes(
    scoreAll(input.candidates),
    input.preferences.budgetTier,
    input.guests,  // DAS check flips single pool shape
  );

  // 5. Greedy fill: sort remaining candidates by score DESC, insert into gaps
  const items = greedyFill([...mustDoBlocks, ...mealBlocks, ...restBlocks, ...llAllocations], input);

  return { dayIndex: input.dayIndex, parkId: park.id, items };
}
```

### Pattern 4: Deterministic hashing (SOLV-11)

```typescript
// packages/solver/src/hash.ts
import { createHash } from 'node:crypto';

export function solverInputHash(input: SolverInput): string {
  const canonical = canonicalJson(stripForecasts(input));  // drop forecasts — not part of hash
  return createHash('sha256').update(canonical).digest('hex');
}

function canonicalJson(value: unknown): string {
  // Sort ALL object keys recursively; arrays preserve order (guest order is meaningful).
  // Dates → ISO 8601 UTC (no local timezone leakage). Numbers → raw; booleans → raw.
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const keys = Object.keys(value as object).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((value as any)[k])).join(',') + '}';
}
```

**Pitfalls guarded against:** (a) key order drift across Node versions, (b) local timezone in `Date.toString()`, (c) `undefined` vs missing-key ambiguity — normalize to missing.

### Pattern 5: Walking graph preload + all-pairs shortest path

```typescript
// packages/solver/src/walkingGraph.ts  (pure — no NestJS)
export type WalkingGraph = { shortest(a: string, b: string): number };

export function buildWalkingGraph(edges: { from: string; to: string; seconds: number }[]): WalkingGraph {
  const nodes = [...new Set(edges.flatMap(e => [e.from, e.to]))].sort();
  const N = nodes.length;
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const dist: number[][] = Array.from({ length: N }, () => Array(N).fill(Infinity));
  for (let i = 0; i < N; i++) dist[i][i] = 0;
  for (const e of edges) {
    const i = idx.get(e.from)!, j = idx.get(e.to)!;
    dist[i][j] = Math.min(dist[i][j], e.seconds);
    dist[j][i] = Math.min(dist[j][i], e.seconds);  // graph is undirected
  }
  // Floyd-Warshall: O(N³) — N ≤ ~32, so ~32k ops, sub-millisecond
  for (let k = 0; k < N; k++)
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  return {
    shortest: (a, b) => {
      const i = idx.get(a), j = idx.get(b);
      if (i === undefined || j === undefined) return Infinity;
      return dist[i][j];
    },
  };
}
```

**Worker startup:** `PlanGenerationProcessor.onModuleInit()` loads `walking_graph` rows from Postgres once, builds graph, caches in a module-scoped variable. Reloaded only on process restart.

### Pattern 6: Anthropic prompt caching

```typescript
// apps/api/src/narrative/narrative.service.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

const CACHED_PREFIX = buildCachedPrefix();  // catalog JSON + BRAND guide — literal string, stable bytes

async function callClaude(solverOutput: DayPlan[], guests: Guest[], model: string) {
  const resp = await client.messages.create({
    model,  // 'claude-sonnet-4-6' or 'claude-haiku-4-5'
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: CACHED_PREFIX,  // must be ≥1024 tokens to be cacheable
        cache_control: { type: 'ephemeral' },  // 5-min TTL, refreshes on hit
      },
    ],
    messages: [
      { role: 'user', content: buildDynamicSuffix(solverOutput, guests) },
    ],
  });
  // usage: { input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens }
  await logLlmCost(resp.usage, model, tripId, planId);
  return resp.content;
}
```

**Cache correctness rules:**
- `CACHED_PREFIX` must be **byte-stable** — any whitespace drift invalidates cache. Keep as a literal template string with no date/uuid interpolation.
- Must be ≥ 1024 tokens for Sonnet 4.x / Haiku 4.x (1024-token minimum).
- Up to 4 breakpoints allowed. Plan 3 uses 1 (end of system block).
- Ephemeral TTL = 5 minutes default; refreshed each hit. 1-hour cache tier available if hit rate stalls, but 5-min suits the plan generation cadence.

### Pattern 7: Zod narrative schema + contract test (LLM-04)

```typescript
// apps/api/src/narrative/schema.ts
export const NarrativeSchema = z.object({
  days: z.array(z.object({
    day_index: z.number().int().nonnegative(),
    intro: z.string().min(20).max(400),
    items: z.array(z.object({
      item_id: z.string().uuid(),
      tip: z.string().min(10).max(200),
    })),
    contingency: z.string().max(300).optional(),
  })),
  budget_hacks: z.array(z.string().max(200)).max(5),
  packing_delta: z.array(z.string().max(100)).max(10),
});

// Contract test: narrative.item_id MUST ⊆ solver.plan_item_ids
function validateAgainstSolver(narrative: Narrative, solverItemIds: Set<string>): Result {
  const bad: string[] = [];
  for (const day of narrative.days)
    for (const it of day.items)
      if (!solverItemIds.has(it.item_id)) bad.push(it.item_id);
  return bad.length === 0 ? { ok: true } : { ok: false, invalidRefs: bad };
}
```

**Retry protocol:** On Zod fail OR contract-test fail → retry once with a system-message nudge ("Return ONLY items whose `item_id` appears in `solver_output.items[].id`"). On second failure → persist plan with `narrative_available: false`, log `llm_cost_incidents` entry of type `narrative_abandoned`.

### Pattern 8: Cache hit rate rolling alert (LLM-06)

Background job runs every 5 minutes:
```sql
SELECT SUM(cached_read_tok)::float / NULLIF(SUM(input_tok), 0) AS hit_rate
FROM llm_costs
WHERE created_at > NOW() - INTERVAL '1 hour';
```
If `hit_rate < 0.70` AND sample count > 20 (avoid early-startup false alarms), fire `Sentry.captureMessage('llm cache hit rate <70%')` with level=warning.

### Pattern 9: Redis rate limiter (LLM-08, PLAN-05)

```typescript
const key = `rethink_day:${userId}:${utcDate}`;   // or `plans_generated:${userId}` for PLAN-05
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 86400);   // 24h TTL — PLAN-05 lifetime counter skips expire
if (count > CAP) throw new HttpException('rate_limit_exceeded', 429);
```

### Pattern 10: PlanGenerationProcessor orchestration with phase budgets

```typescript
async process(job: Job<{ tripId: string }>): Promise<PlanResult> {
  const t0 = Date.now();
  await job.updateProgress({ phase: 'hydrate', pct: 0 });

  const hydrated = await this.hydrate(job.data.tripId);  // target: ≤3s
  this.assertBudget(t0, 3000, 'hydrate');

  await job.updateProgress({ phase: 'solve', pct: 20 });
  const plan = await this.solver.solve(hydrated);        // target: ≤15s
  this.assertBudget(t0, 18000, 'solve');

  // Cache hit? return early without narrative cost.
  const hash = solverInputHash(hydrated);
  const existing = await this.findPlanByHash(hydrated.tripId, hash);
  if (existing) return this.persist(plan, existing.narrative, /* reused */ true);

  await job.updateProgress({ phase: 'narrate', pct: 60 });
  const narrative = await this.narrative.generate(plan, hydrated);  // target: ≤10s
  this.assertBudget(t0, 28000, 'narrate');

  await job.updateProgress({ phase: 'persist', pct: 90 });
  const result = await this.persist(plan, narrative, false);
  await job.updateProgress({ phase: 'done', pct: 100 });
  return result;
}
```

**`returnvalue` vs DB write:** Persist to DB (durable). BullMQ `returnvalue` holds only `{ plan_id, job_id, status }` for UI polling from `plans.controller.ts` via job-event subscription (Phase 5 concern).

### Pattern 11: Packing list generation (PLAN-06)

Derive from plan + weather forecast + guest ages via rule table in `packages/content/wdw/packing-rules.ts`:
```typescript
// Pure function. Deterministic.
generatePackingList(plan: Plan, weather: DailyWeather[], guests: Guest[]): PackingItem[]
```
Affiliate rewrite: at `GET /plans/:id` serialization time, wrap Amazon URL with `?tag=${AMZ_AFFILIATE_TAG}`. Tag never appears in DB, never sent in job data.

### Anti-Patterns to Avoid

- **`Math.random()` or `Date.now()` inside solver** — breaks snapshot determinism. Use only the `SolverInput` for entropy.
- **String-concatenating JSON for the cached prefix** — drift-prone. Use a literal template.
- **`INSERT` for `llm_costs` happening after `Claude` call inside a try-without-catch** — if narrative fails but tokens were consumed, the bill is still real. Always log `llm_costs` in a `finally`.
- **Running solver inside the HTTP process** — PLAN-01 requires 202 async. Only the worker calls `solve()`.
- **Mutating `attractions.yaml` via admin UI in Phase 3** — YAML is source-controlled. Only `crowd_calendar` is DB-editable this phase.
- **Querying walking_graph per `walkCost` call** — the graph is 32 edges; preload at `onModuleInit`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| US federal holiday enumeration | Custom holiday table with Easter/MLK floating-date math | `date-holidays` NPM (small, zero-deps) | Floating holidays (Thanksgiving = 4th Thu, MLK = 3rd Mon, Easter = Computus) are error-prone |
| SHA-256 hashing | Custom murmur/fnv implementation | Node `crypto.createHash('sha256')` | Built-in, fast, stable across Node versions |
| Canonical JSON | `JSON.stringify()` alone | Sorted-keys recursive canonicalizer (Pattern 4) | JSON.stringify preserves insertion order — drifts across code paths |
| Claude API HTTP requests | Direct `fetch` with `cache_control` JSON | `@anthropic-ai/sdk` | Usage reporting, error types, streaming handled |
| Token counting / cost calc | Custom tokenizer to estimate tokens | Read `response.usage` fields and apply price table | The SDK returns actual billed tokens including cache_read/create |
| Timezone math in crowd calendar | `new Date(y, m, d)` and hope | `Temporal` API polyfill or UTC-normalized strings | US holidays observed in ET (park timezone); server may be UTC |
| Shortest-path algorithm | Per-query BFS | Precomputed Floyd-Warshall (Pattern 5) | 32 edges × 32³ = ~32k ops once at startup; O(1) per query after |
| Rate-limit counter | In-memory Map | Redis INCR + EXPIRE | Worker + API are separate processes; must share state |

**Key insight:** Phase 3 is mostly glue between proven primitives (SDK, DB queries, BullMQ). The novel logic is the solver scoring + must-do pinning + LL allocation — resist the urge to also hand-roll the infrastructure underneath.

## Common Pitfalls

### Pitfall 1: Cache prefix byte drift

**What goes wrong:** Cache hit rate stays at 0% even though the "same" prompt is sent.
**Why it happens:** A trailing space, ISO 8601 millisecond precision, locale-sensitive number formatting, or `JSON.stringify` key-order drift changes the prefix by 1 byte → full cache miss.
**How to avoid:** Compute `CACHED_PREFIX` **once at module init**, store in a module-scoped `const`. Never interpolate dynamic values into it. Add a test `expect(sha256(CACHED_PREFIX)).toBe('<locked-hash>')` so drift fails CI.
**Warning signs:** `cache_read_input_tokens: 0` on the second call of the same worker process.

### Pitfall 2: Forecast query misuse of `wait_times_history` instead of `wait_times_1h`

**What goes wrong:** `predictWait()` scans the raw hypertable per call; 200ms → 2s latency. With a 15s solver budget and hundreds of `wait_cost` evaluations, this alone blows the SLO.
**Why:** Devs forget the continuous aggregate exists (Phase 2 DATA-03).
**How to avoid:** Query `wait_times_1h` exclusively. Add an EXPLAIN ANALYZE in the FC-04 tests to fail CI on seq-scan.
**Warning signs:** Solver runtime creeping above 10s on a warm cache.

### Pitfall 3: Non-deterministic solver due to implicit `Map` iteration order

**What goes wrong:** Snapshot tests pass locally, fail in CI (different Node minor version).
**Why:** `Map.entries()` preserves insertion order which depends on construction path. Two equivalent inputs that construct the Map differently produce different outputs.
**How to avoid:** At every boundary where the solver emits an ordered list, sort explicitly by a total order (e.g., `sortBy(id)` then by `score DESC`). Write a "determinism harness" helper that runs the solver twice and deep-equals.

### Pitfall 4: LLM circuit breaker races

**What goes wrong:** Two concurrent plan generations for the same trip both check `spent < budget`, both pass, both spend — trip goes $0.20 over.
**Why:** Read-check-write without atomicity.
**How to avoid:** Either (a) serialize plan generation per trip via a per-trip BullMQ queue name, or (b) use `SELECT ... FOR UPDATE` on `trips.llm_budget_cents` inside a transaction that also inserts the projected `llm_costs` row. Prefer (a) — simpler, Phase 3 already has per-trip async semantics.
**Warning signs:** `spent_cents > budget_cents` in `llm_cost_incidents` log.

### Pitfall 5: Zod schema drift from Claude model updates

**What goes wrong:** Sonnet 4.6 → 4.7 silently rephrases output structure; Zod fails; narrative silently disabled.
**Why:** Model pinning is by version string but behavior can shift on `-latest` aliases.
**How to avoid:** Pin exact dated model IDs (`claude-sonnet-4-6`, `claude-haiku-4-5`) — NOT `-latest`. Add a nightly smoke test that calls Claude with a fixture input and validates the response.

### Pitfall 6: YAML schema additions not propagated to seed script

**What goes wrong:** Migration adds `baseline_wait_minutes` column; seed script does not read it; solver gets `null` fallback; all low-confidence rides get 0 wait; plan looks absurdly optimistic.
**Why:** Content package + seed script are in different packages; reviewer missed one side.
**How to avoid:** Wave 0 includes a single task that adds all three YAML fields (`baseline_wait_minutes`, `lightning_lane_type`, `is_headliner`) AND updates the seed script AND the Drizzle schema. Task-plan should explicitly list all three files.

### Pitfall 7: `solver_input_hash` includes volatile fields

**What goes wrong:** Hash changes between identical-intent generations because `preferences.mealPreferences` has different array order, or `createdAt` timestamps leak in.
**Why:** "Trip" data model has both user-meaningful fields and server metadata.
**How to avoid:** Define a `CanonicalSolverInput` view that strips `createdAt`, `updatedAt`, `id` fields from guests (they're client-derived anyway in Phase 3), and sorts array members where order is semantically irrelevant (mealPreferences tags).

### Pitfall 8: Narrative references a ride removed by local search

**What goes wrong:** Solver swaps order, one ride drops out. Claude narrative still describes it. Contract test catches it; retry-once burns another call; final abandon → no narrative.
**Why:** Narrative prompt built from pre-local-search plan.
**How to avoid:** Narrative generation takes the **final** `DayPlan[]` after local search + LL allocation — never the intermediate construction output.

## Code Examples

### Registering the plan-generation BullMQ processor

```typescript
// apps/api/src/plan-generation/plan-generation.processor.ts
@Processor('plan-generation', {
  concurrency: 2,
  settings: { backoffStrategy: (n) => Math.min(n * 5000, 30000) },
})
export class PlanGenerationProcessor extends WorkerHost {
  constructor(
    private readonly planService: PlanGenerationService,
    private readonly slackAlerter: SlackAlerterService,  // reused from Phase 2
  ) { super(); }

  async process(job: Job): Promise<PlanResult> {
    return this.planService.generate(job);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    const max = job.opts.attempts ?? 1;
    if (job.attemptsMade >= max) {
      Sentry.captureException(err, { tags: { queue: 'plan-generation', jobId: String(job.id), tripId: job.data.tripId } });
      await this.slackAlerter.sendDeadLetter('plan-generation', String(job.id), err.message);
    }
  }
}
```

### Anthropic cost calculation from `usage`

```typescript
// apps/api/src/narrative/cost.ts
const PRICE_TABLE = {
  'claude-sonnet-4-6': { input: 300, cachedRead: 30, cacheWrite: 375, output: 1500 },   // ¢ per M tokens ×100
  'claude-haiku-4-5':  { input: 100, cachedRead: 10, cacheWrite: 125, output: 500 },
};

export function computeUsdCents(usage: Usage, model: keyof typeof PRICE_TABLE): number {
  const p = PRICE_TABLE[model];
  const fractional =
    (usage.input_tokens - (usage.cache_read_input_tokens ?? 0) - (usage.cache_creation_input_tokens ?? 0)) * p.input
    + (usage.cache_read_input_tokens ?? 0) * p.cachedRead
    + (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite
    + usage.output_tokens * p.output;
  return Math.ceil(fractional / 1_000_000 / 100);  // convert ¢×100 per Mtok → total ¢
}
```
**Verify against Anthropic's billed amount in the dashboard during Wave 3** — pricing drift is the #1 source of telemetry skew.

### Vitest snapshot for solver fixture

```typescript
// packages/solver/src/__fixtures__/toddler-mk.test.ts
import { solve } from '../index.js';
import toddlerMkInput from './toddler-mk.input.json';

test('single-day MK with toddler — deterministic', () => {
  const out1 = solve(toddlerMkInput);
  const out2 = solve(toddlerMkInput);
  expect(out1).toEqual(out2);                 // SOLV-11
  expect(out1).toMatchSnapshot();             // SOLV-12
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude 3.5 Sonnet | Sonnet 4.6 (`claude-sonnet-4-6`) | Feb 2026 | Same pricing as 4.5 ($3/$15 per Mtok); better instruction following — worth upgrade |
| Prompt caching on system text only | `cache_control` on system OR user messages, up to 4 breakpoints | Mid-2025 | Plan 3 only needs 1 breakpoint — simplifies implementation |
| Manual cache hit tracking | `usage.cache_read_input_tokens` / `cache_creation_input_tokens` returned natively | 2025 | Direct feed into `llm_costs` columns |
| 2-opt / or-opt local search | Adjacent-pair swap (Phase 3 decision) | Phase 3 scope | Simpler, snapshot-stable, fast; revisit post-v1 if fixture quality demands |

**Deprecated/outdated:**
- `-latest` alias model IDs — discouraged for prod; pin dated IDs.
- Claude 3.x models — superseded by 4.x; do not target.

## Open Questions

1. **Anthropic SDK version**
   - What we know: `@anthropic-ai/sdk` is NOT currently in `apps/api/package.json` (verified via grep 2026-04-15). Phase 3 CONTEXT states it "already is".
   - What's unclear: Whether it was added in an uncommitted branch or CONTEXT was optimistic.
   - Recommendation: Wave 0 task — install latest stable (`^0.65.x` or current at plan time); do not assume presence.

2. **Queue-times catalog ID gap**
   - What we know: `.planning/todos/pending/fix-queue-times-catalog-ids.md` — only 2 of 4 parks ingesting from Phase 2.
   - What's unclear: Whether to fix as Phase 3 Wave 0 task or defer.
   - Recommendation: Include a Wave 0 task to fix catalog IDs. Phase 3's forecast quality depends on all 4 parks having buckets — two missing parks means solver falls back to `baseline_wait_minutes` for half the catalog, undermining the whole point of the bucketed-median design.

3. **DAS operational details (already flagged in STATE.md)**
   - What we know: Disney's current DAS flow uses video chat application pre-trip; return windows behave like LL.
   - What's unclear: Exact return window duration (is it the old 60-min or now flexible?); whether DAS counts against LLMP quota or is separate.
   - Recommendation: Model DAS as a **separate `Resource` pool** (same allocator type as LL, different budget). Narrative text explaining DAS is the user-facing copy; keep it factual and link to Disney's official DAS page. Verify return-window math against Disney's current published DAS FAQ during Wave 1.

4. **TimescaleDB `percentile_cont` on continuous aggregate**
   - What we know: Continuous aggregates support standard aggregates; `percentile_cont` is a Postgres ordered-set aggregate.
   - What's unclear: Whether the specific `wait_times_1h` aggregate pre-computes percentiles or whether we must query the underlying hypertable.
   - Recommendation: Inspect `wait_times_1h` DDL (migration 0002) in Wave 0. If it only stores `avg_minutes`, we have two choices: (a) query the hypertable directly bounded by time range, (b) add a second continuous aggregate that stores percentiles. Prefer (a) for Phase 3 with a hard-capped time window (last 90 days); evaluate (b) if p95 latency misses the solver budget.

5. **Model ID stability**
   - What we know: `claude-sonnet-4-6` and `claude-haiku-4-5` are current (verified 2026-04-15).
   - What's unclear: Anthropic's deprecation schedule for 4.x models.
   - Recommendation: Store model IDs as environment variables (`ANTHROPIC_SONNET_MODEL`, `ANTHROPIC_HAIKU_MODEL`) with code defaults. Allows bumping without code change.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 (already installed in `apps/api`, `packages/solver`, `packages/content`) |
| Config file | `apps/api/vitest.config.mts`, `packages/solver/vitest.config.ts` (Wave 0 — not yet present) |
| Quick run command | `pnpm --filter @wonderwaltz/solver test && pnpm --filter @wonderwaltz/api test -- --run` |
| Full suite command | `pnpm -r test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FC-01 | `predictWait(rideId, ts)` returns `{minutes, confidence}` from bucketed median | unit + integration | `pnpm --filter @wonderwaltz/api test -- forecast.service` | ❌ Wave 0 |
| FC-02 | Crowd bucket derived from rule engine + DB override | unit | `pnpm --filter @wonderwaltz/content test -- calendar-rules` | ❌ Wave 0 |
| FC-03 | Confidence label computed from weeks-of-history × sample-count matrix | unit | `pnpm --filter @wonderwaltz/api test -- forecast.confidence` | ❌ Wave 0 |
| FC-04 | Forecast accuracy fixtures for canonical ride/day combos | unit (fixture) | `pnpm --filter @wonderwaltz/api test -- forecast.fixtures` | ❌ Wave 0 |
| FC-05 | `meta.forecast_disclaimer: "Beta Forecast"` emitted when any plan bucket is `low` | integration | `pnpm --filter @wonderwaltz/api test -- plans.controller.beta-forecast` | ❌ Wave 0 |
| SOLV-01 | `solve(SolverInput): DayPlan[]` exported from `@wonderwaltz/solver`; zero NestJS imports | typecheck + unit | `pnpm --filter @wonderwaltz/solver typecheck && vitest run` | ❌ Wave 0 |
| SOLV-02 | Filter rules: height/mobility/sensory/dietary eliminate ineligible candidates | unit | `pnpm --filter @wonderwaltz/solver test -- filter` | ❌ Wave 0 |
| SOLV-03 | Greedy construction pins must-dos first, then fills by score | unit | `pnpm --filter @wonderwaltz/solver test -- construct` | ❌ Wave 0 |
| SOLV-04 | LLMP ≤3/day, LLSP 0/0-1/0-2 per tier | unit | `pnpm --filter @wonderwaltz/solver test -- resources.ll` | ❌ Wave 0 |
| SOLV-05 | Table-service meals = hard pins; quick-service in rides-free windows | unit | `pnpm --filter @wonderwaltz/solver test -- meals` | ❌ Wave 0 |
| SOLV-06 | Parades/fireworks/shows scored as optional blocks | unit | `pnpm --filter @wonderwaltz/solver test -- shows` | ❌ Wave 0 |
| SOLV-07 | Fatigue rest blocks inserted proportional to age distribution | unit | `pnpm --filter @wonderwaltz/solver test -- fatigue` | ❌ Wave 0 |
| SOLV-08 | DAS flag models return windows as LL-equivalent resource | unit | `pnpm --filter @wonderwaltz/solver test -- das` | ❌ Wave 0 |
| SOLV-09 | Early Entry (+30 min) + Extended Evening for Deluxe apply | unit | `pnpm --filter @wonderwaltz/solver test -- park-hours` | ❌ Wave 0 |
| SOLV-10 | Budget tier rules drive LL + rest + dining tier | unit | `pnpm --filter @wonderwaltz/solver test -- rules` | ❌ Wave 0 |
| SOLV-11 | Same input → byte-identical output; `solverInputHash(a) === solverInputHash(b)` | snapshot + unit | `pnpm --filter @wonderwaltz/solver test -- determinism` | ❌ Wave 0 |
| SOLV-12 | Six fixture trips produce stable snapshots | snapshot | `pnpm --filter @wonderwaltz/solver test -- __fixtures__` | ❌ Wave 0 |
| SOLV-13 | Walking graph preloaded at `onModuleInit`; `shortestPath` is O(1) per call | unit | `pnpm --filter @wonderwaltz/solver test -- walking-graph` | ❌ Wave 0 |
| LLM-01 | `NarrativeModule.generate()` returns intro + per-item tips + contingencies + packing delta | integration (with Anthropic mock) | `pnpm --filter @wonderwaltz/api test -- narrative.service` | ❌ Wave 0 |
| LLM-02 | `cache_control` placed at end of system block; prefix ≥1024 tokens; prefix byte-stable | unit | `pnpm --filter @wonderwaltz/api test -- narrative.prompt` | ❌ Wave 0 |
| LLM-03 | Model IDs pinned: `claude-sonnet-4-6` initial, `claude-haiku-4-5` rethink + free-tier | unit | `pnpm --filter @wonderwaltz/api test -- narrative.model-selection` | ❌ Wave 0 |
| LLM-04 | Zod + contract test: narrative `item_id` ⊆ solver `item.id` set; retry-once then abandon | unit + integration | `pnpm --filter @wonderwaltz/api test -- narrative.schema` | ❌ Wave 0 |
| LLM-05 | Every Anthropic call writes `llm_costs` row with all 8 columns populated | integration | `pnpm --filter @wonderwaltz/api test -- llm-costs.insert` | ❌ Wave 0 |
| LLM-06 | Background cache-hit-rate check fires Sentry when <70% over 1hr (with >20 samples) | integration | `pnpm --filter @wonderwaltz/api test -- cache-hit-rate.alert` | ❌ Wave 0 |
| LLM-07 | Circuit breaker: mid-gen Sonnet→Haiku swap; 402 on over-budget new request; 3-sink telemetry | integration | `pnpm --filter @wonderwaltz/api test -- circuit-breaker` | ❌ Wave 0 |
| LLM-08 | 15/day unlocked, 5/day free-tier rethink cap enforced via Redis | integration | `pnpm --filter @wonderwaltz/api test -- rethink.rate-limit` | ❌ Wave 0 |
| PLAN-01 | `POST /trips/:id/generate-plan` → 202 with `{plan_job_id}`; BullMQ job enqueued | integration | `pnpm --filter @wonderwaltz/api test -- trips.generatePlan` | ❌ Wave 0 |
| PLAN-02 | `GET /plans/:id` free-tier projection: Day 1 full, Days 2+ `LockedDayPlan` | integration | `pnpm --filter @wonderwaltz/api test -- plans.projection` | ❌ Wave 0 |
| PLAN-03 | Job orchestration: hydrate → solve → narrate → persist; `trips.plan_status` transitions correctly | integration | `pnpm --filter @wonderwaltz/api test -- plan-generation.processor` | ❌ Wave 0 |
| PLAN-04 | `POST /trips/:id/rethink-today` re-solves remaining with Haiku intro only | integration | `pnpm --filter @wonderwaltz/api test -- trips.rethinkToday` | ❌ Wave 0 |
| PLAN-05 | Free tier: 3 plans/lifetime per anon user; 4th call → 402/429 | integration | `pnpm --filter @wonderwaltz/api test -- plans.free-tier-limit` | ❌ Wave 0 |
| PLAN-06 | Packing list generated per plan; Amazon tag rewritten at serialization only | integration + unit | `pnpm --filter @wonderwaltz/api test -- packing-list` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter <affected-package> test -- --run` (solver unit tests alone should complete in <5s; API integration with Vitest mocks <30s).
- **Per wave merge:** `pnpm -r test` full workspace suite.
- **Phase gate:** Full suite green + six fixture snapshots stable across two consecutive runs (`pnpm --filter @wonderwaltz/solver test -- __fixtures__` twice).

### Wave 0 Gaps

- [ ] `packages/solver/vitest.config.ts` — solver test config (vitest 4.1.3 compatible)
- [ ] `packages/solver/src/__fixtures__/{toddler-mk,family-3day,adult-thrill,mobility,ecv-das,royal-5day}.input.json` — 6 canonical inputs
- [ ] `packages/solver/src/__fixtures__/__snapshots__/` — will be populated on first green run
- [ ] `apps/api/src/forecast/forecast.service.spec.ts` — fixture seeds for bucketed-median tests (with fake Timescale rows)
- [ ] `apps/api/src/narrative/narrative.service.spec.ts` — Anthropic mock harness using `vi.mock('@anthropic-ai/sdk')`
- [ ] `apps/api/tests/fixtures/anthropic-fixtures/` — canned Claude Messages responses for Zod + contract tests
- [ ] `packages/db/migrations/0007_crowd_calendar.sql`, `0008_llm_cost_incidents.sql`, `0009_trips_current_plan_id_and_budget.sql`, `0010_plans_solver_input_hash_index.sql`
- [ ] `packages/content/wdw/attractions.yaml` — add `baseline_wait_minutes`, `lightning_lane_type`, `is_headliner` to every row + update seed script
- [ ] `packages/shared-openapi/openapi.v1.snapshot.json` — amend with FullDayPlan|LockedDayPlan union + warnings + RethinkRequestDto + PlanBudgetExhaustedDto
- [ ] Install `@anthropic-ai/sdk` + `date-holidays` in `apps/api`
- [ ] Environment: `ANTHROPIC_API_KEY` in Railway worker + `.env.local` (document in `PROVISIONING_STATE.md`)

## Sources

### Primary (HIGH confidence)
- Anthropic Prompt Caching docs — https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching (1024-token minimum, 4 breakpoints, ephemeral TTL 5min / 1hr)
- Anthropic Pricing page — https://platform.claude.com/docs/en/about-claude/pricing (Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, cached-read 0.1× base input)
- Anthropic Models overview — https://platform.claude.com/docs/en/about-claude/models/overview (model IDs `claude-sonnet-4-6`, `claude-haiku-4-5`)
- Anthropic Sonnet 4.6 announcement — https://www.anthropic.com/news/claude-sonnet-4-6 (launch Feb 17 2026; backward-compatible with 4.5 API surface)
- BullMQ Workers docs — https://docs.bullmq.io/guide/workers (`updateProgress`, `returnvalue`)
- BullMQ Returning Job Data — https://docs.bullmq.io/guide/returning-job-data
- BullMQ NestJS guide — https://docs.bullmq.io/guide/nestjs (`WorkerHost` + `@Processor` pattern — matches Phase 2 `QueueTimesProcessor`)
- Existing Phase 2 code — `apps/api/src/ingestion/queue-times.processor.ts`, `apps/api/src/alerting/slack-alerter.service.ts`, `apps/api/src/shared-infra.module.ts`

### Secondary (MEDIUM confidence)
- PromptHub prompt caching comparison — https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models
- Anthropic API pricing guide 2026 — https://benchlm.ai/blog/posts/claude-api-pricing (cross-verifies Sonnet 4.6 / Haiku 4.5 rates)
- date-holidays NPM — https://www.npmjs.com/package/date-holidays (US federal holidays + configurable observed dates)
- Spring AI prompt caching blog — https://spring.io/blog/2025/10/27/spring-ai-anthropic-prompt-caching-blog/ (independent confirmation of 1024 / 2048 breakpoint minimums, 4-breakpoint limit)

### Tertiary (LOW confidence — flag for validation during Wave 1)
- Claude 4.x exact cache pricing ratio (listed widely as "0.1× base input for read, 1.25× for write") — verify in Anthropic billing console on first real call
- TimescaleDB `percentile_cont` on continuous aggregate performance — validate with EXPLAIN ANALYZE in Wave 0; may need fallback to raw hypertable query
- DAS return-window current duration (old 60-min or current flexible) — verify against WDW official DAS FAQ during Wave 1

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries pre-installed, model IDs and pricing verified against official Anthropic docs
- Architecture: **HIGH** for BullMQ/processor/solver shape (follows established Phase 2 patterns); **MEDIUM** for solver scoring calibration (will tune via fixtures)
- Pitfalls: **HIGH** — cache byte-drift, determinism, and circuit-breaker races are catalogued; derived from Phase 2 lessons plus LLM-specific known issues

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (LLM stack moves fast; revisit before Phase 4 if schedule slips past this date)
