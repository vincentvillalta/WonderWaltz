import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AccountDeletionService } from './account-deletion.service.js';

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockPurgeQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
    mockPurgeQueue = { add: vi.fn().mockResolvedValue(undefined) };

    service = new AccountDeletionService(mockDb as never, mockPurgeQueue as never);
  });

  it('Test 1: requestDeletion sets deleted_at on users table and revokes active entitlements', async () => {
    const result = await service.requestDeletion('user-1', true);

    // First call: UPDATE users SET deleted_at
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
    expect(result.deleted).toBe(true);
    expect(result.purge_scheduled_at).toBeDefined();
  });

  it('Test 2: requestDeletion enqueues a BullMQ delayed job with 30-day delay', async () => {
    await service.requestDeletion('user-1', true);

    expect(mockPurgeQueue.add).toHaveBeenCalledWith(
      'purge-account',
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({
        delay: 30 * 24 * 60 * 60 * 1000,
        attempts: 3,
      }),
    );
  });

  it('Test 3: requestDeletion throws 400 if confirmed is not true', async () => {
    await expect(service.requestDeletion('user-1', false)).rejects.toThrow(BadRequestException);
  });

  it('Test 4: requestDeletion is idempotent — calling twice does not error', async () => {
    // First call succeeds
    await service.requestDeletion('user-1', true);
    // Second call also succeeds (deleted_at already set, WHERE deleted_at IS NULL = 0 rows)
    await service.requestDeletion('user-1', true);

    expect(mockDb.execute).toHaveBeenCalledTimes(4); // 2 per call
    expect(mockPurgeQueue.add).toHaveBeenCalledTimes(2);
  });
});
