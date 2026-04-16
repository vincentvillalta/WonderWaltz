import { Module } from '@nestjs/common';
import { AlertingModule } from '../alerting/alerting.module.js';
import { ForecastModule } from '../forecast/forecast.module.js';
import { NarrativeModule } from '../narrative/narrative.module.js';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { PlanGenerationService } from './plan-generation.service.js';
import { PersistPlanService } from './persist-plan.service.js';
import { PlanGenerationProcessor } from './plan-generation.processor.js';
import { SolverLoader } from './solver.loader.js';

/**
 * PlanGenerationModule -- umbrella for the solver-driven plan pipeline.
 *
 * Plan 03-05: WalkingGraphLoader (SOLV-13 preload).
 * Plan 03-14: CircuitBreakerService (LLM-07 budget enforcement).
 * Plan 03-15: RateLimitService (LLM-08 rethink caps).
 * Plan 03-16: PlanGenerationService (orchestrator) +
 *             PersistPlanService (multi-table insert) +
 *             PlanGenerationProcessor (BullMQ processor).
 *
 * Import once in AppModule (HTTP) AND WorkerModule (worker)
 * so both processes keep an in-memory precomputed walking graph.
 */
@Module({
  imports: [AlertingModule, ForecastModule, NarrativeModule],
  providers: [
    WalkingGraphLoader,
    CircuitBreakerService,
    RateLimitService,
    PlanGenerationService,
    PersistPlanService,
    PlanGenerationProcessor,
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
