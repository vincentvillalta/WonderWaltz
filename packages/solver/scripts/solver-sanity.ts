#!/usr/bin/env -S node --import=tsx/esm
/**
 * solver-sanity.ts
 *
 * Pure solver check — no DB, no LLM, no network. Runs the 6 canonical
 * fixtures through `solve()` and asserts invariants we care about in
 * production:
 *
 *   1. Every day has at least one attraction (no plans-with-zero-rides).
 *   2. No time overlaps within a day (rest blocks don't double up with rides).
 *   3. Every must-do attraction appears somewhere in the plan.
 *   4. Items within a day are sorted by startTime ascending.
 *
 * Exits 1 on any failure so CI or a pre-commit hook can enforce it.
 *
 *   pnpm --filter @wonderwaltz/api solver:sanity
 */
// Live inside the solver package so rootDir constraints don't fight us.
import { solve, type DayPlan, type PlanItem } from '../src/index.js';
import { filterAttractionsForParty } from '../src/filter.js';
import { fixtures } from '../src/__fixtures__/index.js';

type FixtureLike = (typeof fixtures)[number];

interface CheckFailure {
  fixture: string;
  day: number;
  message: string;
  severity: 'error' | 'warn';
}

function isoToMinutes(iso: string): number {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Bad ISO time: ${iso}`);
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function checkFixture(fx: FixtureLike): CheckFailure[] {
  const failures: CheckFailure[] = [];
  const plan: DayPlan[] = solve(fx.input);

  if (plan.length === 0) {
    failures.push({
      fixture: fx.name,
      day: -1,
      message: 'solver returned zero days',
      severity: 'error',
    });
    return failures;
  }

  const mustDos = new Set(fx.input.preferences.mustDoAttractionIds);

  // A must-do that fails the accessibility filter is a WARNING, not an error:
  // the solver correctly excludes rides the party cannot physically experience.
  // Production UI should warn the user; the solver simply can't honor it.
  const allEligible = new Set(
    filterAttractionsForParty(fx.input.catalog.attractions, fx.input.guests).map((a) => a.id),
  );

  const placedAttractionIds = new Set<string>();

  for (const day of plan) {
    const attractions = day.items.filter((i) => i.type === 'attraction');
    const meals = day.items.filter((i) => i.type === 'dining');
    const breaks = day.items.filter((i) => i.type === 'break');

    // Invariant 1 — at least one attraction.
    if (attractions.length === 0) {
      failures.push({
        fixture: fx.name,
        day: day.dayIndex,
        message: `no attractions in day (meals=${meals.length} breaks=${breaks.length})`,
        severity: 'error',
      });
    }

    // Invariant 2 — no overlaps.
    const sorted = [...day.items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (isoToMinutes(cur.startTime) < isoToMinutes(prev.endTime)) {
        failures.push({
          fixture: fx.name,
          day: day.dayIndex,
          message: `overlap: ${prev.name} (${prev.startTime}-${prev.endTime}) vs ${cur.name} (${cur.startTime}-${cur.endTime})`,
          severity: 'error',
        });
      }
    }

    // Invariant 4 — sorted.
    for (let i = 1; i < day.items.length; i++) {
      if (day.items[i]!.startTime < day.items[i - 1]!.startTime) {
        failures.push({
          fixture: fx.name,
          day: day.dayIndex,
          message: 'items not sorted by startTime',
          severity: 'error',
        });
        break;
      }
    }

    for (const item of attractions) {
      if (item.refId) placedAttractionIds.add(item.refId);
    }
  }

  // Invariant 3 — every must-do placed (unless filtered by accessibility).
  for (const id of mustDos) {
    if (placedAttractionIds.has(id)) continue;
    const isEligible = allEligible.has(id);
    failures.push({
      fixture: fx.name,
      day: -1,
      message: isEligible
        ? `must-do '${id}' was not placed (solver skipped it despite being eligible)`
        : `must-do '${id}' excluded by accessibility filter (expected UI warning)`,
      severity: isEligible ? 'error' : 'warn',
    });
  }

  return failures;
}

function summarizeFixture(fx: FixtureLike): void {
  const plan = solve(fx.input);
  const totalAttr = plan.reduce(
    (n: number, d: DayPlan) => n + d.items.filter((i: PlanItem) => i.type === 'attraction').length,
    0,
  );
  const totalMeal = plan.reduce(
    (n: number, d: DayPlan) => n + d.items.filter((i: PlanItem) => i.type === 'dining').length,
    0,
  );
  const totalBreak = plan.reduce(
    (n: number, d: DayPlan) => n + d.items.filter((i: PlanItem) => i.type === 'break').length,
    0,
  );
  const days = plan.length;
  const parts = fx.input.guests.length;
  const tier = fx.input.preferences.budgetTier;
  console.log(
    `  ${fx.name.padEnd(60)}  ${days}d · ${parts}g · ${tier.padEnd(6)}  attr=${String(totalAttr).padStart(3)}  meal=${String(totalMeal).padStart(2)}  break=${String(totalBreak).padStart(2)}`,
  );
  for (const day of plan) {
    const perType = new Map<string, number>();
    for (const it of day.items) perType.set(it.type, (perType.get(it.type) ?? 0) + 1);
    const breakdown = Array.from(perType.entries())
      .map(([t, n]) => `${t}=${n}`)
      .join(' ');
    console.log(`      day ${day.dayIndex} ${day.date}  ${breakdown}`);
  }
}

function main(): void {
  console.log('\n═══ solver-sanity ═══\n');

  const allFailures: CheckFailure[] = [];
  for (const fx of fixtures) {
    summarizeFixture(fx);
    const fails = checkFixture(fx);
    allFailures.push(...fails);
  }

  const errors = allFailures.filter((f) => f.severity === 'error');
  const warns = allFailures.filter((f) => f.severity === 'warn');
  console.log(
    `\nRan ${fixtures.length} fixtures · ${errors.length} error(s) · ${warns.length} warning(s).`,
  );

  if (warns.length > 0) {
    console.log('\n\x1b[33m⚠ warnings:\x1b[0m');
    for (const f of warns) {
      const where = f.day >= 0 ? `day ${f.day}` : 'global';
      console.log(`  [${f.fixture}] ${where}: ${f.message}`);
    }
  }

  if (errors.length === 0) {
    console.log('\n\x1b[32m✓ all invariants hold\x1b[0m\n');
    return;
  }

  console.log('\n\x1b[31m✗ errors:\x1b[0m');
  for (const f of errors) {
    const where = f.day >= 0 ? `day ${f.day}` : 'global';
    console.log(`  [${f.fixture}] ${where}: ${f.message}`);
  }
  console.log();
  process.exit(1);
}

main();
