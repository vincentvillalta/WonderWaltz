---
phase: 01-foundation
plan: "03"
subsystem: ui
tags: [nextjs, tailwindcss, shadcn, react, vercel, design-tokens]

# Dependency graph
requires:
  - phase: 01-foundation/01-02
    provides: packages/design-tokens with generated tokens.css, packages/content scaffold
provides:
  - Next.js 16 App Router web app compiling cleanly
  - Tailwind v4 CSS with @theme design token integration
  - Root layout with LEGL-02 disclaimer footer on every page
  - shadcn/ui v4 components.json config (new-york, CSS variables)
  - cn() utility helper with clsx + tailwind-merge
  - Vercel deployment config for monorepo (apps/web root + repo root)
affects:
  - 01-foundation/01-04 (Supabase/infra — web app is now a deploy target)
  - Phase 8 (Marketing/UI — will build on this layout)

# Tech tracking
tech-stack:
  added:
    - next@16.2.3 (App Router, Turbopack default)
    - react@19.0.0 + react-dom@19.0.0
    - tailwindcss@4.2.0 (@tailwindcss/postcss@4.2.0)
    - shadcn/ui v4 (components.json, copy-to-own model)
    - clsx@^2.1.1 + tailwind-merge@^3.5.0
    - @sentry/nextjs@10.47.0 (dependency declared, not yet configured)
    - posthog-js@latest (dependency declared, not yet configured)
    - @supabase/ssr@latest + @supabase/supabase-js@2.102.1
  patterns:
    - Tailwind v4 CSS-native config (@import tailwindcss + @theme, no tailwind.config.js)
    - Design tokens imported in globals.css via @import from packages/design-tokens/generated/tokens.css
    - shadcn/ui components via CLI add (copy-to-own, no node_modules component dependency)
    - cn() utility pattern for conditional class merging

key-files:
  created:
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/next.config.ts
    - apps/web/src/app/globals.css
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/lib/utils.ts
    - apps/web/components.json
    - apps/web/vitest.config.ts
    - apps/web/vercel.json
    - vercel.json (repo root)
  modified:
    - pnpm-lock.yaml (new deps resolved)

key-decisions:
  - "globals.css tokens.css @import path is 4 levels up from src/app/ to repo root (../../../../packages/design-tokens/generated/tokens.css)"
  - "Tailwind v4 uses CSS-native @import tailwindcss + @theme directive — no tailwind.config.js created"
  - "DISCLAIMER text is inline in layout.tsx for Phase 1 (avoids build-time dependency on @wonderwaltz/content dist); will import from @wonderwaltz/content in Phase 8"
  - "tsconfig uses module=ESNext + moduleResolution=bundler for Next.js 16 App Router compatibility"

patterns-established:
  - "globals.css pattern: @import tailwindcss first, then @import design tokens CSS for @theme variables"
  - "Root layout footer: LEGL-02 satisfied by placing disclaimer text in RootLayout footer — renders on every route"

requirements-completed:
  - FND-01
  - FND-08

# Metrics
duration: 15min
completed: 2026-04-09
---

# Phase 01 Plan 03: Next.js 16 Web App Scaffold Summary

**Next.js 16 App Router app with Tailwind v4 CSS-native tokens, shadcn/ui v4 config, and LEGL-02 disclaimer footer wired into root layout**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-09T00:00:00Z
- **Completed:** 2026-04-09T00:15:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Next.js 16 app builds cleanly (`next build` exits 0) with Turbopack
- Tailwind v4 CSS-native config: `@import "tailwindcss"` + design tokens `@theme` block imported from `packages/design-tokens/generated/tokens.css`
- Root layout disclaimer footer satisfies LEGL-02 for every web page automatically
- shadcn/ui v4 `components.json` in place (new-york style, CSS variables, RSC-ready)
- Vercel deployment config in both `apps/web/vercel.json` and repo root `vercel.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Next.js 16 app scaffold with Tailwind v4** - `b231cd1` (feat)
2. **Task 2: Root layout with disclaimer footer + Vercel config** - `02d558d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `apps/web/package.json` - Next.js 16 app with all declared dependencies
- `apps/web/tsconfig.json` - Extends tsconfig.base.json, bundler moduleResolution, jsx preserve
- `apps/web/next.config.ts` - Minimal config (Turbopack default in Next.js 16)
- `apps/web/src/app/globals.css` - Tailwind v4 entry: @import tailwindcss + design tokens
- `apps/web/src/app/layout.tsx` - Root layout with metadata + LEGL-02 disclaimer footer
- `apps/web/src/app/page.tsx` - Placeholder home page
- `apps/web/src/lib/utils.ts` - cn() helper with clsx + tailwind-merge
- `apps/web/components.json` - shadcn/ui v4 config (new-york, neutral, CSS variables)
- `apps/web/vitest.config.ts` - jsdom test environment config
- `apps/web/vercel.json` - Vercel project config (framework, buildCommand, outputDirectory)
- `vercel.json` - Root Vercel config for monorepo deploy pointing at apps/web
- `pnpm-lock.yaml` - Updated with new resolved packages

## Decisions Made

- CSS @import path for design tokens is `../../../../packages/design-tokens/generated/tokens.css` (4 levels from `src/app/` to repo root) — this was auto-fixed when the build failed with a 2-level relative path from the plan
- DISCLAIMER text stays inline in `layout.tsx` for now; plan notes it will move to `@wonderwaltz/content` import in Phase 8 to avoid requiring a build step in Phase 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect CSS @import relative path for tokens.css**
- **Found during:** Task 2 (build verification)
- **Issue:** Plan specified `../../packages/design-tokens/generated/tokens.css` which resolves relative to `apps/web/` (the Next.js root), but CSS @import resolves relative to the CSS file itself at `apps/web/src/app/globals.css` — requiring 4 levels up, not 2
- **Fix:** Changed path to `../../../../packages/design-tokens/generated/tokens.css`
- **Files modified:** `apps/web/src/app/globals.css`
- **Verification:** `next build` exits 0, no module-not-found error
- **Committed in:** `02d558d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect relative path)
**Impact on plan:** Required for build to pass. No scope creep.

## Issues Encountered

- Turbopack module resolution for CSS `@import` resolves relative to the CSS file location, not the Next.js project root. The plan's 2-level relative path assumed project-root resolution; fixed to 4-level path.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- `apps/web` builds cleanly and is ready for CI integration (turbo pipeline)
- Design token CSS integration is live — token utility classes available in all components
- shadcn/ui components can be added via `pnpm dlx shadcn@latest add [component]` from `apps/web/`
- Sentry and PostHog are declared as dependencies but not yet configured (Phase 8)
- Vercel deploy config in place — linking the Vercel project to the repo will enable preview deploys

---
*Phase: 01-foundation*
*Completed: 2026-04-09*
