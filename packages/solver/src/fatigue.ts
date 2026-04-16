/**
 * SOLV-07: Child fatigue model — age-weighted rest block insertion.
 *
 * Inserts rest blocks based on the youngest guest's age bracket and
 * the budget tier's rest frequency. Peak fatigue windows are:
 *   - Toddlers (0-2): 12:30-13:30
 *   - Young kids (3-6): 13:00-14:00
 *   - Both present: merged 12:30-14:00
 *
 * Fatigue is a soft constraint: must-do items are never displaced.
 * Items that conflict with a rest block are removed (unless must-do).
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import type { PlanItem, SolverGuest, BudgetTier, AgeBracket } from './types.js';
import { BUDGET_TIER_RULES } from './rules.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export type InsertRestBlocksOptions = {
  /** IDs of must-do items that cannot be displaced by rest blocks. */
  mustDoIds?: string[];
  /** Lodging type — 'deluxe' enables resort mid-day break for Royal. */
  lodgingType?: string;
};

// ─── Time helpers (timezone-naive) ─────────────────────────────────────────

function parseIso(iso: string): { datePrefix: string; minutes: number } {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Invalid ISO string: ${iso}`);
  return {
    datePrefix: m[1]!,
    minutes: parseInt(m[2]!, 10) * 60 + parseInt(m[3]!, 10),
  };
}

function buildIso(datePrefix: string, minutes: number): string {
  // Handle midnight crossing
  let dp = datePrefix;
  let mins = minutes;
  if (mins >= 1440) {
    mins -= 1440;
    const d = new Date(
      Date.UTC(
        parseInt(dp.slice(0, 4), 10),
        parseInt(dp.slice(5, 7), 10) - 1,
        parseInt(dp.slice(8, 10), 10) + 1,
      ),
    );
    dp = d.toISOString().slice(0, 10);
  }
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${dp}T${hh}:${mm}:00`;
}

// ─── Peak fatigue window detection ─────────────────────────────────────────

type FatigueWindow = { startMin: number; endMin: number };

const TODDLER_WINDOW: FatigueWindow = {
  startMin: 12 * 60 + 30, // 12:30
  endMin: 13 * 60 + 30, // 13:30
};

const YOUNG_KID_WINDOW: FatigueWindow = {
  startMin: 13 * 60, // 13:00
  endMin: 14 * 60, // 14:00
};

function hasAgeBracket(guests: readonly SolverGuest[], bracket: AgeBracket): boolean {
  return guests.some((g) => g.ageBracket === bracket);
}

/**
 * Compute the peak fatigue window based on the party's age
 * distribution. Returns null if no children require a peak
 * fatigue rest.
 */
function computePeakWindow(guests: readonly SolverGuest[]): FatigueWindow | null {
  const hasToddler = hasAgeBracket(guests, '0-2');
  const hasYoungKid = hasAgeBracket(guests, '3-6');

  if (hasToddler && hasYoungKid) {
    // Merged window: earliest start to latest end
    return {
      startMin: TODDLER_WINDOW.startMin,
      endMin: YOUNG_KID_WINDOW.endMin,
    };
  }
  if (hasToddler) return { ...TODDLER_WINDOW };
  if (hasYoungKid) return { ...YOUNG_KID_WINDOW };
  return null;
}

// ─── Rest block creation ───────────────────────────────────────────────────

function makeRestBlock(
  datePrefix: string,
  startMin: number,
  endMin: number,
  label: string,
): PlanItem {
  return {
    id: `rest-${startMin}-${endMin}`,
    type: 'break',
    name: label,
    startTime: buildIso(datePrefix, startMin),
    endTime: buildIso(datePrefix, endMin),
  };
}

// ─── Overlap checking ──────────────────────────────────────────────────────

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Core insertion logic ──────────────────────────────────────────────────

/**
 * Insert rest blocks into a day's plan items based on guest age
 * distribution and budget tier rules.
 *
 * @param items - Current plan items (sorted by startTime)
 * @param guests - Party members with age brackets
 * @param tier - Budget tier key
 * @param options - Must-do IDs and lodging type
 * @returns New array of plan items with rest blocks inserted, sorted
 */
export function insertRestBlocks(
  items: readonly PlanItem[],
  guests: readonly SolverGuest[],
  tier: BudgetTier,
  options?: InsertRestBlocksOptions,
): PlanItem[] {
  if (items.length === 0) return [];

  const mustDoIds = new Set(options?.mustDoIds ?? []);
  const lodgingType = options?.lodgingType;
  const rules = BUDGET_TIER_RULES[tier];

  // Parse all items into minutes for overlap math
  const parsed = items.map((item) => {
    const s = parseIso(item.startTime);
    const e = parseIso(item.endTime);
    return { item, startMin: s.minutes, endMin: e.minutes };
  });

  const datePrefix = parseIso(items[0]!.startTime).datePrefix;

  // Determine the day's time span
  const dayStartMin = parsed[0]!.startMin;
  const dayEndMin = parsed[parsed.length - 1]!.endMin;

  // Collect rest blocks to insert
  const restBlocks: Array<{
    startMin: number;
    endMin: number;
    label: string;
  }> = [];

  // 1. Peak fatigue window (children only)
  const peakWindow = computePeakWindow(guests);
  if (peakWindow) {
    restBlocks.push({
      startMin: peakWindow.startMin,
      endMin: peakWindow.endMin,
      label: 'Rest break (peak fatigue)',
    });
  }

  // 2. Tier-driven periodic rest blocks
  const freqMin = rules.restFrequencyHours * 60;
  const blockDuration = rules.restBlockDurationMinutes;

  // Royal + deluxe lodging: afternoon resort mid-day break
  const isResortBreak =
    tier === 'royal' && lodgingType != null && ['deluxe', 'deluxe_villa'].includes(lodgingType);

  // Place periodic rests starting from dayStart + freqMin
  let cursor = dayStartMin + freqMin;
  while (cursor + blockDuration <= dayEndMin) {
    // Skip if this overlaps with a peak fatigue window we already placed
    const overlapsPeak =
      peakWindow != null &&
      overlaps(cursor, cursor + blockDuration, peakWindow.startMin, peakWindow.endMin);

    if (!overlapsPeak) {
      const label = isResortBreak ? 'Resort mid-day break' : 'Rest break (scheduled)';
      restBlocks.push({
        startMin: cursor,
        endMin: cursor + blockDuration,
        label,
      });
    }
    cursor += freqMin;
  }

  // 3. Filter out rest blocks that fully conflict with must-do items
  //    and adjust blocks that partially conflict
  const finalRestBlocks: Array<{
    startMin: number;
    endMin: number;
    label: string;
  }> = [];

  for (const rest of restBlocks) {
    // Check conflicts with must-do items
    const conflictingMustDos = parsed.filter(
      (p) => mustDoIds.has(p.item.id) && overlaps(rest.startMin, rest.endMin, p.startMin, p.endMin),
    );

    if (conflictingMustDos.length === 0) {
      finalRestBlocks.push(rest);
    } else {
      // Try to place rest around must-do items
      // Find gaps around must-do conflicts
      const occupiedRanges = conflictingMustDos
        .map((c) => ({ start: c.startMin, end: c.endMin }))
        .sort((a, b) => a.start - b.start);

      // Try before first must-do
      if (occupiedRanges[0]!.start > rest.startMin) {
        const gapEnd = occupiedRanges[0]!.start;
        if (gapEnd - rest.startMin >= 30) {
          finalRestBlocks.push({
            startMin: rest.startMin,
            endMin: gapEnd,
            label: rest.label,
          });
        }
      }

      // Try after last must-do
      const lastOccupied = occupiedRanges[occupiedRanges.length - 1]!;
      if (lastOccupied.end < rest.endMin) {
        const gapStart = lastOccupied.end;
        if (rest.endMin - gapStart >= 30) {
          finalRestBlocks.push({
            startMin: gapStart,
            endMin: rest.endMin,
            label: rest.label,
          });
        }
      }
    }
  }

  // 4. Build final item list: keep items that don't conflict with
  //    rest blocks (unless must-do), then merge in rest blocks
  const keptItems: PlanItem[] = [];

  for (const p of parsed) {
    const isMustDo = mustDoIds.has(p.item.id);
    if (isMustDo) {
      keptItems.push(p.item);
      continue;
    }

    // Check if this item overlaps with any rest block
    const conflictsWithRest = finalRestBlocks.some((rest) =>
      overlaps(p.startMin, p.endMin, rest.startMin, rest.endMin),
    );

    if (!conflictsWithRest) {
      keptItems.push(p.item);
    }
  }

  // Add rest block PlanItems
  for (const rest of finalRestBlocks) {
    keptItems.push(makeRestBlock(datePrefix, rest.startMin, rest.endMin, rest.label));
  }

  // Sort by startTime
  return keptItems.sort((a, b) => {
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });
}
