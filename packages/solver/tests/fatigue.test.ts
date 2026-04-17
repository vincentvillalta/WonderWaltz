/**
 * SOLV-07: Child fatigue model — age-weighted rest block insertion.
 *
 * Tests peak fatigue windows per age bracket, merged windows,
 * tier-driven rest frequency, and must-do displacement rules.
 */
import { describe, it, expect } from 'vitest';
import { insertRestBlocks } from '../src/fatigue.js';
import type { PlanItem, SolverGuest } from '../src/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────

const DATE = '2026-06-15';

function iso(hh: number, mm: number): string {
  return `${DATE}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}

function makeItem(
  id: string,
  startHH: number,
  startMM: number,
  endHH: number,
  endMM: number,
  overrides?: Partial<PlanItem>,
): PlanItem {
  return {
    id,
    type: 'attraction',
    name: `Ride ${id}`,
    startTime: iso(startHH, startMM),
    endTime: iso(endHH, endMM),
    ...overrides,
  };
}

function guest(id: string, ageBracket: SolverGuest['ageBracket']): SolverGuest {
  return {
    id,
    ageBracket,
    mobility: 'none',
    sensory: 'none',
    dietary: [],
  };
}

function getRestBlocks(items: PlanItem[]): PlanItem[] {
  return items.filter((i) => i.type === 'break');
}

// ─── Peak fatigue windows ────────────────────────────────────────────────

describe('peak fatigue windows', () => {
  // A full day of items from 9am to 6pm
  const fullDayItems: PlanItem[] = [
    makeItem('a1', 9, 0, 9, 30),
    makeItem('a2', 9, 30, 10, 0),
    makeItem('a3', 10, 0, 10, 30),
    makeItem('a4', 10, 30, 11, 0),
    makeItem('a5', 11, 0, 11, 30),
    makeItem('a6', 11, 30, 12, 0),
    makeItem('a7', 12, 0, 12, 30),
    makeItem('a8', 12, 30, 13, 0),
    makeItem('a9', 13, 0, 13, 30),
    makeItem('a10', 13, 30, 14, 0),
    makeItem('a11', 14, 0, 14, 30),
    makeItem('a12', 14, 30, 15, 0),
    makeItem('a13', 15, 0, 15, 30),
    makeItem('a14', 15, 30, 16, 0),
    makeItem('a15', 16, 0, 16, 30),
    makeItem('a16', 16, 30, 17, 0),
    makeItem('a17', 17, 0, 17, 30),
    makeItem('a18', 17, 30, 18, 0),
  ];

  it('toddler (0-2) + adult: rest block covers 12:30-13:30', () => {
    const guests = [guest('g1', '0-2'), guest('g2', '18+')];
    const result = insertRestBlocks(fullDayItems, guests, 'fairy');
    const rests = getRestBlocks(result);

    // Should have a peak fatigue rest block at 12:30
    const peakRest = rests.find((r) => r.startTime === iso(12, 30));
    expect(peakRest).toBeDefined();
    expect(peakRest!.endTime).toBe(iso(13, 30));
    expect(peakRest!.name).toMatch(/rest/i);
  });

  it('young kid (3-6): rest block covers 13:00-14:00', () => {
    const guests = [guest('g1', '3-6'), guest('g2', '18+')];
    const result = insertRestBlocks(fullDayItems, guests, 'fairy');
    const rests = getRestBlocks(result);

    const peakRest = rests.find((r) => r.startTime === iso(13, 0));
    expect(peakRest).toBeDefined();
    expect(peakRest!.endTime).toBe(iso(14, 0));
  });

  it('both toddler + young kid: merged rest block 12:30-14:00', () => {
    const guests = [guest('g1', '0-2'), guest('g2', '3-6'), guest('g3', '18+')];
    const result = insertRestBlocks(fullDayItems, guests, 'fairy');
    const rests = getRestBlocks(result);

    const mergedRest = rests.find((r) => r.startTime === iso(12, 30));
    expect(mergedRest).toBeDefined();
    expect(mergedRest!.endTime).toBe(iso(14, 0));
  });

  it('adults only: no peak fatigue rest block inserted', () => {
    const guests = [guest('g1', '18+'), guest('g2', '18+')];
    const result = insertRestBlocks(fullDayItems, guests, 'fairy');
    const rests = getRestBlocks(result);

    // No rest blocks labeled as peak fatigue
    const peakRests = rests.filter((r) => r.name.toLowerCase().includes('peak fatigue'));
    expect(peakRests).toHaveLength(0);
  });
});

// ─── Tier-driven rest frequency ──────────────────────────────────────────

describe('tier-driven rest frequency', () => {
  const longDayItems: PlanItem[] = [];
  // Items from 9:00 to 18:00 every 30 min
  for (let h = 9; h < 18; h++) {
    longDayItems.push(makeItem(`ld${h}a`, h, 0, h, 30));
    longDayItems.push(makeItem(`ld${h}b`, h, 30, h + 1, 0));
  }

  it('pixie tier: rest every 3 hours', () => {
    const guests = [guest('g1', '7-9'), guest('g2', '18+')];
    const result = insertRestBlocks(longDayItems, guests, 'pixie');
    const rests = getRestBlocks(result);

    // With 9hr day and 3hr frequency, expect ~3 rest blocks
    expect(rests.length).toBeGreaterThanOrEqual(2);
    expect(rests.length).toBeLessThanOrEqual(4);
  });

  it('fairy tier: rest every 2 hours', () => {
    const guests = [guest('g1', '7-9'), guest('g2', '18+')];
    const result = insertRestBlocks(longDayItems, guests, 'fairy');
    const rests = getRestBlocks(result);

    // With 9hr day and 2hr frequency, expect ~4 rest blocks
    expect(rests.length).toBeGreaterThanOrEqual(3);
    expect(rests.length).toBeLessThanOrEqual(5);
  });

  it('royal tier + deluxe lodging: gets resort mid-day break', () => {
    const guests = [guest('g1', '7-9'), guest('g2', '18+')];
    const result = insertRestBlocks(longDayItems, guests, 'royal', { lodgingType: 'deluxe' });
    const rests = getRestBlocks(result);

    // Royal gets 120-min rest blocks
    const longRest = rests.find((r) => {
      const startMin = parseMin(r.startTime);
      const endMin = parseMin(r.endTime);
      return endMin - startMin >= 120;
    });
    expect(longRest).toBeDefined();
    expect(longRest!.name).toMatch(/resort|mid-day/i);
  });
});

// ─── Must-do displacement ────────────────────────────────────────────────

describe('must-do displacement', () => {
  it('must-do at 13:00 is kept; rest block adjusts', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('a2', 10, 0, 10, 30),
      makeItem('must1', 13, 0, 13, 30, {
        name: 'Space Mountain',
        notes: 'must-do',
      }),
      makeItem('a3', 14, 0, 14, 30),
      makeItem('a4', 15, 0, 15, 30),
      makeItem('a5', 16, 0, 16, 30),
    ];
    const guests = [guest('g1', '3-6'), guest('g2', '18+')];
    const result = insertRestBlocks(items, guests, 'fairy', {
      mustDoIds: ['must1'],
    });

    // Must-do item must still be present
    const mustDo = result.find((i) => i.id === 'must1');
    expect(mustDo).toBeDefined();
    expect(mustDo!.startTime).toBe(iso(13, 0));
    expect(mustDo!.endTime).toBe(iso(13, 30));
  });

  it('must-do conflicts with peak: rest splits around it', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('must1', 12, 30, 13, 0, {
        name: 'Seven Dwarfs Mine Train',
        notes: 'must-do',
      }),
      makeItem('a2', 14, 0, 14, 30),
      makeItem('a3', 15, 0, 15, 30),
      makeItem('a4', 16, 0, 16, 30),
    ];
    const guests = [guest('g1', '0-2'), guest('g2', '18+')];
    const result = insertRestBlocks(items, guests, 'fairy', {
      mustDoIds: ['must1'],
    });

    // Must-do kept at its original time
    const mustDo = result.find((i) => i.id === 'must1');
    expect(mustDo).toBeDefined();
    expect(mustDo!.startTime).toBe(iso(12, 30));

    // There should still be some rest block (shifted)
    const rests = getRestBlocks(result);
    expect(rests.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Output ordering ─────────────────────────────────────────────────────

describe('output properties', () => {
  it('returns items sorted by startTime', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('a2', 10, 0, 10, 30),
      makeItem('a3', 14, 0, 14, 30),
      makeItem('a4', 16, 0, 16, 30),
    ];
    const guests = [guest('g1', '3-6'), guest('g2', '18+')];
    const result = insertRestBlocks(items, guests, 'fairy');

    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.startTime >= result[i - 1]!.startTime).toBe(true);
    }
  });

  it('rest blocks have type "break"', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('a2', 12, 0, 12, 30),
      makeItem('a3', 15, 0, 15, 30),
    ];
    const guests = [guest('g1', '0-2'), guest('g2', '18+')];
    const result = insertRestBlocks(items, guests, 'fairy');
    const rests = getRestBlocks(result);

    for (const r of rests) {
      expect(r.type).toBe('break');
    }
  });

  it('deterministic: same input produces same output', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('a2', 11, 0, 11, 30),
      makeItem('a3', 14, 0, 14, 30),
      makeItem('a4', 16, 0, 16, 30),
    ];
    const guests = [guest('g1', '0-2'), guest('g2', '3-6')];
    const r1 = insertRestBlocks(items, guests, 'royal');
    const r2 = insertRestBlocks(items, guests, 'royal');
    expect(r1).toEqual(r2);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('empty items returns empty array', () => {
    const guests = [guest('g1', '0-2')];
    const result = insertRestBlocks([], guests, 'fairy');
    expect(result).toEqual([]);
  });

  it('no children: only tier-driven frequency rests', () => {
    const items: PlanItem[] = [
      makeItem('a1', 9, 0, 9, 30),
      makeItem('a2', 11, 0, 11, 30),
      makeItem('a3', 14, 0, 14, 30),
      makeItem('a4', 16, 0, 16, 30),
    ];
    const guests = [guest('g1', '14-17'), guest('g2', '18+')];
    const result = insertRestBlocks(items, guests, 'pixie');

    // No peak fatigue blocks, but still tier-driven rests
    const rests = getRestBlocks(result);
    // Pixie at 3hr frequency over 7hr span: at least 1
    expect(rests.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Helper ──────────────────────────────────────────────────────────────

function parseMin(iso: string): number {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Bad ISO: ${iso}`);
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}
