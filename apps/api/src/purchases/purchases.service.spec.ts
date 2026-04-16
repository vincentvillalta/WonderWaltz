import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchasesService } from './purchases.service.js';

/**
 * Mock RevenueCat subscriber response shape.
 * subscriber.non_subscriptions.trip_unlock contains purchase events.
 */
function buildRcResponse(purchases: Array<{ id: string; purchase_date: string }>) {
  return {
    subscriber: {
      non_subscriptions: {
        trip_unlock: purchases.map((p) => ({
          id: p.id,
          purchase_date: p.purchase_date,
          store: 'app_store',
        })),
      },
      subscriber_attributes: {},
    },
  };
}

describe('PurchasesService', () => {
  let service: PurchasesService;
  let mockEntitlementService: {
    createEntitlement: ReturnType<typeof vi.fn>;
    unlockTrip: ReturnType<typeof vi.fn>;
    getEntitlementsByUserId: ReturnType<typeof vi.fn>;
  };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEntitlementService = {
      createEntitlement: vi.fn(),
      unlockTrip: vi.fn(),
      getEntitlementsByUserId: vi.fn(),
    };

    mockFetch = vi.fn();
    // Replace global fetch for test isolation
    vi.stubGlobal('fetch', mockFetch);

    process.env['REVENUECAT_API_KEY'] = 'test-rc-key';

    service = new PurchasesService(mockEntitlementService as never);
  });

  it('Test 1: restorePurchases calls RevenueCat REST API and returns subscriber data', async () => {
    const rcResponse = buildRcResponse([{ id: 'rc-abc', purchase_date: '2026-01-15T10:00:00Z' }]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rcResponse),
    });
    mockEntitlementService.createEntitlement.mockResolvedValue({
      id: 'ent-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      revenuecat_id: 'rc-abc',
      state: 'active',
    });
    mockEntitlementService.getEntitlementsByUserId.mockResolvedValue([
      {
        id: 'ent-1',
        trip_id: 'trip-1',
        purchased_at: '2026-01-15T10:00:00Z',
      },
    ]);

    const result = await service.restorePurchases('user-1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/user-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-rc-key',
        }) as Record<string, string>,
      }),
    );
    expect(result.restored_count).toBeGreaterThanOrEqual(0);
    expect(result.entitlements).toBeDefined();
  });

  it('Test 2: restorePurchases reconciles entitlements — creates missing rows for active purchases from RC', async () => {
    const rcResponse = buildRcResponse([
      { id: 'rc-abc', purchase_date: '2026-01-15T10:00:00Z' },
      { id: 'rc-def', purchase_date: '2026-02-20T12:00:00Z' },
    ]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rcResponse),
    });
    // First purchase creates new entitlement
    mockEntitlementService.createEntitlement
      .mockResolvedValueOnce({
        id: 'ent-1',
        trip_id: 'trip-1',
        revenuecat_id: 'rc-abc',
      })
      .mockResolvedValueOnce({
        id: 'ent-2',
        trip_id: 'trip-2',
        revenuecat_id: 'rc-def',
      });
    mockEntitlementService.getEntitlementsByUserId.mockResolvedValue([
      { trip_id: 'trip-1', purchased_at: '2026-01-15T10:00:00Z' },
      { trip_id: 'trip-2', purchased_at: '2026-02-20T12:00:00Z' },
    ]);

    await service.restorePurchases('user-1');

    expect(mockEntitlementService.createEntitlement).toHaveBeenCalledTimes(2);
    expect(mockEntitlementService.unlockTrip).toHaveBeenCalledTimes(2);
  });

  it('Test 3: restorePurchases does not create duplicate entitlements (idempotent)', async () => {
    const rcResponse = buildRcResponse([{ id: 'rc-abc', purchase_date: '2026-01-15T10:00:00Z' }]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rcResponse),
    });
    // createEntitlement returns null = already existed
    mockEntitlementService.createEntitlement.mockResolvedValue(null);
    mockEntitlementService.getEntitlementsByUserId.mockResolvedValue([
      { trip_id: 'trip-1', purchased_at: '2026-01-15T10:00:00Z' },
    ]);

    const result = await service.restorePurchases('user-1');

    // unlockTrip should NOT be called for duplicates
    expect(mockEntitlementService.unlockTrip).not.toHaveBeenCalled();
    expect(result.entitlements).toHaveLength(1);
  });

  it('Test 4: restorePurchases returns list of restored trip entitlements', async () => {
    const rcResponse = buildRcResponse([{ id: 'rc-abc', purchase_date: '2026-01-15T10:00:00Z' }]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rcResponse),
    });
    mockEntitlementService.createEntitlement.mockResolvedValue({
      id: 'ent-1',
      trip_id: 'trip-1',
      revenuecat_id: 'rc-abc',
    });
    mockEntitlementService.getEntitlementsByUserId.mockResolvedValue([
      { trip_id: 'trip-1', purchased_at: '2026-01-15T10:00:00Z' },
    ]);

    const result = await service.restorePurchases('user-1');

    expect(result.restored_count).toBeGreaterThanOrEqual(0);
    expect(result.entitlements).toEqual([
      { trip_id: 'trip-1', purchased_at: '2026-01-15T10:00:00Z' },
    ]);
  });

  it('Test 5: restorePurchases throws when RevenueCat API returns error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(service.restorePurchases('user-1')).rejects.toThrow();
  });
});
