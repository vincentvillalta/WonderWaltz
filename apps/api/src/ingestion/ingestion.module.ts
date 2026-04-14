import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertingModule } from '../alerting/alerting.module.js';
import { QueueTimesService } from './queue-times.service.js';
import { QueueTimesProcessor } from './queue-times.processor.js';

/**
 * IngestionModule
 *
 * Houses the queue-times.com ingestion worker for WDW wait times (DATA-01).
 *
 * - Registers the 'wait-times' BullMQ queue
 * - Provides QueueTimesService (HTTP + Redis + DB) and QueueTimesProcessor
 * - Imports AlertingModule to get SlackAlerterService + LagAlertService
 * - Exports QueueTimesService for potential use by other modules
 *
 * Note: REDIS_CLIENT_TOKEN and DB_TOKEN are provided by SharedInfraModule
 * (registered as @Global() in WorkerModule) — no need to redeclare them here.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'wait-times' }), AlertingModule],
  providers: [QueueTimesService, QueueTimesProcessor],
  exports: [QueueTimesService],
})
export class IngestionModule {}
