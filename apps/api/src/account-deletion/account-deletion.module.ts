import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AccountDeletionService } from './account-deletion.service.js';
import { PurgeProcessor } from './purge.processor.js';

/**
 * AccountDeletionModule -- soft-delete + 30-day purge cascade.
 *
 * Registers the 'account-purge' BullMQ queue for delayed purge jobs.
 * Exports AccountDeletionService for use by UsersController.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'account-purge' })],
  providers: [AccountDeletionService, PurgeProcessor],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}
