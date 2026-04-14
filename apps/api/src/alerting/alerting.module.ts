import { Module } from '@nestjs/common';
import { SlackAlerterService } from './slack-alerter.service.js';
import { LagAlertService } from './lag-alert.service.js';

/**
 * AlertingModule
 *
 * Provides Slack webhook alerting and ingestion lag detection.
 * Purely a service provider — does NOT register BullModule queues.
 *
 * Wave 2 feature modules (e.g., QueueTimesModule) import AlertingModule
 * to access SlackAlerterService and LagAlertService without circular deps.
 *
 * Note: Consumers must also provide DB_TOKEN (Drizzle instance) in their
 * module scope, as LagAlertService injects it via @Inject(DB_TOKEN).
 */
@Module({
  providers: [SlackAlerterService, LagAlertService],
  exports: [SlackAlerterService, LagAlertService],
})
export class AlertingModule {}
