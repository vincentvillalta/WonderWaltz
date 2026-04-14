import { describe, it, expect, vi } from 'vitest';

// Mock @nestjs/bullmq to prevent real BullMQ queue connections during bootstrap test.
// This avoids onModuleInit upsertJobScheduler calls hanging on Redis connection.
vi.mock('@nestjs/bullmq', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const original = await importOriginal<typeof import('@nestjs/bullmq')>();

  function makeMockQueue() {
    return {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: '1' }),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };
  }

  return {
    ...original,
    BullModule: {
      forRoot: vi.fn().mockReturnValue({
        module: class BullRootModule {},
        providers: [],
        exports: [],
        global: true,
      }),
      // registerQueue is called once per queue name; provide a stub token for each
      registerQueue: vi.fn().mockImplementation((...configs: Array<{ name: string }>) => {
        const providers = configs.map((cfg) => ({
          provide: original.getQueueToken(cfg.name),
          useValue: makeMockQueue(),
        }));
        const exports = configs.map((cfg) => original.getQueueToken(cfg.name));
        return {
          module: class BullQueueModule {},
          providers,
          exports,
        };
      }),
    },
  };
});

// Mock ioredis before any imports to prevent real Redis connections.
// Uses a regular function (not arrow) so vi.fn() can be called as a constructor
// (new Redis(config)) when NestJS module providers instantiate it.
vi.mock('ioredis', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRedis = vi.fn().mockImplementation(function (this: any) {
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
  });
  return { default: mockRedis };
});

// Mock @sentry/nestjs to avoid real Sentry initialization
vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  SentryModule: {
    forRoot: vi.fn().mockReturnValue({ module: class SentryModule {} }),
  },
}));

// Set required env vars before module load
process.env['REDIS_URL'] = 'rediss://:testpassword@localhost:6380';
process.env['NODE_ENV'] = 'test';

import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

describe('worker bootstrap (DATA-07)', () => {
  it('creates application context without an HTTP server', async () => {
    const app = await NestFactory.createApplicationContext(WorkerModule, {
      bufferLogs: true,
      abortOnError: false,
    });

    // Must not expose an HTTP server
    expect((app as { getHttpServer?: unknown }).getHttpServer).toBeUndefined();

    await app.close();
  });

  it('worker.ts does not call app.listen()', async () => {
    // Verify worker entry point has no HTTP listen call
    const fs = await import('fs');
    const path = await import('path');
    const workerPath = path.resolve(__dirname, 'worker.ts');
    const workerSource = fs.readFileSync(workerPath, 'utf-8');

    expect(workerSource).not.toContain('app.listen(');
    expect(workerSource).not.toContain('SwaggerModule.setup(');
    expect(workerSource).toContain('createApplicationContext');
    expect(workerSource).toContain('enableShutdownHooks');
  });

  it('worker.module.ts has maxRetriesPerRequest: null in BullModule config', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const modulePath = path.resolve(__dirname, 'worker.module.ts');
    const moduleSource = fs.readFileSync(modulePath, 'utf-8');

    expect(moduleSource).toContain('maxRetriesPerRequest: null');
  });
});
