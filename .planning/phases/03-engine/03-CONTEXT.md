# Phase 3: Engine — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A real plan can be generated end-to-end:

1. `POST /trips/:id/generate-plan` enqueues a BullMQ job, returns `202`.
2. Job loads trip + catalog + forecasts + weather → runs the pure-TS solver
   → runs Claude narrative → persists `plans` + `plan_days` + `plan_items`
   + `llm_costs` → updates `trips.plan_status`.
3. Job completes within 30 seconds.
4. `GET /plans/:id` returns a fully structured plan with narrative.
5. Free tier sees Day 1 full + locked summary cards for Days 2+.
6. `POST /trips/:id/rethink-today` re-solves the remaining day with Haiku.
7. LLM cost telemetry lives from the first call; $0.50 per-trip circuit
   breaker enforced.
8. All six solver snapshot tests pass (deterministic).

Requirements in scope: FC-01..05, SOLV-01..13, LLM-01..08, PLAN-01..06
(31 requirement IDs).

Not in this phase (explicit): authentication enforcement on endpoints
(Phase 4), IAP / entitlement mutation (Phase 4), mobile client UI for
any of these endpoints (Phase 5+), paid top-up IAP for budget extension
(Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Solver Algorithm Shape (SOLV-01..13)

**Construction (greedy):**
- Must-do attractions placed first as **hard pins** in their optimal
  time windows, then greedy fills remaining slots by score.
- Score function: `score = enjoyment_weight / (time_cost + wait_cost + walk_cost)`
  with **equal weights** (each cost multiplier = 1.0). Baseline; can
  calibrate later via fixture outcomes.

**Local search:**
- **Adjacent-pair swap only** — try swapping order of any 2 adjacent
  items in the day; keep if total score improves. No 2-opt, no
  insert/remove moves. Simpler, faster, more snapshot-stable.

**Runtime budget:**
- Solver pass must complete in **≤ 15 seconds**. This trades LLM
  headroom (leaves ~10-15s for narrative within the 30s end-to-end
  budget) against solver thoroughness. Planner must design LLM
  pipeline for concurrency / aggressive cache use.

**Determinism (SOLV-11):**
- `solver_input_hash` = hash of `{ trip, guests, preferences, date }`.
  Forecasts are NOT part of the hash — plans feel stable within a day,
  refresh naturally the next day.
- Cache storage: **DB only** via indexed `plans.solver_input_hash`
  lookup. No Redis cache layer (premature).
- Cache hit → return stored plan as-is. Zero LLM cost. User runs
  "Rethink my day" if they want fresh narrative.
- Each new hash produces a **new `plan` row** (history preserved).
  `trips.current_plan_id` tracks the active plan.

### Forecast Model (FC-01..05)

**Low-confidence fallback:**
- When confidence label is `low` (the default for the first 4 weeks
  after t=0 = 2026-04-15 16:08:01 UTC), the solver uses a
  **hardcoded `baseline_wait_minutes`** from `attractions.yaml`
  instead of the empty/noisy bucketed-median forecast.
- Solver penalizes `low`-confidence buckets with `wait_cost × 1.2` —
  small nudge away from unreliable data.

**Crowd calendar (FC-02):**
- Hybrid: **rule-based defaults** (weekends, federal holidays, school
  breaks derived at runtime) + **DB override table** (`crowd_calendar`
  with `(date, bucket, reason)`) for manual admin overrides.
- `packages/content/wdw/calendar-rules.ts` — pure rule engine.
- `crowd_calendar` table seeded empty; admin (Phase 8) adds exceptions.

**Confidence label surfacing:**
- Always included on every forecasted wait returned by
  `ForecastModule.predictWait()`.
- Client UI renders `low` as "Beta Forecast" framing until 8+ weeks
  of history exist for that ride/bucket.

### LLM Prompt & Caching (LLM-01..08)

**Cache boundary (LLM-02):**
- **Cached prefix (~5-8K tokens):** WDW catalog (all 51 attractions
  with heights/tags, 38 dining, 30 resorts) + BRAND voice guide with
  examples + tone rules.
- **Dynamic suffix:** guest context + solver output for the specific trip.
- Target cache hit rate: ≥ 70% (LLM-06 alert threshold).

**Model selection (LLM-03):**
- **Sonnet** for initial plan generation.
- **Haiku** for "Rethink my day" AND as fallback when Sonnet budget is
  exhausted mid-generation.

**Zod validation (LLM-04):**
- Narrative output validated against Zod schema.
- Narrative never references a ride not present in the solver output
  (contract test).
- On validation failure: **retry once, then persist plan with empty
  narrative** + `narrative_available: false` flag. Plan is still usable;
  client surfaces "narrative unavailable" label.

**Rethink-my-day (PLAN-04):**
- Solver re-runs on remaining items (Haiku does NOT re-order).
- Haiku writes **intro only** (shifted arc: "Since you're done with X…");
  per-item tips unchanged from the initial generation.

**Rate limits (LLM-08):**
- 15 rethinks/day for unlocked trips, 5/day for free-tier teaser.
- Enforced at the endpoint layer, counted per-user-per-day.

### Free-tier "Blur" Semantics (PLAN-02)

**DTO shape (v1 snapshot amendment):**
- `Plan.days` is a **discriminated union**:
  `Array<FullDayPlan | LockedDayPlan>` tagged by `type`.
- `LockedDayPlan`:
  ```
  { type: "locked",
    dayIndex: int,
    park: string,
    totalItems: int,
    headline: string,
    unlockTeaser: string }
  ```
- `totalItems` counts **everything** on the day (rides + meals + shows
  + rest blocks), not just rides.
- `headline` is **templated from solver output** — no LLM call for
  locked-day text. Example template:
  `"Your {park} {budget_tier} day centers on {top_scored_item}."`

### Rethink-my-day API Contract (PLAN-04, v1 snapshot amendment)

**Request body:**
```
POST /trips/:id/rethink-today
{
  current_time: ISO8601,
  completed_item_ids: uuid[],
  active_ll_bookings: [
    { attraction_id, return_window_start, return_window_end }
  ]
}
```

**Semantics:**
- **In-progress item inference:** if `current_time` falls within a
  scheduled item's window AND the item is not in `completed_item_ids`,
  it's in-progress and pinned.
- **LL bookings:** `active_ll_bookings[]` is client-authoritative (the
  client is the only one that knows what the user actually booked in
  Disney's system). Each booking becomes a hard pin.

### Lightning Lane Allocation (SOLV-04, SOLV-10)

**Selection rule:**
- Filter to **top-N scored rides** in the plan, then assign LL slots
  to the **longest-wait rides** within that filtered set. Respects user
  priorities AND maximizes time saved.

**LL type distinction:**
- Each attraction in `attractions.yaml` has a `lightning_lane_type`
  field: `"multi_pass" | "single_pass" | "none"`.
- LLMP budget: solver assigns per-day cap (3 default) to any eligible
  ride.
- LLSP budget (paid-per-ride premium): only rides tagged
  `single_pass`; budget scaled by tier (Pixie=0, Fairy=0-1, Royal=0-2).

**Must-do without LL budget:**
- Schedule standby in the **low-wait window** the forecast predicts.
- Emit `warnings: string[]` field on the plan response with conversion
  nudge text (e.g., "Upgrade to Royal Treatment for LL access on
  Seven Dwarfs Mine Train").

**Return window assumption:**
- Plan-generation time (before the user is in the park): **fixed
  90-minute offset** from booking time. Conservative default.
- Real bookings flow in via rethink's `active_ll_bookings` (above).

### Cost Circuit Breaker (LLM-07)

**Scope:**
- **Per-trip lifetime** $0.50 cap (sum of all `llm_costs.trip_id` spend
  across all plan generations and rethinks).
- Default stored on `trip.llm_budget_cents = 50`.

**Mid-generation behavior:**
- When `trip_spent + projected_call_cost > budget` AND current model is
  Sonnet, **swap to Haiku** for the remaining narrative calls.
- If Haiku also fails (Zod validation etc.), fall through to the
  "persist without narrative" path from LLM-04.

**Over-budget new request:**
- Return `402 Payment Required` with structured body:
  ```
  { error: "trip_budget_exhausted",
    spent_cents: int,
    budget_cents: int,
    resetOptions: [{ type: "top_up", sku, usd_cents }, ...] }
  ```
- Mobile client renders a top-up paywall (Phase 4 delivers the
  RevenueCat mechanics; Phase 3 just publishes the contract).

**Telemetry:**
- Every breaker event writes to **three** sinks:
  1. Sentry (as a captured exception with trip context)
  2. Slack alert (aggregated hourly to avoid noise)
  3. `llm_cost_incidents` table (durable analytics)

### Claude's Discretion

- Exact score-weight calibration from fixture outcomes (baseline equal
  weights; planner may tune within snapshot tolerance).
- LLM prompt phrasing, retry backoff, Zod schema structure.
- `crowd_calendar` rule engine edge cases (how many weeks before/after
  a federal holiday count as elevated bucket, etc.).
- Exact templated-headline wording for locked days; as long as it's
  deterministic from solver output.
- `llm_cost_incidents` schema fields beyond `{ trip_id, event, model,
  spent_cents, timestamp }`.

</decisions>

<specifics>
## Specific Ideas

- **8-week clock already started** (2026-04-15 16:08:01 UTC). Plan 3's
  forecast module ships with every bucket at `low` confidence — that's
  the normal operating mode until ~2026-06-10.
- **Catalog ID gap from Phase 2**: the `queue_times_id` mismatch
  tracked in `todos/pending/fix-queue-times-catalog-ids.md` affects
  forecast quality (only 2 of 4 parks ingesting). The planner may
  choose to include a catalog-fix task in the first wave of Phase 3
  so forecast bucketing isn't starved.
- **Phase 4 prerequisites flagged now** — this phase publishes the
  `402` contract; Phase 4 must wire the top-up IAP SKU and RevenueCat
  webhook to mutate `trip.llm_budget_cents`.
- **Snapshot test fixtures (SOLV-12):** six canonical trips must
  produce byte-identical `DayPlan[]` on repeated runs:
    1. single-day MK with toddler (0-2 bracket in party)
    2. 3-day all-parks family (mixed ages)
    3. adult thrill-day (no kids, headliner priority)
    4. mobility-constrained multi-day (ECV, walking budget hard cap)
    5. ECV guest with DAS flag (DAS as LL-equivalent resource)
    6. 5-day Royal Treatment trip (full budget tier exercised)
  Fixture dates pinned inside the test so `solver_input_hash` is
  stable across runs.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`packages/solver/`** — empty scaffold from Phase 1 (just
  `src/index.ts` placeholder). Phase 3 fills it with pure-TS solver
  logic, zero NestJS deps, zero I/O.
- **`apps/api/src/trips/` and `apps/api/src/auth/`** — stub modules
  created in Plan 02-03 with frozen DTOs returning `501 Not
  Implemented`. Phase 3 fills `trips.controller.ts` endpoint bodies
  without changing shapes (except the one deliberate v1 amendment).
- **`apps/api/src/shared-infra.module.ts`** — `DB_TOKEN` + `REDIS_CLIENT_TOKEN`
  globals. New `PlanGenerationModule` imports this for DB/Redis access.
- **`packages/db/src/schema/plans.ts`** — `plans`, `plan_days`,
  `plan_items` tables exist. Phase 3 adds: index on
  `plans(trip_id, solver_input_hash)`; columns
  `trips.current_plan_id`, `trips.llm_budget_cents`; new table
  `crowd_calendar`; new table `llm_cost_incidents`.
- **`packages/db/src/schema/ops.ts`** — `llm_costs` table already
  exists. Phase 3 writes to it per LLM-05.
- **BullMQ + `AlertingModule`** — already wired from Phase 2.
  `PlanGenerationProcessor` follows the same pattern as
  `QueueTimesProcessor` (5×30s retry, dead-letter via Slack).
- **`packages/shared-openapi/openapi.v1.snapshot.json`** — locked in
  Plan 02-03 with stub `DayPlan`. Phase 3 **amends once** (Area 4
  decision); amendment is a deliberate v1 evolution.
- **`@anthropic-ai/sdk`** + **`zod`** — already in the NestJS workspace
  deps. No new runtime packages needed.

### Established Patterns

- **drizzle-orm postgres-js returns `RowList`, NOT `{ rows: [] }`**
  (learned in Phase 2). All DB queries in Phase 3 must use
  `const rows = (await db.execute<T>(...)) as unknown as T[]`.
- **NestJS response envelope** wraps every JSON response with
  `{ data, meta: { disclaimer } }`. Plan 3 endpoints inherit;
  `@ApiEnvelopedResponse()` annotation maintained for snapshot CI.
- **Sentry + Slack dead-letter pipeline** — processors call
  `slackAlerter.sendDeadLetter()` after final retry exhaustion.
  `llm_cost_incidents` insertion joins this pattern.
- **Supabase Session pooler DATABASE_URL** — port 5432 at
  `aws-*.pooler.supabase.com`. Direct connection (`db.*.supabase.co`)
  is IPv6-only; Railway uses IPv4.

### Integration Points

- New NestJS modules registered in `apps/api/src/app.module.ts`:
  `ForecastModule`, `PlanGenerationModule`, `NarrativeModule`.
- New BullMQ queue: `plan-generation` (registered in
  `worker.module.ts`).
- New controller wiring: `apps/api/src/trips/trips.controller.ts`
  gains `generatePlan`, `rethinkToday` handlers;
  `apps/api/src/plans/plans.controller.ts` created with `getPlan`.
- Anthropic API key env: `ANTHROPIC_API_KEY` (new). Flagged in
  `PROVISIONING_STATE.md` as a Phase 3 prerequisite.
- OpenAPI snapshot: `packages/shared-openapi/openapi.v1.snapshot.json`
  amended once during the first plan; CI gate blocks subsequent drift.

</code_context>

<deferred>
## Deferred Ideas

### To Phase 4 (Entitlements & Accounts)
- **Paid top-up IAP product** for extending `trip.llm_budget_cents`
  when the $0.50 circuit breaker trips. Phase 3 publishes the `402`
  contract and `resetOptions` DTO; Phase 4 wires the RevenueCat SKU,
  webhook, and budget mutation logic.
- **Paywall UI** for the 402 response — client-side, not Phase 3.

### To Phase 9 (Live Activities & Push Polish)
- **On-device local LLM inference** for offline rethink narrative
  fallback (iOS Foundation Models; Android ML Kit GenAI). Could
  supplement graceful degradation when server LLM fails OR extend
  rethink capability to airplane-mode in-park use. Connects directly
  to Phase 9's "Rethink my day offline" story.

### Out of Phase 3 scope (not yet bucketed)
- **Cached LLM re-run on hit for fresh tips** (considered, rejected
  for now — "rethink my day" is the user-facing escape hatch for
  freshness).
- **Redis cache layer** in front of `plans.solver_input_hash` DB
  lookup (rejected as premature; DB indexed lookup is fast enough).
- **2-opt or insert/remove local search moves** (rejected for Phase 3;
  adjacent swap is sufficient). Revisit if fixture quality proves
  insufficient.
- **LL selection by "longest predicted wait" alone** (rejected; must
  respect user score priorities first). Can revisit if analytics show
  users ignoring certain LL picks.
- **Per-day $0.50 budget** instead of per-trip lifetime (rejected; LLM-07
  wording is explicit "per-trip").

</deferred>

---

*Phase: 03-engine*
*Context gathered: 2026-04-15*
