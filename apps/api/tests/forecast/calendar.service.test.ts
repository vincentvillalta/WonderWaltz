import { Test } from '@nestjs/testing';
import { describe, it, expect, vi } from 'vitest';
import { CalendarService } from '../../src/forecast/calendar.service.js';
import { DB_TOKEN } from '../../src/ingestion/queue-times.service.js';

/**
 * CalendarService hybrid: DB override wins, else falls through to
 * pure calendar-rules engine.
 *
 * drizzle-orm/postgres-js returns a RowList (array), NOT { rows: [] }.
 * Test mocks must match that shape to avoid silent schema drift.
 */
function makeDb(overrideRows: Array<{ bucket: string }>) {
  return {
    execute: vi.fn().mockResolvedValue(overrideRows),
  };
}

async function makeService(db: ReturnType<typeof makeDb>): Promise<CalendarService> {
  const mod = await Test.createTestingModule({
    providers: [CalendarService, { provide: DB_TOKEN, useValue: db }],
  }).compile();
  return mod.get(CalendarService);
}

describe('CalendarService.getBucket', () => {
  it('returns the DB override when a crowd_calendar row exists', async () => {
    const db = makeDb([{ bucket: 'peak' }]);
    const svc = await makeService(db);
    // 2026-02-10 is a weekday in February → rule engine would return "low".
    // With override = "peak", override wins.
    const bucket = await svc.getBucket(new Date('2026-02-10T12:00:00Z'));
    expect(bucket).toBe('peak');
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('falls back to rule engine when no override row exists', async () => {
    const db = makeDb([]);
    const svc = await makeService(db);
    // July 4 → peak from rule engine
    const bucket = await svc.getBucket(new Date('2026-07-04T12:00:00Z'));
    expect(bucket).toBe('peak');
  });

  it('falls back to rule engine for a plain weekday (low)', async () => {
    const db = makeDb([]);
    const svc = await makeService(db);
    const bucket = await svc.getBucket(new Date('2026-02-10T12:00:00Z'));
    expect(bucket).toBe('low');
  });

  it('queries crowd_calendar by ISO date', async () => {
    const db = makeDb([]);
    const svc = await makeService(db);
    await svc.getBucket(new Date('2026-05-16T12:00:00Z'));
    // Confirm the query parameter includes the ISO date (2026-05-16)
    const callArg: unknown = db.execute.mock.calls[0]?.[0];
    // drizzle's sql tag produces a query object — serialize to string for inspect
    const serialized = JSON.stringify(callArg);
    expect(serialized).toContain('2026-05-16');
  });
});
