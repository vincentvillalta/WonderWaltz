import { Module } from '@nestjs/common';
import { anthropicClientProvider } from './anthropic.client.js';
import { NarrativeService } from './narrative.service.js';
import { CostAlertService } from './cost-alert.service.js';

/**
 * NarrativeModule — the Claude-facing surface for plan generation.
 *
 * Provides NarrativeService (prompt pipeline + Zod validation) and
 * CostAlertService (LLM-06 cache hit rate monitoring).
 *
 * External dependencies (DB_TOKEN, REDIS_CLIENT_TOKEN, SlackAlerterService)
 * are provided by SharedInfraModule (@Global) and AlertingModule which are
 * registered at the root module level. CostAlertService uses string token
 * 'SlackAlerterService' to avoid importing AlertingModule here (which would
 * create DI resolution issues in tests without the global providers).
 *
 * Registered in both `AppModule` (so 03-09 `POST /trips/:id/rethink-today`
 * can call it directly on the HTTP side) and `WorkerModule` (so 03-16
 * BullMQ processor can call it). Each process instantiates its own
 * Anthropic client via the provider factory.
 */
@Module({
  providers: [anthropicClientProvider, NarrativeService, CostAlertService],
  exports: [NarrativeService, CostAlertService],
})
export class NarrativeModule {}
