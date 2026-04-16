import { Module } from '@nestjs/common';
import { PackingListModule } from '../packing-list/packing-list.module.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

/**
 * PlansModule -- GET /v1/plans/:id endpoint with entitlement projection.
 *
 * Plan 03-17: reads persisted plan data from plans + plan_days + plan_items
 * and projects days as FullDayPlan or LockedDayPlan based on
 * trips.entitlement_state.
 *
 * Plan 03-18: imports PackingListModule for AffiliateService injection
 * into PlansService (packing list URL rewriting at serialization time).
 */
@Module({
  imports: [PackingListModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
