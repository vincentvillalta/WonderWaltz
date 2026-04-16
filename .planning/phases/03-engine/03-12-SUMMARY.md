---
phase: 03-engine
plan: 12
subsystem: narrative
tags: [anthropic, claude, prompt-caching, zod, narrative, llm, retry, haiku]

requires:
  - phase: 03-engine
    plan: 02
    provides: Anthropic mock harness + NarrativeModule scaffold + fixtures + CACHED_PREFIX SHA test
  - phase: 03-engine
    plan: 04
    provides: DayPlan + PlanItem shapes for solver output types
provides:
  - "buildCachedPrefix() — byte-stable cached prefix with WDW catalog + BRAND voice guide"
  - "buildDynamicPrompt() — per-trip context (guests + solver plan items)"
  - "buildMessagesPayload() — Anthropic API shape with cache_control ephemeral breakpoint"
  - "NarrativeResponseSchema (Zod) — validates days[].intro/items[].tip, packingDelta, budgetHacks"
  - "validateNarrative() — cross-validates planItemIds against solver output (subset check)"
  - "NarrativeService.generate() — full pipeline with retry-once + graceful degradation"
  - "NarrativeService.generateRethinkIntro() — Haiku intro-only for rethink-my-day"
  - "RethinkIntroSchema (Zod) — validates { intro: string } for Haiku path"
affects:
  - 03-engine plans 13 (cost telemetry reads usage from GenerateResult)
  - 03-engine plan 16 (plan-generation processor calls NarrativeService.generate)
  - 03-engine plan 15 (rethink-today calls NarrativeService.generateRethinkIntro)

tech-stack:
  added: []
  patterns:
    - "Byte-stable cached prefix via sorted YAML loads + module-level cache — SHA-256 invariant across 100 invocations"
    - "Anthropic cache_control ephemeral on system block before dynamic suffix — maximizes cache hit rate"
    - "Zod + cross-validation (subset check) as two-layer validation — shape first, then semantic correctness"
    - "Retry-once with corrective system suffix — includes validation error details for targeted LLM self-correction"
    - "Graceful degradation: narrativeAvailable=false on 2nd failure — plan still usable without narrative"

key-files:
  created:
    - apps/api/src/narrative/prompt.ts
    - apps/api/src/narrative/schema.ts
    - apps/api/tests/narrative/prompt-cache-prefix.test.ts
    - apps/api/tests/narrative/zod-schema.test.ts
    - apps/api/tests/narrative/ride-id-contract.test.ts
    - apps/api/tests/narrative/narrative-service.test.ts
  modified:
    - apps/api/src/narrative/narrative.service.ts
    - apps/api/tests/narrative/narrative.module.test.ts
    - apps/api/tests/fixtures/narrative-response.invalid-ride.json

key-decisions:
  - "Combined RED+GREEN commits per task — ESLint typed-rules block import tests from passing pre-commit lint until the implementation exists"
  - "Cached prefix includes catalog + BRAND voice in XML-tagged blocks (<CATALOG>, <BRAND_VOICE>, <TONE_RULES>) for clear LLM section boundaries"
  - "YAML loaders sort entries by id before serialization — deterministic order regardless of YAML file ordering"
  - "Module-level cache for prefix (let _cachedPrefix) — avoids re-reading YAML on every call within same process"
  - "Retry corrective prompt appended as systemSuffix (not replacing system) — preserves cache_control on the original cached block"
  - "generateRethinkIntro uses hardcoded claude-haiku-4-5 model — matches CONTEXT.md Area 3 Q3.3 decision"
  - "GenerateResult.narrative typed as optional with | undefined — required by exactOptionalPropertyTypes tsconfig"

patterns-established:
  - "Two-layer LLM validation: Zod schema parse then semantic cross-validation against source data"
  - "Retry-once-then-degrade pattern for LLM outputs — consistent across generate and future cost-breaker paths"

requirements-completed: [LLM-02, LLM-04]

# Metrics
duration: 34 min
completed: 2026-04-16
---

# Phase 03 Plan 12: Narrative Generation Pipeline Summary

**Byte-stable cached prefix (catalog + BRAND voice) with Zod-validated structured output, ride-ID hallucination rejection, retry-once pipeline, and Haiku rethink-intro path.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-04-16T08:05:13Z
- **Completed:** 2026-04-16T08:39:00Z
- **Tasks:** 3 (all TDD, combined RED+GREEN)
- **Tests added:** 19
- **Files:** 6 created, 3 modified

## Accomplishments

- `prompt.ts` builds a byte-stable cached prefix (~20K chars) from sorted YAML catalog + BRAND voice guide, with `cache_control: { type: 'ephemeral' }` on the Anthropic system block.
- `schema.ts` provides `NarrativeResponseSchema` (Zod) with intro length bounds (50-800), tip bounds (10-400), and `validateNarrative()` cross-checking planItemIds against solver output.
- `narrative.service.ts` fully implemented: `generate()` runs the complete pipeline (build payload, call SDK, parse JSON, validate, retry once on failure, degrade gracefully), and `generateRethinkIntro()` uses Haiku for intro-only rethink path.
- All failure modes exercised: JSON parse failure, Zod validation failure, hallucinated ride rejection, double-failure graceful degradation.
- Usage aggregation sums input/output/cache tokens across all attempts.

## Task Commits

1. **Task 1: buildCachedPrefix — byte-stable across builds** — `dfcefec` (feat)
2. **Task 2: Zod schema + ride-ID contract validator** — `8f07893` (feat)
3. **Task 3: NarrativeService.generate — full pipeline with retry + fallback** — `b7b2c93` (feat)

## Files Created/Modified

### Created

- `apps/api/src/narrative/prompt.ts` — buildCachedPrefix(), buildDynamicPrompt(), buildMessagesPayload()
- `apps/api/src/narrative/schema.ts` — NarrativeResponseSchema, RethinkIntroSchema, validateNarrative()
- `apps/api/tests/narrative/prompt-cache-prefix.test.ts` — 8 tests: byte-stability (100x SHA), size bounds, content checks
- `apps/api/tests/narrative/zod-schema.test.ts` — 7 tests: valid/invalid shape, length bounds, edge cases
- `apps/api/tests/narrative/ride-id-contract.test.ts` — 4 tests: valid fixture, hallucinated ride, extra unknown ID, empty
- `apps/api/tests/narrative/narrative-service.test.ts` — 7 tests: happy path, retry success, double fail, hallucination, model passthrough, retry prompt, rethink intro

### Modified

- `apps/api/src/narrative/narrative.service.ts` — replaced 03-12 stubs with full implementation
- `apps/api/tests/narrative/narrative.module.test.ts` — updated DI tests (stubs no longer throw /03-12/)
- `apps/api/tests/fixtures/narrative-response.invalid-ride.json` — intro length 47->88 chars (Zod min 50)

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **XML-tagged sections in cached prefix** (`<CATALOG>`, `<BRAND_VOICE>`, `<TONE_RULES>`) — gives the LLM clear section boundaries without ambiguity.
- **Retry appends systemSuffix, not replaces** — preserves cache_control on the original cached block so the retry still gets a cache hit.
- **GenerateResult uses `| undefined` explicitly** — `exactOptionalPropertyTypes` tsconfig option requires it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Invalid-ride fixture intro too short for Zod validation**
- **Found during:** Task 2 (ride-id-contract test)
- **Issue:** The `narrative-response.invalid-ride.json` fixture from 03-02 had an intro of 47 chars ("Start at Magic Kingdom with a secret headliner."). The Zod schema requires min 50 chars, so the parse failed before reaching the contract check.
- **Fix:** Extended intro to 88 chars: "Start at Magic Kingdom with a secret headliner that nobody has ever ridden before today."
- **Files modified:** `apps/api/tests/fixtures/narrative-response.invalid-ride.json`
- **Verification:** Fixture now passes Zod parse and reaches the hallucinated_ride contract check as intended.
- **Committed in:** `8f07893` (Task 2 commit)

**2. [Rule 1 - Bug] narrative.module.test.ts expects /03-12/ rejection stubs**
- **Found during:** Task 3 (full pipeline implementation)
- **Issue:** The 03-02 DI wiring tests asserted that `generate()` and `generateRethinkIntro()` reject with errors matching `/03-12/`. Now that both methods are implemented, these assertions fail.
- **Fix:** Updated the tests to verify the methods are callable and produce meaningful results (not stub rejections).
- **Files modified:** `apps/api/tests/narrative/narrative.module.test.ts`
- **Verification:** All 4 DI wiring tests pass with real service behavior.
- **Committed in:** `b7b2c93` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). None required user approval.

## Authentication Gates

None — mock harness sidesteps Anthropic API entirely.

## Issues Encountered

- ESLint `no-useless-escape` flagged `\Z` in regex — replaced with `$` (end-of-string anchor).
- ESLint `require-await` flagged async arrow functions in mock overrides — refactored to use `Promise.resolve()` instead.
- TypeScript `exactOptionalPropertyTypes` required explicit `| undefined` on `GenerateResult.narrative`.
- Pre-commit `commitlint` required lowercase subject and body lines under 100 chars.

## User Setup Required

None — mock harness sidesteps network. `ANTHROPIC_API_KEY` needed in production (documented in 03-02).

## Next Phase Readiness

The narrative pipeline is complete. Downstream plans can now:

- **03-13 (cost telemetry):** Read `GenerateResult.usage` for `llm_costs` insertion.
- **03-16 (plan-generation processor):** Call `NarrativeService.generate()` in the BullMQ job pipeline.
- **03-15 (rethink-today):** Call `NarrativeService.generateRethinkIntro()` for the Haiku intro-only path.

The `buildCachedPrefix()` output is byte-stable. The 03-02 SHA-256 invariant test in `anthropic-mock.test.ts` uses a different (shorter) test prefix string — production prefix content is validated by `prompt-cache-prefix.test.ts` with its own 100-invocation invariant.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 6 created files present on disk.
- All 3 task commits present in git log (`dfcefec`, `8f07893`, `b7b2c93`).
- `pnpm --filter @wonderwaltz/api test -- tests/narrative --run` -> 27 files, 223 tests, 0 failures.
- `pnpm --filter @wonderwaltz/api typecheck` -> clean.
