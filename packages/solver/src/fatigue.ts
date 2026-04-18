/**
 * SOLV-07 (revised 2026-04): Child fatigue model — gap-fill rest blocks.
 *
 * Rest blocks are ONLY inserted into gaps where the existing schedule is
 * already empty. The previous implementation deleted any non-must-do item
 * that overlapped a rest block, which produced plans with no attractions
 * when the tier's rest blocks were large enough to cover the afternoon.
 *
 * Peak fatigue rules (children):
 *   - Toddlers (0-2): 12:30-13:30
 *   - Young kids (3-6): 13:00-14:00
 *   - Both present: merged 12:30-14:00
 *
 * For all tiers, periodic tier-driven rests are attempted at
 * (dayStart + freqMin), (dayStart + 2*freqMin), … but each candidate rest
 * is clipped to the next available gap. Rest blocks that would shrink
 * below MIN_REST_MINUTES get skipped — the solver simply keeps riding.
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

/** Rest blocks shorter than this are skipped — not worth scheduling. */
const MIN_REST_MINUTES = 30;

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

// ─── Gap computation ───────────────────────────────────────────────────────

type Gap = { startMin: number; endMin: number };

/**
 * Given a sorted list of occupied ranges, compute the free gaps
 * between them bounded by [dayStartMin, dayEndMin]. Adjacent / touching
 * ranges collapse; zero-length gaps are not emitted.
 */
function computeGaps(
  occupied: Array<{ startMin: number; endMin: number }>,
  dayStartMin: number,
  dayEndMin: number,
): Gap[] {
  if (occupied.length === 0) {
    return dayEndMin > dayStartMin ? [{ startMin: dayStartMin, endMin: dayEndMin }] : [];
  }

  // Merge overlapping occupied ranges
  const sorted = [...occupied].sort((a, b) => a.startMin - b.startMin);
  const merged: Array<{ startMin: number; endMin: number }> = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, cur.endMin);
    } else {
      merged.push({ ...cur });
    }
  }

  const gaps: Gap[] = [];
  let cursor = dayStartMin;
  for (const range of merged) {
    if (range.startMin > cursor) {
      gaps.push({ startMin: cursor, endMin: Math.min(range.startMin, dayEndMin) });
    }
    cursor = Math.max(cursor, range.endMin);
    if (cursor >= dayEndMin) break;
  }
  if (cursor < dayEndMin) {
    gaps.push({ startMin: cursor, endMin: dayEndMin });
  }
  return gaps;
}

/**
 * Try to fit a rest block of the given ideal duration starting at or after
 * idealStartMin into one of the available gaps. The rest never exceeds the
 * gap's boundaries and never falls below MIN_REST_MINUTES. Returns null
 * when nothing fits.
 *
 * Deterministic: picks the earliest gap that can host the rest.
 */
function pickRestSlot(
  gaps: Gap[],
  idealStartMin: number,
  idealDurationMin: number,
): { startMin: number; endMin: number; gapIndex: number } | null {
  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    // We want the rest to start at idealStartMin if possible, otherwise
    // at the gap's own start — whichever is later.
    const start = Math.max(gap.startMin, idealStartMin);
    if (start >= gap.endMin) continue;

    const available = gap.endMin - start;
    if (available < MIN_REST_MINUTES) continue;

    const actualDuration = Math.min(idealDurationMin, available);
    return { startMin: start, endMin: start + actualDuration, gapIndex: i };
  }
  return null;
}

/**
 * Consume a slice of a gap by splitting the gap into before/after the
 * consumed range. Returns a new gaps array (input is not mutated).
 */
function consumeGap(
  gaps: Gap[],
  gapIndex: number,
  consumedStartMin: number,
  consumedEndMin: number,
): Gap[] {
  const before = gaps.slice(0, gapIndex);
  const after = gaps.slice(gapIndex + 1);
  const target = gaps[gapIndex]!;
  const pieces: Gap[] = [];
  if (consumedStartMin > target.startMin) {
    pieces.push({ startMin: target.startMin, endMin: consumedStartMin });
  }
  if (consumedEndMin < target.endMin) {
    pieces.push({ startMin: consumedEndMin, endMin: target.endMin });
  }
  return [...before, ...pieces, ...after];
}

// ─── Core insertion logic ──────────────────────────────────────────────────

/**
 * Insert rest blocks into a day's plan items based on guest age
 * distribution and budget tier rules. Rest blocks are only inserted in
 * gaps that already exist in the schedule — scheduled rides, meals, and
 * shows are never displaced.
 *
 * @param items - Current plan items (sorted by startTime)
 * @param guests - Party members with age brackets
 * @param tier - Budget tier key
 * @param options - Must-do IDs (legacy, no longer gates displacement) and lodgingType
 * @returns New array of items with rest blocks inserted, sorted by startTime
 */
export function insertRestBlocks(
  items: readonly PlanItem[],
  guests: readonly SolverGuest[],
  tier: BudgetTier,
  options?: InsertRestBlocksOptions,
): PlanItem[] {
  if (items.length === 0) return [];

  const lodgingType = options?.lodgingType;
  const rules = BUDGET_TIER_RULES[tier];

  // Parse all items into minute ranges
  const parsed = items.map((item) => {
    const s = parseIso(item.startTime);
    const e = parseIso(item.endTime);
    return { item, startMin: s.minutes, endMin: e.minutes };
  });

  const datePrefix = parseIso(items[0]!.startTime).datePrefix;
  const dayStartMin = parsed[0]!.startMin;
  const dayEndMin = parsed[parsed.length - 1]!.endMin;

  // Start with the gaps between already-scheduled items.
  let gaps = computeGaps(
    parsed.map((p) => ({ startMin: p.startMin, endMin: p.endMin })),
    dayStartMin,
    dayEndMin,
  );

  const restBlocksPlaced: Array<{ startMin: number; endMin: number; label: string }> = [];

  // ─── 1. Peak fatigue window (children only) — best effort ──────────
  const peakWindow = computePeakWindow(guests);
  if (peakWindow) {
    const slot = pickRestSlot(gaps, peakWindow.startMin, peakWindow.endMin - peakWindow.startMin);
    if (slot !== null) {
      restBlocksPlaced.push({
        startMin: slot.startMin,
        endMin: slot.endMin,
        label: 'Rest break (peak fatigue)',
      });
      gaps = consumeGap(gaps, slot.gapIndex, slot.startMin, slot.endMin);
    }
  }

  // ─── 2. Tier-driven periodic rest blocks — best effort ─────────────
  const freqMin = rules.restFrequencyHours * 60;
  const idealDuration = rules.restBlockDurationMinutes;

  const isResortBreak =
    tier === 'royal' && lodgingType != null && ['deluxe', 'deluxe_villa'].includes(lodgingType);
  const label = isResortBreak ? 'Resort mid-day break' : 'Rest break (scheduled)';

  let cursor = dayStartMin + freqMin;
  while (cursor + MIN_REST_MINUTES <= dayEndMin) {
    const slot = pickRestSlot(gaps, cursor, idealDuration);
    if (slot === null) {
      cursor += freqMin;
      continue;
    }
    // Skip if we already placed something that overlaps this slot (e.g. peak
    // fatigue rest already covers the same minute range).
    const alreadyCovered = restBlocksPlaced.some((r) =>
      overlaps(slot.startMin, slot.endMin, r.startMin, r.endMin),
    );
    if (!alreadyCovered) {
      restBlocksPlaced.push({
        startMin: slot.startMin,
        endMin: slot.endMin,
        label,
      });
      gaps = consumeGap(gaps, slot.gapIndex, slot.startMin, slot.endMin);
    }
    cursor = slot.endMin + freqMin;
  }

  // ─── 3. Build final item list ──────────────────────────────────────
  // Every original item is preserved. Rest blocks are appended.
  const out: PlanItem[] = items.map((item) => item);
  for (const rest of restBlocksPlaced) {
    out.push(makeRestBlock(datePrefix, rest.startMin, rest.endMin, rest.label));
  }

  return out.sort((a, b) => {
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });
}
