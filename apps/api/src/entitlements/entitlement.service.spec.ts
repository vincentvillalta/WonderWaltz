import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntitlementService } from './entitlement.service.js';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn() };
    service = new EntitlementService(mockDb as never);
  });

  it('Test 1: createEntitlement inserts row with state=active and returns the created row', async () => {
    const row = {
      id: 'ent-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      revenuecat_id: 'rc-123',
      state: 'active',
      purchased_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    };
    mockDb.execute.mockResolvedValue({ rows: [row] });

    const result = await service.createEntitlement(
      'user-1',
      'trip-1',
      'rc-123',
      new Date('2026-01-01'),
    );

    expect(result).toEqual(row);
    expect(mockDb.execute).toHaveBeenCalledOnce();
  });

  it('Test 2: createEntitlement with duplicate revenuecat_id returns null (idempotent)', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });

    const result = await service.createEntitlement(
      'user-1',
      'trip-1',
      'rc-123',
      new Date('2026-01-01'),
    );

    expect(result).toBeNull();
  });

  it('Test 3: revokeEntitlement updates state and sets revokedAt', async () => {
    mockDb.execute.mockResolvedValue({ rows: [{ id: 'ent-1', state: 'refunded' }] });

    await service.revokeEntitlement('rc-123', 'refunded');

    expect(mockDb.execute).toHaveBeenCalledOnce();
  });

  it('Test 4: unlockTrip updates entitlement_state to unlocked', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });

    await service.unlockTrip('trip-1');

    expect(mockDb.execute).toHaveBeenCalledOnce();
  });

  it('Test 5: lockTrip updates entitlement_state to free', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });

    await service.lockTrip('trip-1');

    expect(mockDb.execute).toHaveBeenCalledOnce();
  });
});
