---
phase: 02-data-pipeline
plan: "10"
subsystem: api
tags: [nestjs, swagger, openapi, dto, snapshot, ci, freeze]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "03"
    provides: initial snapshot generator script, tsconfig.build.json rootDirs pattern
  - phase: 02-data-pipeline
    plan: "09"
    provides: GET /v1/parks endpoint, WaitTimeDto nullable fields, ParksService

provides:
  - Final committed OpenAPI v1 snapshot — 11 routes, 17 schemas, frozen v1 spec
  - Snapshot generator fixed for tsc rootDir "." output structure (dist/src/ subdir)
  - CI gate clean: git diff --exit-code exits 0 after regeneration
  - DATA-06: v1 spec freeze complete

affects: [03-*, 04-*, 05-*, mobile-clients]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot generation: pnpm build → node apps/api/dist/scripts/generate-openapi-snapshot.js"
    - "generate-openapi-snapshot.js requires '../src/app.module.js' (not '../app.module.js') — tsc rootDir '.' preserves src/ in dist output"
    - "shared-infra.module.ts monorepoRoot uses resolve(__dirname, '../../../..') — 4 levels up from dist/src/"

key-files:
  created: []
  modified:
    - packages/shared-openapi/openapi.v1.snapshot.json
    - apps/api/scripts/generate-openapi-snapshot.ts
    - apps/api/src/shared-infra.module.ts

key-decisions:
  - "AppModule require path updated from '../app.module.js' to '../src/app.module.js' — tsc with rootDir '.' puts src files at dist/src/, not flat dist/"
  - "monorepoRoot in shared-infra.module.ts updated from '../../..' (3 levels) to '../../../..' (4 levels) — accounts for extra src/ level in dist output"
  - "GET /v1/parks included in final snapshot — route was added in 02-09 but snapshot was never regenerated; freeze captures it correctly"
  - "WaitTimeDto nullable fields (minutes/fetched_at/source) documented in frozen spec — reflects 02-09 Rule 2 auto-fix"

requirements-completed: [DATA-06]

# Metrics
duration: 25min
completed: 2026-04-14
---

# Phase 02, Plan 10: OpenAPI v1 Final Snapshot Freeze Summary

**Final OpenAPI v1 snapshot frozen with 11 routes (including GET /v1/parks added in 02-09) and WaitTimeDto nullable fields — CI gate passes clean**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-14T22:35:00Z
- **Completed:** 2026-04-14T22:59:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Regenerated snapshot after 02-09 implementations — captured GET /v1/parks (missing from committed snapshot) and WaitTimeDto nullable fields
- Fixed snapshot generator path: `require('../app.module.js')` → `require('../src/app.module.js')` to match tsc `rootDir "."` output structure where src files land in `dist/src/`
- Fixed `shared-infra.module.ts` monorepoRoot resolution: `../../..` → `../../../..` (4 levels up from `dist/src/`, not 3)
- CI gate verified clean: `git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` exits 0 after regeneration

## Task Commits

1. **Task 1: Final snapshot regeneration + path fixes** - `e07a4d6` (chore)

## Files Created/Modified

- `packages/shared-openapi/openapi.v1.snapshot.json` — updated: added GET /v1/parks, WaitTimeDto nullable fields (minutes/fetched_at/source), 11 routes total
- `apps/api/scripts/generate-openapi-snapshot.ts` — fixed AppModule require path for tsc rootDir "." dist/src/ output
- `apps/api/src/shared-infra.module.ts` — fixed monorepoRoot resolution from 3 levels to 4 levels up

## Decisions Made

- **AppModule path correction**: Previous path `../app.module.js` assumed flat dist structure. After clean build with `rootDir: "."` in tsconfig.json, tsc outputs `src/` files to `dist/src/`. The snapshot script at `dist/scripts/` must now reference `../src/app.module.js`. This is a structural correction, not a behavioral change.

- **monorepoRoot correction**: `shared-infra.module.ts` computed monorepo root as `resolve(__dirname, '../../..')` — 3 levels up from what was previously `dist/`. With the new `dist/src/` output structure, 3 levels up only reaches `apps/`. Updated to `../../../..` (4 levels) to correctly reach repo root for `packages/db/dist/src/index.js` dynamic import.

- **Snapshot includes GET /v1/parks**: The previous committed snapshot (from 02-03) was generated before 02-09 added the parks listing endpoint. The final freeze correctly includes all 11 v1 routes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] generate-openapi-snapshot.ts AppModule require path broken after clean tsc build**
- **Found during:** Task 1 — running `node apps/api/dist/scripts/generate-openapi-snapshot.js`
- **Issue:** Script tried to `require('../app.module.js')` but after clean build, tsc with `rootDir: "."` places app.module at `dist/src/app.module.js`, not `dist/app.module.js`. Snapshot script exits with code 1 (no output).
- **Fix:** Changed require path to `'../src/app.module.js'`; updated comment to document the tsc rootDir "." behavior
- **Files modified:** `apps/api/scripts/generate-openapi-snapshot.ts`
- **Verification:** Snapshot generator runs successfully, writes JSON
- **Committed in:** `e07a4d6`

**2. [Rule 1 - Bug] shared-infra.module.ts monorepoRoot resolves to apps/ instead of repo root**
- **Found during:** Task 1 — debugging snapshot generator exit code 1 via NODE_DEBUG=module
- **Issue:** `resolve(__dirname, '../../..')` with `__dirname = apps/api/dist/src/` resolves to `apps/` (not repo root). `packages/db` lookup then fails at `apps/packages/db/dist/src/index.js`.
- **Fix:** Updated to `resolve(__dirname, '../../../..')` — 4 levels up from `dist/src/`
- **Files modified:** `apps/api/src/shared-infra.module.ts`
- **Verification:** Snapshot generator successfully bootstraps AppModule (SharedInfraModule loaded without DB error since DATABASE_URL not set in snapshot context)
- **Committed in:** `e07a4d6`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes required to unblock snapshot generation after clean tsc build revealed stale dist had masked the path issues. No scope change.

## Issues Encountered

The prior dist artifact was stale — it was compiled before `rootDir: "."` was set in tsconfig.json (added in Phase 01 foundation). Incremental tsc builds did not regenerate the entire dist structure, so `dist/app.module.js` (flat) coexisted with the source having `rootDir: "."`. A clean `rm -rf dist` exposed the true output structure, which required path corrections in both the snapshot script and shared-infra.module.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- OpenAPI v1 spec is now the **final frozen surface** — 11 routes, 17 schemas
- `packages/shared-openapi/openapi.v1.snapshot.json` is the source for mobile client code generation
- CI gate is clean and stable: any future controller/DTO change will fail CI until snapshot is regenerated and committed
- Phase 3 trip/plan endpoint shapes are frozen in the spec; implementors add service logic only
- Phase 4 auth shapes frozen; same pattern

## Self-Check: PASSED

- `packages/shared-openapi/openapi.v1.snapshot.json` — exists, 11 routes, valid JSON
- `apps/api/scripts/generate-openapi-snapshot.ts` — updated require path
- `apps/api/src/shared-infra.module.ts` — updated monorepoRoot resolution
- `e07a4d6` — verified in git log
- CI gate: `git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` exits 0

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
