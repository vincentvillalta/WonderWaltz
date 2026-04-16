---
phase: 04-entitlements-accounts
verified: 2026-04-17T00:10:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
human_verification:
  - test: "POST /v1/auth/anonymous with a live Supabase project returns a usable JWT"
    expected: "201 response with access_token, user_id, expires_at. Token must pass supabase.auth.getUser()."
    why_human: "JWT signing uses SUPABASE_JWT_SECRET env var. Integration only verifiable against a live project; unit tests mock Supabase admin."
  - test: "Sign in with Apple / Google OAuth merge (POST /v1/auth/upgrade) works end-to-end"
    expected: "Client completes linkIdentity via Supabase SDK, then POSTs to /v1/auth/upgrade; public.users row shows is_anonymous=false and email set."
    why_human: "Requires live Apple/Google OAuth flow and Supabase project — cannot verify programmatically."
  - test: "RevenueCat webhook INITIAL_PURCHASE received from live RevenueCat → trip unlocked"
    expected: "entitlements row created with state='active', trips.entitlement_state = 'unlocked'. Requires REVENUECAT_WEBHOOK_AUTH_KEY env var."
    why_human: "Requires live RevenueCat account, sandbox purchase, and running API with real DB."
  - test: "DELETE /v1/users/me followed by a login attempt is rejected with 403"
    expected: "After soft-delete, any request with the old JWT should return 403 account_deleted."
    why_human: "Requires live Supabase instance to verify guard behavior after real deletion."
---

# Phase 4: Entitlements & Accounts Verification Report

**Phase Goal:** Users can create anonymous accounts, upgrade to Sign in with Apple or Google, purchase a trip unlock, receive refunds, delete their accounts with full data cascade, and restore purchases across devices — all correctly reflected in backend entitlement state.
**Verified:** 2026-04-17T00:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | POST /v1/auth/anonymous returns JWT access_token, user_id, expires_at | VERIFIED | `auth.controller.ts` calls `authService.createAnonymousUser()` at 201; service uses Supabase admin.createUser + jose JWT signing; 5/5 unit tests pass |
| 2 | Anonymous user row created in public.users with is_anonymous=true | VERIFIED | `auth.service.ts` line 80: `INSERT INTO users ... is_anonymous=true ... ON CONFLICT DO NOTHING` |
| 3 | SupabaseAuthGuard validates JWTs and blocks soft-deleted users | VERIFIED | `auth.guard.ts` calls `supabase.auth.getUser(token)` and queries `deleted_at`; 5+1 guard tests pass |
| 4 | POST /v1/auth/upgrade syncs upgraded identity to public.users | VERIFIED | `auth.service.ts:130` UPDATE sets `is_anonymous=false, email=...`; controller uses `@UseGuards(SupabaseAuthGuard)` |
| 5 | GET /v1/users/me returns profile including is_anonymous, email, created_at | VERIFIED | `users.controller.ts` calls `usersService.getUserProfile()` behind `@UseGuards(SupabaseAuthGuard)` |
| 6 | AUTH-04: Anonymous users rejected from purchase endpoints with 403 | VERIFIED | `anonymous-purchase.guard.ts` throws 403 upgrade_required when isAnonymous=true; applied to PurchasesController |
| 7 | AUTH-06: New device sign-in restores trips via user_id linkage | VERIFIED | Trips are user_id-keyed in DB; SupabaseAuthGuard attaches same user.id for any valid JWT; UsersService.getUserProfile scoped by user_id |
| 8 | POST /v1/webhooks/revenuecat processes all 5 IAP-04 event types | VERIFIED | `webhook.service.ts` handles INITIAL_PURCHASE, NON_RENEWING_PURCHASE, REFUND, CANCELLATION, EXPIRATION; 8/8 service tests pass |
| 9 | Webhook bearer token authorization verified | VERIFIED | `webhook.guard.ts` compares Authorization header to `REVENUECAT_WEBHOOK_AUTH_KEY`; 2 guard tests pass |
| 10 | INITIAL_PURCHASE creates entitlement and unlocks trip | VERIFIED | `entitlement.service.ts` INSERT with ON CONFLICT DO NOTHING; `unlockTrip` sets `entitlement_state='unlocked'` |
| 11 | REFUND revokes entitlement and locks trip | VERIFIED | `revokeEntitlement` sets state='refunded'; `lockTrip` sets `entitlement_state='free'` |
| 12 | All webhook events logged to iap_events with raw payload | VERIFIED | `logRawEvent` is called before switch statement for every event type |
| 13 | POST /v1/purchases/restore calls RevenueCat REST API and reconciles entitlements | VERIFIED | `purchases.service.ts:52` fetches `https://api.revenuecat.com/v1/subscribers/${userId}`; 5/5 tests pass |
| 14 | DELETE /v1/users/me soft-deletes, revokes entitlements, schedules 30-day purge | VERIFIED | `account-deletion.service.ts` sets deleted_at, revokes entitlements, enqueues BullMQ job with 30-day delay |
| 15 | PurgeProcessor cascade-deletes all 14 tables + Supabase auth | VERIFIED | `purge.processor.ts` executes 14 DELETE statements in FK-safe order, calls `supabase.auth.admin.deleteUser`; 3 processor tests pass |
| 16 | Anonymous users limited to 1 trip server-side (AUTH-02) | VERIFIED | `anonymous-trip-limit.guard.ts` applied to POST /trips via `@UseGuards(SupabaseAuthGuard, AnonymousTripLimitGuard)` in trips.controller.ts line 56 |

**Score:** 16/16 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/auth/auth.guard.ts` | Supabase JWT validation guard | VERIFIED | 84 lines; exports SupabaseAuthGuard + RequestUser interface |
| `apps/api/src/auth/auth.guard.spec.ts` | Guard unit tests | VERIFIED | 132 lines; 6 tests covering all behaviors |
| `apps/api/src/auth/auth.service.ts` | Supabase Auth admin operations | VERIFIED | 141 lines; createAnonymousUser + upgradeUser |
| `apps/api/src/auth/auth.service.spec.ts` | Auth service unit tests | VERIFIED | 153 lines; 5 tests including AUTH-05 returning user |
| `apps/api/src/auth/auth.controller.ts` | Auth endpoints | VERIFIED | POST /v1/auth/anonymous (201) + POST /v1/auth/upgrade (200) |
| `apps/api/src/auth/users.service.ts` | User profile operations | VERIFIED | getUserProfile + getTripsCount both implemented with real SQL |
| `apps/api/src/auth/users.service.spec.ts` | User service unit tests | VERIFIED | Exists and substantive |
| `apps/api/src/auth/users.controller.ts` | User profile + delete endpoints | VERIFIED | GET /v1/users/me + DELETE /v1/users/me behind SupabaseAuthGuard |
| `apps/api/src/auth/anonymous-purchase.guard.ts` | Blocks anonymous purchasers | VERIFIED | 38 lines; throws 403 upgrade_required |
| `apps/api/src/auth/anonymous-purchase.guard.spec.ts` | Guard tests | VERIFIED | Exists and substantive |
| `apps/api/src/auth/anonymous-trip-limit.guard.ts` | 1-trip limit for anonymous users | VERIFIED | 37 lines; injects UsersService.getTripsCount |
| `apps/api/src/auth/anonymous-trip-limit.guard.spec.ts` | Trip limit guard tests | VERIFIED | Exists and substantive |
| `apps/api/src/webhooks/webhook.controller.ts` | RevenueCat webhook endpoint | VERIFIED | @SkipEnvelope, @UseGuards(WebhookAuthGuard), returns {ok:true} |
| `apps/api/src/webhooks/webhook.service.ts` | Webhook event processing | VERIFIED | 140 lines; full switch on all 5 event types |
| `apps/api/src/webhooks/webhook.guard.ts` | Webhook auth verification | VERIFIED | Compares Authorization vs REVENUECAT_WEBHOOK_AUTH_KEY |
| `apps/api/src/webhooks/webhook.service.spec.ts` | Webhook service tests | VERIFIED | 149 lines; 8 tests covering all event types |
| `apps/api/src/entitlements/entitlement.service.ts` | Entitlement CRUD operations | VERIFIED | 115 lines; createEntitlement/revoke/unlockTrip/lockTrip/getBy* |
| `apps/api/src/entitlements/entitlement.service.spec.ts` | Entitlement tests | VERIFIED | 72 lines |
| `apps/api/src/purchases/purchases.service.ts` | RevenueCat subscriber lookup + restore | VERIFIED | 106 lines; real fetch call to RC API |
| `apps/api/src/purchases/purchases.service.spec.ts` | Purchases tests | VERIFIED | 5 tests pass |
| `apps/api/src/account-deletion/account-deletion.service.ts` | Soft-delete + entitlement revocation | VERIFIED | 89 lines; confirmed check, deleted_at, purge enqueue |
| `apps/api/src/account-deletion/purge.processor.ts` | 30-day delayed purge BullMQ processor | VERIFIED | 127 lines; 14 DELETE statements + auth.admin.deleteUser |
| `apps/api/src/account-deletion/purge.processor.spec.ts` | Purge processor tests | VERIFIED | 3 tests pass including idempotency |
| `docs/app-store/review-notes-draft.md` | IAP-06 App Store review notes | VERIFIED | Exists; explains consumable model "each $9.99 applies to one trip" |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shared-infra.module.ts` | `@supabase/supabase-js` | SUPABASE_ADMIN_TOKEN provider | VERIFIED | line 27: `provide: SUPABASE_ADMIN_TOKEN`, line 40: `createClient(...)`, exported at line 90 |
| `auth.guard.ts` | `supabase.auth.getUser` | JWT validation | VERIFIED | line 54: `this.supabase.auth.getUser(token)` |
| `auth.controller.ts` | `auth.service.ts` | DI injection | VERIFIED | `constructor(private readonly authService: AuthService)` + `AuthService` in upgrade pattern |
| `auth.service.ts` | `public.users` | upgrade sync UPDATE | VERIFIED | line 130: `SET is_anonymous = false, email = ...` |
| `users.controller.ts` | `users.service.ts` | DI injection | VERIFIED | `constructor(private readonly usersService: UsersService)` |
| `webhook.controller.ts` | `webhook.service.ts` | DI injection | VERIFIED | `constructor(private readonly webhookService: WebhookService)` + `@UseGuards(WebhookAuthGuard)` |
| `webhook.service.ts` | `entitlement.service.ts` | DI injection for entitlement mutation | VERIFIED | line 42: `private readonly entitlementService: EntitlementService` |
| `entitlement.service.ts` | `entitlements` table | drizzle INSERT/UPDATE | VERIFIED | INSERT at line 50; UPDATE at line 69 |
| `purchases.service.ts` | RevenueCat REST API v1 | HTTP GET /v1/subscribers/{userId} | VERIFIED | line 52: `fetch('https://api.revenuecat.com/v1/subscribers/${userId}')` |
| `account-deletion.service.ts` | BullMQ purge-account queue | delayed job enqueue | VERIFIED | line 70: `this.purgeQueue.add('purge-account', ..., { delay: THIRTY_DAYS_MS })` |
| `purge.processor.ts` | 14 DB tables + Supabase auth | cascade DELETE | VERIFIED | 14 SQL DELETE statements + `supabase.auth.admin.deleteUser` |
| `anonymous-trip-limit.guard.ts` | `users.service.ts` | getTripsCount injection | VERIFIED | line 26: `this.usersService.getTripsCount(user.id)` |
| `trips.controller.ts` | `auth.guard.ts` | @UseGuards(SupabaseAuthGuard) | VERIFIED | line 43: `@UseGuards(SupabaseAuthGuard)` on controller; line 56: `@UseGuards(SupabaseAuthGuard, AnonymousTripLimitGuard)` on POST create |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 04-01 | Anonymous device-linked account via Supabase Auth | SATISFIED | POST /v1/auth/anonymous + auth.service.createAnonymousUser |
| AUTH-02 | 04-05 | Create trip + free Day 1 teaser without signing up; 1-trip limit | SATISFIED | AnonymousTripLimitGuard on POST /trips; entitlement projection from Phase 3 |
| AUTH-03 | 04-02 | Upgrade anonymous to Apple/Google; preserves trips | SATISFIED | POST /v1/auth/upgrade syncs identity; trips preserved via stable user_id |
| AUTH-04 | 04-02 | Account upgrade required before IAP; server-side enforcement | SATISFIED | AnonymousPurchaseGuard on PurchasesController |
| AUTH-05 | 04-01 | Log out and back in on same device preserving trips | SATISFIED | ON CONFLICT DO NOTHING insert + stable user_id linkage (test 5 in auth.service.spec.ts) |
| AUTH-06 | 04-02 | Sign in on new device restores trips | SATISFIED | Trips are user_id-keyed; new JWT with same user_id passes guard and returns same data |
| AUTH-07 | 04-04 | Delete account with cascade within 30 days | SATISFIED | DELETE /v1/users/me + AccountDeletionService + PurgeProcessor 14-table cascade |
| IAP-01 | 04-03 | Single consumable IAP product configured in app stores | NEEDS HUMAN | Dashboard/SDK config — no backend code; documented in SUMMARY as external config |
| IAP-02 | 04-03 | StoreKit 2 (iOS) + Google Play Billing (Android) via RevenueCat | NEEDS HUMAN | Mobile SDK config — no backend code; documented as external config |
| IAP-03 | 04-03 | Purchase flow: paywall → RevenueCat receipt validation → webhook → entitlement | SATISFIED | webhook.service.ts processes INITIAL_PURCHASE end-to-end |
| IAP-04 | 04-03 | Webhook handles INITIAL_PURCHASE, REFUND, CANCELLATION, EXPIRATION, NON_RENEWING_PURCHASE | SATISFIED | All 5 event types handled in WebhookService; 8 tests pass |
| IAP-05 | 04-04 | Restore purchases via RevenueCat SDK + backend reconciliation | SATISFIED | POST /v1/purchases/restore calls RC API and creates missing entitlements idempotently |
| IAP-06 | 04-05 | App Store review notes explain consumable model | SATISFIED | `docs/app-store/review-notes-draft.md` exists with correct consumable explanation |
| IAP-07 | 04-03 | Affiliate links rewritten server-side with tag | SATISFIED | AffiliateService from Phase 3 handles this; noted in WebhookService comment; no Phase 4 code needed |
| LEGL-06 | 04-04 | Account deletion cascades across all data tables (GDPR+CCPA+COPPA) | SATISFIED | PurgeProcessor: 14-table cascade + Supabase auth deletion, 30-day delayed BullMQ job |

**Note on IAP-01, IAP-02:** These requirements are App Store Connect / Google Play Console configuration and mobile SDK setup. They have no backend API implementation and were correctly identified in the plans as external configuration steps. Verification requires human confirmation of the RevenueCat dashboard setup.

### Anti-Patterns Found

No blocker or warning anti-patterns detected. Scan of all modified files found:
- Zero TODO/FIXME/HACK/placeholder comments in production code
- Zero stub return patterns (no `return null`, `return {}`, or empty handlers in controllers)
- No 501 status codes remaining (auth.controller.ts returns 201/200 as specified)
- All handlers delegate to real service implementations

### Human Verification Required

#### 1. Supabase Anonymous Auth Integration

**Test:** Call `POST /v1/auth/anonymous` against a staging environment with real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET` set.
**Expected:** 201 response with valid JWT. The returned access_token passes `supabase.auth.getUser()` and `auth.users` shows a new row.
**Why human:** JWT is signed with SUPABASE_JWT_SECRET. Only a live Supabase project can verify the token is accepted by the Supabase auth service.

#### 2. Apple/Google OAuth Upgrade Flow

**Test:** On a device, create an anonymous session, then use Sign in with Apple or Google via the Supabase SDK's `linkIdentity`. After merge, call `POST /v1/auth/upgrade` with the new JWT.
**Expected:** `GET /v1/users/me` returns `is_anonymous: false` and the correct email. All previously created trips remain accessible.
**Why human:** Requires live OAuth provider, native device, and Supabase project.

#### 3. RevenueCat Webhook Live Integration

**Test:** Configure RevenueCat sandbox with `REVENUECAT_WEBHOOK_AUTH_KEY`. Trigger a test purchase. Verify webhook is received at `POST /v1/webhooks/revenuecat`.
**Expected:** `iap_events` row inserted, `entitlements` row created with state='active', `trips.entitlement_state = 'unlocked'`.
**Why human:** Requires RevenueCat sandbox account, live API, and database inspection.

#### 4. IAP-01 / IAP-02: App Store and Google Play Product Configuration

**Test:** Confirm that the `trip_unlock` consumable product is configured at $9.99 in App Store Connect and Google Play Console. Confirm RevenueCat SDK is initialized with the correct app IDs.
**Expected:** Product visible in sandbox purchases. RevenueCat dashboard shows the product in the entitlement mapping.
**Why human:** External dashboard configuration — no backend API to verify.

### Summary

Phase 4 achieves its goal. All 16 observable truths are verified against the actual codebase. Every artifact is substantive (no stubs, no placeholder returns). All key links are wired (DI injections verified, SQL operations confirmed, BullMQ queue registered in both AppModule and WorkerModule).

The full test suite runs 51 tests across 11 spec files, all passing in 442ms. The OpenAPI snapshot contains all 6 new endpoints (`/v1/auth/anonymous`, `/v1/auth/upgrade`, `/v1/users/me`, `/v1/users/me DELETE`, `/v1/webhooks/revenuecat`, `/v1/purchases/restore`). The 30-day purge cascade covers all 14 required tables. IAP-01 and IAP-02 are correctly classified as external mobile SDK/dashboard configuration with no backend implementation required.

---

_Verified: 2026-04-17T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
