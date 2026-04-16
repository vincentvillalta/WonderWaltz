---
phase: 4
slug: entitlements-accounts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `apps/api/vitest.config.mts` |
| **Quick run command** | `cd apps/api && pnpm test` |
| **Full suite command** | `cd apps/api && pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test`
- **After every plan wave:** Run `cd apps/api && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | AUTH-01 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "anonymous" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-02 | unit | `cd apps/api && pnpm vitest run src/auth/users.service.spec.ts -t "trip limit" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-03 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "upgrade" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-04 | unit | `cd apps/api && pnpm vitest run src/entitlements/entitlement.service.spec.ts -t "anonymous" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-05 | integration | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "session" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-06 | unit | `cd apps/api && pnpm vitest run src/purchases/purchases.service.spec.ts -t "restore" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | AUTH-07 | unit | `cd apps/api && pnpm vitest run src/account-deletion/account-deletion.service.spec.ts -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IAP-03 | unit | `cd apps/api && pnpm vitest run src/webhooks/webhook.service.spec.ts -t "INITIAL_PURCHASE" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IAP-04 | unit | `cd apps/api && pnpm vitest run src/webhooks/webhook.service.spec.ts -t "event" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IAP-05 | unit | `cd apps/api && pnpm vitest run src/purchases/purchases.service.spec.ts -t "restore" -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IAP-07 | unit | `cd apps/api && pnpm vitest run src/packing-list/packing-list.service.spec.ts -t "affiliate" -x` | Partial | ⬜ pending |
| TBD | 01 | 0 | LEGL-06 | unit | `cd apps/api && pnpm vitest run src/account-deletion/purge.processor.spec.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/auth/auth.service.spec.ts` — stubs for AUTH-01, AUTH-03, AUTH-05
- [ ] `src/auth/auth.guard.spec.ts` — JWT validation, soft-delete blocking
- [ ] `src/auth/users.service.spec.ts` — AUTH-02 (trip limit), user profile
- [ ] `src/webhooks/webhook.service.spec.ts` — IAP-03, IAP-04
- [ ] `src/webhooks/webhook.guard.spec.ts` — webhook signature verification
- [ ] `src/entitlements/entitlement.service.spec.ts` — AUTH-04, entitlement CRUD
- [ ] `src/purchases/purchases.service.spec.ts` — AUTH-06, IAP-05
- [ ] `src/account-deletion/account-deletion.service.spec.ts` — AUTH-07
- [ ] `src/account-deletion/purge.processor.spec.ts` — LEGL-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| trip_unlock product configured in RC dashboard | IAP-01 | RevenueCat dashboard configuration | Verify product exists in RC dashboard with correct price and type |
| StoreKit 2 + Play Billing via RC SDK | IAP-02 | Client-side SDK integration (Phase 5/6/7) | Verify via sandbox purchase in Phase 6/7 |
| App Store review notes for consumable model | IAP-06 | Documentation artifact for Phase 10 | Review notes template drafted and reviewed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
