# Phase 4: Entitlements & Accounts - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create anonymous accounts, upgrade to Sign in with Apple or Google, purchase a trip unlock, receive refunds, delete their accounts with full data cascade, and restore purchases across devices — all correctly reflected in backend entitlement state.

Requirements in scope: AUTH-01..07, IAP-01..07, LEGL-06 (15 requirement IDs).

Not in this phase: mobile UI for paywall (Phase 6), StoreKit 2 / Play Billing client-side code (Phase 5/6/7), admin panel entitlement grants (Phase 8), LLM budget top-up IAP SKU (deferred — Phase 3 published the 402 contract only).

</domain>

<decisions>
## Implementation Decisions

### Anonymous-to-registered upgrade flow
- Upgrade prompt **only at paywall** — no nudges, no periodic prompts. User stays anonymous until they tap "Unlock Trip $9.99"
- Anonymous users can create **exactly one trip** before upgrading. Prevents abuse; matches the "teaser" mental model
- If merge fails (Apple/Google account already linked to another WonderWaltz account): **block with clear error message** — "This account is already linked to another WonderWaltz account. Sign in with that account instead." No silent merge, no data loss
- After successful merge: **silent JWT refresh** + brief success toast ("Account linked!"). No full-screen confirmation. User proceeds directly to paywall
- Backend implements Supabase Auth `linkIdentity` for the merge; new JWT issued automatically post-merge

### RevenueCat webhook handling
- Process **all IAP-04 events**: INITIAL_PURCHASE, REFUND, CANCELLATION, EXPIRATION, NON_RENEWING_PURCHASE — even if some don't apply to consumables now, handle them for future-proofing
- All webhook events logged to `iap_events` table with raw payload regardless of whether they trigger an entitlement mutation
- **HMAC signature verification** on webhook endpoint — compute HMAC-SHA256 of raw body and compare to RevenueCat's signing key header. Stronger than bearer token
- **Client polls, webhook is source of truth** for purchase confirmation race condition: client shows optimistic "processing" state after StoreKit confirms, polls `GET /plans/:id` every 2s for up to 15s. If timeout, show "Purchase received, unlocking shortly" with manual retry
- On **REFUND**: plan is **completely hidden** (not re-locked). Trip wizard data remains but plan view shows "Plan unavailable — purchase required." User can re-purchase to get a new plan
- Webhook idempotency enforced via `revenuecat_id` unique constraint on `entitlements` table (already in schema)

### Account deletion cascade
- **Soft delete + 30-day grace period**: mark user as deleted immediately (`deletedAt` timestamp on `users` table). Block all API access for deleted users. Background purge job runs after 30 days
- User can contact support to cancel deletion within the 30-day grace window
- Active entitlements **revoked immediately** on deletion request. If user cancels deletion within grace period, entitlement is restored
- **Local data only** deleted during purge. RevenueCat subscriber record is kept — if user re-creates account with same Apple ID, RC restore still works. Simplifies compliance with Apple/Google purchase records
- Purge cascade covers: `trips`, `guests`, `trip_park_days`, `trip_preferences`, `plans`, `plan_days`, `plan_items`, `entitlements`, `iap_events`, `push_tokens`, `llm_costs`, `packing_list_items`, `affiliate_items`, and the `users` row itself
- Supabase Auth user record deleted as part of the purge (via admin API)
- Confirmation UX: **double-tap confirm** — first tap shows warning with details of what will be deleted, second tap confirms. Backend requires a `confirmed: true` flag in the DELETE request body

### Affiliate tag injection
- Amazon Associates tag sourced from **env var only** (`AMAZON_ASSOCIATES_TAG`, default `wonderwaltz-20`). Already configured in Phase 3's AffiliateService
- Affiliate disclosure: **inline note at top of packing list section** — "Some links earn us a small commission at no cost to you." Matches FTC guidance
- Affiliate links open in **in-app browser** (SafariViewController on iOS, Chrome Custom Tab on Android). Keeps user in-app; cookie attribution works
- Packing list with affiliate links **available to all users** including free tier — affiliate revenue offsets free-tier cost; good will gesture + passive revenue from non-converters
- No client response ever contains the raw affiliate tag string — server-side rewrite only (IAP-07)

### Claude's Discretion
- Supabase Auth configuration details (JWT expiry, refresh token rotation policy)
- Exact polling interval and timeout for client-side purchase confirmation
- Background purge job implementation (BullMQ delayed job vs cron)
- Error handling for Supabase Auth `linkIdentity` edge cases
- Webhook retry/dead-letter strategy for failed processing
- Rate limiting on DELETE /users/me endpoint

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`packages/db/src/schema/entitlements.ts`**: `entitlements` and `iap_events` tables already defined with correct columns including `revenuecat_id` unique constraint
- **`packages/db/src/schema/users.ts`**: `users` table with `isAnonymous`, `deletedAt`, `isAdmin` fields already in place
- **`packages/db/src/schema/trips.ts`**: `entitlementStateEnum` (`free` / `unlocked`) and `trips.entitlementState` column already exist
- **`apps/api/src/auth/auth.controller.ts`**: Stub returning 501 with `AnonymousAuthResponseDto` shape already defined
- **`apps/api/src/auth/users.controller.ts`**: Stub returning 501 with `UserMeDto` shape already defined
- **`apps/api/src/shared/dto/auth.dto.ts`**: `AnonymousAuthResponseDto` (access_token, user_id, expires_at) and `UserMeDto` (id, email, created_at, is_anonymous) already defined
- **`apps/api/src/shared-infra.module.ts`**: `DB_TOKEN` + `REDIS_CLIENT_TOKEN` globals ready for injection
- **`apps/api/src/shared/dto/plan-budget-exhausted.dto.ts`**: 402 contract from Phase 3 already published
- **`AffiliateService`** from Phase 3 with `@Optional()` injection pattern — already handles tag rewrite

### Established Patterns
- **NestJS response envelope** `{ data, meta: { disclaimer } }` — all new endpoints inherit this
- **BullMQ processor pattern** from Phase 2/3 — purge job follows same pattern (queue, processor, dead-letter)
- **`SharedInfraModule` @Global()** provides DB + Redis tokens — new modules import this
- **drizzle-orm postgres-js** `RowList` casting pattern — `(await db.execute<T>(...)) as unknown as T[]`
- **Sentry + Slack dead-letter pipeline** for failed jobs

### Integration Points
- New NestJS modules: `EntitlementModule`, `WebhookModule` (RevenueCat), `AccountDeletionModule`
- New endpoint: `POST /v1/webhooks/revenuecat` (no auth envelope — raw webhook)
- Fill in stubs: `POST /v1/auth/anonymous`, `GET /v1/users/me`, `DELETE /v1/users/me`
- New endpoint: `POST /v1/auth/upgrade` (trigger Supabase linkIdentity)
- New endpoint: `POST /v1/purchases/restore` (trigger RevenueCat restorePurchases server-side)
- Supabase Auth client needed in NestJS — `@supabase/supabase-js` admin client via service role key
- RevenueCat REST API client for subscriber lookup and restore validation

</code_context>

<specifics>
## Specific Ideas

- Phase 3 published the `402 Payment Required` contract with `resetOptions` array — Phase 4 must wire the RevenueCat webhook to mutate `trips.llm_budget_cents` on a top-up purchase (if the top-up SKU is defined). For now, only the single `trip_unlock` SKU exists; top-up is deferred
- The "one trip per anonymous user" limit should be enforced at the API layer (middleware or guard), not just client-side
- Webhook endpoint must be excluded from the NestJS response envelope (raw JSON response for RevenueCat's retry logic to parse correctly)
- The 30-day purge job should be idempotent — safe to re-run if it fails partway through the cascade

</specifics>

<deferred>
## Deferred Ideas

- **LLM budget top-up IAP SKU** — Phase 3 published the 402 contract with `resetOptions`. A second SKU for budget extension is deferred until analytics show users hitting the $0.50 circuit breaker frequently enough to justify it
- **Multi-device simultaneous session management** — not in v1. If a user signs in on device B, device A's session is not explicitly invalidated (Supabase handles token refresh naturally)
- **Family sharing / shared trip access** — out of scope for v1. Trips belong to a single user account

</deferred>

---

*Phase: 04-entitlements-accounts*
*Context gathered: 2026-04-16*
