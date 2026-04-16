import { Module } from '@nestjs/common';
import { ForecastModule } from '../forecast/forecast.module.js';
import { NarrativeModule } from '../narrative/narrative.module.js';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { PlanGenerationService } from './plan-generation.service.js';
import { PersistPlanService } from './persist-plan.service.js';
import { SolverLoader } from './solver.loader.js';

/**
 * PlanGenerationModule — umbrella for the solver-driven plan pipeline.
 *
 * Plan 03-05 scope: WalkingGraphLoader (SOLV-13 preload).
 * Plan 03-14: CircuitBreakerService (LLM-07 per-trip budget enforcement).
 * Plan 03-15: RateLimitService (LLM-08 rethink daily cap + PLAN-05 free-tier lifetime cap).
 * Plan 03-16: PlanGenerationService (orchestrator) + PersistPlanService (multi-table insert).
 *
 * Import once in AppModule (HTTP side) AND WorkerModule (worker side)
 * so both processes keep an in-memory precomputed walking graph.
 */
@Module({
  imports: [ForecastModule, NarrativeModule],
  providers: [
    WalkingGraphLoader,
    CircuitBreakerService,
    RateLimitService,
    PlanGenerationService,
    PersistPlanService,
    SolverLoader,
  ],
  exports: [
    WalkingGraphLoader,
    CircuitBreakerService,
    RateLimitService,
    PlanGenerationService,
    PersistPlanService,
    SolverLoader,
  ],
})
export class PlanGenerationModule {}
