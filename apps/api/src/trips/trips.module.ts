import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module.js';
import { PlanGenerationModule } from '../plan-generation/plan-generation.module.js';
import { TripsController } from './trips.controller.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'plan-generation' }),
    PlanGenerationModule,
    AuthModule,
  ],
  controllers: [TripsController],
})
export class TripsModule {}
