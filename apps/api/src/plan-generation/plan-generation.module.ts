import { Module } from '@nestjs/common';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

/**
 * PlanGenerationModule — umbrella for the solver-driven plan pipeline.
 *
 * Plan 03-05 scope: WalkingGraphLoader (SOLV-13 preload).
 * Plan 03-14: CircuitBreakerService (LLM-07 per-trip budget enforcement).
 * Plan 03-16 will extend this module with the generation processor,
 * rethink-today handler, etc.
 *
 * Import once in AppModule (HTTP side) AND WorkerModule (worker side)
 * so both processes keep an in-memory precomputed walking graph.
 */
@Module({
  providers: [WalkingGraphLoader, CircuitBreakerService],
  exports: [WalkingGraphLoader, CircuitBreakerService],
})
export class PlanGenerationModule {}
