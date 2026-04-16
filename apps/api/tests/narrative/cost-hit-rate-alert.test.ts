import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import { CostAlertService } from '../../src/narrative/cost-alert.service.js';

// Mock Sentry
vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────

function createMockDb(rows: Array<{ cached: string; input: string; rows: string }>) {
  return { execute: vi.fn().mockResolvedValue(rows) };
}

function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  };
}

function createMockSlack() {
  return {
    sendAlert: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CostAlertService.checkHitRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires Sentry + Slack when hit rate < 70% with enough rows', async () => {
    // cached=100, input=900 -> rate = 100/(100+900) = 10%
    const mockDb = createMockDb([{ cached: '100', input: '900', rows: '10' }]);
    const mockRedis = createMockRedis();
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.rate).toBeCloseTo(0.1);
    expect(result.windowRows).toBe(10);
    expect(result.alerted).toBe(true);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(mockSlack.sendAlert).toHaveBeenCalledOnce();
    // Redis dedup key set with 1h TTL
    expect(mockRedis.set).toHaveBeenCalledWith('cost-alert:last-fired', '1', 'EX', 3600);
  });

  it('does NOT alert when hit rate >= 70%', async () => {
    // cached=800, input=200 -> rate = 800/(800+200) = 80%
    const mockDb = createMockDb([{ cached: '800', input: '200', rows: '10' }]);
    const mockRedis = createMockRedis();
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.rate).toBeCloseTo(0.8);
    expect(result.alerted).toBe(false);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockSlack.sendAlert).not.toHaveBeenCalled();
  });

  it('skips alert when dedup key exists (already fired in last hour)', async () => {
    // Low rate but dedup key present
    const mockDb = createMockDb([{ cached: '100', input: '900', rows: '10' }]);
    const mockRedis = createMockRedis();
    mockRedis.get.mockResolvedValue('1'); // dedup key present
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.rate).toBeCloseTo(0.1);
    expect(result.alerted).toBe(false);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockSlack.sendAlert).not.toHaveBeenCalled();
  });

  it('skips alert when rows < 5 (insufficient signal)', async () => {
    // Low rate but only 3 rows
    const mockDb = createMockDb([{ cached: '10', input: '90', rows: '3' }]);
    const mockRedis = createMockRedis();
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.windowRows).toBe(3);
    expect(result.alerted).toBe(false);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockSlack.sendAlert).not.toHaveBeenCalled();
  });

  it('handles zero rows (no LLM calls in the window)', async () => {
    const mockDb = createMockDb([{ cached: '0', input: '0', rows: '0' }]);
    const mockRedis = createMockRedis();
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.rate).toBe(0);
    expect(result.windowRows).toBe(0);
    expect(result.alerted).toBe(false);
  });

  it('handles DB returning null sums', async () => {
    // When no rows match, SUM returns null in Postgres
    const mockDb = createMockDb([
      { cached: null as unknown as string, input: null as unknown as string, rows: '0' },
    ]);
    const mockRedis = createMockRedis();
    const mockSlack = createMockSlack();

    const service = new CostAlertService(mockDb as never, mockRedis as never, mockSlack as never);
    const result = await service.checkHitRate();

    expect(result.rate).toBe(0);
    expect(result.windowRows).toBe(0);
    expect(result.alerted).toBe(false);
  });
});
