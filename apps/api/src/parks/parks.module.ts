import { Module } from '@nestjs/common';
import { CrowdIndexController } from './crowd-index.controller.js';
import { ParksController } from './parks.controller.js';
import { WeatherController } from './weather.controller.js';

@Module({
  controllers: [ParksController, CrowdIndexController, WeatherController],
})
export class ParksModule {}
