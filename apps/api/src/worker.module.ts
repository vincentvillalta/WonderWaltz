import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      connection: (() => {
        const redisUrl = process.env['REDIS_URL'] ?? '';
        // Parse rediss:// URL: rediss://:password@host:port
        // ioredis connection config with Upstash-safe TLS settings
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
      })(),
    }),
  ],
})
export class WorkerModule {}
