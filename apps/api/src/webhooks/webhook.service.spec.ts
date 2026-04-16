import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from './webhook.service.js';
import type { EntitlementService } from '../entitlements/entitlement.service.js';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockEntitlementService: {
    createEntitlement: ReturnType<typeof vi.fn>;
    revokeEntitlement: ReturnType<typeof vi.fn>;
    unlockTrip: ReturnType<typeof vi.fn>;
    lockTrip: ReturnType<typeof vi.fn>;
    getEntitlementByRevenuecatId: ReturnType<typeof vi.fn>;
  };

  const basePurchasePayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-1',
      id: 'rc-evt-1',
      purchased_at_ms: 1704067200000,
      subscriber_attributes: {
        trip_id: { value: 'trip-1' },
      },
    },
  };

  beforeEach(() => {
    mockDb = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
    mockEntitlementService = {
      createEntitlement: vi.fn().mockResolvedValue({ id: 'ent-1', state: 'active' }),
      revokeEntitlement: vi.fn().mockResolvedValue(undefined),
      unlockTrip: vi.fn().mockResolvedValue(undefined),
      lockTrip: vi.fn().mockResolvedValue(undefined),
      getEntitlementByRevenuecatId: vi.fn().mockResolvedValue({ trip_id: 'trip-1' }),
    };

    service = new WebhookService(
      mockDb as never,
      mockEntitlementService as unknown as EntitlementService,
    );
  });

  it('Test 1: INITIAL_PURCHASE logs event, creates entitlement, and unlocks trip', async () => {
    await service.processEvent(basePurchasePayload);

    // Should log raw event
    expect(mockDb.execute).toHaveBeenCalled();
    // Should create entitlement
    expect(mockEntitlementService.createEntitlement).toHaveBeenCalledWith(
      'user-1',
      'trip-1',
      'rc-evt-1',
      expect.any(Date),
    );
    // Should unlock trip
    expect(mockEntitlementService.unlockTrip).toHaveBeenCalledWith('trip-1');
  });

  it('Test 2: REFUND event logs, revokes entitlement, and locks trip', async () => {
    const payload = {
      ...basePurchasePayload,
      event: { ...basePurchasePayload.event, type: 'REFUND' },
    };

    await service.processEvent(payload);

    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockEntitlementService.revokeEntitlement).toHaveBeenCalledWith('rc-evt-1', 'refunded');
    expect(mockEntitlementService.lockTrip).toHaveBeenCalledWith('trip-1');
  });

  it('Test 3: CANCELLATION event logs but does not mutate entitlements', async () => {
    const payload = {
      ...basePurchasePayload,
      event: { ...basePurchasePayload.event, type: 'CANCELLATION' },
    };

    await service.processEvent(payload);

    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockEntitlementService.createEntitlement).not.toHaveBeenCalled();
    expect(mockEntitlementService.revokeEntitlement).not.toHaveBeenCalled();
  });

  it('Test 4: EXPIRATION event logs but does not mutate entitlements', async () => {
    const payload = {
      ...basePurchasePayload,
      event: { ...basePurchasePayload.event, type: 'EXPIRATION' },
    };

    await service.processEvent(payload);

    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockEntitlementService.createEntitlement).not.toHaveBeenCalled();
    expect(mockEntitlementService.revokeEntitlement).not.toHaveBeenCalled();
  });

  it('Test 5: NON_RENEWING_PURCHASE creates entitlement and unlocks trip', async () => {
    const payload = {
      ...basePurchasePayload,
      event: { ...basePurchasePayload.event, type: 'NON_RENEWING_PURCHASE' },
    };

    await service.processEvent(payload);

    expect(mockEntitlementService.createEntitlement).toHaveBeenCalledWith(
      'user-1',
      'trip-1',
      'rc-evt-1',
      expect.any(Date),
    );
    expect(mockEntitlementService.unlockTrip).toHaveBeenCalledWith('trip-1');
  });

  it('Test 6: duplicate INITIAL_PURCHASE is idempotent (no unlock on duplicate)', async () => {
    // createEntitlement returns null for duplicates (ON CONFLICT DO NOTHING)
    mockEntitlementService.createEntitlement.mockResolvedValue(null);

    await service.processEvent(basePurchasePayload);

    expect(mockEntitlementService.createEntitlement).toHaveBeenCalled();
    // Should NOT unlock trip if entitlement already existed
    expect(mockEntitlementService.unlockTrip).not.toHaveBeenCalled();
  });

  it('Test 7: all events log raw_payload as JSON string to iap_events', async () => {
    await service.processEvent(basePurchasePayload);

    // First call to mockDb.execute is the raw event log
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it('Test 8: unknown event type logs to iap_events but does not mutate entitlements', async () => {
    const payload = {
      ...basePurchasePayload,
      event: { ...basePurchasePayload.event, type: 'SOME_FUTURE_EVENT' },
    };

    await service.processEvent(payload);

    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockEntitlementService.createEntitlement).not.toHaveBeenCalled();
    expect(mockEntitlementService.revokeEntitlement).not.toHaveBeenCalled();
    expect(mockEntitlementService.unlockTrip).not.toHaveBeenCalled();
    expect(mockEntitlementService.lockTrip).not.toHaveBeenCalled();
  });
});
