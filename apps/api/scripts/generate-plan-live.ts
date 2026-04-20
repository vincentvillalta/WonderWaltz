#!/usr/bin/env -S node --import=tsx/esm
/**
 * generate-plan-live.ts
 *
 * End-to-end plan generation smoke test. Creates a synthetic trip in
 * Supabase, runs the real PlanGenerationService (hydration → solver →
 * Anthropic narrative → persist), prints a human-readable summary, and
 * asserts every day actually has attractions.
 *
 * USAGE
 *   pnpm --filter @wonderwaltz/api plan:live                       # new synthetic trip
 *   pnpm --filter @wonderwaltz/api plan:live -- --trip <uuid>      # reuse existing trip
 *   pnpm --filter @wonderwaltz/api plan:live -- --keep             # don't delete after
 *   pnpm --filter @wonderwaltz/api plan:live -- --skip-narrative   # zero LLM cost
 *
 * REQUIRED ENV (set in apps/api/.env.local)
 *   NEXT_PUBLIC_SUPABASE_URL       — (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY      — bypasses RLS for trip setup/cleanup
 *   DATABASE_URL                   — postgres:// for Drizzle inside the API
 *   ANTHROPIC_API_KEY              — unless --skip-narrative
 *   REDIS_URL                      — BullMQ boot (even if we bypass the queue)
 */
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;
import { NestFactory } from '@nestjs/core';
import type { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WorkerModule } from '../src/worker.module.js';
import { PlanGenerationService } from '../src/plan-generation/plan-generation.service.js';

// ─── CLI flags ───────────────────────────────────────────────────────────
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const OPTS = {
  tripId: arg('trip'),
  keep: flag('keep'),
  skipNarrative: flag('skip-narrative'),
  verbose: flag('verbose'),
};

// ─── Supabase admin client ───────────────────────────────────────────────
function getSupabase(): SupabaseClient {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Synthetic trip setup ────────────────────────────────────────────────
interface SyntheticTrip {
  userId: string;
  tripId: string;
}

async function createSyntheticTrip(sb: SupabaseClient): Promise<SyntheticTrip> {
  const userId = randomUUID();
  const tripId = randomUUID();
  const today = new Date();
  const startDate = new Date(today.getTime() + 14 * 86400_000).toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 17 * 86400_000).toISOString().slice(0, 10);

  const { error: uErr } = await sb.from('users').insert({
    id: userId,
    email: `e2e+${userId.slice(0, 8)}@wonderwaltz.test`,
    display_name: 'E2E Test User',
    is_anonymous: true,
  });
  if (uErr) throw new Error(`users insert failed: ${uErr.message}`);

  const { error: tErr } = await sb.from('trips').insert({
    id: tripId,
    user_id: userId,
    name: 'E2E Smoke Test Trip',
    start_date: startDate,
    end_date: endDate,
    budget_tier: 'royal_treatment',
    lodging_type: 'off_site',
    has_hopper: false,
    has_das: false,
    plan_status: 'pending',
    entitlement_state: 'free',
    llm_budget_cents: 50,
  });
  if (tErr) throw new Error(`trips insert failed: ${tErr.message}`);

  const { error: gErr } = await sb.from('guests').insert({
    trip_id: tripId,
    name: 'Test Guest',
    age_bracket: '18+',
    has_das: false,
    has_mobility_needs: false,
    has_sensory_needs: false,
    dietary_flags: [],
  });
  if (gErr) throw new Error(`guests insert failed: ${gErr.message}`);

  const { error: pErr } = await sb.from('trip_preferences').insert({
    trip_id: tripId,
    must_do_attraction_ids: [],
    avoid_attraction_ids: [],
    meal_preferences: [],
  });
  if (pErr) throw new Error(`trip_preferences insert failed: ${pErr.message}`);

  return { userId, tripId };
}

async function cleanupTrip(sb: SupabaseClient, trip: SyntheticTrip): Promise<void> {
  // Order matters due to FKs: items/days before plans, prefs/guests before trip, trip before user.
  const { data: planIds } = await sb.from('plans').select('id').eq('trip_id', trip.tripId);
  const planIdList = (planIds ?? []).map((p: { id: string }) => p.id);
  if (planIdList.length > 0) {
    const { data: dayIds } = await sb.from('plan_days').select('id').in('plan_id', planIdList);
    const dayIdList = (dayIds ?? []).map((d: { id: string }) => d.id);
    if (dayIdList.length > 0) {
      await sb.from('plan_items').delete().in('plan_day_id', dayIdList);
      await sb.from('plan_days').delete().in('plan_id', planIdList);
    }
    await sb.from('packing_list_items').delete().in('plan_id', planIdList);
    await sb.from('plans').delete().eq('trip_id', trip.tripId);
  }
  await sb.from('trip_preferences').delete().eq('trip_id', trip.tripId);
  await sb.from('guests').delete().eq('trip_id', trip.tripId);
  await sb.from('trips').delete().eq('id', trip.tripId);
  await sb.from('users').delete().eq('id', trip.userId);
}

// ─── Summary rendering ───────────────────────────────────────────────────
interface PlanSummary {
  planId: string;
  version: number;
  status: string;
  days: Array<{
    dayIndex: number;
    date: string;
    parkName: string;
    counts: Record<string, number>;
    hasNarrative: boolean;
  }>;
  warnings: string[];
  attractionTotal: number;
}

async function summarizePlan(sb: SupabaseClient, tripId: string): Promise<PlanSummary | null> {
  const { data: plan } = await sb
    .from('plans')
    .select('id, version, status, warnings')
    .eq('trip_id', tripId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const planRow = plan as { id: string; version: number; status: string; warnings: string | null };

  const { data: days } = await sb
    .from('plan_days')
    .select('id, day_index, park_id, date, narrative_intro')
    .eq('plan_id', planRow.id)
    .order('day_index');
  const { data: items } = await sb
    .from('plan_items')
    .select('plan_day_id, item_type, name, start_time, end_time')
    .in(
      'plan_day_id',
      (days ?? []).map((d: { id: string }) => d.id),
    );
  const { data: parks } = await sb.from('parks').select('id, name');

  const parkName = new Map<string, string>();
  for (const p of (parks ?? []) as Array<{ id: string; name: string }>) parkName.set(p.id, p.name);

  const itemsByDay = new Map<string, Array<{ item_type: string }>>();
  for (const it of (items ?? []) as Array<{ plan_day_id: string; item_type: string }>) {
    const arr = itemsByDay.get(it.plan_day_id) ?? [];
    arr.push(it);
    itemsByDay.set(it.plan_day_id, arr);
  }

  let attractionTotal = 0;
  const daysOut: PlanSummary['days'] = [];
  for (const d of (days ?? []) as Array<{
    id: string;
    day_index: number;
    park_id: string;
    date: string;
    narrative_intro: string | null;
  }>) {
    const counts: Record<string, number> = {};
    for (const it of itemsByDay.get(d.id) ?? []) {
      counts[it.item_type] = (counts[it.item_type] ?? 0) + 1;
    }
    attractionTotal += counts['attraction'] ?? 0;
    daysOut.push({
      dayIndex: d.day_index,
      date: d.date,
      parkName: parkName.get(d.park_id) ?? d.park_id,
      counts,
      hasNarrative: d.narrative_intro != null && d.narrative_intro.length > 0,
    });
  }

  let warnings: string[] = [];
  if (typeof planRow.warnings === 'string' && planRow.warnings.length > 0) {
    try {
      const parsed = JSON.parse(planRow.warnings) as unknown;
      if (Array.isArray(parsed)) warnings = parsed.map(String);
    } catch {
      /* ignore */
    }
  }

  return {
    planId: planRow.id,
    version: planRow.version,
    status: planRow.status,
    days: daysOut,
    warnings,
    attractionTotal,
  };
}

function printSummary(s: PlanSummary): void {
  console.log(`\n  Plan ${s.planId.slice(0, 8)}… · v${s.version} · ${s.status}`);
  for (const d of s.days) {
    const parts = Object.entries(d.counts)
      .map(([k, v]) => `${k}=${v}`)
      .join('  ');
    const narr = d.hasNarrative ? '✓' : '·';
    console.log(`    ${narr} Day ${d.dayIndex} ${d.date} ${d.parkName.padEnd(20)} ${parts}`);
  }
  if (s.warnings.length > 0) {
    console.log(`  Warnings (${s.warnings.length}):`);
    for (const w of s.warnings.slice(0, 5)) console.log(`    • ${w}`);
  }
  console.log(`  Attractions total: ${s.attractionTotal}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n═══ generate-plan-live ═══');

  if (OPTS.skipNarrative) {
    console.log('  Narrative disabled (--skip-narrative set)');
    process.env['ANTHROPIC_API_KEY'] ??= 'sk-ant-SKIP';
    process.env['NARRATIVE_DISABLED'] = 'true'; // read by NarrativeService if wired
  }

  const sb = getSupabase();
  const t0 = Date.now();

  let trip: SyntheticTrip;
  let created = false;
  if (OPTS.tripId) {
    // Reuse existing — fetch user id for potential cleanup
    const { data: existing } = await sb
      .from('trips')
      .select('id, user_id')
      .eq('id', OPTS.tripId)
      .maybeSingle();
    if (!existing) {
      console.error(`\x1b[31m✗ trip ${OPTS.tripId} not found\x1b[0m`);
      process.exit(1);
    }
    trip = {
      tripId: (existing as { id: string }).id,
      userId: (existing as { user_id: string }).user_id,
    };
    console.log(`  Reusing trip ${trip.tripId.slice(0, 8)}…`);
  } else {
    trip = await createSyntheticTrip(sb);
    created = true;
    console.log(`  Created synthetic trip ${trip.tripId.slice(0, 8)}…`);
  }

  console.log('  Booting NestJS application context…');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: OPTS.verbose ? ['log', 'error', 'warn'] : ['error', 'warn'],
  });
  const service = app.get(PlanGenerationService);
  const logger = app.get<Logger>('Logger', { strict: false }) as unknown as Logger | undefined;
  if (logger) logger.log?.('E2E script: running PlanGenerationService.generate');

  console.log('  Running plan generation (this may take 30-180 s)…');
  const genStart = Date.now();
  let exitCode = 0;
  try {
    const { planId } = await service.generate(trip.tripId);
    console.log(`  Generation done in ${((Date.now() - genStart) / 1000).toFixed(1)} s`);
    const summary = await summarizePlan(sb, trip.tripId);
    if (!summary) {
      console.error(`\n\x1b[31m✗ no plan row found for trip ${trip.tripId}\x1b[0m`);
      exitCode = 1;
    } else {
      printSummary(summary);

      // Assertions.
      const emptyDays = summary.days.filter((d) => (d.counts['attraction'] ?? 0) === 0);
      if (emptyDays.length > 0) {
        console.error(`\n\x1b[31m✗ FAIL: ${emptyDays.length} day(s) have zero attractions:\x1b[0m`);
        for (const d of emptyDays) {
          console.error(`    day ${d.dayIndex} ${d.date} ${d.parkName} — no attractions`);
        }
        exitCode = 1;
      } else {
        console.log(
          `\n\x1b[32m✓ PASS: every day has attractions (plan ${planId.slice(0, 8)}…)\x1b[0m`,
        );
      }
    }
  } catch (err) {
    console.error('\n\x1b[31m✗ generation threw:\x1b[0m', err);
    exitCode = 1;
  } finally {
    await app.close();
  }

  if (created && !OPTS.keep) {
    console.log('  Cleaning up synthetic trip…');
    try {
      await cleanupTrip(sb, trip);
    } catch (err) {
      console.error('  cleanup failed (non-fatal):', err);
    }
  } else if (OPTS.keep) {
    console.log(
      `  --keep set: trip ${trip.tripId} preserved (view at /admin/trips/${trip.tripId})`,
    );
  }

  console.log(`\n  Total elapsed: ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  process.exit(exitCode);
}

main().catch((err: unknown) => {
  console.error('\n\x1b[31m✗ fatal:\x1b[0m', err);
  process.exit(1);
});
