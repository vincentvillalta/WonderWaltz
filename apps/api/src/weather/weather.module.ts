import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service.js';

/**
 * WeatherModule — on-demand weather cache-aside (DATA-08).
 *
 * Provides WeatherService for HTTP endpoints (GET /v1/weather?date=…).
 * No BullMQ queues or processors — weather is fetched on-demand only.
 *
 * REDIS_CLIENT_TOKEN is provided by the global SharedInfraModule registered
 * in AppModule (via SharedInfraModule import) — no need to re-declare it here.
 */
@Module({
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
