---
phase: 02-data-pipeline
plan: "03"
subsystem: api
tags: [nestjs, swagger, openapi, dto, controllers, ci, snapshot]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule, ioredis config
  - phase: 01-foundation
    provides: NestJS API scaffold, ResponseEnvelopeInterceptor, ApiEnvelopedResponse decorator
provides:
  - OpenAPI v1 surface: 10 routes, 17 schemas, committed snapshot
  - DTOs for all v1 endpoints (ingestion reads + Phase 3 trip/plan + Phase 4 auth)
  - ParksModule, TripsModule, AuthModule registered in AppModule
  - CI gate: git diff against openapi.v1.snapshot.json fails on spec drift
affects: [02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 03-*, 04-*, 05-*]

# Tech tracking
tech-stack:
  added:
    - "apps/api/scripts/: snapshot generation script compiled via tsconfig.build.json"
    - "packages/shared-openapi/openapi.v1.snapshot.json: committed OpenAPI v1 spec"
  patterns:
    - "ApiEnvelopedResponse decorator on every endpoint — snapshot reflects envelope shape"
    - "Snapshot generation: pnpm build → node dist/scripts/generate-openapi-snapshot.js"
    - "Snapshot CI gate: node generate-openapi-snapshot.js + git diff --exit-code"
    - "Phase 3/4 stubs: HttpException('Not Implemented', 501) with @ApiResponse(501) docs"
    - "tsconfig.build.json uses rootDirs + include:[src,scripts] to compile scripts/ to dist/"

key-files:
  created:
    - apps/api/src/shared/dto/wait-time.dto.ts
    - apps/api/src/shared/dto/crowd-index.dto.ts
    - apps/api/src/shared/dto/weather.dto.ts
    - apps/api/src/shared/dto/trip.dto.ts
    - apps/api/src/shared/dto/plan.dto.ts
    - apps/api/src/shared/dto/auth.dto.ts
    - apps/api/src/parks/parks.controller.ts
    - apps/api/src/parks/parks.module.ts
    - apps/api/src/parks/crowd-index.controller.ts
    - apps/api/src/parks/weather.controller.ts
    - apps/api/src/trips/trips.controller.ts
    - apps/api/src/trips/trips.module.ts
    - apps/api/src/trips/plans.controller.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/auth.module.ts
    - apps/api/src/auth/users.controller.ts
    - apps/api/scripts/generate-openapi-snapshot.ts
    - packages/shared-openapi/openapi.v1.snapshot.json
  modified:
    - apps/api/src/app.module.ts
    - apps/api/tsconfig.json
    - apps/api/tsconfig.build.json
    - .github/workflows/ci.yml
    - .prettierignore

key-decisions:
  - "CrowdIndexController and WeatherController are separate @Controller('crowd-index') and @Controller('weather') — not sub-routes of /parks, per CONTEXT.md spec"
  - "Snapshot generation runs against compiled tsc dist/ (not tsx): tsx esbuild doesn't emit decorator metadata (emitDecoratorMetadata: true) required by NestJS @ApiProperty"
  - "tsconfig.build.json uses rootDirs:[src,scripts] so apps/api/scripts/ compiles to dist/scripts/"
  - "openapi.v1.snapshot.json added to .prettierignore: prevents prettier from reformatting and creating false git diffs in CI"
  - "Phase 3/4 stub endpoints throw HttpException('Not Implemented', 501) — returns real HTTP 501, not 200 or 404"

requirements-completed: [DATA-05, DATA-06]

# Metrics
duration: 35min
completed: 2026-04-14
---

# Phase 02, Plan 03: OpenAPI v1 Surface Summary

**Complete OpenAPI v1 surface with DTOs (6 files, 17 schemas), 10 stub/live controllers, committed snapshot, and CI diff-gate**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-14T20:00:00Z
- **Completed:** 2026-04-14T20:35:00Z
- **Tasks:** 2
- **Files modified:** 18 files (17 created, 5 modified)

## Accomplishments

### Task 1: DTO layer
- `wait-time.dto.ts`: WaitTimeDto with source enum, is_stale flag
- `crowd-index.dto.ts`: CrowdIndexValueDto (bootstrap/percentile confidence), CrowdIndexParksDto, CrowdIndexResponseDto
- `weather.dto.ts`: WeatherDto (7 weather fields), WeatherQueryDto
- `trip.dto.ts`: GuestInputDto (age_bracket enum — LEGL-07), TripPreferencesDto, CreateTripDto, TripDto, GeneratePlanResponseDto, RethinkTodayDto — all Phase 3 shapes frozen
- `plan.dto.ts`: PlanItemDto, DayPlanDto (with crowd_index + weather), PlanDto — Phase 3 shapes frozen
- `auth.dto.ts`: AnonymousAuthResponseDto, UserMeDto — Phase 4 shapes frozen

### Task 2: Controllers + snapshot + CI
- **ParksModule**: ParksController (GET /v1/parks/:parkId/waits), CrowdIndexController (GET /v1/crowd-index), WeatherController (GET /v1/weather) — all live stubs returning empty/null
- **TripsModule**: TripsController (POST /v1/trips, GET /v1/trips/:id, POST generate-plan, POST rethink-today), PlansController (GET /v1/plans/:id) — all 501 Phase 3 stubs
- **AuthModule**: AuthController (POST /v1/auth/anonymous), UsersController (GET /v1/users/me) — 501 Phase 4 stubs
- All endpoints use @ApiEnvelopedResponse to document envelope shape in spec
- `apps/api/scripts/generate-openapi-snapshot.ts` bootstraps NestJS with Fastify (no listen), writes spec to packages/shared-openapi/openapi.v1.snapshot.json
- `openapi.v1.snapshot.json` committed: 10 routes, 17 schemas, 1128 lines
- CI step: `node apps/api/dist/scripts/generate-openapi-snapshot.js` + `git diff --exit-code`

## Task Commits

1. **Task 1: DTO layer** - `0bdeea4` (feat)
2. **Task 2: Controllers + snapshot + CI** - `df1b3ae` (feat)
3. **Fix: snapshot format alignment + prettierignore** - `5d651e8` (fix)

## Files Created/Modified

### Created
- `apps/api/src/shared/dto/wait-time.dto.ts` — WaitTimeDto (attractionId, name, minutes, fetched_at, source, is_stale)
- `apps/api/src/shared/dto/crowd-index.dto.ts` — CrowdIndexValueDto, CrowdIndexParksDto, CrowdIndexResponseDto
- `apps/api/src/shared/dto/weather.dto.ts` — WeatherDto, WeatherQueryDto
- `apps/api/src/shared/dto/trip.dto.ts` — GuestInputDto (age_bracket enum LEGL-07), TripPreferencesDto, CreateTripDto, TripDto, GeneratePlanResponseDto, RethinkTodayDto
- `apps/api/src/shared/dto/plan.dto.ts` — PlanItemDto, DayPlanDto, PlanDto, enums
- `apps/api/src/shared/dto/auth.dto.ts` — AnonymousAuthResponseDto, UserMeDto
- `apps/api/src/parks/parks.controller.ts` — GET /v1/parks/:parkId/waits
- `apps/api/src/parks/parks.module.ts` — ParksModule with 3 controllers
- `apps/api/src/parks/crowd-index.controller.ts` — GET /v1/crowd-index
- `apps/api/src/parks/weather.controller.ts` — GET /v1/weather
- `apps/api/src/trips/trips.controller.ts` — 4 trip endpoints (501)
- `apps/api/src/trips/trips.module.ts` — TripsModule with 2 controllers
- `apps/api/src/trips/plans.controller.ts` — GET /v1/plans/:id (501)
- `apps/api/src/auth/auth.controller.ts` — POST /v1/auth/anonymous (501)
- `apps/api/src/auth/auth.module.ts` — AuthModule with 2 controllers
- `apps/api/src/auth/users.controller.ts` — GET /v1/users/me (501)
- `apps/api/scripts/generate-openapi-snapshot.ts` — snapshot generation script (compiled to dist/scripts/)
- `packages/shared-openapi/openapi.v1.snapshot.json` — committed OpenAPI v1 spec (1128 lines)

### Modified
- `apps/api/src/app.module.ts` — added ParksModule, TripsModule, AuthModule to imports
- `apps/api/tsconfig.json` — added `scripts/` to include array for ESLint projectService
- `apps/api/tsconfig.build.json` — changed to rootDirs + include:[src,scripts]; fixed rootDir conflict with tests/
- `.github/workflows/ci.yml` — added Check OpenAPI snapshot step
- `.prettierignore` — excluded openapi.v1.snapshot.json from prettier formatting

## Decisions Made

- **CrowdIndex and Weather at root path**: `CrowdIndexController` uses `@Controller('crowd-index')` and `WeatherController` uses `@Controller('weather')` rather than being sub-routes of `/parks`. This matches the CONTEXT.md spec which shows `GET /v1/crowd-index` and `GET /v1/weather` at the top-level path.
- **Snapshot uses tsc dist, not tsx**: `tsx` uses esbuild which doesn't support `emitDecoratorMetadata: true`. NestJS Swagger decorators rely on `Reflect.getMetadata` which requires tsc compilation. The snapshot script runs from `apps/api/dist/scripts/` using the compiled output.
- **tsconfig.build.json rootDirs**: Changed from `rootDir: ./src` to `rootDirs: [./src, ./scripts]` with `include: [src, scripts]` so the scripts directory compiles alongside src/ into dist/. This was needed to put the snapshot script in the deployable build artifact.
- **prettierignore for snapshot**: Prettier reformats JSON arrays to multi-line, creating false diffs between the committed snapshot (prettier-formatted) and the regenerated snapshot (JSON.stringify output). Excluding the file from prettier ensures the CI diff check is reliable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsconfig.build.json rootDir conflict with tests/**
- **Found during:** Task 2, running `pnpm run build`
- **Issue:** `tsconfig.build.json` extends `tsconfig.json` which has `include: [src, tests, ...]` but `tsconfig.build.json` set `rootDir: ./src`. TypeScript error: `tests/setup.ts is not under rootDir ./src`.
- **Fix:** Added explicit `"include": ["src"]` to `tsconfig.build.json` to override the parent's `include`. Later extended to `["src", "scripts"]` when scripts/ was added.
- **Files modified:** `apps/api/tsconfig.build.json`
- **Commit:** `df1b3ae`

**2. [Rule 3 - Blocking] tsx esbuild incompatible with emitDecoratorMetadata**
- **Found during:** Task 2, when attempting to run snapshot script with `npx tsx`
- **Issue:** `tsx` uses esbuild for TypeScript transpilation. esbuild does not support `emitDecoratorMetadata: true`. NestJS Swagger's `@ApiProperty` decorators call `Reflect.getMetadata` which throws `TypeError` when decorator metadata is missing.
- **Fix:** Changed snapshot generation approach to run the compiled tsc output (`dist/scripts/`) via `node`. This requires a `pnpm run build` step first, which CI already has.
- **Files modified:** `apps/api/scripts/generate-openapi-snapshot.ts`, `apps/api/tsconfig.build.json`, `.github/workflows/ci.yml`
- **Commit:** `df1b3ae`

**3. [Rule 1 - Bug] Snapshot formatting drift (prettier vs JSON.stringify)**
- **Found during:** Post-commit verification
- **Issue:** When the snapshot was first committed, lint-staged ran prettier on the JSON file, reformatting arrays to compact syntax (e.g., `"required": ["data", "meta"]`). When the script regenerated the snapshot, `JSON.stringify(doc, null, 2)` produced expanded arrays. `git diff --exit-code` failed on every run.
- **Fix:** Added `packages/shared-openapi/openapi.v1.snapshot.json` to `.prettierignore`. Recommitted the snapshot in the script's native JSON.stringify format.
- **Files modified:** `.prettierignore`, `packages/shared-openapi/openapi.v1.snapshot.json`
- **Commit:** `5d651e8`

---

**Total deviations:** 3 auto-fixed (2 Rule 3 - blocking, 1 Rule 1 - bug)
**Impact on plan:** All fixes required for the CI gate to work reliably. No scope change.

## Issues Encountered

- `tsx` + NestJS Swagger + `emitDecoratorMetadata` is a known incompatibility (see esbuild #915). The tsc-compiled dist approach is the correct production pattern.
- Snapshot formatting must be stable across generate cycles — prettier must be excluded from the snapshot file.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- OpenAPI v1 surface is frozen. Mobile clients can generate networking code against `packages/shared-openapi/openapi.v1.snapshot.json`
- Phase 3 can begin implementing trip/plan endpoints — shapes are already documented and CI-gated
- Phase 4 can begin implementing auth endpoints — shapes are already documented and CI-gated
- ParksModule, TripsModule, AuthModule are registered in AppModule; Phase 3/4 implementors just add service/provider logic
- CI snapshot gate is live: any controller/DTO change without a committed snapshot update will fail the build

## Self-Check: PASSED

All 19 expected files exist on disk. All 3 task commits verified in git history (0bdeea4, df1b3ae, 5d651e8). Snapshot regeneration + git diff --exit-code confirms CI gate is stable.

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
