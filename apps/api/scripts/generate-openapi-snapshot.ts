/**
 * Generate OpenAPI v1 snapshot from the compiled NestJS AppModule.
 *
 * Usage (from repo root, after pnpm run build):
 *   node apps/api/scripts/generate-openapi-snapshot.js
 *
 * Or during development (compile first):
 *   pnpm --filter @wonderwaltz/api run build
 *   node apps/api/scripts/generate-openapi-snapshot.js
 *
 * Bootstraps NestJS with Fastify (no HTTP listener) and writes the Swagger
 * document to packages/shared-openapi/openapi.v1.snapshot.json.
 *
 * Run this after any controller or DTO change, then commit the snapshot.
 * CI enforces: git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json
 *
 * Why use dist/ instead of tsx?
 * tsx uses esbuild which does not emit decorator metadata. NestJS @ApiProperty
 * decorators rely on Reflect.metadata, which requires tsc with
 * emitDecoratorMetadata: true. The compiled dist/ output has this metadata.
 */

// reflect-metadata MUST be the first import — NestJS decorators require it
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// __dirname when compiled: apps/api/dist/scripts/
// tsc with rootDir "." outputs src/ files to dist/src/ and scripts/ to dist/scripts/
// 4 levels up from dist/scripts/ → repo root → packages/shared-openapi/
const SNAPSHOT_PATH: string = join(
  __dirname,
  '../../../../packages/shared-openapi/openapi.v1.snapshot.json',
);

async function generateSnapshot(): Promise<void> {
  // Import AppModule from the compiled dist/ — this requires `pnpm run build` first.
  // When compiled, this script runs from dist/scripts/ and AppModule is at ../src/app.module.js
  // (tsc rootDir "." preserves src/ subdir in dist output)
  // Using require() because the dist is CJS (apps/api "type": "commonjs").
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../src/app.module.js') as {
    AppModule: new () => object;
  };

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false, // suppress noise during snapshot generation
  });

  // Set global prefix so all routes appear as /v1/... in the spec
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('WonderWaltz API')
    .setDescription(
      'WonderWaltz trip planning backend. ' +
        'v1 surface: ingestion reads (live), trip/plan stubs (501 until Phase 3), ' +
        'auth stubs (501 until Phase 4).',
    )
    .setVersion('1')
    .addServer('/v1', 'WonderWaltz API v1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Ensure output directory exists
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(document, null, 2) + '\n', 'utf8');

  await app.close();

  console.log(`OpenAPI snapshot written to: ${SNAPSHOT_PATH}`);
}

generateSnapshot().catch((err: unknown) => {
  console.error('Failed to generate OpenAPI snapshot:', err);
  process.exit(1);
});
