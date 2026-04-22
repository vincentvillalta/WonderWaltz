import { Module } from '@nestjs/common';
import { AlertingModule } from '../alerting/alerting.module.js';
import { ForecastModule } from '../forecast/forecast.module.js';
import { NarrativeModule } from '../narrative/narrative.module.js';
import { PackingListModule } from '../packing-list/packing-list.module.js';
import { WeatherModule } from '../weather/weather.module.js';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { PlanGenerationService } from './plan-generation.service.js';
import { PersistPlanService } from './persist-plan.service.js';
import { SolverLoader } from './solver.loader.js';

/**
 * PlanGenerationModule -- umbrella for the solver-driven plan pipeline.
 *
 * Plan generation is invoked inline (fire-and-forget) from
 * TripsController; see runPlanGenerationInBackground. There is no
 * BullMQ processor here anymore — the old queue-based path was
 * replaced to stop burning Redis requests on idle Worker polling.
 */
@Module({
  imports: [AlertingModule, ForecastModule, NarrativeModule, PackingListModule, WeatherModule],
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
