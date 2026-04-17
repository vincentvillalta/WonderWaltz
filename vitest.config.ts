import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/db',
      'packages/content',
      'packages/design-tokens',
      'packages/solver',
      'apps/api',
      'apps/web',
    ],
  },
});
