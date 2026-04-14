import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertingModule } from '../alerting/alerting.module.js';
import { CrowdIndexService } from './crowd-index.service.js';
import { CrowdIndexProcessor } from './crowd-index.processor.js';

/**
 * CrowdIndexModule
 *
 * Houses the crowd index worker (DATA-04).
 *
 * CrowdIndexService: percentile/bootstrap formula selection + Redis writes
 * CrowdIndexProcessor: BullMQ processor, hourly upsertJobScheduler, dead-letter
 *
 * - Registers 'crowd-index' BullMQ queue
 * - Imports AlertingModule to get SlackAlerterService for dead-letter alerts
 * - Exports CrowdIndexService for use by the API HTTP layer (GET /v1/crowd-index)
 *
 * Note: REDIS_CLIENT_TOKEN and DB_TOKEN are provided by SharedInfraModule
 * (registered as @Global() in WorkerModule) — no need to redeclare them here.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'crowd-index' }), AlertingModule],
  providers: [CrowdIndexService, CrowdIndexProcessor],
  exports: [CrowdIndexService],
})
export class CrowdIndexModule {}
