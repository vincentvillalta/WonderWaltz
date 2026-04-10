import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    name: 'design-tokens',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
