import { Module, Global } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { REDIS_CLIENT_TOKEN } from './alerting/slack-alerter.service.js';
import { DB_TOKEN } from './ingestion/queue-times.service.js';

/** Injection token for the Supabase admin client (service_role key) */
export const SUPABASE_ADMIN_TOKEN = 'SUPABASE_ADMIN_TOKEN';

/**
 * Shared infrastructure module — marked @Global() so Redis and DB providers
 * are available throughout the entire module tree without repeated re-provision.
 *
 * Provides:
 *  - REDIS_CLIENT_TOKEN: shared ioredis client (from REDIS_URL env)
 *  - DB_TOKEN: Drizzle DB instance (from DATABASE_URL env)
 *
 * Import this module once in the root module (WorkerModule).
 * All feature modules (AlertingModule, IngestionModule) access these via DI
 * without needing to import SharedInfraModule themselves.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN_TOKEN,
      useFactory: () => {
        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!url || !key) {
          // Return a stub in environments without Supabase (e.g. unit tests)
          return {
            auth: {
              getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'stub' } }),
              admin: {},
            },
          };
        }
        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
    {
      provide: REDIS_CLIENT_TOKEN,
      useFactory: () => {
        const redisUrl = process.env['REDIS_URL'] ?? '';
        let host = 'localhost';
        let port = 6379;
        let password: string | undefined;
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          host = parsed.hostname;
          port = parsed.port ? Number(parsed.port) : 6380;
          password = parsed.password || undefined;
        }
        // In tests, ioredis is globally mocked — new Redis() returns a stub object
        const useTls = redisUrl.startsWith('rediss://');
        const config: RedisOptions = {
          host,
          port,
          password,
          ...(useTls ? { tls: {} } : {}),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };
        return new Redis(config);
      },
    },
    {
      provide: DB_TOKEN,
      useFactory: async (): Promise<unknown> => {
        const databaseUrl = process.env['DATABASE_URL'];
        if (!databaseUrl) {
          // No-op stub for environments without a DB (e.g. bootstrap tests)
          return { execute: () => Promise.resolve({ rows: [] }) };
        }
        // Work around @wonderwaltz/db dist-path mismatch (exports: ./dist/index.js
        // but build output is at dist/src/index.js — see 02-02 SUMMARY).
        // Resolve relative to the DB package, not __dirname, so the lookup
        // works regardless of where this module is loaded from (compiled
        // NestJS bundle vs. tsx live execution).
        const anchor =
          typeof __filename !== 'undefined' ? __filename : `${process.cwd()}/package.json`;
        const require = createRequire(anchor);
        const dbPkgJson = require.resolve('@wonderwaltz/db/package.json');
        const dbIndexPath = resolve(dirname(dbPkgJson), 'dist/src/index.js');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const dbPkg: { createDb: (url: string) => unknown } = await import(dbIndexPath);
        return dbPkg.createDb(databaseUrl);
      },
    },
  ],
  exports: [SUPABASE_ADMIN_TOKEN, REDIS_CLIENT_TOKEN, DB_TOKEN],
})
export class SharedInfraModule {}
