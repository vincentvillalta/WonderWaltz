/**
 * Shared Redis connection config for BullMQ queues.
 * Used by both AppModule (HTTP) and WorkerModule (worker) to avoid duplication.
 * Parses Upstash's rediss:// format with TLS and password auth.
 */
export function buildBullRedisConfig() {
  const redisUrl = process.env['REDIS_URL'] ?? '';
  let host = 'localhost';
  let port = 6379;
  let password: string | undefined;
  let useTls = false;

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    host = parsed.hostname;
    port = parsed.port ? Number(parsed.port) : 6380;
    password = parsed.password || undefined;
    useTls = parsed.protocol === 'rediss:';
  }

  return {
    host,
    port,
    password,
    ...(useTls ? { tls: {} } : {}),
    maxRetriesPerRequest: null, // CRITICAL: required for BullMQ blocking commands
    enableReadyCheck: false, // Recommended for Upstash
  };
}
