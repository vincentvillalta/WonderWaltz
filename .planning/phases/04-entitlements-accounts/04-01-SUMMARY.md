---
phase: 04-entitlements-accounts
plan: 01
subsystem: auth
tags: [supabase, jwt, jose, anonymous-auth, nestjs-guard]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SharedInfraModule with DB_TOKEN and REDIS_CLIENT_TOKEN
  - phase: 01-foundation
    provides: users table schema with is_anonymous, deleted_at fields
provides:
  - SUPABASE_ADMIN_TOKEN globally injectable via SharedInfraModule
  - SupabaseAuthGuard for JWT validation on protected routes
  - AuthService for anonymous user creation
  - POST /v1/auth/anonymous endpoint returning JWT
affects: [04-entitlements-accounts, 05-ios, 07-android]

# Tech tracking
tech-stack:
  added: [jose]
  patterns: [ESM dynamic import for jose in CJS NestJS, custom JWT signing with SUPABASE_JWT_SECRET]

key-files:
  created:
    - apps/api/src/auth/auth.guard.ts
    - apps/api/src/auth/auth.guard.spec.ts
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/auth.service.spec.ts
  modified:
    - apps/api/src/shared-infra.module.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/auth.module.ts

key-decisions:
  - "jose used for JWT signing via dynamic import — ESM-only library requires import() in CJS NestJS context"
  - "Custom JWT signed with SUPABASE_JWT_SECRET rather than Supabase admin session API — admin.createUser does not return a session; custom JWT is validated by supabase.auth.getUser"
  - "SUPABASE_ADMIN_TOKEN returns stub when env vars missing — unit tests run without Supabase credentials"

patterns-established:
  - "SupabaseAuthGuard pattern: inject SUPABASE_ADMIN_TOKEN + DB_TOKEN, validate via auth.getUser, check soft-delete, attach request.user"
  - "ESM dynamic import for jose: module-level async function caches imported class"

requirements-completed: [AUTH-01, AUTH-05]

# Metrics
duration: 5min
completed: 2026-04-16
---

# Phase 04 Plan 01: Supabase Auth Foundation Summary

**Supabase JWT guard + anonymous auth endpoint using jose for custom token signing, with soft-delete blocking and idempotent user sync**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T21:30:58Z
- **Completed:** 2026-04-16T21:36:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- SUPABASE_ADMIN_TOKEN provider added to SharedInfraModule, globally available for injection
- SupabaseAuthGuard validates JWTs via Supabase, blocks soft-deleted users (403), attaches user context
- POST /v1/auth/anonymous creates anonymous Supabase user, syncs to public.users, returns signed JWT
- AUTH-05 verified: returning user re-authenticates with stable user_id, ON CONFLICT DO NOTHING preserves existing data

## Task Commits

Each task was committed atomically:

1. **Task 1: SUPABASE_ADMIN_TOKEN provider + SupabaseAuthGuard** - `e7694eb` (feat)
2. **Task 2: AuthService + POST /v1/auth/anonymous** - `aeedc18` (feat)

## Files Created/Modified
- `apps/api/src/auth/auth.guard.ts` - SupabaseAuthGuard: JWT validation, soft-delete check, request.user attachment
- `apps/api/src/auth/auth.guard.spec.ts` - 6 unit tests for guard behavior
- `apps/api/src/auth/auth.service.ts` - AuthService: anonymous user creation via Supabase admin + custom JWT signing
- `apps/api/src/auth/auth.service.spec.ts` - 5 unit tests for service behavior
- `apps/api/src/auth/auth.controller.ts` - Replaced 501 stub with 201 anonymous auth endpoint
- `apps/api/src/auth/auth.module.ts` - Added AuthService provider and export
- `apps/api/src/shared-infra.module.ts` - Added SUPABASE_ADMIN_TOKEN provider and createClient import

## Decisions Made
- Used jose library (ESM-only) with dynamic import pattern for JWT signing in CJS NestJS context
- Custom JWT signed with SUPABASE_JWT_SECRET env var since Supabase admin.createUser does not return a session/token
- SUPABASE_ADMIN_TOKEN factory returns a stub object when env vars are missing, allowing unit tests to run without live Supabase
- DrizzleDb duck-type interface used for DB access (same pattern as QueueTimesService, LagAlertService)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jose ESM/CJS boundary**
- **Found during:** Task 2 (AuthService implementation)
- **Issue:** jose is ESM-only; static import `import { SignJWT } from 'jose'` fails tsc build with TS1479
- **Fix:** Replaced with module-level async `signJwt()` function using `await import('jose')` dynamic import
- **Files modified:** apps/api/src/auth/auth.service.ts
- **Verification:** `pnpm run build` passes clean
- **Committed in:** aeedc18 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** ESM dynamic import is the standard pattern in this project (mirrors DISCLAIMER inline, solver loader). No scope creep.

## Issues Encountered
None beyond the ESM boundary fix documented above.

## User Setup Required
None - no external service configuration required. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_JWT_SECRET env vars are already documented in SERVICES.md from Phase 1.

## Next Phase Readiness
- Auth guard and service are ready for use by all subsequent Phase 4 plans
- Entitlements, trips, and user management endpoints can now use SupabaseAuthGuard
- AuthService is exported for injection by other modules needing user creation/lookup

---
*Phase: 04-entitlements-accounts*
*Completed: 2026-04-16*
