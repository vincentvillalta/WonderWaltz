import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlements/entitlement.module.js';
import { PurchasesController } from './purchases.controller.js';
import { PurchasesService } from './purchases.service.js';

/**
 * PurchasesModule -- purchase restore endpoint.
 *
 * Imports EntitlementModule for entitlement CRUD operations
 * during the restore flow.
 */
@Module({
  imports: [EntitlementModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
