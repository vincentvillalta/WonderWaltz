import { Module } from '@nestjs/common';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { RateLimitService } from './rate-limit.service.js';

/**
 * PlanGenerationModule — umbrella for the solver-driven plan pipeline.
 *
 * Plan 03-05 scope: WalkingGraphLoader (SOLV-13 preload).
 * Plan 03-14: CircuitBreakerService (LLM-07 per-trip budget enforcement).
 * Plan 03-15: RateLimitService (LLM-08 rethink daily cap + PLAN-05 free-tier lifetime cap).
 * Plan 03-16 will extend this module with the generation processor,
 * rethink-today handler, etc.
 *
 * Import once in AppModule (HTTP side) AND WorkerModule (worker side)
 * so both processes keep an in-memory precomputed walking graph.
 */
@Module({
  providers: [WalkingGraphLoader, CircuitBreakerService, RateLimitService],
  exports: [WalkingGraphLoader, CircuitBreakerService, RateLimitService],
})
export class PlanGenerationModule {}
