import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { ForecastModule } from './forecast/forecast.module.js';
import { NarrativeModule } from './narrative/narrative.module.js';
import { ParksModule } from './parks/parks.module.js';
import { PlanGenerationModule } from './plan-generation/plan-generation.module.js';
import { PlansModule } from './plans/plans.module.js';
import { SharedInfraModule } from './shared-infra.module.js';
import { TripsModule } from './trips/trips.module.js';
import { WeatherModule } from './weather/weather.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SharedInfraModule,
    WeatherModule,
    ParksModule,
    TripsModule,
    AuthModule,
    NarrativeModule,
    ForecastModule,
    PlanGenerationModule,
    PlansModule,
  ],
  providers: [
    {
      // Register as global interceptor via DI (allows Reflector injection)
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class AppModule {}
