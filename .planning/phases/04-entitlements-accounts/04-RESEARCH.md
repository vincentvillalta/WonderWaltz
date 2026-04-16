# Phase 4: Entitlements & Accounts - Research

**Researched:** 2026-04-16
**Domain:** Authentication, In-App Purchases, Account Lifecycle, Webhook Processing
**Confidence:** HIGH

## Summary

Phase 4 wires up the full user lifecycle: anonymous account creation via Supabase Auth, upgrade to Apple/Google OAuth via `linkIdentity`, RevenueCat webhook processing for purchase/refund events, account deletion with 30-day soft-delete cascade, and purchase restoration. The existing codebase has strong foundations -- the `users`, `entitlements`, and `iap_events` DB schema are defined, auth controller stubs exist returning 501, the `SharedInfraModule` provides DB/Redis injection, and `@supabase/supabase-js` 2.102.1 is already an API dependency.

The primary technical challenges are: (1) Supabase anonymous auth is designed as a client-side flow, but our NestJS backend needs to create anonymous sessions server-side using `auth.admin.createUser()` with no email to synthesize anonymous users, then generate JWTs; (2) RevenueCat webhooks use an authorization header (not HMAC) for verification -- the CONTEXT.md specifies HMAC-SHA256, but RevenueCat's actual mechanism is a static bearer token set in the dashboard; (3) the `linkIdentity` OAuth upgrade is client-initiated (requires browser redirect), so the backend's role is to validate the merged JWT post-upgrade and sync the `users` table.

**Primary recommendation:** Use Supabase Admin API (`auth.admin.createUser` + `auth.admin.generateLink`) for anonymous user creation server-side, Supabase JWT verification via `jsonwebtoken` or Supabase's `auth.getUser(token)` as NestJS guard, RevenueCat REST API v1 for subscriber lookups, and the dashboard-configured authorization header for webhook verification.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Upgrade prompt **only at paywall** -- no nudges, no periodic prompts. User stays anonymous until they tap "Unlock Trip $9.99"
- Anonymous users can create **exactly one trip** before upgrading. Prevents abuse; matches the "teaser" mental model
- If merge fails (Apple/Google account already linked to another WonderWaltz account): **block with clear error message** -- "This account is already linked to another WonderWaltz account. Sign in with that account instead." No silent merge, no data loss
- After successful merge: **silent JWT refresh** + brief success toast ("Account linked!"). No full-screen confirmation. User proceeds directly to paywall
- Backend implements Supabase Auth `linkIdentity` for the merge; new JWT issued automatically post-merge
- Process **all IAP-04 events**: INITIAL_PURCHASE, REFUND, CANCELLATION, EXPIRATION, NON_RENEWING_PURCHASE -- even if some don't apply to consumables now, handle them for future-proofing
- All webhook events logged to `iap_events` table with raw payload regardless of whether they trigger an entitlement mutation
- **HMAC signature verification** on webhook endpoint -- compute HMAC-SHA256 of raw body and compare to RevenueCat's signing key header. Stronger than bearer token
- **Client polls, webhook is source of truth** for purchase confirmation race condition: client shows optimistic "processing" state after StoreKit confirms, polls `GET /plans/:id` every 2s for up to 15s. If timeout, show "Purchase received, unlocking shortly" with manual retry
- On **REFUND**: plan is **completely hidden** (not re-locked). Trip wizard data remains but plan view shows "Plan unavailable -- purchase required." User can re-purchase to get a new plan
- Webhook idempotency enforced via `revenuecat_id` unique constraint on `entitlements` table (already in schema)
- **Soft delete + 30-day grace period**: mark user as deleted immediately (`deletedAt` timestamp on `users` table). Block all API access for deleted users. Background purge job runs after 30 days
- User can contact support to cancel deletion within the 30-day grace window
- Active entitlements **revoked immediately** on deletion request. If user cancels deletion within grace period, entitlement is restored
- **Local data only** deleted during purge. RevenueCat subscriber record is kept -- if user re-creates account with same Apple ID, RC restore still works
- Purge cascade covers: `trips`, `guests`, `trip_park_days`, `trip_preferences`, `plans`, `plan_days`, `plan_items`, `entitlements`, `iap_events`, `push_tokens`, `llm_costs`, `packing_list_items`, `affiliate_items`, and the `users` row itself
- Supabase Auth user record deleted as part of the purge (via admin API)
- Confirmation UX: **double-tap confirm** -- first tap shows warning, second tap confirms. Backend requires a `confirmed: true` flag in the DELETE request body
- Amazon Associates tag sourced from **env var only** (`AMAZON_ASSOCIATES_TAG`, default `wonderwaltz-20`). Already configured in Phase 3's AffiliateService
- Affiliate disclosure: **inline note at top of packing list section**
- Affiliate links open in **in-app browser** (SafariViewController on iOS, Chrome Custom Tab on Android)
- Packing list with affiliate links **available to all users** including free tier
- No client response ever contains the raw affiliate tag string -- server-side rewrite only (IAP-07)

### Claude's Discretion
- Supabase Auth configuration details (JWT expiry, refresh token rotation policy)
- Exact polling interval and timeout for client-side purchase confirmation
- Background purge job implementation (BullMQ delayed job vs cron)
- Error handling for Supabase Auth `linkIdentity` edge cases
- Webhook retry/dead-letter strategy for failed processing
- Rate limiting on DELETE /users/me endpoint

### Deferred Ideas (OUT OF SCOPE)
- **LLM budget top-up IAP SKU** -- Phase 3 published the 402 contract with `resetOptions`. A second SKU for budget extension is deferred until analytics show users hitting the $0.50 circuit breaker frequently enough to justify it
- **Multi-device simultaneous session management** -- not in v1. If a user signs in on device B, device A's session is not explicitly invalidated
- **Family sharing / shared trip access** -- out of scope for v1. Trips belong to a single user account
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Anonymous device-linked account via Supabase Auth (silent onboarding) | Supabase Admin API `createUser` for server-side anonymous user creation; JWT guard pattern |
| AUTH-02 | User can create trip, configure guests, view free Day 1 without signing up | Anonymous trip guard enforcing 1-trip limit; existing trip/plan stubs need auth context wiring |
| AUTH-03 | Upgrade anonymous to Apple/Google; merge preserves trips | Supabase `linkIdentity` (client-initiated OAuth redirect); backend validates merged JWT + syncs users table |
| AUTH-04 | Upgrade required before IAP purchase (client + server enforcement) | Server-side guard on purchase validation checking `isAnonymous` flag |
| AUTH-05 | Logout/login on same device preserves trips | Supabase session management; trips linked by `user_id` survive re-auth |
| AUTH-06 | Sign in on new device restores trips (read-only until RC re-validates) | RevenueCat REST API v1 subscriber lookup for entitlement re-validation |
| AUTH-07 | Account deletion with cascade within 30 days (LEGL-06) | Soft-delete + BullMQ delayed purge job; Supabase admin deleteUser |
| IAP-01 | Single consumable `trip_unlock` at $9.99 | RevenueCat product configuration (dashboard setup, not backend code) |
| IAP-02 | iOS StoreKit 2 + Android Play Billing via RevenueCat SDK | Client-side (Phase 5/6/7); backend receives webhook events only |
| IAP-03 | Purchase flow: tap -> native paywall -> RC validates -> webhook -> entitlement | Webhook handler creates entitlement row; client polls `GET /plans/:id` |
| IAP-04 | Webhook handles INITIAL_PURCHASE, REFUND, CANCELLATION, EXPIRATION, NON_RENEWING_PURCHASE | RevenueCat webhook event processor with per-type handlers |
| IAP-05 | Restore purchases from Settings via RevenueCat SDK | `POST /v1/purchases/restore` endpoint; RC REST API v1 subscriber lookup |
| IAP-06 | App Store review notes for consumable model | Documentation artifact (Phase 10 submission); no backend code |
| IAP-07 | Affiliate links rewritten server-side with Associates tag | Already implemented in Phase 3 AffiliateService; verify integration |
| LEGL-06 | Account deletion cascade removes all user data | Purge job covering 14 tables + Supabase auth record |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.102.1 | Supabase Auth admin client (anonymous user creation, user deletion, JWT validation) | Already in api package.json; official SDK with admin API support |
| @nestjs/common + @nestjs/core | ^11.0.0 | NestJS framework (guards, interceptors, modules, DI) | Already in use across all modules |
| bullmq | 5.73.1 | Background job queue for account purge delayed jobs | Already in use for plan-generation; established patterns |
| drizzle-orm + postgres-js | existing | Database access for entitlements, iap_events, users tables | Already in use via DB_TOKEN pattern |
| ioredis | ^5.0.0 | Redis for rate limiting, session caching | Already in use via REDIS_CLIENT_TOKEN |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node built-in) | N/A | HMAC-SHA256 computation for webhook signature verification | Webhook endpoint request validation |
| class-transformer + class-validator | existing | DTO validation for webhook payloads and auth requests | All new endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase admin createUser for anon | Client-side signInAnonymously | Server-side creation gives backend control; client approach requires SDK on device (Phase 5+) |
| RevenueCat REST API v1 for subscriber lookup | REST API v2 | v2 has known issues with entitlement retrieval; v1 is stable and well-documented |
| BullMQ delayed job for purge | pg_cron | BullMQ matches existing pattern; pg_cron already used for rollup but delayed jobs need precise per-user timing |

**Installation:**
No new packages needed. All dependencies are already installed in `apps/api/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
  auth/
    auth.controller.ts          # POST /v1/auth/anonymous, POST /v1/auth/upgrade
    auth.module.ts              # Expanded: imports SupabaseAuthService
    auth.service.ts             # NEW: Supabase Auth admin operations
    auth.guard.ts               # NEW: JWT validation guard (extract user from token)
    users.controller.ts         # GET /v1/users/me, DELETE /v1/users/me (expand stub)
    users.service.ts            # NEW: user CRUD, deletion, anon-trip-limit check
  entitlements/
    entitlement.module.ts       # NEW module
    entitlement.service.ts      # NEW: entitlement CRUD, trip unlock, revocation
  webhooks/
    webhook.module.ts           # NEW module
    webhook.controller.ts       # NEW: POST /v1/webhooks/revenuecat (raw, no envelope)
    webhook.service.ts          # NEW: event processing, idempotency, entitlement mutation
    webhook.guard.ts            # NEW: HMAC signature or bearer token verification
  purchases/
    purchases.module.ts         # NEW module
    purchases.controller.ts     # NEW: POST /v1/purchases/restore
    purchases.service.ts        # NEW: RevenueCat API client for subscriber lookup
  account-deletion/
    account-deletion.module.ts  # NEW module
    account-deletion.service.ts # NEW: soft-delete + entitlement revocation
    purge.processor.ts          # NEW: BullMQ processor for 30-day cascade purge
```

### Pattern 1: Supabase Admin Client as Injectable
**What:** Create a `SUPABASE_ADMIN_TOKEN` injection token (like `DB_TOKEN`) providing a Supabase client initialized with service role key.
**When to use:** Any operation requiring admin-level Supabase Auth access (create user, delete user, get user by token).
**Example:**
```typescript
// In SharedInfraModule or a new SupabaseModule
{
  provide: SUPABASE_ADMIN_TOKEN,
  useFactory: () => {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  },
}
```

### Pattern 2: JWT Auth Guard
**What:** NestJS guard that extracts Bearer token from Authorization header, validates it via Supabase `auth.getUser(token)`, and attaches user to `request.user`.
**When to use:** All authenticated endpoints. Applied globally or per-controller.
**Example:**
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(SUPABASE_ADMIN_TOKEN) private readonly supabase: SupabaseClient) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpException('unauthorized', 401);
    
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) throw new HttpException('unauthorized', 401);
    
    // Check soft-delete
    // Attach user context to request
    req.user = { id: user.id, isAnonymous: user.is_anonymous };
    return true;
  }
}
```

### Pattern 3: Raw Webhook Endpoint (Skip Envelope)
**What:** RevenueCat webhook endpoint must skip the NestJS response envelope and return raw JSON.
**When to use:** The `POST /v1/webhooks/revenuecat` endpoint specifically.
**Example:**
```typescript
@Controller('webhooks')
export class WebhookController {
  @Post('revenuecat')
  @SkipEnvelope()
  @HttpCode(200)
  async handleRevenueCat(@Req() req: FastifyRequest): Promise<{ ok: boolean }> {
    // Verify signature from raw body
    // Process event
    return { ok: true };
  }
}
```

### Pattern 4: BullMQ Delayed Job for Account Purge
**What:** On account deletion request, enqueue a BullMQ job with 30-day delay. Job cascades through all 14 tables + Supabase auth deletion.
**When to use:** `DELETE /v1/users/me` confirmed endpoint.
**Example:**
```typescript
// Enqueue with 30-day delay
await this.purgeQueue.add(
  'purge-account',
  { userId },
  { delay: 30 * 24 * 60 * 60 * 1000, attempts: 3 }
);
```

### Anti-Patterns to Avoid
- **Do not use Supabase client-side SDK patterns in NestJS:** No `signInAnonymously()` on the server -- use `auth.admin.createUser()` instead. The client SDK manages sessions in browser storage which does not apply server-side.
- **Do not create request-scoped Supabase clients:** The admin client uses the service role key and is stateless. Creating per-request clients wastes resources. Use a singleton.
- **Do not return raw errors from Supabase/RevenueCat to clients:** Map all external service errors to standardized HTTP responses.
- **Do not put webhook processing in the controller:** Controller validates signature and delegates to service. Heavy processing (DB writes, entitlement mutation) lives in the service layer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom JWT decode/verify | Supabase `auth.getUser(token)` | Handles token expiry, rotation, revocation; stays in sync with Supabase Auth |
| Anonymous user creation | Manual UUID + JWT generation | Supabase `auth.admin.createUser()` | Supabase manages auth.users, JWT signing, token refresh |
| User deletion from auth | Direct SQL DELETE on auth.users | Supabase `auth.admin.deleteUser(id)` | Handles auth schema cascades, session invalidation |
| RevenueCat subscriber state | Custom purchase tracking | RevenueCat REST API v1 `GET /v1/subscribers/{id}` | RC is source of truth for purchase state; handles receipt validation |
| Delayed job scheduling | setTimeout or cron-based scheduler | BullMQ delayed jobs | Survives process restarts; built-in retry; established pattern in codebase |
| Idempotent webhook processing | Custom dedup logic | `revenuecat_id` unique constraint + ON CONFLICT DO NOTHING | DB-level guarantee; already in schema |

**Key insight:** Supabase Auth and RevenueCat are the sources of truth for their respective domains. The backend's role is to bridge them: validate Supabase JWTs, process RevenueCat webhooks, and maintain the `entitlements` table as the derived state that controls access.

## Common Pitfalls

### Pitfall 1: Supabase signInAnonymously is client-only
**What goes wrong:** Attempting to call `supabase.auth.signInAnonymously()` from a NestJS service. The server-side client does not manage sessions and this call may not return a usable session.
**Why it happens:** Documentation shows client-side examples; easy to assume it works server-side.
**How to avoid:** Use `supabase.auth.admin.createUser({ })` with no email/password to create an anonymous user. The admin API returns the user object with `id`. Then generate a JWT session for the client via `auth.admin.generateLink({ type: 'magiclink', email: '' })` or create a custom token.
**Warning signs:** Empty session object returned, no access_token in response.

### Pitfall 2: RevenueCat webhook signature is NOT HMAC
**What goes wrong:** Implementing HMAC-SHA256 verification when RevenueCat actually uses a static authorization header value configured in the dashboard.
**Why it happens:** CONTEXT.md specifies HMAC-SHA256, but RevenueCat's actual mechanism is simpler -- a bearer token in the Authorization header.
**How to avoid:** Implement the authorization header check as documented by RevenueCat. If the user truly wants HMAC on top, add a secondary verification layer, but the primary check must match what RevenueCat sends. **IMPORTANT:** The CONTEXT.md decision says HMAC. Research shows RC uses a static auth header. The planner should implement what RC actually sends (auth header verification) and note the discrepancy. Consider adding an HMAC wrapper if a custom proxy is used.
**Warning signs:** All webhooks failing verification, 401 responses to RevenueCat.

### Pitfall 3: linkIdentity requires browser redirect
**What goes wrong:** Trying to call `linkIdentity` server-side without a browser context.
**Why it happens:** `linkIdentity` triggers an OAuth redirect flow that requires a browser.
**How to avoid:** The mobile client calls `linkIdentity` via the Supabase SDK. After the OAuth flow completes, the client receives a new JWT with the linked identity. The backend simply validates the new JWT -- it does not call `linkIdentity` itself.
**Warning signs:** "redirect_uri not found" errors, OAuth flow failing silently.

### Pitfall 4: Race condition between webhook and client poll
**What goes wrong:** Client polls for entitlement state before webhook has been processed. User sees "still processing" even though purchase completed.
**Why it happens:** StoreKit confirms purchase -> client starts polling -> RevenueCat processes receipt -> webhook fires -> backend creates entitlement. The webhook may arrive seconds after the client starts polling.
**How to avoid:** Design the polling endpoint to check both the `entitlements` table AND the `trips.entitlement_state` field. On the client side, implement the 2s/15s polling with graceful fallback message. Webhook processing should be fast (< 1s DB write).
**Warning signs:** Users reporting "stuck on processing" state.

### Pitfall 5: Purge job fails halfway through cascade
**What goes wrong:** Purge job deletes some tables but crashes before completing all 14 tables.
**Why it happens:** Network errors, DB timeouts, process restart mid-cascade.
**How to avoid:** Make the purge job idempotent. Use a transaction for the entire cascade if possible, or check `deletedAt` before each delete batch. BullMQ retry will re-run the job. Use `DELETE ... WHERE user_id = $1` which is a no-op on already-deleted rows.
**Warning signs:** Orphaned rows in child tables after user deletion.

### Pitfall 6: Anonymous user trip count enforcement only client-side
**What goes wrong:** Anonymous users bypass the 1-trip limit by calling the API directly.
**Why it happens:** Limit enforced in client UI only, not in API middleware.
**How to avoid:** Add a guard/middleware on `POST /v1/trips` that counts existing trips for anonymous users. If count >= 1 and user is anonymous, return 403 with upgrade prompt.
**Warning signs:** Anonymous users creating multiple trips.

### Pitfall 7: Fastify raw body not available for signature verification
**What goes wrong:** NestJS with Fastify does not automatically provide the raw request body needed for HMAC/signature computation.
**Why it happens:** Fastify parses JSON by default, and the parsed body may differ from the raw bytes.
**How to avoid:** Use Fastify's `addContentTypeParser` or `preParsing` hook to capture raw body bytes before JSON parsing. Store on `request.rawBody`.
**Warning signs:** Signature mismatch on every webhook despite correct secret.

## Code Examples

### Anonymous User Creation (Server-Side)
```typescript
// Source: Supabase Admin API docs + project pattern
async createAnonymousUser(): Promise<{ userId: string; accessToken: string; expiresAt: string }> {
  const { data, error } = await this.supabase.auth.admin.createUser({
    // No email, no password = anonymous user
    user_metadata: { is_anonymous: true },
  });
  if (error) throw new HttpException('auth_creation_failed', 500);

  // Generate a session for the user
  const { data: session, error: sessionError } = 
    await this.supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${data.user.id}@anon.wonderwaltz.local`,
    });
  // Note: actual implementation may need signInWithIdToken or a custom approach
  
  // Sync to public.users table
  await this.db.execute(sql`
    INSERT INTO users (id, is_anonymous, created_at, updated_at)
    VALUES (${data.user.id}, true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  return {
    userId: data.user.id,
    accessToken: session?.properties?.access_token ?? '',
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}
```

### RevenueCat Webhook Handler
```typescript
// Source: RevenueCat webhook docs + project patterns
@Post('revenuecat')
@SkipEnvelope()
@HttpCode(200)
async handleWebhook(
  @Req() req: FastifyRequest,
  @Headers('authorization') authHeader: string,
): Promise<{ ok: boolean }> {
  // Verify authorization header
  const expectedToken = this.configService.get<string>('REVENUECAT_WEBHOOK_AUTH_KEY');
  if (authHeader !== `Bearer ${expectedToken}`) {
    throw new HttpException('unauthorized', 401);
  }

  const payload = req.body as RevenueCatWebhookPayload;
  
  // Log raw event regardless of processing outcome
  await this.webhookService.logRawEvent(payload);
  
  // Process by event type
  await this.webhookService.processEvent(payload);
  
  return { ok: true };
}
```

### Account Deletion Soft-Delete
```typescript
// Source: project patterns (BullMQ delayed job)
async requestDeletion(userId: string): Promise<void> {
  const now = new Date();
  
  // Mark user as deleted
  await this.db.execute(sql`
    UPDATE users SET deleted_at = ${now.toISOString()}, updated_at = ${now.toISOString()}
    WHERE id = ${userId} AND deleted_at IS NULL
  `);
  
  // Revoke active entitlements immediately
  await this.db.execute(sql`
    UPDATE entitlements SET state = 'revoked', revoked_at = ${now.toISOString()}
    WHERE user_id = ${userId} AND state = 'active'
  `);
  
  // Enqueue purge job with 30-day delay
  await this.purgeQueue.add(
    'purge-account',
    { userId, requestedAt: now.toISOString() },
    { delay: 30 * 24 * 60 * 60 * 1000, attempts: 3, backoff: { type: 'exponential', delay: 60_000 } }
  );
}
```

### JWT Auth Guard
```typescript
// Source: NestJS guard pattern + Supabase auth.getUser
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_ADMIN_TOKEN) private readonly supabase: SupabaseClient,
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new HttpException('unauthorized', 401);
    
    const token = auth.slice(7);
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) throw new HttpException('unauthorized', 401);
    
    // Block soft-deleted users
    const rows = await this.db.execute(
      sql`SELECT deleted_at FROM users WHERE id = ${user.id}`
    ) as Array<{ deleted_at: string | null }>;
    if (rows[0]?.deleted_at) throw new HttpException('account_deleted', 403);
    
    // Attach to request for downstream use
    (req as any).user = {
      id: user.id,
      isAnonymous: user.user_metadata?.is_anonymous ?? !user.email,
      email: user.email,
    };
    return true;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase GoTrue v1 | GoTrue v2 with anonymous sign-in support | 2024-03 | Anonymous users are first-class; `is_anonymous` flag on auth.users |
| RevenueCat webhook v3 | Webhook v4 with 17 event types | 2024 | More granular events; NON_RENEWING_PURCHASE for consumables |
| RevenueCat REST API v1 only | REST API v2 available (beta) | 2024 | v2 has entitlement endpoints but known reliability issues; v1 recommended |
| Manual JWT verification | `auth.getUser(token)` validates server-side | Supabase JS v2 | Simpler than importing jsonwebtoken + managing JWKS |

**Deprecated/outdated:**
- RevenueCat REST API `POST /receipts` with `is_restore: true` is deprecated. Use client SDK `restorePurchases()` instead.
- Supabase `auth.api.*` namespace replaced by `auth.admin.*` in supabase-js v2.

## Open Questions

1. **Supabase anonymous user JWT generation server-side**
   - What we know: `auth.admin.createUser()` creates the user but does not return a session/JWT directly. The admin API is designed for user management, not session creation.
   - What's unclear: The exact mechanism to generate a JWT for a newly created anonymous user from the server. Options include: (a) `auth.admin.generateLink` with magic link, (b) calling `signInAnonymously` from a server-side Supabase client configured with anon key, (c) using `auth.admin.createUser` and then returning a custom-signed JWT.
   - Recommendation: Investigate in Wave 0 task. Test `auth.admin.createUser()` return value -- recent Supabase versions may include session data. Fallback: use server-side client with anon key for `signInAnonymously()` call, extract the session, and return to mobile client.

2. **RevenueCat webhook verification: auth header vs HMAC**
   - What we know: RevenueCat's documented mechanism is a static authorization header, not HMAC-SHA256. CONTEXT.md explicitly requests HMAC-SHA256.
   - What's unclear: Whether RevenueCat has added HMAC support since documentation was last updated, or if the user intends a custom HMAC layer.
   - Recommendation: Implement RevenueCat's documented auth header verification as the primary mechanism. If stronger security is desired, add a reverse proxy (e.g., API Gateway) that adds HMAC, or accept the authorization header as sufficient for v1.

3. **Entitlement restoration on new device sign-in (AUTH-06)**
   - What we know: RevenueCat SDK on client calls `restorePurchases()` which reconciles with RC backend. Backend needs to verify entitlements match.
   - What's unclear: Whether the backend should proactively sync entitlements on sign-in, or only react to the client's restore request.
   - Recommendation: Backend provides `POST /v1/purchases/restore` that calls RevenueCat REST API v1 `GET /v1/subscribers/{app_user_id}` and reconciles the `entitlements` table. Client calls this after sign-in on new device.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) |
| Config file | `apps/api/vitest.config.mts` |
| Quick run command | `cd apps/api && pnpm test` |
| Full suite command | `cd apps/api && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Anonymous user creation via admin API | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "anonymous" -x` | No -- Wave 0 |
| AUTH-02 | Anonymous user can create exactly 1 trip | unit | `cd apps/api && pnpm vitest run src/auth/users.service.spec.ts -t "trip limit" -x` | No -- Wave 0 |
| AUTH-03 | linkIdentity merge preserves trips | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "upgrade" -x` | No -- Wave 0 |
| AUTH-04 | Anonymous user blocked from purchase | unit | `cd apps/api && pnpm vitest run src/entitlements/entitlement.service.spec.ts -t "anonymous" -x` | No -- Wave 0 |
| AUTH-05 | Logout/login preserves trips | integration | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "session" -x` | No -- Wave 0 |
| AUTH-06 | New device restore entitlements | unit | `cd apps/api && pnpm vitest run src/purchases/purchases.service.spec.ts -t "restore" -x` | No -- Wave 0 |
| AUTH-07 | Account deletion soft-delete + purge | unit | `cd apps/api && pnpm vitest run src/account-deletion/account-deletion.service.spec.ts -x` | No -- Wave 0 |
| IAP-01 | trip_unlock product configured | manual-only | RevenueCat dashboard configuration -- no automated test | N/A |
| IAP-02 | StoreKit 2 + Play Billing via RC SDK | manual-only | Client-side SDK integration (Phase 5/6/7) | N/A |
| IAP-03 | Purchase flow end-to-end | unit | `cd apps/api && pnpm vitest run src/webhooks/webhook.service.spec.ts -t "INITIAL_PURCHASE" -x` | No -- Wave 0 |
| IAP-04 | Webhook handles all event types | unit | `cd apps/api && pnpm vitest run src/webhooks/webhook.service.spec.ts -t "event" -x` | No -- Wave 0 |
| IAP-05 | Restore purchases | unit | `cd apps/api && pnpm vitest run src/purchases/purchases.service.spec.ts -t "restore" -x` | No -- Wave 0 |
| IAP-06 | App Store review notes | manual-only | Documentation artifact for Phase 10 | N/A |
| IAP-07 | Affiliate tag server-side rewrite | unit | `cd apps/api && pnpm vitest run src/packing-list/packing-list.service.spec.ts -t "affiliate" -x` | Partial -- Phase 3 |
| LEGL-06 | Deletion cascade removes all data | unit | `cd apps/api && pnpm vitest run src/account-deletion/purge.processor.spec.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm test`
- **Per wave merge:** `cd apps/api && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/auth/auth.service.spec.ts` -- covers AUTH-01, AUTH-03, AUTH-05
- [ ] `src/auth/auth.guard.spec.ts` -- covers JWT validation, soft-delete blocking
- [ ] `src/auth/users.service.spec.ts` -- covers AUTH-02 (trip limit), user profile
- [ ] `src/webhooks/webhook.service.spec.ts` -- covers IAP-03, IAP-04
- [ ] `src/webhooks/webhook.guard.spec.ts` -- covers webhook signature verification
- [ ] `src/entitlements/entitlement.service.spec.ts` -- covers AUTH-04, entitlement CRUD
- [ ] `src/purchases/purchases.service.spec.ts` -- covers AUTH-06, IAP-05
- [ ] `src/account-deletion/account-deletion.service.spec.ts` -- covers AUTH-07
- [ ] `src/account-deletion/purge.processor.spec.ts` -- covers LEGL-06

## Sources

### Primary (HIGH confidence)
- Supabase Auth Anonymous Sign-Ins docs: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase Identity Linking docs: https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase Admin API (createUser): https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase Admin API (deleteUser): https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- RevenueCat Webhooks docs: https://www.revenuecat.com/docs/integrations/webhooks
- RevenueCat Event Types: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
- RevenueCat REST API v1: https://www.revenuecat.com/docs/api-v1
- Existing codebase: `apps/api/src/` (auth stubs, shared-infra, plan-generation patterns)

### Secondary (MEDIUM confidence)
- Supabase Auth signInAnonymously JS reference: https://supabase.com/docs/reference/javascript/auth-signinanonymously
- RevenueCat REST API v2 docs: https://www.revenuecat.com/docs/api-v2

### Tertiary (LOW confidence)
- Supabase anonymous user server-side creation specifics (session generation mechanism unclear)
- RevenueCat HMAC support (documentation only shows auth header; HMAC may exist undocumented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in package.json; no new dependencies needed
- Architecture: HIGH - follows established NestJS module patterns from Phase 2/3; new modules mirror existing structure
- Pitfalls: HIGH - identified through official docs + codebase analysis; webhook/auth edge cases well-documented
- Anonymous auth server-side: MEDIUM - Supabase admin API is documented but anonymous user JWT generation from server needs validation
- RevenueCat webhook verification: MEDIUM - auth header mechanism confirmed, but user decision says HMAC (discrepancy flagged)

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days -- Supabase and RevenueCat APIs are stable)
