import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { ForecastService } from './forecast.service.js';
import { WaitBaselinesService } from './wait-baselines.service.js';

/**
 * ForecastModule — FC-01..05 surface.
 *
 * Registered once in `AppModule`. Plan orchestrator (03-16) injects
 * `ForecastService`; the DB_TOKEN + REDIS_CLIENT_TOKEN come from the
 * @Global() SharedInfraModule that's already wired.
 *
 * `WaitBaselinesService` is the static-JSON shortcut added 2026-04 for
 * attractions we have curated hour-bucket data on — see
 * `packages/content/wdw/wait-baselines.json`.
 */
@Module({
  providers: [CalendarService, ForecastService, WaitBaselinesService],
  exports: [CalendarService, ForecastService, WaitBaselinesService],
})
export class ForecastModule {}
