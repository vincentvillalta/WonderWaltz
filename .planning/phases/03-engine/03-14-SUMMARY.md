---
phase: 03-engine
plan: 14
subsystem: narrative
tags: [anthropic, claude, llm, circuit-breaker, model-pinning, sentry, slack, redis, budget]

requires:
  - phase: 03-engine
    plan: 12
    provides: NarrativeService.generate() with retry pipeline + generateRethinkIntro() Haiku path
  - phase: 03-engine
    plan: 13
    provides: calculateUsdCents + recordLlmCost + CostAlertService + SlackAlerterService.sendAlert()
provides:
  - "SONNET_MODEL_ID / HAIKU_MODEL_ID exported constants with env var overrides (LLM-03)"
  - "CircuitBreakerService.checkBudget(tripId, projectedCents) — per-trip budget enforcement"
  - "CircuitBreakerService.recordIncident() — 3-sink telemetry (DB + Sentry + Slack)"
  - "CircuitBreakerService.buildBudgetExhaustedResponse() — 402 response body builder"
  - "BudgetExhaustedError — thrown when trip budget exhausted, caught by orchestrator"
  - "NarrativeService mid-generation Sonnet->Haiku swap when budget tight"
affects:
  - 03-engine plan 16 (plan-generation processor catches BudgetExhaustedError -> 402)
  - 03-engine plan 15 (rethink-today may also hit circuit breaker)
  - Phase 4 (wires real RevenueCat SKU in resetOptions)

tech-stack:
  added: []
  patterns:
    - "Per-trip circuit breaker with 3-sink telemetry (DB + Sentry + Slack dedup)"
    - "Model ID pinning via env vars — bumps require zero code changes"
    - "Optional DI for cross-module service (CircuitBreakerService via string token)"
    - "BudgetExhaustedError as typed throw for 402 flow control"

key-files:
  created:
    - apps/api/src/plan-generation/circuit-breaker.service.ts
    - apps/api/tests/plan-generation/circuit-breaker.test.ts
    - apps/api/tests/narrative/model-id-contract.test.ts
    - apps/api/tests/narrative/sonnet-haiku-fallback.test.ts
  modified:
    - apps/api/src/narrative/narrative.service.ts
    - apps/api/src/plan-generation/plan-generation.module.ts

key-decisions:
  - "CircuitBreakerService injected via string token 'CircuitBreakerService' with @Optional() — avoids circular import between NarrativeModule and PlanGenerationModule"
  - "ESTIMATED_SONNET_CENTS=5 as conservative projected cost for budget check — real cost varies by cache hit"
  - "Budget check runs once before first Anthropic call (not per-attempt) — retry reuses same model decision"
  - "Slack dedup key 'circuit-breaker:slack-dedup' separate from cost-alert dedup key — independent rate limits"
  - "BudgetExhaustedError is a typed Error subclass (not HttpException) — plan-generation orchestrator maps to 402"

patterns-established:
  - "Circuit breaker pattern: check before expensive call, record on trip"
  - "3-sink telemetry: DB (durable) + Sentry (event) + Slack (alert with hourly dedup)"

requirements-completed: [LLM-03, LLM-07]

# Metrics
duration: 12 min
completed: 2026-04-16
---

# Phase 03 Plan 14: Model ID Pinning + Per-Trip Circuit Breaker Summary

**Env-var-pinned Sonnet/Haiku model IDs with per-trip $0.50 circuit breaker, mid-generation Sonnet-to-Haiku swap, 402 exhaustion contract, and 3-sink telemetry (DB + Sentry + Slack dedup).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-16T13:12:38Z
- **Completed:** 2026-04-16T13:25:00Z
- **Tasks:** 3 (all TDD, combined RED+GREEN)
- **Tests added:** 12
- **Files:** 4 created, 2 modified

## Accomplishments

- `SONNET_MODEL_ID` and `HAIKU_MODEL_ID` exported from narrative.service.ts, reading from `ANTHROPIC_SONNET_MODEL` / `ANTHROPIC_HAIKU_MODEL` env vars with pinned defaults (`claude-sonnet-4-6`, `claude-haiku-4-5`).
- `CircuitBreakerService.checkBudget()` queries `trips.llm_budget_cents` and `SUM(usd_cents) FROM llm_costs` to enforce per-trip $0.50 lifetime cap. Returns `allowed:true/false` with optional `swapTo:'haiku'` signal.
- `CircuitBreakerService.recordIncident()` writes to all 3 sinks: `llm_cost_incidents` INSERT, `Sentry.captureException`, and `SlackAlerterService.sendAlert` with hourly Redis dedup.
- `NarrativeService.generate()` now checks budget before each Anthropic call. Budget tight triggers Sonnet-to-Haiku swap; budget exhausted throws `BudgetExhaustedError` without making an Anthropic call.
- `buildBudgetExhaustedResponse()` returns the `PlanBudgetExhaustedDto` shape with `resetOptions: [{ type: 'top_up', sku: 'trip_topup_050', usd_cents: 50 }]` for the 402 response.

## Task Commits

1. **Task 1: Pin model IDs + contract test** -- `a20d287` (feat)
2. **Task 2: CircuitBreakerService + 3-sink alerting** -- `1f35097` (feat)
3. **Task 3: NarrativeService integration -- mid-gen Sonnet->Haiku swap** -- `372f2b4` (feat)

## Files Created/Modified

### Created

- `apps/api/src/plan-generation/circuit-breaker.service.ts` -- CircuitBreakerService with checkBudget, recordIncident, buildBudgetExhaustedResponse
- `apps/api/tests/plan-generation/circuit-breaker.test.ts` -- 7 tests: budget math (3), 3-sink telemetry, dedup, null budget default, 402 dto shape
- `apps/api/tests/narrative/model-id-contract.test.ts` -- 4 tests: constant values, generate uses Sonnet, rethink uses Haiku
- `apps/api/tests/narrative/sonnet-haiku-fallback.test.ts` -- 5 tests: happy path, swap+incident, over-budget+throw, swap+fail=degraded, no-breaker backward compat

### Modified

- `apps/api/src/narrative/narrative.service.ts` -- Added SONNET_MODEL_ID/HAIKU_MODEL_ID exports, BudgetExhaustedError class, CircuitBreakerService DI integration, budget check before Anthropic calls
- `apps/api/src/plan-generation/plan-generation.module.ts` -- Registered CircuitBreakerService

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **String token for CircuitBreakerService** -- NarrativeModule cannot import PlanGenerationModule without creating a circular dependency chain. Using `@Optional() @Inject('CircuitBreakerService')` allows duck-typed injection when both modules are loaded in production, while gracefully degrading (no budget check) when the token is unavailable in tests.
- **BudgetExhaustedError as typed Error** -- Not an HttpException because NarrativeService is a domain service. The plan-generation orchestrator (03-16) will catch this and map it to a 402 HttpException at the controller layer.
- **Budget check once per generate() call** -- The retry attempt reuses the same model decision from the initial budget check. This avoids a second DB query and ensures consistent behavior within a single generation pipeline.

## Deviations from Plan

None -- plan executed exactly as written.

## Authentication Gates

None -- mock harness and mocked DB/Redis sidestep all network dependencies.

## Issues Encountered

- ESLint `no-unsafe-assignment` flagged `expect.objectContaining()` return type as `any` in circuit-breaker test. Fixed by casting Sentry mock call context to explicit type before assertion.

## User Setup Required

None -- all tests use mocked infrastructure. Circuit breaker activates automatically when CircuitBreakerService is provided via DI in the production module graph.

## Next Phase Readiness

The circuit breaker is complete. Downstream plans can now:

- **03-16 (plan-generation processor):** Catch `BudgetExhaustedError` from `NarrativeService.generate()` and return a 402 response with `CircuitBreakerService.buildBudgetExhaustedResponse()`.
- **03-15 (rethink-today):** Rethink-today already uses Haiku, but budget check can be added to prevent over-budget rethinks too.
- **Phase 4 (entitlements):** Wire the real RevenueCat SKU in the `resetOptions` array (currently placeholder `trip_topup_050`).

The 402 contract is published and the top-up paywall flow is ready for Phase 4 client integration.

---
*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 4 created files present on disk.
- All 3 task commits present in git log (`a20d287`, `1f35097`, `372f2b4`).
- `pnpm --filter @wonderwaltz/api test -- tests/plan-generation tests/narrative --run` -> 32 files, 259 tests, 0 failures.
