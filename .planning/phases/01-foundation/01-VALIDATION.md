---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.3 |
| **Config file** | `vitest.config.ts` at repo root (references per-package configs via `projects`) |
| **Quick run command** | `turbo run lint typecheck` |
| **Full suite command** | `turbo run build test` |
| **RLS integration tests** | `vitest run --project rls-integration` (requires `supabase start`) |
| **Estimated runtime** | ~60s (build) + ~15s (tests) + ~10s (RLS integration with local Supabase) |

---

## Sampling Rate

- **After every task commit:** `turbo run lint typecheck` (~30s)
- **After every plan wave:** `turbo run build test` + RLS integration if Supabase running (~85s total)
- **Before `/gsd:verify-work`:** Full suite green + manual check of `docs/design/BRAND.md` + Xcode Cloud green + Gradle build green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| SC-1a | TBD | TBD | FND-01..04 | build | `turbo run build` | ❌ W0 | ⬜ pending |
| SC-1b | TBD | TBD | FND-04 | ci | GitHub Actions + Xcode Cloud green on PR | ❌ W0 | ⬜ pending |
| SC-2a | TBD | TBD | DB-01..06 | integration | `DATABASE_URL=... npx drizzle-kit migrate` exits 0 | ❌ W0 | ⬜ pending |
| SC-2b | TBD | TBD | DB-03 | integration | `psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name='wait_times_history'"` returns 1 row | ❌ W0 | ⬜ pending |
| SC-2c | TBD | TBD | DB-04 | integration | `psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.continuous_aggregates WHERE view_name='wait_times_1h'"` returns 1 row | ❌ W0 | ⬜ pending |
| SC-3 | TBD | TBD | DB-07 | integration | Run seed twice: `tsx scripts/seed-catalog.ts && tsx scripts/seed-catalog.ts`; count rows before and after second run — must be identical | ❌ W0 | ⬜ pending |
| SC-4a | TBD | TBD | DSGN-03..04 | build | `pnpm --filter @wonderwaltz/design-tokens build && test -f packages/design-tokens/generated/WWDesignTokens.swift` | ❌ W0 | ⬜ pending |
| SC-4b | TBD | TBD | DSGN-04 | build | `test -f packages/design-tokens/generated/WWTheme.kt` | ❌ W0 | ⬜ pending |
| SC-4c | TBD | TBD | DSGN-04 | build | `test -f packages/design-tokens/generated/tokens.css && grep -c "@theme" packages/design-tokens/generated/tokens.css` returns > 0 | ❌ W0 | ⬜ pending |
| SC-4d | TBD | TBD | DSGN-02 | manual | `test -f docs/design/BRAND.md` — human reviews brand direction | ❌ W0 | ⬜ pending |
| SC-5a | TBD | TBD | LEGL-02 | unit | Vitest: NestJS interceptor test — response has `x-ww-disclaimer` header | ❌ W0 | ⬜ pending |
| SC-5b | TBD | TBD | LEGL-02 | unit | Vitest: NestJS interceptor test — response body has `{ data, meta: { disclaimer } }` shape | ❌ W0 | ⬜ pending |
| SC-5c | TBD | TBD | LEGL-07 | static | `grep -r "birthdate\|date_of_birth\|birth_date" packages/db/schema/` returns empty | N/A | ⬜ pending |
| SC-RLS | TBD | TBD | DB-08 | integration | `vitest run packages/db/tests/rls.integration.test.ts` (requires `supabase start`) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — repo root config with projects array
- [ ] `packages/db/tests/rls.integration.test.ts` — RLS policy verification (DB-08)
- [ ] `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts` — disclaimer interceptor unit test (LEGL-02)
- [ ] `packages/design-tokens/tests/build.test.ts` — verifies all four output files exist and contain expected token names (DSGN-03..04)
- [ ] `supabase/config.toml` — local Supabase config committed to repo

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Brand direction locked in BRAND.md | DSGN-01, DSGN-02 | Aesthetic evaluation — human reviews `ui-designer` agent's 3 brand directions and picks one | Read `docs/design/BRAND.md`, confirm it has palette, type, motion, voice, iconography, per-park accents. Verify it's a real brand direction, not a placeholder. |
| Xcode Cloud green on iOS shell PR | FND-04 | External CI system — not observable from within repo | Check Xcode Cloud dashboard or GitHub PR status checks for "Xcode Cloud" showing green |
| No Disney imagery in any committed asset | LEGL-03 | Visual inspection required | `find . -name "*.png" -o -name "*.svg" -o -name "*.jpg" | head -20` — review any image files for Disney trademarks |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
