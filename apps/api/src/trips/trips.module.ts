import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PlanGenerationModule } from '../plan-generation/plan-generation.module.js';
import { TripsController } from './trips.controller.js';

@Module({
  imports: [PlanGenerationModule, AuthModule],
  controllers: [TripsController],
})
export class TripsModule {}
