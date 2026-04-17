import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Global /v1 prefix matches the OpenAPI spec used by mobile clients.
  app.setGlobalPrefix('v1', { exclude: ['api/docs', 'api/docs-json'] });

  // OpenAPI spec — Phase 2+ controllers will populate this
  const config = new DocumentBuilder()
    .setTitle('WonderWaltz API')
    .setDescription('WonderWaltz trip planning backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env['PORT'] ?? 3000, '0.0.0.0');
}

void bootstrap();
