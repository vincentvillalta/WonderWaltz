import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertingModule } from '../alerting/alerting.module.js';
import { RollupProcessor } from './rollup.processor.js';

/**
 * RollupModule
 *
 * Houses the pg_cron monitor worker (DATA-03).
 *
 * The RollupProcessor queries cron.job_run_details to verify that the
 * wait_times_1h materialized view was refreshed by pg_cron on schedule.
 * It does NOT refresh the view itself.
 *
 * - Registers 'rollup-verify' BullMQ queue
 * - Imports AlertingModule to get SlackAlerterService for dead-letter alerts
 *
 * Note: REDIS_CLIENT_TOKEN and DB_TOKEN are provided by SharedInfraModule
 * (registered as @Global() in WorkerModule) — no need to redeclare them here.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'rollup-verify' }), AlertingModule],
  providers: [RollupProcessor],
})
export class RollupModule {}
