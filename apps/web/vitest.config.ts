import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    name: 'web',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Add `environment: 'jsdom'` + install jsdom once actual DOM-touching
    // tests are added. Keeping the default (node) so the empty suite
    // doesn't fail on a missing jsdom dependency.
  },
});
