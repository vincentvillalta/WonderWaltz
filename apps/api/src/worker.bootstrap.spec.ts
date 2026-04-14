import { describe, it, expect, vi } from 'vitest';

// Mock ioredis before any imports to prevent real Redis connections
vi.mock('ioredis', () => {
  const mockRedis = vi.fn().mockImplementation(() => ({
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
  }));
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
