import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import type { AnthropicUsage } from '../narrative/narrative.service.js';
import type { NarrativeResponse } from '../narrative/schema.js';

/**
 * PersistPlanService -- multi-table INSERT for plan persistence.
 *
 * Inserts into:
 *   1. plans (trip_id, solver_input_hash, version, status, generated_at)
 *   2. plan_days (plan_id, day_index, park_id, date, narrative_intro, forecast_confidence)
 *   3. plan_items (plan_day_id, item_type, ref_id, name, start_time, end_time, wait_minutes, sort_index, lightning_lane_type, notes, narrative_tip, metadata)
 *
 * LLM costs are written by NarrativeService inline (best-effort).
 *
 * Plan version: MAX(version) FROM plans WHERE trip_id + 1 (history preserved).
 */

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

// ---- Mirror types from solver (ESM boundary) ----
interface DayPlan {
  dayIndex: number;
  date: string;
  parkId: string;
  items: Array<{
    id: string;
    type: string;
    refId?: string;
    name: string;
    startTime: string;
    endTime: string;
    waitMinutes?: number;
    lightningLaneType?: string | null;
    notes?: string;
  }>;
  warnings: string[];
}

export interface PersistInput {
  tripId: string;
  solverOutput: DayPlan[];
  narrative: NarrativeResponse | null;
  narrativeAvailable: boolean;
  usage: AnthropicUsage;
  solverInputHash: string;
  model: string;
}

export interface PersistResult {
  planId: string;
}

interface PlanIdRow extends Record<string, unknown> {
  id: string;
}

interface VersionRow extends Record<string, unknown> {
  max_version: number | string | null;
}

interface PlanDayIdRow extends Record<string, unknown> {
  id: string;
}

@Injectable()
export class PersistPlanService {
  private readonly logger = new Logger(PersistPlanService.name);

  constructor(@Inject(DB_TOKEN) private readonly db: DbExecutable) {}

  async persist(input: PersistInput): Promise<PersistResult> {
    // Compute next version
    const versionRows = await this.queryRows<VersionRow>(
      sql`SELECT MAX(version) AS max_version FROM plans WHERE trip_id = ${input.tripId}`,
    );
    const currentMax = Number(versionRows[0]?.max_version) || 0;
    const nextVersion = currentMax + 1;

    // Collect all warnings across days
    const allWarnings = input.solverOutput.flatMap((d) => d.warnings);
    const warningsJson = JSON.stringify(allWarnings);

    // 1. INSERT plan
    const planRows = await this.queryRows<PlanIdRow>(sql`
      INSERT INTO plans (trip_id, solver_input_hash, version, status, warnings, generated_at)
      VALUES (${input.tripId}, ${input.solverInputHash}, ${nextVersion}, 'ready', ${warningsJson}, NOW())
      RETURNING id
    `);

    const planId = planRows[0]?.id;
    if (!planId) throw new Error('Failed to insert plan row');

    // 2. INSERT plan_days + plan_items for each day
    for (const day of input.solverOutput) {
      // Get narrative day intro if available
      const narrativeDay = input.narrative?.days?.find(
        (nd: { dayIndex: number }) => nd.dayIndex === day.dayIndex,
      );
      const dayNarrative = narrativeDay?.intro ?? null;

      const dayRows = await this.queryRows<PlanDayIdRow>(sql`
        INSERT INTO plan_days (plan_id, day_index, park_id, date, narrative_intro)
        VALUES (${planId}, ${day.dayIndex}, ${day.parkId}, ${day.date}, ${dayNarrative})
        RETURNING id
      `);

      const planDayId = dayRows[0]?.id;
      if (!planDayId) throw new Error(`Failed to insert plan_day for dayIndex ${day.dayIndex}`);

      // 3. INSERT plan_items for each item in the day
      for (let sortIndex = 0; sortIndex < day.items.length; sortIndex++) {
        const item = day.items[sortIndex]!;

        // Get narrative tip for this item if available
        const narrativeItem = narrativeDay?.items?.find(
          (ni: { planItemId: string }) => ni.planItemId === item.id,
        );
        const itemNarrative = narrativeItem?.tip ?? null;

        // Extract HH:MM from ISO or full time strings
        const startTime = this.extractTime(item.startTime);
        const endTime = this.extractTime(item.endTime);

        await this.db.execute(sql`
          INSERT INTO plan_items (plan_day_id, item_type, ref_id, name, start_time, end_time, wait_minutes, sort_index, lightning_lane_type, notes, narrative_tip, metadata)
          VALUES (${planDayId}, ${item.type}, ${item.refId ?? null}, ${item.name}, ${startTime}, ${endTime}, ${item.waitMinutes ?? null}, ${sortIndex}, ${item.lightningLaneType ?? null}, ${item.notes ?? null}, ${itemNarrative}, '{}'::jsonb)
        `);
      }
    }

    this.logger.log(`Persisted plan ${planId} v${nextVersion} for trip ${input.tripId}`);
    return { planId };
  }

  /** Extract HH:MM from ISO 8601 or pass through if already HH:MM */
  private extractTime(timeStr: string): string {
    // If it contains 'T', extract the time part
    const tIdx = timeStr.indexOf('T');
    if (tIdx >= 0) {
      return timeStr.slice(tIdx + 1, tIdx + 6);
    }
    // Already HH:MM or HH:MM:SS
    return timeStr.slice(0, 5);
  }

  private async queryRows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
    const result = await this.db.execute(query);
    if (Array.isArray(result)) return result as T[];
    const wrapped = result as { rows?: T[] } | null;
    return wrapped?.rows ?? [];
  }
}
