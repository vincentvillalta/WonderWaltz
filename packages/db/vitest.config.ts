import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'db',
    include: ['tests/**/*.test.ts'],
    globals: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
