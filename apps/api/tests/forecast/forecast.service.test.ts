import { Test } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarService } from '../../src/forecast/calendar.service.js';
import { ForecastService } from '../../src/forecast/forecast.service.js';
import { DB_TOKEN } from '../../src/ingestion/queue-times.service.js';

/**
 * Integration tests (mocked DB) for FC-01 + FC-03 + baseline fallback.
 *
 * The mock `db.execute` returns a RowList (array), matching drizzle
 * postgres-js — NOT `{ rows: [] }`. If this shape ever regresses to
 * `{ rows: [] }` silently, the test suite will fail loudly because
 * `rowsOf()` normalizes to empty array and every case collapses to
 * baseline-low.
 */

type ExecCall = (query: unknown) => Promise<unknown>;

/**
 * Build a DB mock whose `execute` inspects the query SQL text and
 * returns the appropriate fixture. The three shapes we care about:
 *
 *   - `percentile_cont` → median + samples over the bucket
 *   - `MIN(ts)`         → start-of-history row
 *   - `attractions`     → baseline_wait_minutes row
 */
function makeDb(fixtures: {
  median?: number | null;
  samples?: number;
  minTs?: string | null;
  baseline?: number | null;
}): { execute: ReturnType<typeof vi.fn> } {
  const execute = vi.fn<ExecCall>((query: unknown) => {
    const serialized = JSON.stringify(query);
    if (serialized.includes('percentile_cont')) {
      return Promise.resolve([{ median: fixtures.median ?? null, samples: fixtures.samples ?? 0 }]);
    }
    if (serialized.includes('MIN(ts)')) {
      return Promise.resolve([{ min_ts: fixtures.minTs ?? null }]);
    }
    if (serialized.includes('attractions')) {
      return Promise.resolve([{ baseline_wait_minutes: fixtures.baseline ?? null }]);
    }
    if (serialized.includes('crowd_calendar')) {
      return Promise.resolve([]); // no override — falls through to rule engine
    }
    return Promise.resolve([]);
  });
  return { execute };
}

async function makeService(db: { execute: ReturnType<typeof vi.fn> }): Promise<ForecastService> {
  const mod = await Test.createTestingModule({
    providers: [ForecastService, CalendarService, { provide: DB_TOKEN, useValue: db }],
  }).compile();
  return mod.get(ForecastService);
}

// Freeze time so weeks-of-history is deterministic across test runs.
const NOW_ISO = '2026-09-15T12:00:00Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));
});

describe('ForecastService.predictWait', () => {
  const rideId = '00000000-0000-0000-0000-000000000001';
  const targetTs = new Date('2026-09-15T13:00:00Z'); // Tue @ 13:00

  it('returns median + confidence=high for 100 samples × 10 weeks', async () => {
    // 10 weeks ago from 2026-09-15 = 2026-07-07
    const db = makeDb({ median: 42, samples: 100, minTs: '2026-07-07T00:00:00Z' });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result).toEqual({ minutes: 42, confidence: 'high' });
  });

  it('returns median + confidence=medium for 30 samples × 5 weeks', async () => {
    // 5 weeks before 2026-09-15 = 2026-08-11
    const db = makeDb({ median: 25, samples: 30, minTs: '2026-08-11T00:00:00Z' });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result).toEqual({ minutes: 25, confidence: 'medium' });
  });

  it('falls back to baseline for 3 samples (under MIN_SAMPLES_FOR_MEDIAN)', async () => {
    const db = makeDb({
      median: 99, // should be ignored
      samples: 3,
      minTs: '2026-07-07T00:00:00Z',
      baseline: 35,
    });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result).toEqual({ minutes: 35, confidence: 'low' });
  });

  it('falls back to baseline when history is 0 rows (confidence=low)', async () => {
    const db = makeDb({ median: null, samples: 0, minTs: null, baseline: 45 });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result).toEqual({ minutes: 45, confidence: 'low' });
  });

  it('falls back to baseline when confidence would be low (2 weeks of history)', async () => {
    // 2 weeks before 2026-09-15 = 2026-09-01. 100 samples wouldnt help — weeks gates.
    const db = makeDb({
      median: 50,
      samples: 100,
      minTs: '2026-09-01T00:00:00Z',
      baseline: 40,
    });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result).toEqual({ minutes: 40, confidence: 'low' });
  });

  it('returns 30 (safe default) when baseline_wait_minutes is NULL in catalog', async () => {
    const db = makeDb({ median: null, samples: 0, minTs: null, baseline: null });
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    expect(result.confidence).toBe('low');
    expect(result.minutes).toBe(30);
  });

  it('parses string numerics from pg (postgres-js returns numeric as string)', async () => {
    const db = {
      execute: vi.fn<ExecCall>((query: unknown) => {
        const s = JSON.stringify(query);
        if (s.includes('percentile_cont'))
          return Promise.resolve([{ median: '37.5', samples: '80' }]);
        if (s.includes('MIN(ts)')) return Promise.resolve([{ min_ts: '2026-06-01T00:00:00Z' }]);
        if (s.includes('attractions')) return Promise.resolve([{ baseline_wait_minutes: '40' }]);
        return Promise.resolve([]);
      }),
    };
    const svc = await makeService(db);
    const result = await svc.predictWait(rideId, targetTs);
    // ~15 weeks of history + 80 samples → high; median 37.5 → round to 38
    expect(result).toEqual({ minutes: 38, confidence: 'high' });
  });
});
