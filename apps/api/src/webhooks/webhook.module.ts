import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlements/entitlement.module.js';
import { WebhookAuthGuard } from './webhook.guard.js';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';

/**
 * WebhookModule -- RevenueCat webhook processing.
 *
 * Imports EntitlementModule for purchase/refund entitlement mutations.
 * WebhookAuthGuard verifies the bearer token from RevenueCat.
 */
@Module({
  imports: [EntitlementModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookAuthGuard],
})
export class WebhookModule {}
