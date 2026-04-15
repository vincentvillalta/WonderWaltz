import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LagAlertService } from './lag-alert.service.js';
import type { SlackAlerterService } from './slack-alerter.service.js';

/**
 * Unit tests for LagAlertService.
 *
 * DATA-06b: lag > 30min, outside quiet hours → Slack called
 * DATA-06c: lag > 30min, inside quiet hours (2am–6am ET) → Slack NOT called
 */
describe('LagAlertService', () => {
  let service: LagAlertService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockSlackAlerter: { sendLagAlert: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn() };
    mockSlackAlerter = { sendLagAlert: vi.fn().mockResolvedValue(undefined) };

    service = new LagAlertService(
      mockDb as never,
      mockSlackAlerter as unknown as SlackAlerterService,
    );
  });

  /**
   * Helper: configure mockDb.execute to return a specific MAX(fetched_at) value.
   * Pass null to simulate no rows returned.
   */
  function mockMaxFetchedAt(date: Date | null): void {
    mockDb.execute.mockResolvedValue([{ max_fetched: date }]);
  }

  describe('checkAndAlert', () => {
    it('DATA-06b: calls sendLagAlert when lag > 30min and hour is 14 (afternoon)', async () => {
      // 35 minutes ago
      const fetchedAt = new Date(Date.now() - 35 * 60 * 1000);
      mockMaxFetchedAt(fetchedAt);

      // Override isQuietHours to return false (afternoon — not quiet hours)
      vi.spyOn(
        service as unknown as { isQuietHours: () => boolean },
        'isQuietHours',
      ).mockReturnValue(false);

      await service.checkAndAlert();

      expect(mockSlackAlerter.sendLagAlert).toHaveBeenCalledOnce();
      const lagArg = mockSlackAlerter.sendLagAlert.mock.calls[0]![0] as number;
      expect(lagArg).toBeGreaterThan(30);
    });

    it('DATA-06c: does NOT call sendLagAlert when lag > 30min but hour=3 (quiet hours)', async () => {
      const fetchedAt = new Date(Date.now() - 35 * 60 * 1000);
      mockMaxFetchedAt(fetchedAt);

      // Override isQuietHours to return true (3am ET — quiet hours)
      vi.spyOn(
        service as unknown as { isQuietHours: () => boolean },
        'isQuietHours',
      ).mockReturnValue(true);

      await service.checkAndAlert();

      expect(mockSlackAlerter.sendLagAlert).not.toHaveBeenCalled();
    });

    it('does NOT call sendLagAlert when lag is 20min (below threshold)', async () => {
      const fetchedAt = new Date(Date.now() - 20 * 60 * 1000);
      mockMaxFetchedAt(fetchedAt);

      vi.spyOn(
        service as unknown as { isQuietHours: () => boolean },
        'isQuietHours',
      ).mockReturnValue(false);

      await service.checkAndAlert();

      expect(mockSlackAlerter.sendLagAlert).not.toHaveBeenCalled();
    });

    it('treats null MAX(fetched_at) as infinite lag → calls sendLagAlert if not quiet hours', async () => {
      mockMaxFetchedAt(null);

      vi.spyOn(
        service as unknown as { isQuietHours: () => boolean },
        'isQuietHours',
      ).mockReturnValue(false);

      await service.checkAndAlert();

      expect(mockSlackAlerter.sendLagAlert).toHaveBeenCalledOnce();
      const lagArg = mockSlackAlerter.sendLagAlert.mock.calls[0]![0] as number;
      expect(lagArg).toBe(Infinity);
    });
  });

  describe('isQuietHours', () => {
    it('returns true when America/New_York hour is 2 (2am ET)', () => {
      // Spy on toLocaleString to simulate 2am ET
      vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('2');
      expect((service as unknown as { isQuietHours: () => boolean }).isQuietHours()).toBe(true);
    });

    it('returns true when America/New_York hour is 5 (5am ET)', () => {
      vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('5');
      expect((service as unknown as { isQuietHours: () => boolean }).isQuietHours()).toBe(true);
    });

    it('returns false when America/New_York hour is 6 (6am ET)', () => {
      vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('6');
      expect((service as unknown as { isQuietHours: () => boolean }).isQuietHours()).toBe(false);
    });

    it('returns false when America/New_York hour is 14 (2pm ET)', () => {
      vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('14');
      expect((service as unknown as { isQuietHours: () => boolean }).isQuietHours()).toBe(false);
    });
  });
});
