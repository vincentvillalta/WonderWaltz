import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller.js';
import { TripsController } from './trips.controller.js';

@Module({
  controllers: [TripsController, PlansController],
})
export class TripsModule {}
