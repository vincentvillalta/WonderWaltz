/**
 * Vitest workspace config — lets `vitest` at the repo root run the suite
 * across every package. Per-package `vitest.config.ts` files still apply
 * when running inside a specific package (e.g. via `pnpm --filter X test`).
 */
export default [
  'packages/db',
  'packages/content',
  'packages/design-tokens',
  'packages/solver',
  'apps/api',
  'apps/web',
];
