import { vi } from 'vitest';

/**
 * Global Vitest setup file.
 * Mocks ioredis, Sentry, and provides test helpers.
 * Registered via vitest.config.mts setupFiles.
 */

// Mock ioredis globally so tests never require a live Redis connection.
// Uses a regular function (not arrow) in mockImplementation so vi.fn() can
// also be called as a constructor (new Redis(config)) in NestJS module factories.
vi.mock('ioredis', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRedis = vi.fn().mockImplementation(function (this: any) {
    return makeRedisClient();
  });
  return { default: mockRedis };
});

// Stub Sentry to prevent real initialization in tests
vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  SentryModule: {
    forRoot: vi.fn().mockReturnValue({ module: class SentryModule {} }),
  },
}));

/**
 * Creates a mock ioredis client with common Redis methods stubbed.
 * Use this in individual tests when you need a typed mock client reference.
 */
export function makeRedisClient() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    status: 'ready',
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
}
