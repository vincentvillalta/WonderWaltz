import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'db',
    include: ['tests/**/*.test.ts'],
    // Integration tests require a local Supabase instance (`supabase start`).
    // Excluded from the default suite; run explicitly with:
    //   vitest run packages/db/tests/rls.integration.test.ts
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    globals: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
