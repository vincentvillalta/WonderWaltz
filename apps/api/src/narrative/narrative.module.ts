import { Module } from '@nestjs/common';
import { anthropicClientProvider } from './anthropic.client.js';
import { NarrativeService } from './narrative.service.js';

/**
 * NarrativeModule — the Claude-facing surface for plan generation.
 *
 * Scaffold only in plan 03-02. Real prompt pipeline + Zod validation +
 * circuit breaker integration land in 03-12 (prompt/schema) and 03-13
 * (cost telemetry). Wiring this early so downstream plans (03-16
 * plan-generation processor) can import it without creating a cycle.
 *
 * Registered in both `AppModule` (so 03-09 `POST /trips/:id/rethink-today`
 * can call it directly on the HTTP side) and `WorkerModule` (so 03-16
 * BullMQ processor can call it). Each process instantiates its own
 * Anthropic client via the provider factory.
 */
@Module({
  providers: [anthropicClientProvider, NarrativeService],
  exports: [NarrativeService],
})
export class NarrativeModule {}
