import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { AffiliateService } from '../packing-list/affiliate.service.js';
import type {
  FullDayPlanDto,
  LockedDayPlanDto,
  PlanDto,
  PlanItemDto,
  PlanMetaDto,
} from '../shared/dto/plan.dto.js';
import { PlanItemTypeEnum, PlanStatusEnum } from '../shared/dto/plan.dto.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

// ─── DB row types ─────────────────────────────────────────────────────

interface PlanRow extends Record<string, unknown> {
  id: string;
  trip_id: string;
  version: number;
  status: string;
  solver_input_hash: string;
  created_at: string;
  warnings: string;
}

interface TripRow extends Record<string, unknown> {
  id: string;
  entitlement_state: string;
  budget_tier: string;
}

interface PlanDayRow extends Record<string, unknown> {
  id: string;
  plan_id: string;
  day_index: number;
  park_id: string;
  park_name: string;
  date: string;
  narrative_intro: string | null;
  forecast_confidence: string | null;
}

interface PlanItemRow extends Record<string, unknown> {
  id: string;
  plan_day_id: string;
  item_type: string;
  ref_id: string | null;
  name: string;
  start_time: string;
  end_time: string;
  wait_minutes: number | null;
  sort_index: number;
  lightning_lane_type: string | null;
  notes: string | null;
  narrative_tip: string | null;
  metadata: string | null;
}

interface PackingListItemRow extends Record<string, unknown> {
  id: string;
  plan_id: string;
  category: string;
  name: string;
  is_affiliate: boolean;
  recommended_amazon_url: string | null;
  sort_index: string;
}

export interface PackingListItemDto {
  id: string;
  name: string;
  category: string;
  isAffiliate: boolean;
  recommendedUrl?: string;
}

/**
 * PlansService -- retrieves plan data and projects it for the user's
 * entitlement state.
 *
 * Free tier: Day 0 = FullDayPlanDto, Days 1+ = LockedDayPlanDto
 * Unlocked/paid tier: all days = FullDayPlanDto
 *
 * LockedDayPlanDto.headline is templated from solver output (no LLM call).
 * Template: "Your {park} {budgetTier} day centers on {topScoredItem}."
 */
@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    @Optional() private readonly affiliateService?: AffiliateService,
  ) {}

  /**
   * Load and project a plan for display.
   * Returns null if plan not found.
   */
  async getPlan(planId: string): Promise<PlanDto | null> {
    // 1. Load plan row
    const planRows = await this.queryRows<PlanRow>(
      sql`SELECT id, trip_id, version, status, solver_input_hash, created_at, COALESCE(warnings, '[]') as warnings FROM plans WHERE id = ${planId}`,
    );
    const plan = planRows[0];
    if (!plan) return null;

    // 2. Load trip for entitlement_state + budget_tier
    const tripRows = await this.queryRows<TripRow>(
      sql`SELECT id, entitlement_state, budget_tier FROM trips WHERE id = ${plan.trip_id}`,
    );
    const trip = tripRows[0];
    if (!trip) return null;

    // 3. Load plan days
    const dayRows = await this.queryRows<PlanDayRow>(
      sql`SELECT pd.id, pd.plan_id, pd.day_index, pd.park_id, COALESCE(p.name, pd.park_id::text) as park_name, pd.date, pd.narrative_intro, pd.forecast_confidence
          FROM plan_days pd
          LEFT JOIN parks p ON p.id = pd.park_id
          WHERE pd.plan_id = ${planId}
          ORDER BY pd.day_index`,
    );

    // 4. Load all plan items for this plan
    const itemRows = await this.queryRows<PlanItemRow>(
      sql`SELECT pi.id, pi.plan_day_id, pi.item_type, pi.ref_id, pi.name, pi.start_time, pi.end_time, pi.wait_minutes, pi.sort_index, pi.lightning_lane_type, pi.notes, pi.narrative_tip, pi.metadata
          FROM plan_items pi
          JOIN plan_days pd ON pd.id = pi.plan_day_id
          WHERE pd.plan_id = ${planId}
          ORDER BY pd.day_index, pi.sort_index`,
    );

    // Group items by plan_day_id
    const itemsByDay = new Map<string, PlanItemRow[]>();
    for (const item of itemRows) {
      const existing = itemsByDay.get(item.plan_day_id) ?? [];
      existing.push(item);
      itemsByDay.set(item.plan_day_id, existing);
    }

    // 5. Project days based on entitlement
    const isUnlocked = trip.entitlement_state === 'unlocked' || trip.entitlement_state === 'paid';
    const days: Array<FullDayPlanDto | LockedDayPlanDto> = dayRows.map((day) => {
      const dayItems = itemsByDay.get(day.id) ?? [];

      if (isUnlocked || day.day_index === 0) {
        // Full day plan
        return this.buildFullDay(day, dayItems);
      }

      // Locked day plan
      return this.buildLockedDay(day, dayItems, trip.budget_tier);
    });

    // 6. Check for low-confidence forecast
    let meta: PlanMetaDto | undefined;
    const hasLowConfidence = dayRows.some((d) => d.forecast_confidence === 'low');
    if (hasLowConfidence) {
      meta = { forecast_disclaimer: 'Beta Forecast' };
    }

    // 7. Parse warnings
    let warnings: string[] = [];
    try {
      const parsed = JSON.parse(plan.warnings) as unknown;
      if (Array.isArray(parsed)) {
        warnings = parsed as string[];
      }
    } catch {
      warnings = [];
    }

    // 8. Load packing list items + rewrite affiliate URLs
    const packingList = await this.loadPackingList(planId);

    return {
      id: plan.id,
      trip_id: plan.trip_id,
      version: plan.version,
      status: plan.status as PlanStatusEnum,
      days,
      warnings,
      meta,
      packing_list: packingList.length > 0 ? packingList : undefined,
      created_at: plan.created_at,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────

  private buildFullDay(day: PlanDayRow, items: PlanItemRow[]): FullDayPlanDto {
    return {
      type: 'full' as const,
      id: day.id,
      date: day.date,
      park_id: day.park_id,
      items: items.map((item) => this.mapItem(item)),
    };
  }

  private buildLockedDay(
    day: PlanDayRow,
    items: PlanItemRow[],
    budgetTier: string,
  ): LockedDayPlanDto {
    // Top scored item = first item by sort_index (already sorted)
    const topItem = items[0];
    const topName = topItem?.name ?? 'your favorites';

    return {
      type: 'locked' as const,
      dayIndex: day.day_index,
      park: day.park_name,
      totalItems: items.length,
      headline: `Your ${day.park_name} ${budgetTier} day centers on ${topName}.`,
      unlockTeaser: 'Upgrade to see your full multi-day plan',
    };
  }

  private mapItem(item: PlanItemRow): PlanItemDto {
    const mapped: PlanItemDto = {
      id: item.id,
      type: item.item_type as PlanItemTypeEnum,
      name: item.name,
      start_time: item.start_time,
      end_time: item.end_time,
    };

    if (item.ref_id) mapped.ref_id = item.ref_id;
    if (item.wait_minutes != null) mapped.wait_minutes = Number(item.wait_minutes);
    if (item.notes) mapped.notes = item.notes;
    if (item.lightning_lane_type) {
      mapped.lightning_lane_type = item.lightning_lane_type as PlanItemDto['lightning_lane_type'];
    }

    return mapped;
  }

  private async loadPackingList(planId: string): Promise<PackingListItemDto[]> {
    const rows = await this.queryRows<PackingListItemRow>(
      sql`SELECT pli.id, pli.plan_id, pli.category, pli.name, pli.is_affiliate, ai.base_url as recommended_amazon_url, pli.sort_index
          FROM packing_list_items pli
          LEFT JOIN affiliate_items ai ON ai.id = pli.affiliate_item_id
          WHERE pli.plan_id = ${planId}
          ORDER BY pli.sort_index`,
    );

    return rows.map((row) => {
      const url = row.recommended_amazon_url;
      const rewrittenUrl =
        url && this.affiliateService
          ? (this.affiliateService.rewriteUrl(url) ?? undefined)
          : (url ?? undefined);

      const dto: PackingListItemDto = {
        id: row.id,
        name: row.name,
        category: row.category,
        isAffiliate: row.is_affiliate,
      };

      if (rewrittenUrl) {
        dto.recommendedUrl = rewrittenUrl;
      }

      return dto;
    });
  }

  private async queryRows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
    const result = await this.db.execute(query);
    if (Array.isArray(result)) return result as T[];
    const wrapped = result as { rows?: T[] } | null;
    return wrapped?.rows ?? [];
  }
}
