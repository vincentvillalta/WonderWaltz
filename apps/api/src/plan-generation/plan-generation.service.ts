import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UnrecoverableError } from 'bullmq';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { WalkingGraphLoader } from './walking-graph.loader.js';
import { ForecastService } from '../forecast/forecast.service.js';
import { CalendarService } from '../forecast/calendar.service.js';
import { NarrativeService, BudgetExhaustedError } from '../narrative/narrative.service.js';
import type {
  CostContext,
  NarrativeInput,
  NarrativeInputDay,
  NarrativeInputItem,
} from '../narrative/narrative.service.js';
import { PersistPlanService } from './persist-plan.service.js';
import type { PersistInput } from './persist-plan.service.js';
import { SolverLoader } from './solver.loader.js';
import { PackingListService } from '../packing-list/packing-list.service.js';
import type { PackingGuest } from '../packing-list/packing-list.service.js';
import { WeatherService } from '../weather/weather.service.js';

/**
 * PlanGenerationService -- orchestrator for the full plan pipeline.
 *
 * Pipeline (PLAN-03, revised 2026-04):
 *   1. Load trip + guests + preferences from DB
 *   2. Hydrate: catalog, walking graph, forecasts, weather, crowd
 *   3. solve(solverInput) -> DayPlan[]
 *   4. NarrativeService.generate(...)    (per-day cache via narrative_day_cache)
 *   5. PersistPlanService.persist(...) -> planId
 *   6. Update trips.current_plan_id + trips.plan_status = 'ready'
 *   7. Return { planId }
 *
 * The old solver_input_hash trip-level cache was removed: guest identity
 * made every key unique, so cache hits were near-impossible. Cross-user
 * LLM reuse now lives per-day in NarrativeService.
 *
 * On BudgetExhaustedError: update trips.plan_status = 'failed', wrap
 * in UnrecoverableError so BullMQ skips retries.
 */

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

export interface GeneratePlanResult {
  planId: string;
}

// ---- Mirror types from solver (ESM boundary -- structural duplicates) ----

/** Solver item output shape */
interface SolverPlanItem {
  id: string;
  type: string;
  refId?: string;
  name: string;
  startTime: string;
  endTime: string;
  waitMinutes?: number;
  lightningLaneType?: string | null;
  notes?: string;
}

/** Solver day output shape */
interface SolverDayPlan {
  dayIndex: number;
  date: string;
  parkId: string;
  items: SolverPlanItem[];
  warnings: string[];
}

// ---- DB row shapes ----
interface TripRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  budget_tier: string;
  lodging_type: string;
  lodging_resort_id: string | null;
  has_hopper: boolean;
  has_das: boolean;
  plan_status: string;
  current_plan_id: string | null;
  llm_budget_cents: number;
}

interface GuestRow extends Record<string, unknown> {
  id: string;
  trip_id: string;
  name: string;
  age_bracket: string;
  has_das: boolean;
  has_mobility_needs: boolean;
  has_sensory_needs: boolean;
  dietary_flags: string[];
}

interface PreferencesRow extends Record<string, unknown> {
  must_do_attraction_ids: string[];
  avoid_attraction_ids: string[];
  meal_preferences: string[];
}

interface AttractionRow extends Record<string, unknown> {
  id: string;
  park_id: string;
  name: string;
  tags: string[];
  baseline_wait_minutes: number;
  lightning_lane_type: string | null;
  is_headliner: boolean;
  height_req_cm: number | null;
  popularity_score: number | null;
}

interface DiningRow extends Record<string, unknown> {
  id: string;
  park_id: string;
  name: string;
  cuisine_tags: string[];
  dining_type: string | null;
}

interface ShowRow extends Record<string, unknown> {
  id: string;
  park_id: string;
  name: string;
}

interface WalkingEdgeRow extends Record<string, unknown> {
  from_node_id: string;
  to_node_id: string;
  park_id: string;
  walking_seconds: number;
}

@Injectable()
export class PlanGenerationService {
  private readonly logger = new Logger(PlanGenerationService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    private readonly walkingGraphLoader: WalkingGraphLoader,
    private readonly forecastService: ForecastService,
    private readonly calendarService: CalendarService,
    private readonly narrativeService: NarrativeService,
    private readonly solverLoader: SolverLoader,
    @Optional() private readonly persistPlanService?: PersistPlanService,
    @Optional() private readonly packingListService?: PackingListService,
    @Optional() private readonly weatherService?: WeatherService,
  ) {}

  async generate(tripId: string): Promise<GeneratePlanResult> {
    const t0 = Date.now();

    // ─── 1. Load trip + guests + preferences ───────────────────
    const [tripRows, guestRows, prefRows] = await Promise.all([
      this.queryRows<TripRow>(sql`SELECT * FROM trips WHERE id = ${tripId}`),
      this.queryRows<GuestRow>(sql`SELECT * FROM guests WHERE trip_id = ${tripId}`),
      this.queryRows<PreferencesRow>(sql`SELECT * FROM trip_preferences WHERE trip_id = ${tripId}`),
    ]);

    const trip = tripRows[0];
    if (!trip) throw new Error(`Trip ${tripId} not found`);

    const preferences = prefRows[0];

    // ─── 2. Build stable solver input skeleton (for hash) ──────
    const solverGuests = guestRows.map((g) => ({
      id: g.id,
      ageBracket: g.age_bracket,
      mobility: g.has_mobility_needs ? 'reduced' : 'none',
      sensory: g.has_sensory_needs ? 'high' : 'none',
      dietary: g.dietary_flags ?? [],
      hasDas: g.has_das,
    }));

    const budgetTierMap: Record<string, string> = {
      pixie_dust: 'pixie',
      fairy_tale: 'fairy',
      royal_treatment: 'royal',
    };
    const solverBudgetTier = budgetTierMap[trip.budget_tier] ?? 'fairy';

    const solverPreferences = {
      budgetTier: solverBudgetTier,
      mustDoAttractionIds: preferences?.must_do_attraction_ids ?? [],
      preferredShows: [] as string[],
      tableServiceReservations: [] as Array<{
        venueName: string;
        startTime: string;
        endTime: string;
      }>,
    };

    // Load solver via ESM boundary
    const solverPkg = await this.solverLoader.load();

    // ─── 2. Hydrate full SolverInput ───────────────────────────
    try {
      const solverInput = await this.hydrateSolverInput(trip, solverGuests, solverPreferences);

      // ─── 5. solve() ───────────────────────────────────────────
      const rawOutput = solverPkg.solve(solverInput as never);
      const solverOutput = rawOutput as unknown as SolverDayPlan[];
      const perDay = solverOutput
        .map(
          (d) =>
            `d${d.dayIndex}:${d.items.filter((i) => i.type === 'attraction').length}a/${d.items.length}t`,
        )
        .join(' ');
      this.logger.log(
        `Solver completed: ${solverOutput.length} days [${perDay}] (${Date.now() - t0}ms)`,
      );

      // ─── 6. Narrative ─────────────────────────────────────────
      const narrativeInput = this.buildNarrativeInput(
        trip,
        guestRows,
        solverOutput,
        solverBudgetTier,
      );
      const costContext: CostContext = { tripId, planId: '' };

      const narrativeResult = await this.narrativeService.generate(
        narrativeInput,
        undefined,
        costContext,
      );

      // ─── 7. Persist ───────────────────────────────────────────
      if (!this.persistPlanService) {
        throw new Error('PersistPlanService not injected');
      }

      const persistInput: PersistInput = {
        tripId,
        solverOutput,
        narrative: narrativeResult.narrative ?? null,
        narrativeAvailable: narrativeResult.narrativeAvailable,
        usage: narrativeResult.usage,
        model: 'claude-sonnet-4-6',
      };

      const { planId } = await this.persistPlanService.persist(persistInput);

      // ─── 7b. Generate packing list (PLAN-06) ────────────────────
      if (this.packingListService) {
        try {
          const planItems = solverOutput.flatMap((day) =>
            day.items.map((item) => ({
              name: item.name,
              type: item.type,
              ...(item.refId != null ? { refId: item.refId } : {}),
            })),
          );

          // Collect weather for each trip date (reuse WeatherService)
          const packingWeather: Array<{
            date: string;
            highF: number;
            precipitationProbability: number;
            uvIndex?: number;
          }> = [];
          if (this.weatherService) {
            const start = new Date(trip.start_date + 'T00:00:00Z');
            const end = new Date(trip.end_date + 'T00:00:00Z');
            for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
              const dateStr = d.toISOString().slice(0, 10);
              const forecast = await this.weatherService.getForecast(dateStr);
              if (forecast) {
                packingWeather.push({
                  date: dateStr,
                  highF: forecast.high_f,
                  precipitationProbability: forecast.precipitation_pct / 100,
                  uvIndex: forecast.uv_index,
                });
              }
            }
          }

          const packingGuests: PackingGuest[] = solverGuests.map((g) => ({
            id: g.id,
            ageBracket: g.ageBracket as PackingGuest['ageBracket'],
            mobility: g.mobility as PackingGuest['mobility'],
          }));

          const packingItems = this.packingListService.generate({
            tripId,
            planItems,
            weatherByDate: packingWeather,
            guests: packingGuests,
          });

          // Persist packing list items to DB
          for (let i = 0; i < packingItems.length; i++) {
            const item = packingItems[i]!;
            await this.db.execute(sql`
              INSERT INTO packing_list_items (plan_id, category, name, is_affiliate, affiliate_item_id, sort_index)
              VALUES (${planId}, ${item.category}, ${item.name}, ${!!item.recommendedAmazonUrl}, NULL, ${String(i)})
            `);
          }

          this.logger.log(`Generated ${packingItems.length} packing list items for plan ${planId}`);
        } catch (err) {
          // Packing list is best-effort — never fail plan generation
          this.logger.error('Packing list generation failed (non-fatal)', err);
        }
      }

      // ─── 8. Update trip status ────────────────────────────────
      await this.db.execute(
        sql`UPDATE trips SET current_plan_id = ${planId}, plan_status = 'ready', updated_at = NOW() WHERE id = ${tripId}`,
      );

      this.logger.log(
        `Plan generation complete: trip=${tripId} plan=${planId} (${Date.now() - t0}ms)`,
      );
      return { planId };
    } catch (err) {
      if (err instanceof BudgetExhaustedError) {
        await this.db.execute(
          sql`UPDATE trips SET plan_status = 'failed', updated_at = NOW() WHERE id = ${tripId}`,
        );
        throw new UnrecoverableError(
          `Budget exhausted for trip ${tripId}: ${(err as Error).message}`,
        );
      }
      throw err;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────

  private async hydrateSolverInput(
    trip: TripRow,
    solverGuests: Array<{
      id: string;
      ageBracket: string;
      mobility: string;
      sensory: string;
      dietary: string[];
      hasDas: boolean;
    }>,
    solverPreferences: {
      budgetTier: string;
      mustDoAttractionIds: string[];
      preferredShows: string[];
      tableServiceReservations: Array<{ venueName: string; startTime: string; endTime: string }>;
    },
  ): Promise<Record<string, unknown>> {
    const [attractionRows, diningRows, showRows, walkingEdgeRows] = await Promise.all([
      // height_req_cm in DB; convert to inches (1 inch = 2.54 cm). No duration_minutes column — default at mapping.
      this.queryRows<AttractionRow>(
        sql`SELECT id, park_id, name, tags, baseline_wait_minutes, lightning_lane_type, is_headliner, height_req_cm, popularity_score FROM attractions WHERE is_active = true`,
      ),
      // dining has no table_service or duration_minutes columns; derive from dining_type.
      this.queryRows<DiningRow>(
        sql`SELECT id, park_id, name, cuisine_tags, dining_type FROM dining WHERE is_active = true`,
      ),
      // shows has no duration_minutes or showtimes columns yet; defaults applied at mapping.
      this.queryRows<ShowRow>(sql`SELECT id, park_id, name FROM shows WHERE is_active = true`),
      this.queryRows<WalkingEdgeRow>(
        sql`SELECT from_node_id, to_node_id, park_id, walking_seconds FROM walking_graph`,
      ),
    ]);

    const catalog = {
      attractions: attractionRows.map((a) => ({
        id: a.id,
        parkId: a.park_id,
        name: a.name,
        tags: a.tags ?? [],
        baselineWaitMinutes: Number(a.baseline_wait_minutes) || 30,
        lightningLaneType: a.lightning_lane_type,
        isHeadliner: a.is_headliner ?? false,
        popularityScore: a.popularity_score != null ? Number(a.popularity_score) : 5,
        ...(a.height_req_cm != null
          ? { heightRequirementInches: Math.round(Number(a.height_req_cm) / 2.54) }
          : {}),
        durationMinutes: 15, // default until column added to schema
      })),
      dining: diningRows.map((d) => ({
        id: d.id,
        parkId: d.park_id,
        name: d.name,
        cuisineTags: d.cuisine_tags ?? [],
        tableService: d.dining_type === 'table_service',
        durationMinutes: d.dining_type === 'table_service' ? 60 : 30,
      })),
      shows: showRows.map((s) => ({
        id: s.id,
        parkId: s.park_id,
        name: s.name,
        durationMinutes: 30, // default until column added to schema
        showtimes: [] as string[], // default until column added to schema
      })),
      walkingGraph: {
        edges: walkingEdgeRows.map((e) => ({
          fromNodeId: e.from_node_id,
          toNodeId: e.to_node_id,
          parkId: e.park_id,
          walkSeconds: Number(e.walking_seconds),
        })),
      },
    };

    const budgetTierMap: Record<string, string> = {
      pixie_dust: 'pixie',
      fairy_tale: 'fairy',
      royal_treatment: 'royal',
    };

    // ─── Forecast hydration (FC-01..FC-05) ─────────────────────
    // Field names must match the solver's buildForecastFn contract:
    // attractionId / bucketStart / predictedWaitMinutes.
    //
    // With no historical data seeded yet, every predictWait() call round-trips
    // to the DB and returns "low-confidence fallback" anyway. Skipping the
    // loop entirely saves ~6 min per plan generation (51 × 4 × 4 = 816 DB
    // calls). Re-enable once historical wait data is ingested.
    const forecastBuckets: Array<{
      attractionId: string;
      bucketStart: string;
      predictedWaitMinutes: number;
      confidence: string;
    }> = [];
    const FORECAST_ENABLED = process.env['ENABLE_FORECAST_HYDRATION'] === 'true';
    try {
      if (!FORECAST_ENABLED) {
        this.logger.log(
          'Forecast hydration skipped (ENABLE_FORECAST_HYDRATION!=true) — solver uses baseline',
        );
      } else
        for (const attraction of attractionRows) {
          const start = new Date(trip.start_date + 'T00:00:00Z');
          const end = new Date(trip.end_date + 'T00:00:00Z');
          for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            for (const hour of [9, 12, 15, 18]) {
              const targetTs = new Date(d);
              targetTs.setUTCHours(hour, 0, 0, 0);
              try {
                const result = await this.forecastService.predictWait(attraction.id, targetTs);
                forecastBuckets.push({
                  attractionId: attraction.id,
                  bucketStart: targetTs.toISOString(),
                  predictedWaitMinutes: result.minutes,
                  confidence: result.confidence,
                });
              } catch {
                // Forecast failure is non-fatal — solver uses baseline
              }
            }
          }
        }
    } catch {
      this.logger.warn('Forecast hydration failed (non-fatal) — solver uses baseline');
    }

    // ─── Weather hydration ─────────────────────────────────────
    const weatherDays: Array<{
      date: string;
      highF: number;
      lowF: number;
      condition: string;
      precipitationProbability: number;
    }> = [];
    if (this.weatherService) {
      try {
        const start = new Date(trip.start_date + 'T00:00:00Z');
        const end = new Date(trip.end_date + 'T00:00:00Z');
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const forecast = await this.weatherService.getForecast(dateStr);
          if (forecast) {
            weatherDays.push({
              date: dateStr,
              highF: forecast.high_f,
              lowF: forecast.low_f,
              condition: forecast.condition,
              precipitationProbability: forecast.precipitation_pct,
            });
          }
        }
      } catch {
        this.logger.warn('Weather hydration failed (non-fatal)');
      }
    }

    // ─── Crowd calendar hydration ──────────────────────────────
    const calendarEntries: Array<{ date: string; bucket: string }> = [];
    try {
      const start = new Date(trip.start_date + 'T00:00:00Z');
      const end = new Date(trip.end_date + 'T00:00:00Z');
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const bucket = await this.calendarService.getBucket(d);
        calendarEntries.push({ date: d.toISOString().slice(0, 10), bucket });
      }
    } catch {
      this.logger.warn('Crowd calendar hydration failed (non-fatal)');
    }

    return {
      trip: {
        id: trip.id,
        userId: trip.user_id,
        startDate: trip.start_date,
        endDate: trip.end_date,
        partySize: solverGuests.length || 1,
        budgetTier: budgetTierMap[trip.budget_tier] ?? 'fairy',
        hasDas: trip.has_das,
        lodgingType: trip.lodging_type,
      },
      guests: solverGuests,
      preferences: solverPreferences,
      dateStart: trip.start_date,
      dateEnd: trip.end_date,
      catalog,
      forecasts: { buckets: forecastBuckets },
      weather: { days: weatherDays },
      crowdCalendar: { entries: calendarEntries },
    };
  }

  private buildNarrativeInput(
    trip: TripRow,
    guestRows: GuestRow[],
    solverOutput: SolverDayPlan[],
    budgetTier: string,
  ): NarrativeInput {
    const days: NarrativeInputDay[] = solverOutput.map((day) => ({
      dayIndex: day.dayIndex,
      park: day.parkId,
      date: day.date,
      items: day.items
        .filter((item) => item.type === 'attraction')
        .map(
          (item): NarrativeInputItem => ({
            planItemId: item.id,
            attractionId: item.refId ?? item.id,
            attractionName: item.name,
            scheduledStart: item.startTime,
            scheduledEnd: item.endTime,
          }),
        ),
    }));

    const tierMap: Record<string, 'pixie' | 'fairy' | 'royal'> = {
      pixie: 'pixie',
      fairy: 'fairy',
      royal: 'royal',
    };

    return {
      tripId: trip.id,
      guests: guestRows.map((g) => ({
        ageBracket: g.age_bracket,
      })),
      days,
      budgetTier: tierMap[budgetTier] ?? 'fairy',
    };
  }

  private async queryRows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
    const result = await this.db.execute(query);
    if (Array.isArray(result)) return result as T[];
    const wrapped = result as { rows?: T[] } | null;
    return wrapped?.rows ?? [];
  }
}
