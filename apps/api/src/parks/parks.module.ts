import { Module } from '@nestjs/common';
import { WeatherModule } from '../weather/weather.module.js';
import { CrowdIndexController } from './crowd-index.controller.js';
import { ParksController } from './parks.controller.js';
import { ParksService } from './parks.service.js';
import { WeatherController } from './weather.controller.js';

/**
 * ParksModule
 *
 * Hosts the live ingestion read endpoints (plan 02-09):
 *   - GET /v1/parks — catalog list
 *   - GET /v1/parks/:parkId/waits — Redis wait times + is_stale computation
 *   - GET /v1/crowd-index — Redis crowd index keys (global + 4 parks)
 *   - GET /v1/weather?date= — delegates to WeatherService
 *
 * SharedInfraModule is @Global() (registered in AppModule) so REDIS_CLIENT_TOKEN
 * and DB_TOKEN are available to ParksService without re-importing here.
 * WeatherModule is imported to provide WeatherService for constructor injection.
 */
@Module({
  imports: [WeatherModule],
  controllers: [ParksController, CrowdIndexController, WeatherController],
  providers: [ParksService],
  exports: [ParksService],
})
export class ParksModule {}
