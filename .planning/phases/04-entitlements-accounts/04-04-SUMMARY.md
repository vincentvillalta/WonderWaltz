---
phase: 04-entitlements-accounts
plan: 04
subsystem: payments
tags: [revenuecat, account-deletion, gdpr, bullmq, purge-cascade, iap-restore]

requires:
  - phase: 04-entitlements-accounts
    provides: "EntitlementService CRUD + WebhookAuthGuard (04-03)"
  - phase: 04-entitlements-accounts
    provides: "AnonymousPurchaseGuard (04-02)"
provides:
  - "POST /v1/purchases/restore endpoint"
  - "DELETE /v1/users/me endpoint with double-tap confirmation"
  - "PurgeProcessor for 30-day delayed cascade delete"
  - "AccountDeletionService for soft-delete + entitlement revocation"
affects: [05-ios, 06-ios-polish, 08-legal]

tech-stack:
  added: []
  patterns: [revenucat-rest-api-restore, soft-delete-with-delayed-purge, fk-safe-cascade-delete, double-tap-confirmation]

key-files:
  created:
    - apps/api/src/purchases/purchases.service.ts
    - apps/api/src/purchases/purchases.controller.ts
    - apps/api/src/purchases/purchases.module.ts
    - apps/api/src/purchases/purchases.service.spec.ts
    - apps/api/src/account-deletion/account-deletion.service.ts
    - apps/api/src/account-deletion/account-deletion.module.ts
    - apps/api/src/account-deletion/purge.processor.ts
    - apps/api/src/account-deletion/account-deletion.service.spec.ts
    - apps/api/src/account-deletion/purge.processor.spec.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/worker.module.ts
    - apps/api/src/auth/users.controller.ts
    - apps/api/src/auth/auth.module.ts
    - apps/api/src/shared/dto/auth.dto.ts

key-decisions:
  - "PurgeProcessor uses Injectable() not @Processor() -- allows direct test instantiation without BullMQ dependency"
  - "AccountDeletionModule imported by AuthModule (not AppModule directly) -- keeps DI chain clean via UsersController dependency"
  - "BullQueue_account-purge token derived from queue name for DI injection in AccountDeletionService"
  - "Purge cascade uses 14 sequential DELETE statements in FK-safe order with per-statement try/catch for best-effort execution"

patterns-established:
  - "Soft-delete pattern: UPDATE deleted_at + WHERE IS NULL for idempotency"
  - "Double-tap confirm: confirmed:true required in request body for destructive operations"
  - "RevenueCat REST API: fetch with Bearer auth + X-Platform header"
  - "Delayed BullMQ jobs: 30-day delay with exponential backoff retries"

requirements-completed: [IAP-05, AUTH-07, LEGL-06]

duration: 6min
completed: 2026-04-16
---

# Phase 4 Plan 4: Purchase Restore + Account Deletion Summary

**RevenueCat purchase restore via REST API with entitlement reconciliation, soft-delete account deletion with 30-day BullMQ purge cascade across 14 tables + Supabase auth**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-16T21:51:09Z
- **Completed:** 2026-04-16T21:57:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- POST /v1/purchases/restore queries RevenueCat REST API, reconciles entitlements, unlocks trips for new purchases
- DELETE /v1/users/me with confirmed:true soft-deletes user, revokes entitlements, schedules 30-day purge
- PurgeProcessor cascades DELETE across all 14 tables (plan_items, plan_days, packing_list_items, affiliate_items, plans, guests, trip_park_days, trip_preferences, entitlements, iap_events, llm_costs, push_tokens, trips, users) then removes Supabase auth record
- All operations idempotent: duplicate restore is no-op, double delete is safe, re-purge on empty rows is no-op
- 12 tests across 3 spec files, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: PurchasesService + POST /v1/purchases/restore** - `c28c98f` (feat)
2. **Task 2: AccountDeletionService + DELETE /v1/users/me + PurgeProcessor** - `091c471` (feat)

## Files Created/Modified
- `apps/api/src/purchases/purchases.service.ts` - RevenueCat subscriber lookup and restore reconciliation
- `apps/api/src/purchases/purchases.controller.ts` - POST /v1/purchases/restore with auth guards
- `apps/api/src/purchases/purchases.module.ts` - NestJS module importing EntitlementModule
- `apps/api/src/purchases/purchases.service.spec.ts` - 5 tests for restore flow
- `apps/api/src/account-deletion/account-deletion.service.ts` - Soft-delete + entitlement revocation + purge scheduling
- `apps/api/src/account-deletion/account-deletion.module.ts` - BullMQ queue registration + providers
- `apps/api/src/account-deletion/purge.processor.ts` - 30-day delayed cascade across 14 tables
- `apps/api/src/account-deletion/account-deletion.service.spec.ts` - 4 tests for deletion service
- `apps/api/src/account-deletion/purge.processor.spec.ts` - 3 tests for purge cascade
- `apps/api/src/app.module.ts` - Added PurchasesModule
- `apps/api/src/worker.module.ts` - Added AccountDeletionModule + account-purge queue
- `apps/api/src/auth/users.controller.ts` - Added DELETE /v1/users/me endpoint
- `apps/api/src/auth/auth.module.ts` - Imported AccountDeletionModule
- `apps/api/src/shared/dto/auth.dto.ts` - Added DeleteAccountDto + DeleteAccountResponseDto

## Decisions Made
- PurgeProcessor uses Injectable() not @Processor() -- allows direct test instantiation without BullMQ test infrastructure; module handles BullMQ registration
- AccountDeletionModule imported by AuthModule rather than AppModule directly -- UsersController has the DELETE endpoint, so AuthModule needs the DI chain
- BullQueue_account-purge injection token matches NestJS BullMQ naming convention for @InjectQueue
- Purge cascade uses per-statement try/catch -- best-effort deletion with retry (3 attempts, exponential backoff) ensures eventual consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. REVENUECAT_API_KEY env var must be set in production (already provisioned via SERVICES.md).

## Next Phase Readiness
- Purchase restore flow complete for iOS client integration (Phase 5)
- Account deletion meets GDPR/CCPA/COPPA 30-day purge requirement (LEGL-06)
- All user lifecycle endpoints operational: create (anonymous), upgrade (email), restore purchases, delete account

---
*Phase: 04-entitlements-accounts*
*Completed: 2026-04-16*
