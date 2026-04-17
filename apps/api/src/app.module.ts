import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { buildBullRedisConfig } from './common/redis-config.js';
import { AuthModule } from './auth/auth.module.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { EntitlementModule } from './entitlements/entitlement.module.js';
import { ForecastModule } from './forecast/forecast.module.js';
import { NarrativeModule } from './narrative/narrative.module.js';
import { PackingListModule } from './packing-list/packing-list.module.js';
import { ParksModule } from './parks/parks.module.js';
import { PlanGenerationModule } from './plan-generation/plan-generation.module.js';
import { PlansModule } from './plans/plans.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { SharedInfraModule } from './shared-infra.module.js';
import { TripsModule } from './trips/trips.module.js';
import { WeatherModule } from './weather/weather.module.js';
import { WebhookModule } from './webhooks/webhook.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      connection: buildBullRedisConfig(),
    }),
    SharedInfraModule,
    WeatherModule,
    ParksModule,
    TripsModule,
    AuthModule,
    EntitlementModule,
    NarrativeModule,
    ForecastModule,
    PlanGenerationModule,
    PackingListModule,
    PlansModule,
    PurchasesModule,
    WebhookModule,
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
