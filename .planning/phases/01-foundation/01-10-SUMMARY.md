---
phase: 01-foundation
plan: "10"
subsystem: api
tags: [nestjs, interceptor, disclaimer, legl-02, openapi, swagger, response-envelope]

# Dependency graph
requires:
  - phase: 01-02
    provides: NestJS API project structure with Fastify adapter and Swagger setup
  - phase: 01-06
    provides: DB schema with LEGL-07 compliance patterns
provides:
  - Global NestJS HTTP response envelope interceptor (X-WW-Disclaimer header + data/meta body)
  - "@SkipEnvelope() decorator for health checks and raw responses"
  - "@ApiEnvelopedResponse() decorator for OpenAPI spec generation with envelope awareness"
  - "ApiResponseDto<T> and ApiMetaDto type definitions"
  - DISCLAIMER constant (inline, LEGL-02 compliant)
affects:
  - All future NestJS API controllers (must use @ApiEnvelopedResponse for correct OpenAPI spec)
  - Mobile client code generation (Swift OpenAPI Generator, Ktor OpenAPI Generator)
  - Phase 02+ API endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - APP_INTERCEPTOR DI registration pattern for interceptors requiring Reflector
    - Response envelope pattern with data/meta structure
    - @SkipEnvelope() escape hatch for non-JSON responses
    - @ApiEnvelopedResponse() for OpenAPI envelope-aware spec

key-files:
  created:
    - apps/api/src/common/interceptors/response-envelope.interceptor.ts
    - apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts
    - apps/api/src/common/decorators/skip-envelope.decorator.ts
    - apps/api/src/common/decorators/api-enveloped-response.decorator.ts
    - apps/api/src/common/dto/api-response.dto.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "DISCLAIMER text inlined in interceptor (not imported from @wonderwaltz/content) due to CommonJS/ESM boundary between packages/content (ESM) and apps/api — comment in file documents this"
  - "APP_INTERCEPTOR DI registration used instead of app.useGlobalInterceptors() to enable Reflector injection for @SkipEnvelope() metadata reading"
  - "String/null/undefined/StreamableFile responses pass through without body wrapping but still get X-WW-Disclaimer header"

patterns-established:
  - "Response envelope: all JSON responses wrapped in { data, meta: { disclaimer } }"
  - "LEGL-02 pattern: X-WW-Disclaimer header on every HTTP response"
  - "@SkipEnvelope() on handler method to bypass envelope (health checks, streams)"
  - "@ApiEnvelopedResponse(DtoClass) replaces @ApiOkResponse on all controllers"

requirements-completed: [LEGL-02, LEGL-03]

# Metrics
duration: 36min
completed: 2026-04-14
---

# Phase 01 Plan 10: Response Envelope Interceptor Summary

**NestJS global interceptor adding X-WW-Disclaimer header + { data, meta: { disclaimer } } wrapper to all JSON responses, with @SkipEnvelope() escape hatch and @ApiEnvelopedResponse() for envelope-aware OpenAPI spec**

## Performance

- **Duration:** 36 min
- **Started:** 2026-04-14T09:31:43Z
- **Completed:** 2026-04-14T10:08:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- ResponseEnvelopeInterceptor adds X-WW-Disclaimer header and wraps JSON responses in { data, meta: { disclaimer } } (LEGL-02)
- @SkipEnvelope() decorator allows bypassing the envelope for health checks and raw responses
- @ApiEnvelopedResponse() generates correct OpenAPI spec so Swift/Ktor client generators produce envelope-aware types
- Interceptor registered globally via APP_INTERCEPTOR (DI-aware, supports Reflector for metadata reading)
- All 5 unit tests pass covering wrapping, header, string passthrough, skip decorator, and LEGL-02 disclaimer text

## Task Commits

Each task was committed atomically:

1. **Task 1: Response envelope interceptor + SkipEnvelope decorator** - `23e752b` (feat)
2. **Task 2: ApiEnvelopedResponse decorator + register interceptor globally** - `4e99f97` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN)_

## Files Created/Modified
- `apps/api/src/common/interceptors/response-envelope.interceptor.ts` - Global NestJS interceptor (DISCLAIMER constant, header + envelope logic)
- `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts` - 5 unit tests (replaces placeholder)
- `apps/api/src/common/decorators/skip-envelope.decorator.ts` - @SkipEnvelope() decorator
- `apps/api/src/common/decorators/api-enveloped-response.decorator.ts` - @ApiEnvelopedResponse() for OpenAPI
- `apps/api/src/common/dto/api-response.dto.ts` - ApiResponseDto<T> and ApiMetaDto type definitions
- `apps/api/src/app.module.ts` - Added APP_INTERCEPTOR provider registration

## Decisions Made
- DISCLAIMER text inlined in interceptor (not imported from @wonderwaltz/content) due to CommonJS/ESM boundary between packages. Comment in file documents this, and update instruction if disclaimer.en.json changes.
- APP_INTERCEPTOR DI registration used instead of app.useGlobalInterceptors() — required for Reflector injection that powers @SkipEnvelope().
- String/null/undefined responses pass through body unwrapped (but still get the header). StreamableFile objects (detected via 'file' key) also pass through unwrapped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unsafe return type in interceptor**
- **Found during:** Task 1 (commit attempt)
- **Issue:** ESLint @typescript-eslint/no-unsafe-return error on `return next.handle()` in skipEnvelope branch — Observable<any> not assignable to return type
- **Fix:** Added explicit cast `as Observable<EnvelopedResponse<T> | T>` on the skipEnvelope return path
- **Files modified:** apps/api/src/common/interceptors/response-envelope.interceptor.ts
- **Verification:** ESLint passes, typecheck passes, all 5 tests pass
- **Committed in:** 23e752b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary type safety fix. No scope creep.

## Issues Encountered
- Commit message subject-case validation rejected "ApiEnvelopedResponse" as sentence-case — lowercased to "add ApiEnvelopedResponse..." to satisfy commitlint.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ResponseEnvelopeInterceptor is live globally — all future API controllers automatically get the envelope
- Controllers should use @ApiEnvelopedResponse(DtoClass) instead of @ApiOkResponse for correct OpenAPI spec
- Health check endpoints must use @SkipEnvelope() to return raw string responses
- LEGL-02 compliance: disclaimer on every response from day one

---
*Phase: 01-foundation*
*Completed: 2026-04-14*
