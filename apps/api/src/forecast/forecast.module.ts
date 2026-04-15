import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { ForecastService } from './forecast.service.js';

/**
 * ForecastModule — FC-01..05 surface.
 *
 * Registered once in `AppModule`. Plan orchestrator (03-16) injects
 * `ForecastService`; the DB_TOKEN + REDIS_CLIENT_TOKEN come from the
 * @Global() SharedInfraModule that's already wired.
 */
@Module({
  providers: [CalendarService, ForecastService],
  exports: [CalendarService, ForecastService],
})
export class ForecastModule {}
