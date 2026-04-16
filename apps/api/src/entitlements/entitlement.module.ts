import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service.js';

/**
 * EntitlementModule -- providers for IAP entitlement CRUD.
 *
 * Exports EntitlementService for use by WebhookModule and future
 * restore flow (Plan 04-04).
 */
@Module({
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
