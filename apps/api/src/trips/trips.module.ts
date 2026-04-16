import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PlanGenerationModule } from '../plan-generation/plan-generation.module.js';
import { TripsController } from './trips.controller.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'plan-generation' }), PlanGenerationModule],
  controllers: [TripsController],
})
export class TripsModule {}
