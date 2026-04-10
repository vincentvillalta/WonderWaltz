---
phase: 01-foundation
plan: "02"
subsystem: api, database, design-tokens
tags: [nestjs, fastify, drizzle, postgres, style-dictionary, typescript, workspace-packages]

requires:
  - phase: 01-foundation/01-01
    provides: Turborepo pipeline, tsconfig.base.json, ESLint/Prettier/Husky/commitlint, pnpm workspaces

provides:
  - packages/db: createDb() factory with prepare:false for Supabase PgBouncer compatibility
  - packages/solver: SolverInput/DayPlan type stubs (Phase 3 implementation)
  - packages/shared-openapi: empty placeholder package for NestJS OpenAPI output
  - packages/content: disclaimer.en.json single source of truth + DISCLAIMER/DISCLAIMER_SHORT exports
  - packages/design-tokens: Style Dictionary 4 build producing Swift/Kotlin/CSS/TS token outputs
  - apps/api: NestJS 11 + Fastify app scaffold with OpenAPI swagger stub

affects: [01-03-web, 01-04-ios, 01-05-android, 02-data-pipeline, 03-engine, 05-ios-app, 07-android-app]

tech-stack:
  added:
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.x
    - postgres@3.4.x
    - "@nestjs/core@11.x"
    - "@nestjs/platform-fastify@11.x"
    - "@nestjs/config@4.x"
    - "@nestjs/swagger@11.x"
    - "@nestjs/bullmq@11.x"
    - bullmq@5.73.1
    - style-dictionary@4.4.x
    - reflect-metadata
    - rxjs

  patterns:
    - createDb() factory pattern with prepare:false for Supabase PgBouncer transaction pooling mode
    - NestJS Node16 module/moduleResolution for CommonJS app (not Node10/NodeNext)
    - vitest.config.mts (.mts extension) for ESM vitest config in CommonJS packages
    - Style Dictionary 4 custom format registration for css/tailwind-v4 (@theme {} directive)
    - SwiftUI ColorSwiftUI transform override (not UIKit UIColorSwift)
    - tsconfig.json includes root-level tool configs; tsconfig.build.json restricts to src/

key-files:
  created:
    - packages/db/src/index.ts
    - packages/db/package.json
    - packages/db/drizzle.config.ts
    - packages/solver/src/index.ts
    - packages/solver/package.json
    - packages/shared-openapi/src/index.ts
    - packages/shared-openapi/package.json
    - packages/content/src/index.ts
    - packages/content/src/disclaimer.ts
    - packages/content/legal/disclaimer.en.json
    - packages/design-tokens/tokens.json
    - packages/design-tokens/style-dictionary.config.mjs
    - packages/design-tokens/tests/build.test.ts
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/package.json
    - apps/api/vitest.config.mts
  modified:
    - packages/db/tsconfig.json
    - packages/design-tokens/tsconfig.json
    - apps/api/tsconfig.json
    - pnpm-lock.yaml

key-decisions:
  - "NestJS module system set to Node16 (not Node10/CommonJS) — Node10 deprecated in TypeScript 6, Node16 required for TS6 compliance while retaining CommonJS runtime output"
  - "@nestjs/swagger upgraded to v11 (not v8 as plan specified) — v8 has unmet peer deps against NestJS 11; v11 is the NestJS 11 compatible release"
  - "@nestjs/config upgraded to v4 (not v3) — v3 has unmet peer deps against NestJS 11"
  - "vitest.config renamed to .mts extension in apps/api — package is CommonJS but vitest/config is ESM-only; .mts forces ESM treatment regardless of package type field"
  - "packages/db tsconfig includes drizzle.config.ts — ESLint projectService requires all linted files to be in tsconfig; drizzle.config.ts is at root so rootDir changed to '.' with build tsconfig restricting to src/"
  - "packages/content tsconfig adds types:['node'] — createRequire from 'module' requires @types/node; base tsconfig does not include it globally"

patterns-established:
  - "Package tsconfig pattern: rootDir:'.' includes tool configs; tsconfig.build.json narrows rootDir to './src' for production output"
  - "ESM-only tool configs in CommonJS packages use .mts extension to bypass package type field"
  - "NestJS apps use Node16 module resolution (not legacy node10) for TypeScript 6 compliance"

requirements-completed: [FND-01, FND-06]

duration: 7min
completed: 2026-04-10
---

# Phase 01 Plan 02: Workspace Packages + NestJS API Scaffold Summary

**NestJS 11/Fastify API scaffolded alongside four typed workspace packages (db with PgBouncer-safe Drizzle client, solver stubs, shared-openapi placeholder, content disclaimer source of truth) and Style Dictionary 4 producing SwiftUI/Compose/Tailwind v4 token outputs**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-10T20:38:08Z
- **Completed:** 2026-04-10T20:45:00Z
- **Tasks:** 3
- **Files modified:** 34

## Accomplishments

- Five workspace packages all typecheck cleanly (db, solver, shared-openapi, content, design-tokens)
- NestJS 11 + Fastify adapter wires to @wonderwaltz/db, solver, content via workspace:* deps
- Style Dictionary 4 build produces four outputs: WWDesignTokens.swift (SwiftUI Color), WWTheme.kt (Compose), tokens.css (@theme block for Tailwind v4), tokens.ts
- packages/db/src/index.ts exports createDb() with `{ prepare: false }` for Supabase PgBouncer transaction pooling mode
- packages/content/legal/disclaimer.en.json established as single source of truth for the disclaimer text

## Task Commits

1. **Task 1: Workspace packages scaffold** - `6ee76b5` (feat)
2. **Task 2: NestJS API app scaffold with Fastify** - `4c04e80` (feat)
3. **Task 3: packages/design-tokens scaffold with Style Dictionary 4** - `2889c1d` (feat)

## Files Created/Modified

- `packages/db/src/index.ts` - createDb() factory with postgres({ prepare: false }) for Supabase PgBouncer
- `packages/db/drizzle.config.ts` - Drizzle Kit config for schema migrations
- `packages/solver/src/index.ts` - SolverInput/DayPlan type stubs; solve() throws until Phase 3
- `packages/shared-openapi/src/index.ts` - Empty placeholder for NestJS swagger output
- `packages/content/legal/disclaimer.en.json` - Canonical disclaimer text (single source of truth)
- `packages/content/src/disclaimer.ts` - DISCLAIMER/DISCLAIMER_SHORT exports via createRequire
- `packages/design-tokens/style-dictionary.config.mjs` - Style Dictionary 4 config with custom css/tailwind-v4 format and ColorSwiftUI transform
- `packages/design-tokens/tokens.json` - Two-tier primitive → semantic token structure with dark mode
- `packages/design-tokens/tests/build.test.ts` - Real assertions (replaced todo stubs)
- `apps/api/src/main.ts` - NestJS bootstrap with FastifyAdapter; OpenAPI DocumentBuilder stubbed
- `apps/api/src/app.module.ts` - Root AppModule with ConfigModule.forRoot (global, .env.local + .env)
- `apps/api/vitest.config.mts` - Vitest config as .mts for ESM compat in CommonJS package

## Decisions Made

- **Node16 module resolution for apps/api:** TypeScript 6 deprecated `moduleResolution: Node` (Node10). Node16 with `module: Node16` is the correct replacement for CommonJS NestJS apps.
- **@nestjs/swagger v11 + @nestjs/config v4:** Plan specified v8/v3 but those have unmet peer deps against NestJS 11. Upgraded to the NestJS 11 compatible releases.
- **vitest.config.mts:** apps/api has `"type": "commonjs"` but vitest/config is ESM-only. Renaming to `.mts` forces ESM module treatment and eliminates the TS1479 error.
- **tsconfig pattern (rootDir: '.'):** ESLint's projectService requires linted files to be in the tsconfig. Config files at package root (drizzle.config.ts, vitest.config.mts) are outside `src/`. Solution: main tsconfig uses rootDir `.`; build tsconfig overrides to `./src` for clean output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript 6 Node10 deprecation in apps/api tsconfig**
- **Found during:** Task 2 (NestJS API scaffold)
- **Issue:** Plan specified `"module": "CommonJS", "moduleResolution": "Node"` — `Node` (alias: Node10) is deprecated in TypeScript 6 and causes fatal TS5107 error
- **Fix:** Changed to `"module": "Node16", "moduleResolution": "Node16"` which is the TypeScript 6 replacement for CJS apps
- **Files modified:** apps/api/tsconfig.json
- **Verification:** `pnpm --filter @wonderwaltz/api typecheck` exits 0
- **Committed in:** 4c04e80 (Task 2 commit)

**2. [Rule 1 - Bug] Upgraded @nestjs/swagger and @nestjs/config for NestJS 11 peer compat**
- **Found during:** Task 2 (pnpm install after creating apps/api/package.json)
- **Issue:** Plan specified `@nestjs/swagger@^8.0.0` and `@nestjs/config@^3.0.0` — both have peer dep requirements for NestJS 9/10, causing pnpm to report unmet peers against NestJS 11
- **Fix:** Changed @nestjs/swagger to `^11.0.0` and @nestjs/config to `^4.0.0`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** No peer dep warnings in `pnpm install` output
- **Committed in:** 4c04e80 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added `void` operator to bootstrap() call**
- **Found during:** Task 2 (pre-commit ESLint hook)
- **Issue:** `bootstrap()` returns a Promise; `@typescript-eslint/no-floating-promises` rule requires explicit handling
- **Fix:** Changed `bootstrap()` to `void bootstrap()`
- **Files modified:** apps/api/src/main.ts
- **Verification:** ESLint lint-staged passes in commit hook
- **Committed in:** 4c04e80 (Task 2 commit)

**4. [Rule 3 - Blocking] Renamed vitest.config.ts to .mts in apps/api**
- **Found during:** Task 2 (ESLint pre-commit hook failure)
- **Issue:** apps/api has `"type": "commonjs"` — including vitest.config.ts in tsconfig caused TS1479 because vitest/config is ESM-only and TypeScript treats the file as CJS
- **Fix:** Renamed to vitest.config.mts (.mts always treated as ESM regardless of package type)
- **Files modified:** apps/api/vitest.config.mts (renamed from .ts)
- **Verification:** `pnpm --filter @wonderwaltz/api typecheck` exits 0
- **Committed in:** 4c04e80 (Task 2 commit)

**5. [Rule 2 - Missing Critical] Added `types: ["node"]` to packages/db and packages/content tscconfig**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** drizzle.config.ts references `process.env` and disclaimer.ts uses `createRequire` from `'module'` — both require `@types/node`; tsconfig.base.json does not include node types globally
- **Fix:** Added `"types": ["node"]` to packages/db/tsconfig.json and packages/content/tsconfig.json
- **Files modified:** packages/db/tsconfig.json, packages/content/tsconfig.json
- **Verification:** Both packages typecheck without errors
- **Committed in:** 6ee76b5 (Task 1 commit)

---

**Total deviations:** 5 auto-fixed (2 bugs, 2 missing critical, 1 blocking)
**Impact on plan:** All fixes required for TypeScript 6 compliance and NestJS 11 compatibility. No scope creep — each fix was necessary to meet the plan's success criteria.

## Issues Encountered

- Node 20 in environment despite engines requirement of Node 22 — non-blocking, only produces WARN from pnpm (not an error). All packages compile and run correctly on Node 20.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- All workspace packages compile and are wired via pnpm workspaces
- apps/api ready to receive NestJS modules (controllers, services, guards) in later plans
- packages/db ready for schema files in Plan 06
- packages/design-tokens generated outputs ready for iOS (WWDesignTokens.swift) and Android (WWTheme.kt) consumption
- packages/content/legal/disclaimer.en.json ready for the interceptor in Plan 10

---
*Phase: 01-foundation*
*Completed: 2026-04-10*
