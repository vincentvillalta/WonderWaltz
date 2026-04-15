import { Test } from '@nestjs/testing';
import { describe, it, expect, vi } from 'vitest';
import { CalendarService } from '../../src/forecast/calendar.service.js';
import { ForecastService } from '../../src/forecast/forecast.service.js';
import { DB_TOKEN } from '../../src/ingestion/queue-times.service.js';

/**
 * FC-05 — Beta Forecast framing contract.
 *
 * `computePlanForecastFraming(days)` returns
 *   { disclaimer: 'Beta Forecast' } if ANY forecasted wait has confidence 'low'
 *   {}                              otherwise
 *
 * Plan orchestrator (03-16) calls this after solver + forecast hydration
 * and sets `plan.meta.forecast_disclaimer` accordingly. The value flows
 * through the response envelope unchanged.
 *
 * FC-04 coverage note: the unit-level forecast fixtures exercised by
 * `forecast.service.test.ts` + `confidence.test.ts` already cover the
 * full round-trip for FC-04 (every code path of `predictWait` plus the
 * classifier). The solver snapshot fixtures landing in plan 03-10
 * exercise the downstream integration. This test file does not need
 * to re-derive those.
 */

async function makeService(): Promise<ForecastService> {
  const mod = await Test.createTestingModule({
    providers: [
      ForecastService,
      CalendarService,
      { provide: DB_TOKEN, useValue: { execute: vi.fn().mockResolvedValue([]) } },
    ],
  }).compile();
  return mod.get(ForecastService);
}

describe('ForecastService.computePlanForecastFraming', () => {
  it('returns empty meta when every forecast is high confidence', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([
      {
        forecasts: [{ confidence: 'high' }, { confidence: 'high' }, { confidence: 'high' }],
      },
    ]);
    expect(framing).toEqual({});
  });

  it('returns empty meta when confidences are a mix of high + medium only', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([
      { forecasts: [{ confidence: 'high' }, { confidence: 'medium' }] },
      { forecasts: [{ confidence: 'medium' }, { confidence: 'high' }] },
    ]);
    expect(framing).toEqual({});
  });

  it('returns Beta Forecast disclaimer when any day has any low-confidence forecast', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([
      { forecasts: [{ confidence: 'high' }, { confidence: 'high' }] },
      { forecasts: [{ confidence: 'medium' }, { confidence: 'low' }] }, // ← triggers
    ]);
    expect(framing).toEqual({ disclaimer: 'Beta Forecast' });
  });

  it('returns Beta Forecast when every forecast is low (dominant Phase 3 operating mode)', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([
      { forecasts: [{ confidence: 'low' }, { confidence: 'low' }] },
      { forecasts: [{ confidence: 'low' }] },
    ]);
    expect(framing).toEqual({ disclaimer: 'Beta Forecast' });
  });

  it('returns empty meta when there are no forecasts at all (edge case)', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([]);
    expect(framing).toEqual({});
  });

  it('returns empty meta when a day has no forecasts', async () => {
    const svc = await makeService();
    const framing = svc.computePlanForecastFraming([{ forecasts: [] }]);
    expect(framing).toEqual({});
  });
});
