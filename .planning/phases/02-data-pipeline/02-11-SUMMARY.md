---
phase: 02-data-pipeline
plan: "11"
subsystem: content + web
tags: [attribution, content, footer, DATA-05, queue-times]
dependency_graph:
  requires: ["02-03"]
  provides: ["attribution content file", "web footer plain-text attribution"]
  affects: ["apps/web", "packages/content"]
tech_stack:
  added: []
  patterns: ["createRequire JSON import (same as disclaimer.ts)", "Footer component extracted from layout.tsx"]
key_files:
  created:
    - packages/content/legal/attribution.en.json
    - packages/content/src/attribution.ts
    - packages/content/src/attribution.spec.ts
    - packages/content/vitest.config.ts
    - apps/web/src/components/Footer.tsx
  modified:
    - packages/content/src/index.ts
    - packages/content/tsconfig.json
    - apps/web/src/app/layout.tsx
decisions:
  - "ATTRIBUTION exported via createRequire pattern — mirrors disclaimer.ts, avoids ESM/CJS boundary issue"
  - "vitest.config.ts added to content package so tests run in workspace (packages/*/vitest.config.ts glob)"
  - "vitest.config.ts added to tsconfig.json include array to satisfy ESLint projectService"
  - "Footer component extracted from layout.tsx (no inline footer in layout anymore)"
  - "iOS/Android About screen wiring explicitly deferred to Phase 5/7 per CONTEXT.md"
metrics:
  duration_minutes: 7
  completed_date: "2026-04-14"
  tasks_completed: 1
  files_created: 5
  files_modified: 3
---

# Phase 02 Plan 11: Attribution Content File + Web Footer Summary

**One-liner:** Single-source attribution JSON ("Data source: queue-times.com") with TDD test and plain-text web footer via imported constant.

## Objective

Create `packages/content/legal/attribution.en.json` as the single source of truth for the queue-times.com attribution string, wire it into the web footer as plain text (no hyperlink), and add an automated DATA-05 test.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Attribution content file + test + web footer | 17cf7f7 | 5 created, 3 modified |

## Implementation Notes

### TDD Execution

**RED:** `attribution.spec.ts` written first — 3 tests all failed (file not found, JSON text mismatch, module not found).

**GREEN:** Created `attribution.en.json`, `attribution.ts`, and exported from `index.ts` — all 3 tests pass.

### Key Patterns

The `attribution.ts` module uses the same `createRequire(import.meta.url)` + `require(...)` pattern as `disclaimer.ts`. This avoids the ESM/CJS boundary issue documented in STATE.md decisions for the disclaimer.

The existing `apps/web/src/app/layout.tsx` had the attribution as a hyperlink (`<a href="https://queue-times.com">`). This was replaced by extracting a `Footer.tsx` component that imports `ATTRIBUTION` from `@wonderwaltz/content` and renders it as plain text per CONTEXT.md decision Area 7 Q7.4.

### Auto-fix Applied

**[Rule 3 - Blocking] Added vitest.config.ts to content package tsconfig.json include array**
- Found during: Task 1 (commit attempt)
- Issue: ESLint projectService could not find `vitest.config.ts` because tsconfig.json only included `src/`
- Fix: Added `"vitest.config.ts"` to the `include` array in `packages/content/tsconfig.json`
- Files modified: `packages/content/tsconfig.json`
- Commit: 17cf7f7 (included in same commit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created vitest.config.ts for content package**
- Found during: Task 1
- Issue: Content package had no vitest.config.ts; the `packages/*/vitest.config.ts` glob in the root vitest.config wouldn't pick it up
- Fix: Created `packages/content/vitest.config.ts` with name `content` and include `src/**/*.spec.ts`
- Files modified: `packages/content/vitest.config.ts`
- Commit: 17cf7f7

**2. [Rule 1 - Bug] Removed hyperlink attribution from layout.tsx**
- Found during: Task 1 (reading existing layout.tsx)
- Issue: The existing `layout.tsx` had `<a href="https://queue-times.com">` — violating CONTEXT.md Area 7 Q7.4 (plain text, no hyperlink)
- Fix: Replaced entire footer with new `Footer.tsx` component that uses plain text `{ATTRIBUTION}`
- Files modified: `apps/web/src/app/layout.tsx`, created `apps/web/src/components/Footer.tsx`
- Commit: 17cf7f7

## Deferred

- iOS About screen wiring → Phase 5 (per CONTEXT.md)
- Android About screen wiring → Phase 7 (per CONTEXT.md)
- DISCLAIMER import from @wonderwaltz/content in layout.tsx → Phase 8 (per existing STATE.md decision)

## Verification Results

1. `pnpm --filter @wonderwaltz/content exec vitest run --project content` — 3/3 tests pass (DATA-05 green)
2. `python3` JSON assertion — passes: text === "Data source: queue-times.com"
3. `pnpm --filter @wonderwaltz/web exec tsc --noEmit` — no errors, Footer.tsx compiles

## Self-Check

Files exist:
- packages/content/legal/attribution.en.json — FOUND
- packages/content/src/attribution.ts — FOUND
- packages/content/src/attribution.spec.ts — FOUND
- packages/content/vitest.config.ts — FOUND
- apps/web/src/components/Footer.tsx — FOUND

Commit 17cf7f7 — FOUND
