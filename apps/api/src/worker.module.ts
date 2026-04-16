import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { SharedInfraModule } from './shared-infra.module.js';
import { IngestionModule } from './ingestion/ingestion.module.js';
import { RollupModule } from './rollup/rollup.module.js';
import { CrowdIndexModule } from './crowd-index/crowd-index.module.js';
import { PlanGenerationModule } from './plan-generation/plan-generation.module.js';

/**
 * Parse the REDIS_URL env var into an ioredis connection config.
 * Handles Upstash's rediss:// format (TLS + password auth).
 */
function buildRedisConfig() {
  const redisUrl = process.env['REDIS_URL'] ?? '';
  let host = 'localhost';
  let port = 6379;
  let password: string | undefined;

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    host = parsed.hostname;
    port = parsed.port ? Number(parsed.port) : 6380;
    // URL password is in the format :password@host (auth is empty username)
    password = parsed.password || undefined;
  }

  return {
    host,
    port,
    password,
    tls: {},
    maxRetriesPerRequest: null, // CRITICAL: required for BullMQ blocking commands
    enableReadyCheck: false, // Recommended for Upstash
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      connection: buildRedisConfig(),
    }),
    BullModule.registerQueue({ name: 'plan-generation' }),
    SharedInfraModule,
    IngestionModule,
    RollupModule,
    CrowdIndexModule,
    PlanGenerationModule,
  ],
})
export class WorkerModule {}
