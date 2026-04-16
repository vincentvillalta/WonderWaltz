---
phase: 04-entitlements-accounts
plan: 02
subsystem: auth
tags: [user-profile, account-upgrade, purchase-guard, nestjs-guard, supabase]

# Dependency graph
requires:
  - phase: 04-entitlements-accounts
    provides: SupabaseAuthGuard, AuthService, SUPABASE_ADMIN_TOKEN from Plan 01
  - phase: 01-foundation
    provides: users table schema with is_anonymous, deleted_at fields
provides:
  - UsersService for user profile queries and trip counting
  - GET /v1/users/me endpoint behind SupabaseAuthGuard
  - POST /v1/auth/upgrade endpoint for post-linkIdentity sync
  - AnonymousPurchaseGuard for AUTH-04 server-side enforcement
affects: [04-entitlements-accounts, 05-ios, 07-android]

# Tech tracking
tech-stack:
  added: []
  patterns: [AnonymousPurchaseGuard pattern for blocking anonymous users on purchase endpoints, exactOptionalPropertyTypes-safe DTO construction]

key-files:
  created:
    - apps/api/src/auth/users.service.ts
    - apps/api/src/auth/users.service.spec.ts
    - apps/api/src/auth/anonymous-purchase.guard.ts
    - apps/api/src/auth/anonymous-purchase.guard.spec.ts
  modified:
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/auth.module.ts
    - apps/api/src/auth/users.controller.ts
    - apps/api/src/shared/dto/auth.dto.ts

key-decisions:
  - "exactOptionalPropertyTypes-safe DTO: conditional assignment (if check + assign) instead of ?? undefined for optional email field"
  - "UserProfile interface uses index signature [key: string]: unknown for DrizzleDb generic constraint compatibility"

patterns-established:
  - "AnonymousPurchaseGuard: synchronous CanActivate guard reading request.user.isAnonymous set by prior SupabaseAuthGuard"
  - "UsersService duck-typed DrizzleDb pattern consistent with QueueTimesService, LagAlertService, AuthService"

requirements-completed: [AUTH-03, AUTH-04, AUTH-06]

# Metrics
duration: 3min
completed: 2026-04-16
---

# Phase 04 Plan 02: Account Upgrade Flow and User Profile Summary

**Account upgrade sync endpoint, user profile query service, and anonymous purchase guard for server-side AUTH-04 enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T21:38:44Z
- **Completed:** 2026-04-16T21:42:01Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- GET /v1/users/me returns authenticated user profile (id, email, is_anonymous, created_at) behind SupabaseAuthGuard
- POST /v1/auth/upgrade syncs post-linkIdentity merge to public.users (is_anonymous=false, email set), idempotent
- AnonymousPurchaseGuard rejects anonymous users from purchase endpoints with 403 upgrade_required (AUTH-04)
- UsersService.getTripsCount ready for anonymous trip limit guard in Plan 05

## Task Commits

Each task was committed atomically:

1. **Task 1: UsersService + GET /v1/users/me + POST /v1/auth/upgrade** - `9e1e111` (feat)
2. **Task 2: Anonymous purchase guard (AUTH-04)** - `afb6ee0` (feat)

## Files Created/Modified
- `apps/api/src/auth/users.service.ts` - UsersService: getUserProfile and getTripsCount queries
- `apps/api/src/auth/users.service.spec.ts` - 4 unit tests for UsersService
- `apps/api/src/auth/users.controller.ts` - Replaced 501 stub with authenticated GET /v1/users/me
- `apps/api/src/auth/auth.controller.ts` - Added POST /v1/auth/upgrade endpoint
- `apps/api/src/auth/auth.service.ts` - Added upgradeUser method for post-merge sync
- `apps/api/src/auth/auth.module.ts` - Added UsersService to providers and exports
- `apps/api/src/shared/dto/auth.dto.ts` - Added UpgradeResponseDto
- `apps/api/src/auth/anonymous-purchase.guard.ts` - AnonymousPurchaseGuard: 403 for anonymous, 401 for missing auth
- `apps/api/src/auth/anonymous-purchase.guard.spec.ts` - 3 unit tests for guard behavior

## Decisions Made
- Used conditional assignment pattern for optional email field to satisfy exactOptionalPropertyTypes TypeScript strict mode
- UserProfile interface includes index signature for DrizzleDb generic constraint compatibility
- AnonymousPurchaseGuard is synchronous (no async needed) since it only reads request.user already set by SupabaseAuthGuard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exactOptionalPropertyTypes TS build error on UserMeDto email field**
- **Found during:** Task 1 (UsersController implementation)
- **Issue:** `email: profile.email ?? undefined` not assignable to optional `email?: string` under exactOptionalPropertyTypes
- **Fix:** Used conditional assignment: `if (profile.email) { dto.email = profile.email; }`
- **Files modified:** apps/api/src/auth/users.controller.ts
- **Verification:** `pnpm run build` passes clean
- **Committed in:** 9e1e111 (Task 1 commit)

**2. [Rule 1 - Bug] DrizzleDb generic constraint requires index signature**
- **Found during:** Task 1 (UsersService implementation)
- **Issue:** `UserProfile` interface does not satisfy `Record<string, unknown>` constraint in DrizzleDb.execute generic
- **Fix:** Added `[key: string]: unknown` index signature to UserProfile interface
- **Files modified:** apps/api/src/auth/users.service.ts
- **Verification:** `pnpm run build` passes clean
- **Committed in:** 9e1e111 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both were TypeScript strict-mode compatibility fixes. No scope creep.

## Issues Encountered
None beyond the TypeScript strict-mode fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UsersService exported for injection by future modules needing user profile or trip count
- AnonymousPurchaseGuard ready to apply on purchase endpoints in Plans 03-04
- POST /v1/auth/upgrade ready for iOS/Android client integration in Phases 5/7
- AUTH-06 (new device sign-in) works naturally through Supabase auth + user_id linkage

---
*Phase: 04-entitlements-accounts*
*Completed: 2026-04-16*
