import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service.js';
import { ClimatologyService } from './climatology.service.js';

/**
 * WeatherModule — on-demand weather cache-aside (DATA-08) plus a
 * climatology fallback for trips beyond the live-forecast horizon.
 *
 * Provides WeatherService for HTTP endpoints (GET /v1/weather?date=…)
 * and plan-generation consumers. Climatology is injected into
 * WeatherService so beyond-horizon requests degrade to Orlando monthly
 * normals instead of null.
 *
 * REDIS_CLIENT_TOKEN is provided by the global SharedInfraModule registered
 * in AppModule (via SharedInfraModule import) — no need to re-declare it here.
 */
@Module({
  providers: [WeatherService, ClimatologyService],
  exports: [WeatherService, ClimatologyService],
})
export class WeatherModule {}
