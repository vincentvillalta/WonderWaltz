import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertingModule } from '../alerting/alerting.module.js';
import { QueueTimesService } from './queue-times.service.js';
import { QueueTimesProcessor } from './queue-times.processor.js';
import { ThemeparksService } from './themeparks.service.js';
import { ThemeparksProcessor } from './themeparks.processor.js';

/**
 * IngestionModule
 *
 * Houses all data ingestion workers for WDW wait times and park hours.
 *
 * DATA-01 (queue-times.com): 'wait-times' queue, QueueTimesService + QueueTimesProcessor
 * DATA-02 (themeparks.wiki): 'park-hours' queue, ThemeparksService + ThemeparksProcessor
 *
 * - Registers 'wait-times' and 'park-hours' BullMQ queues
 * - Imports AlertingModule to get SlackAlerterService + LagAlertService
 * - Exports QueueTimesService and ThemeparksService for use by other modules
 *
 * Note: REDIS_CLIENT_TOKEN and DB_TOKEN are provided by SharedInfraModule
 * (registered as @Global() in WorkerModule) — no need to redeclare them here.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'wait-times' }),
    BullModule.registerQueue({ name: 'park-hours' }),
    AlertingModule,
  ],
  providers: [QueueTimesService, QueueTimesProcessor, ThemeparksService, ThemeparksProcessor],
  exports: [QueueTimesService, ThemeparksService],
})
export class IngestionModule {}
