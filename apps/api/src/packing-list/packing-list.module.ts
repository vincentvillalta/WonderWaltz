import { Module } from '@nestjs/common';
import { PackingListService } from './packing-list.service.js';
import { AffiliateService } from './affiliate.service.js';

/**
 * PackingListModule -- packing list generation + affiliate URL rewriting.
 *
 * Plan 03-18: deterministic rules engine driven by solver output + weather + guest ages.
 * AffiliateService rewrites Amazon URLs with the Associates tag at read time.
 */
@Module({
  providers: [PackingListService, AffiliateService],
  exports: [PackingListService, AffiliateService],
})
export class PackingListModule {}
