import { Module } from '@nestjs/common';
import { WalkingGraphLoader } from './walking-graph.loader.js';

/**
 * PlanGenerationModule — umbrella for the solver-driven plan pipeline.
 *
 * Plan 03-05 scope: only the `WalkingGraphLoader` (SOLV-13 preload).
 * Plan 03-16 will extend this module with the generation processor,
 * rethink-today handler, etc.
 *
 * Import once in AppModule (HTTP side) AND WorkerModule (worker side)
 * so both processes keep an in-memory precomputed walking graph.
 */
@Module({
  providers: [WalkingGraphLoader],
  exports: [WalkingGraphLoader],
})
export class PlanGenerationModule {}
