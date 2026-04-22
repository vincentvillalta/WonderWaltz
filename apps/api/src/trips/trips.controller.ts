import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { rowsOf } from '../common/drizzle-rows.js';
import { AnonymousTripLimitGuard } from '../auth/anonymous-trip-limit.guard.js';
import { SupabaseAuthGuard } from '../auth/auth.guard.js';
import type { RequestUser } from '../auth/auth.guard.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { CircuitBreakerService } from '../plan-generation/circuit-breaker.service.js';
import { PlanGenerationService } from '../plan-generation/plan-generation.service.js';
import { RateLimitGuard, RateLimit } from '../plan-generation/rate-limit.guard.js';
import { PlanBudgetExhaustedDto } from '../shared/dto/plan-budget-exhausted.dto.js';
import { RethinkRequestDto } from '../shared/dto/rethink.dto.js';
import { CreateTripDto, GeneratePlanResponseDto, TripDto } from '../shared/dto/trip.dto.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

/** Plan item row from DB for in-progress inference */
interface PlanItemRow extends Record<string, unknown> {
  id: string;
  start_time: string;
  end_time: string;
  item_type: string;
  ref_id: string | null;
  name: string;
}

@ApiTags('trips')
@Controller('trips')
@UseGuards(SupabaseAuthGuard)
export class TripsController {
  private readonly logger = new Logger(TripsController.name);

  constructor(
    private readonly planGeneration: PlanGenerationService,
    private readonly circuitBreaker: CircuitBreakerService,
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
  ) {}

  /**
   * Fire-and-forget plan generation. Runs in the background after the
   * HTTP response returns so the client sees immediate 200s and then
   * polls `GET /v1/trips/:id` for `plan_status` transitions.
   *
   * We intentionally don't `await` this; callers treat plan-generation
   * as asynchronous from their perspective. Errors flip the trip's
   * `plan_status` to 'failed' inside PlanGenerationService, so all
   * observable state lives in Postgres.
   */
  private runPlanGenerationInBackground(tripId: string): void {
    // Don't await — intentionally fire-and-forget.
    void this.planGeneration.generate(tripId).catch((err: unknown) => {
      this.logger.error(
        `Inline plan generation failed for trip ${tripId}`,
        err instanceof Error ? err.stack : String(err),
      );
    });
  }

  /**
   * POST /v1/trips
   * Create a new trip. Phase 3 implementation.
   */
  @Post()
  @UseGuards(SupabaseAuthGuard, AnonymousTripLimitGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a trip',
    description: 'Creates a new trip with guest list and preferences.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiEnvelopedResponse(TripDto)
  @ApiResponse({ status: 403, description: 'Anonymous users limited to 1 trip' })
  async createTrip(
    @Body() body: CreateTripDto,
    @Req() req: { user: RequestUser },
  ): Promise<TripDto> {
    const tripId = randomUUID();
    const userId = req.user.id;
    const prefs = body.preferences;

    // Insert trip with preferences flattened to columns
    const tripName = `Trip ${body.start_date}`;
    await this.db.execute(
      sql`INSERT INTO trips (id, user_id, name, start_date, end_date, budget_tier, entitlement_state, created_at, updated_at)
          VALUES (${tripId}, ${userId}, ${tripName}, ${body.start_date}, ${body.end_date}, ${prefs.budget_tier ?? 'fairy_tale'}, 'free', NOW(), NOW())`,
    );

    // Insert guests
    for (const guest of body.guests) {
      const guestId = randomUUID();
      await this.db.execute(
        sql`INSERT INTO guests (id, trip_id, name, age_bracket, has_das, created_at)
            VALUES (${guestId}, ${tripId}, ${guest.name}, ${guest.age_bracket}, ${guest.has_das}, NOW())`,
      );
    }

    // Always persist preferences (plan generator reads this table).
    // Pass arrays as JSON, then cast to typed arrays inside SQL to sidestep
    // Drizzle's empty-array serialization which emits invalid "()" SQL.
    // Filter to valid UUIDs — clients may send human-readable attraction
    // names during early wizard development which can't cast to uuid[].
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const mustDoIds = (prefs.must_do_attraction_ids ?? []).filter((id) => uuidRegex.test(id));
    const mustDoJson = JSON.stringify(mustDoIds);
    await this.db.execute(
      sql`INSERT INTO trip_preferences (trip_id, must_do_attraction_ids, avoid_attraction_ids, meal_preferences)
          VALUES (
            ${tripId},
            COALESCE((SELECT ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(${mustDoJson}::jsonb))), ARRAY[]::uuid[]),
            ARRAY[]::uuid[],
            ARRAY[]::text[]
          )
          ON CONFLICT (trip_id) DO UPDATE SET must_do_attraction_ids = EXCLUDED.must_do_attraction_ids`,
    );

    // Kick off plan generation immediately; Android relies on trip polling
    // (GET /v1/trips/:id) rather than an explicit /generate-plan call.
    this.runPlanGenerationInBackground(tripId);

    return this.fetchTripDto(tripId);
  }

  /**
   * GET /v1/trips/:id
   * Retrieve a trip by ID.
   */
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get a trip by ID',
    description: 'Returns the trip object including guests and preferences.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiEnvelopedResponse(TripDto)
  @ApiResponse({ status: 404, description: 'Trip not found' })
  async getTrip(@Param('id') id: string): Promise<TripDto> {
    return this.fetchTripDto(id);
  }

  /**
   * Build the full TripDto shape (trip + guests + preferences) for responses.
   * Throws 404 if the trip doesn't exist or is soft-deleted.
   */
  private async fetchTripDto(tripId: string): Promise<TripDto> {
    const [tripRows, guestRows, prefRows] = await Promise.all([
      this.db.execute(
        sql`SELECT id, start_date::text AS start_date, end_date::text AS end_date, budget_tier, entitlement_state, created_at, current_plan_id, plan_status FROM trips WHERE id = ${tripId} AND deleted_at IS NULL`,
      ),
      this.db.execute(sql`SELECT name, age_bracket, has_das FROM guests WHERE trip_id = ${tripId}`),
      this.db.execute(
        sql`SELECT must_do_attraction_ids FROM trip_preferences WHERE trip_id = ${tripId}`,
      ),
    ]);

    type TripRow = {
      id: string;
      start_date: string;
      end_date: string;
      budget_tier: string;
      entitlement_state: string;
      created_at: string | Date;
      current_plan_id: string | null;
      plan_status: string | null;
    };
    type GuestRow = { name: string; age_bracket: string; has_das: boolean };
    type PrefRow = { must_do_attraction_ids: string[] | null };

    const trip = rowsOf<TripRow>(tripRows)[0];
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    const guests = rowsOf<GuestRow>(guestRows);
    const prefs = rowsOf<PrefRow>(prefRows)[0];

    return {
      id: trip.id,
      start_date: trip.start_date,
      end_date: trip.end_date,
      entitlement_state: trip.entitlement_state as TripDto['entitlement_state'],
      created_at:
        typeof trip.created_at === 'string' ? trip.created_at : trip.created_at.toISOString(),
      current_plan_id: trip.current_plan_id ?? null,
      plan_status: trip.plan_status ?? null,
      guests: guests.map((g) => ({
        name: g.name,
        age_bracket: g.age_bracket as never,
        has_das: g.has_das,
      })),
      preferences: {
        budget_tier: trip.budget_tier as never,
        must_do_attraction_ids: prefs?.must_do_attraction_ids ?? [],
      },
    };
  }

  /**
   * POST /v1/trips/:id/generate-plan
   * Kick off async plan generation. Returns 202 with job_id.
   *
   * Guards:
   *   - RateLimitGuard enforces free-tier 3-plans/lifetime limit (PLAN-05)
   *   - CircuitBreakerService.checkBudget for 402 budget enforcement
   */
  @UseGuards(RateLimitGuard)
  @RateLimit('free-tier-lifetime')
  @Post(':id/generate-plan')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate an itinerary plan',
    description:
      'Enqueues a plan generation job for the trip. ' +
      'Returns a job_id to poll GET /v1/plans/:id for status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiEnvelopedResponse(GeneratePlanResponseDto)
  @ApiResponse({
    status: 402,
    description:
      'Per-trip LLM cost circuit breaker (LLM-07) has tripped for this trip. Client should surface the top-up paywall and retry after upgrading.',
    type: PlanBudgetExhaustedDto,
  })
  async generatePlan(@Param('id') id: string): Promise<GeneratePlanResponseDto> {
    // Budget check: 402 if trip is over budget
    const budget = await this.circuitBreaker.checkBudget(id, 0);
    if (!budget.allowed) {
      const body = this.circuitBreaker.buildBudgetExhaustedResponse(
        budget.spentCents,
        budget.budgetCents,
      );
      throw new HttpException(body, 402);
    }

    // Run plan generation inline (fire-and-forget). The client polls
    // GET /v1/trips/:id for plan_status transitions; there is no longer
    // a BullMQ job_id — we return the tripId as the correlation handle
    // to preserve the response shape for existing clients (iOS).
    this.runPlanGenerationInBackground(id);

    return { job_id: id };
  }

  /**
   * POST /v1/trips/:id/rethink-today
   * Re-plan the remaining items for today. Returns 202 with job_id.
   *
   * In-progress inference: if current_time falls within an unfinished
   * item's window, that item is pinned.
   * active_ll_bookings become hard pins in the solver.
   */
  @Post(':id/rethink-today')
  @HttpCode(200)
  @ApiOperation({
    summary: "Rethink today's remaining itinerary",
    description:
      'Enqueues a re-planning job for the remaining items today. ' +
      'Returns a job_id to poll GET /v1/plans/:id for status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiBody({ type: RethinkRequestDto })
  @ApiEnvelopedResponse(GeneratePlanResponseDto)
  @ApiResponse({
    status: 402,
    description:
      'Per-trip LLM cost circuit breaker (LLM-07) has tripped for this trip. Client should surface the top-up paywall and retry after upgrading.',
    type: PlanBudgetExhaustedDto,
  })
  async rethinkToday(
    @Param('id') id: string,
    @Body() body: RethinkRequestDto,
  ): Promise<GeneratePlanResponseDto> {
    // Budget check: 402 if trip is over budget
    const budget = await this.circuitBreaker.checkBudget(id, 0);
    if (!budget.allowed) {
      const responseBody = this.circuitBreaker.buildBudgetExhaustedResponse(
        budget.spentCents,
        budget.budgetCents,
      );
      throw new HttpException(responseBody, 402);
    }

    // Load current plan items for in-progress inference
    const tripRows = (await this.db.execute(
      sql`SELECT current_plan_id FROM trips WHERE id = ${id}`,
    )) as Array<{ current_plan_id: string | null }>;
    const currentPlanId = tripRows[0]?.current_plan_id;

    let pinnedItemIds: string[] = [];
    const completedSet = new Set(body.completed_item_ids);

    if (currentPlanId) {
      // Load today's plan items
      const itemRows = (await this.db.execute(
        sql`SELECT pi.id, pi.start_time, pi.end_time, pi.item_type, pi.ref_id, pi.name
            FROM plan_items pi
            JOIN plan_days pd ON pd.id = pi.plan_day_id
            WHERE pd.plan_id = ${currentPlanId}
            ORDER BY pi.sort_index`,
      )) as PlanItemRow[];

      // In-progress inference: find items where current_time falls within window
      const currentTime = body.current_time;
      const currentMinutes = this.isoToMinutesSinceMidnight(currentTime);

      pinnedItemIds = itemRows
        .filter((item) => {
          if (completedSet.has(item.id)) return false;
          const startMin = this.timeToMinutes(item.start_time);
          const endMin = this.timeToMinutes(item.end_time);
          return currentMinutes >= startMin && currentMinutes < endMin;
        })
        .map((item) => item.id);
    }

    // Convert LL bookings to hard pins
    const hardPins = body.active_ll_bookings.map((booking) => ({
      attractionId: booking.attraction_id,
      returnWindowStart: booking.return_window_start,
      returnWindowEnd: booking.return_window_end,
    }));

    // Rethink today runs the same pipeline as initial generation.
    // The rethinkInput payload (pinnedItemIds, hardPins, completedItemIds)
    // is not yet consumed by PlanGenerationService.generate — tracked
    // separately; this preserves prior behaviour where the BullMQ job
    // also dropped that payload.
    void pinnedItemIds;
    void hardPins;
    this.runPlanGenerationInBackground(id);

    return { job_id: id };
  }

  // ─── Private helpers ───────────────────────────────────────────

  /** Convert ISO 8601 timestamp to minutes since midnight (UTC). */
  private isoToMinutesSinceMidnight(iso: string): number {
    const d = new Date(iso);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  /** Convert HH:MM time string to minutes since midnight. */
  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
}
