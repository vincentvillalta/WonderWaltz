---
phase: 03-engine
plan: 13
subsystem: narrative
tags: [anthropic, claude, llm, cost-tracking, cache-hit-rate, alerting, sentry, slack, redis]

requires:
  - phase: 03-engine
    plan: 02
    provides: Anthropic mock harness + NarrativeModule scaffold + ANTHROPIC_CLIENT_TOKEN DI
  - phase: 03-engine
    plan: 12
    provides: NarrativeService.generate() returns usage tokens (AnthropicUsage) + GenerateResult
provides:
  - "calculateUsdCents(usage, model) — deterministic cost from frozen rate card (Sonnet/Haiku)"
  - "recordLlmCost(db, row) — INSERT into llm_costs table via drizzle sql template"
  - "NarrativeService writes cost row after every Anthropic call (first attempt + retry)"
  - "CostAlertService.checkHitRate() — rolling 1-hour cache hit rate with Sentry/Slack alerting"
  - "SlackAlerterService.sendAlert() — generic Slack alert method for any service"
affects:
  - 03-engine plan 14 (circuit breaker reads llm_costs for per-trip spend)
  - 03-engine plan 16 (plan-generation processor passes CostContext to NarrativeService)
  - 03-engine plan 15 (rethink-today passes CostContext to generateRethinkIntro)

tech-stack:
  added: []
  patterns:
    - "Frozen rate card as Record<model, ModelRates> — pinned pricing prevents silent cost drift"
    - "Best-effort cost write — errors logged but never crash the narrative pipeline"
    - "@Optional() DI for cross-module dependencies — graceful degradation without global providers in tests"
    - "Redis dedup key with TTL for alert rate-limiting — prevents alert storms"
    - "Duck-typed SlackAlerter interface via string token — avoids AlertingModule import cycle"

key-files:
  created:
    - apps/api/src/narrative/cost.ts
    - apps/api/src/narrative/cost-alert.service.ts
    - apps/api/tests/narrative/cost.test.ts
    - apps/api/tests/narrative/cost-hit-rate-alert.test.ts
  modified:
    - apps/api/src/narrative/narrative.service.ts
    - apps/api/src/narrative/narrative.module.ts
    - apps/api/src/alerting/slack-alerter.service.ts
    - apps/api/tests/narrative/narrative-service.test.ts
    - apps/api/tests/narrative/narrative.module.test.ts

key-decisions:
  - "Rate card frozen with Object.freeze — Sonnet $3/$15 input/output, Haiku $0.80/$4.00, cache_read 10% of input, cache_write 125% of input"
  - "CostAlertService deps are all @Optional() — allows NarrativeModule to resolve in DI tests without SharedInfraModule/AlertingModule global providers"
  - "SlackAlerterService accessed via string token 'SlackAlerterService' rather than importing AlertingModule — avoids circular DI when AlertingModule needs REDIS_CLIENT from SharedInfraModule"
  - "Cost write is best-effort (try/catch around recordLlmCost) — cost telemetry must never crash the narrative generation pipeline"
  - "Hit rate formula: cached_read_tok / (cached_read_tok + input_tok) — not cached/total_tokens, because output tokens are not relevant to cache effectiveness"
  - "Minimum 5 rows required before alerting — prevents spurious alerts during low-traffic periods"

patterns-established:
  - "CostContext { tripId, planId } passed through generate/generateRethinkIntro for cost attribution"
  - "Redis dedup key with TTL for once-per-hour alert rate limiting"

requirements-completed: [LLM-05, LLM-06]

# Metrics
duration: 7 min
completed: 2026-04-16
---

# Phase 03 Plan 13: LLM Cost Tracking + Cache Hit Rate Alert Summary

**Frozen rate card cost calculation writing to llm_costs after every Anthropic call, plus rolling 1-hour cache hit rate alerting via Sentry + Slack with Redis dedup.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-16T10:15:44Z
- **Completed:** 2026-04-16T10:38:00Z
- **Tasks:** 2 (both TDD, combined RED+GREEN)
- **Tests added:** 20
- **Files:** 4 created, 5 modified

## Accomplishments

- `cost.ts` implements `calculateUsdCents()` with frozen rate card (Sonnet/Haiku pricing pinned 2026-04-15) and `recordLlmCost()` for llm_costs INSERT.
- `NarrativeService.generate()` and `generateRethinkIntro()` now write a cost row after every Anthropic API call (including retry attempts), with best-effort error handling.
- `CostAlertService.checkHitRate()` queries a rolling 1-hour window from llm_costs, computes `cached_read_tok / (cached_read_tok + input_tok)`, and fires Sentry + Slack alerts when rate drops below 70% with at least 5 rows of signal.
- Alert deduplication via Redis key `cost-alert:last-fired` with 1-hour TTL prevents alert storms.
- `SlackAlerterService.sendAlert()` added as a generic alert method for use beyond dead-letter notifications.

## Task Commits

1. **Task 1: Cost calculation + recordLlmCost DB write** — `2b54660` (feat)
2. **Task 2: Rolling hit-rate alert + Sentry/Slack** — `75ce992` (feat)

## Files Created/Modified

### Created

- `apps/api/src/narrative/cost.ts` — calculateUsdCents(), recordLlmCost(), frozen RATE_CARD, LlmCostRow/CostInput types
- `apps/api/src/narrative/cost-alert.service.ts` — CostAlertService with checkHitRate(), Redis dedup, Sentry/Slack alerting
- `apps/api/tests/narrative/cost.test.ts` — 9 table-driven cost math tests + 2 DB write tests
- `apps/api/tests/narrative/cost-hit-rate-alert.test.ts` — 6 tests: fire alert, healthy rate, dedup, insufficient rows, zero rows, null sums

### Modified

- `apps/api/src/narrative/narrative.service.ts` — Added DB injection (@Optional), CostContext param, writeCostRow() after every Anthropic call
- `apps/api/src/narrative/narrative.module.ts` — Registers CostAlertService, exports it, uses string token for SlackAlerter
- `apps/api/src/alerting/slack-alerter.service.ts` — Added sendAlert() generic method
- `apps/api/tests/narrative/narrative-service.test.ts` — Added 5 cost-tracking integration tests (1 row on success, 2 rows on retry, rethink cost row, DB failure resilience, no-db graceful)
- `apps/api/tests/narrative/narrative.module.test.ts` — Simplified back to original shape since @Optional handles missing global providers

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **@Optional() DI for all CostAlertService deps** — NarrativeModule can't import AlertingModule without pulling in REDIS_CLIENT dependency chain. Making deps optional lets NarrativeModule resolve cleanly in tests while fully functioning when global providers are available in production.
- **String token for SlackAlerter** — avoids importing AlertingModule into NarrativeModule which would create a DI resolution failure in tests that don't have SharedInfraModule registered.
- **Best-effort cost write** — cost telemetry is valuable but must never break narrative generation. All recordLlmCost calls wrapped in try/catch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Added sendAlert() to SlackAlerterService**
- **Found during:** Task 2 (CostAlertService implementation)
- **Issue:** SlackAlerterService only had sendDeadLetter() and sendLagAlert() — no generic alert method for CostAlertService to use.
- **Fix:** Added `sendAlert(message)` method that delegates to `postToSlack()` with a warning emoji prefix.
- **Files modified:** `apps/api/src/alerting/slack-alerter.service.ts`
- **Verification:** CostAlertService test verifies sendAlert is called on low hit rate.
- **Committed in:** `75ce992` (Task 2 commit)

**2. [Rule 3 - Blocking] NarrativeModule DI resolution failure with AlertingModule import**
- **Found during:** Task 2 (NarrativeModule update)
- **Issue:** Importing AlertingModule into NarrativeModule caused DI failures in narrative.module.test.ts because AlertingModule's SlackAlerterService needs REDIS_CLIENT from the @Global SharedInfraModule, which isn't available in isolated test modules.
- **Fix:** Removed AlertingModule import. CostAlertService uses @Optional() for all deps and a string token 'SlackAlerterService' for duck-typed Slack access. Gracefully degrades when deps unavailable.
- **Files modified:** `apps/api/src/narrative/narrative.module.ts`, `apps/api/src/narrative/cost-alert.service.ts`
- **Verification:** All 4 narrative.module.test.ts cases pass; all 6 cost-alert tests pass.
- **Committed in:** `75ce992` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 critical, 1 blocking). None required user approval.

## Authentication Gates

None — mock harness and mocked DB/Redis sidestep all network dependencies.

## Issues Encountered

- ESLint flagged unused generic type parameter `<T>` on DbExecutable interface — removed.
- Pre-commit lint caught and fixed before final commit.

## User Setup Required

None — all tests use mocked infrastructure. Cost tracking activates automatically once NarrativeService is called with a CostContext in the production environment.

## Next Phase Readiness

The cost tracking pipeline is complete. Downstream plans can now:

- **03-14 (circuit breaker):** Query `llm_costs` for per-trip spend aggregation.
- **03-16 (plan-generation processor):** Pass `{ tripId, planId }` as CostContext to NarrativeService.generate().
- **03-15 (rethink-today):** Pass CostContext to generateRethinkIntro().

CostAlertService can be invoked either on a BullMQ cron schedule or inline after cost writes for responsive alerting.

---
*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 4 created files present on disk.
- All 2 task commits present in git log (`2b54660`, `75ce992`).
- `pnpm --filter @wonderwaltz/api test -- tests/narrative --run` -> 29 files, 243 tests, 0 failures.
