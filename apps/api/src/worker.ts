import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  app.enableShutdownHooks();
}

bootstrap().catch((err: unknown) => {
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
