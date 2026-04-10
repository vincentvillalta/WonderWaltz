---
phase: 01-foundation
plan: "05"
subsystem: infra
tags: [github-actions, turborepo, gradle, android, xcode-cloud, ci, branch-protection]

# Dependency graph
requires:
  - phase: 01-foundation/01-04
    provides: iOS and Android shell projects that CI workflows build
  - phase: 01-foundation/01-01
    provides: pnpm monorepo with turbo.json pipeline (build/lint/typecheck/test)
provides:
  - GitHub Actions CI workflow for backend + web via Turborepo (ci.yml)
  - GitHub Actions CI workflow for Android via Gradle (android.yml)
  - .env.example documenting all required env vars
  - docs/ops/BRANCH_PROTECTION.md with Xcode Cloud setup steps
affects:
  - 02-data-pipeline
  - all phases using the monorepo

# Tech tracking
tech-stack:
  added:
    - github-actions/checkout@v4
    - actions/setup-node@v4
    - pnpm/action-setup@v4
    - actions/cache@v4
    - actions/setup-java@v4 (JDK 17 temurin)
    - gradle/actions/setup-gradle@v3
  patterns:
    - Turborepo remote cache via TURBO_TOKEN + TURBO_TEAM secrets
    - Path-filtered Android workflow (apps/android/**)
    - Xcode Cloud for iOS CI — not a GHA workflow file
    - Gradle cache-read-only on non-main branches

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/android.yml
    - .env.example
    - docs/ops/BRANCH_PROTECTION.md
  modified: []

key-decisions:
  - "Xcode Cloud handles iOS CI — no macOS GHA runner. Locked in 01-CONTEXT.md."
  - "Android CI path-filtered to apps/android/** to avoid spurious runs on TS changes"
  - "Gradle cache-read-only on PR branches to prevent cache poisoning from forks"
  - "No secrets hardcoded — TURBO_TOKEN and TURBO_TEAM referenced via secrets context"

patterns-established:
  - "CI pattern: backend+web always turbo run build lint typecheck test"
  - "CI pattern: Android always ./gradlew assembleDebug lint in apps/android"
  - "Secrets pattern: all CI credentials via GitHub Actions secrets, never in YAML"

requirements-completed: [FND-04, FND-12]

# Metrics
duration: 2min
completed: 2026-04-10
---

# Phase 1 Plan 05: CI Workflows Summary

**GitHub Actions Turborepo CI (backend+web) and Gradle CI (Android) wired from day 1, with Xcode Cloud documented for iOS and branch protection rules specified**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-10T21:04:17Z
- **Completed:** 2026-04-10T21:05:33Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- `.github/workflows/ci.yml` runs `turbo run build lint typecheck test` on every PR to main using pnpm 10, Node 22, and Vercel remote cache via TURBO_TOKEN + TURBO_TEAM secrets
- `.github/workflows/android.yml` runs `./gradlew assembleDebug lint` path-filtered to `apps/android/**` with JDK 17 and Gradle caching
- `.env.example` documents all required env vars (DATABASE_URL, Supabase, Redis, Sentry, PostHog, RevenueCat, Turbo) with no actual values committed
- `docs/ops/BRANCH_PROTECTION.md` documents required GitHub branch protection settings including Xcode Cloud GitHub App setup steps

## Task Commits

Each task was committed atomically:

1. **Task 1: Turborepo CI workflow (backend + web)** - `206562e` (ci)
2. **Task 2: Android CI workflow + branch protection documentation** - `c2c2c6c` (ci)

## Files Created/Modified

- `.github/workflows/ci.yml` - Turborepo CI: pnpm install, turbo build/lint/typecheck/test, TURBO remote cache
- `.github/workflows/android.yml` - Android CI: JDK 17, Gradle assemble + lint, path-filtered
- `.env.example` - All required environment variables documented (no values)
- `docs/ops/BRANCH_PROTECTION.md` - Branch protection config + Xcode Cloud setup guide

## Decisions Made

- Android CI path-filtered to `apps/android/**` — avoids triggering on pure TypeScript changes, keeps CI fast
- `cache-read-only: ${{ github.ref != 'refs/heads/main' }}` on Gradle to prevent fork PRs from writing to cache
- iOS CI intentionally NOT a GitHub Actions workflow — Xcode Cloud is the locked decision per 01-CONTEXT.md; only documented in workflow comments and BRANCH_PROTECTION.md

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The following manual steps are required before CI can run green:

**GitHub Secrets** (Settings → Secrets and variables → Actions):
- `TURBO_TOKEN` — obtain via `npx turbo login && npx turbo link`, then read `~/.turbo/config.json`
- `TURBO_TEAM` — Vercel team slug from same config

**Xcode Cloud** (iOS CI):
1. Install https://github.com/apps/xcode-cloud on the repository
2. Open `apps/ios/WonderWaltz.xcodeproj` in Xcode
3. Product → Xcode Cloud → Create Workflow (Build, Debug, iOS Simulator)
4. Set Start Condition: Pull Request to main
5. After first build, add the "Xcode Cloud" check to branch protection required checks

**Branch Protection** (Settings → Branches → Add rule for `main`):
- See full checklist in `docs/ops/BRANCH_PROTECTION.md`

## Next Phase Readiness

- CI workflows are live on all PRs (once secrets are set and Xcode Cloud is installed)
- Phase 01-foundation is complete — monorepo scaffolded, all apps shell-compiling, CI wired
- Phase 02-data-pipeline can begin: `packages/db` schema, Supabase provisioning, NestJS API, BullMQ

---
*Phase: 01-foundation*
*Completed: 2026-04-10*
