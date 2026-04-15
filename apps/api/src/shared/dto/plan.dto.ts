import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CrowdIndexValueDto } from './crowd-index.dto.js';
import { WeatherDto } from './weather.dto.js';

export enum LightningLaneTypeEnum {
  LLMP = 'LLMP',
  LLSP = 'LLSP',
}

export enum PlanItemTypeEnum {
  ATTRACTION = 'attraction',
  DINING = 'dining',
  SHOW = 'show',
  BREAK = 'break',
  TRAVEL = 'travel',
}

export enum PlanStatusEnum {
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

/**
 * Discriminator literal for the FullDayPlan variant of Plan.days[].
 */
export type FullDayPlanType = 'full';

/**
 * Discriminator literal for the LockedDayPlan variant of Plan.days[].
 * Returned for free-tier users for every day after Day 1 (PLAN-02).
 */
export type LockedDayPlanType = 'locked';

export class PlanItemDto {
  @ApiProperty({
    description: 'PlanItem UUID',
    example: 'plan-item-uuid-here',
  })
  id!: string;

  @ApiProperty({
    description: 'Type of itinerary item',
    enum: PlanItemTypeEnum,
    example: PlanItemTypeEnum.ATTRACTION,
  })
  type!: PlanItemTypeEnum;

  @ApiPropertyOptional({
    description:
      'Reference to the catalog entity (attraction UUID, dining UUID, show UUID). Omitted for break/travel items.',
    example: 'attraction-uuid-here',
  })
  ref_id?: string;

  @ApiProperty({
    description: 'Display name for the item',
    example: 'Space Mountain',
  })
  name!: string;

  @ApiProperty({
    description: 'Scheduled start time in ISO 8601 format',
    example: '2026-06-01T09:30:00.000Z',
  })
  start_time!: string;

  @ApiProperty({
    description: 'Scheduled end time in ISO 8601 format',
    example: '2026-06-01T10:00:00.000Z',
  })
  end_time!: string;

  @ApiPropertyOptional({
    description:
      'Predicted wait time in minutes at the scheduled arrival time. Null for non-attraction items.',
    example: 35,
  })
  wait_minutes?: number;

  @ApiPropertyOptional({
    description:
      'Solver-generated notes (e.g., "Use Individual Lightning Lane here", "Good time for a break")',
    example: 'Recommended for early morning — wait time typically under 20 minutes.',
  })
  notes?: string;

  @ApiPropertyOptional({
    description:
      '"LLMP" = Lightning Lane Multi Pass; "LLSP" = Lightning Lane Single Pass; null = standard queue. Solver sets this based on budget_tier and ride popularity.',
    enum: LightningLaneTypeEnum,
    example: null,
    nullable: true,
    type: String,
  })
  lightning_lane_type?: LightningLaneTypeEnum | null;
}

/**
 * FullDayPlanDto — the full itinerary variant of Plan.days[].
 *
 * Discriminator: type === 'full'.
 *
 * This is what was previously called `DayPlanDto` (pre 03-03). Renamed to
 * participate in the PlanDto.days discriminated union per CONTEXT.md
 * Area 4.
 */
export class FullDayPlanDto {
  @ApiProperty({
    description: 'Discriminator tag — always "full" for this variant.',
    enum: ['full'],
    example: 'full',
    type: String,
  })
  type!: FullDayPlanType;

  @ApiProperty({
    description: 'DayPlan UUID',
    example: 'day-plan-uuid-here',
  })
  id!: string;

  @ApiProperty({
    description: 'Date for this day plan in YYYY-MM-DD format',
    example: '2026-06-01',
  })
  date!: string;

  @ApiProperty({
    description: 'Park UUID for the planned park visit on this day',
    example: 'magic-kingdom-park-uuid',
  })
  park_id!: string;

  @ApiProperty({
    description: 'Ordered list of itinerary items for the day',
    type: [PlanItemDto],
  })
  @Type(() => PlanItemDto)
  items!: PlanItemDto[];

  @ApiPropertyOptional({
    description: 'Crowd index for this park on this date. Omitted if no crowd data is available.',
    type: () => CrowdIndexValueDto,
  })
  @Type(() => CrowdIndexValueDto)
  crowd_index?: CrowdIndexValueDto;

  @ApiPropertyOptional({
    description:
      "Weather forecast for this day. Omitted if date is beyond OpenWeather's 8-day forecast horizon.",
    type: () => WeatherDto,
  })
  @Type(() => WeatherDto)
  weather?: WeatherDto;
}

/**
 * LockedDayPlanDto — the free-tier blur variant of Plan.days[].
 *
 * Discriminator: type === 'locked'. Headline is templated from solver
 * output (no LLM call). Does NOT include items[] — clients render a teaser
 * card and invite the user to upgrade.
 *
 * See CONTEXT.md "Free-tier 'Blur' Semantics (PLAN-02)".
 */
export class LockedDayPlanDto {
  @ApiProperty({
    description: 'Discriminator tag — always "locked" for this variant.',
    enum: ['locked'],
    example: 'locked',
    type: String,
  })
  type!: LockedDayPlanType;

  @ApiProperty({
    description: '0-indexed day number within the trip (Day 1 = 0, Day 2 = 1, …).',
    example: 1,
  })
  dayIndex!: number;

  @ApiProperty({
    description: 'Park display name for the locked day (e.g., "EPCOT", "Magic Kingdom").',
    example: 'EPCOT',
  })
  park!: string;

  @ApiProperty({
    description:
      'Total number of items on this day (attractions + meals + shows + rest blocks). Clients render "{totalItems} items planned" without the individual entries.',
    example: 7,
  })
  totalItems!: number;

  @ApiProperty({
    description:
      'Templated headline summarizing the day. Deterministic from solver output — no LLM call. Example: "Your EPCOT fairy_tale day centers on Guardians of the Galaxy."',
    example: 'Your EPCOT fairy_tale day centers on Guardians of the Galaxy.',
  })
  headline!: string;

  @ApiProperty({
    description: 'Upgrade prompt shown beneath the headline on the locked card.',
    example: 'Upgrade to the Royal Treatment to unlock the full itinerary for this day.',
  })
  unlockTeaser!: string;
}

/**
 * Optional meta block attached to PlanDto.
 *
 * `forecast_disclaimer` is populated when any day has a `low`-confidence
 * forecast bucket (within the first 8 weeks of t=0 on 2026-04-15 while
 * the ForecastModule bootstraps history). Clients render this string
 * alongside wait-time predictions.
 */
export class PlanMetaDto {
  @ApiPropertyOptional({
    description:
      'Populated when any forecasted wait on this plan has confidence=low. Clients render this framing (e.g., "Beta Forecast") in the UI.',
    example: 'Beta Forecast',
  })
  forecast_disclaimer?: string;
}

@ApiExtraModels(FullDayPlanDto, LockedDayPlanDto, PlanMetaDto)
export class PlanDto {
  @ApiProperty({
    description: 'Plan UUID',
    example: 'plan-uuid-here',
  })
  id!: string;

  @ApiProperty({
    description: 'Parent trip UUID',
    example: 'trip-uuid-here',
  })
  trip_id!: string;

  @ApiProperty({
    description:
      'Plan version number. Increments when a new plan is generated for the same trip (e.g., after rethink-today).',
    example: 1,
  })
  version!: number;

  @ApiProperty({
    description:
      '"generating" = solver job is in progress; "ready" = plan is complete and can be viewed; "failed" = solver failed (retry available).',
    enum: PlanStatusEnum,
    example: PlanStatusEnum.READY,
  })
  status!: PlanStatusEnum;

  @ApiProperty({
    description:
      'Day plans — one per day in the trip, ordered by date. Discriminated union: each entry is either a FullDayPlan (type="full") or a LockedDayPlan (type="locked"). Free-tier users see Day 1 as FullDayPlan and Days 2+ as LockedDayPlan.',
    type: 'array',
    items: {
      oneOf: [{ $ref: getSchemaPath(FullDayPlanDto) }, { $ref: getSchemaPath(LockedDayPlanDto) }],
      discriminator: {
        propertyName: 'type',
        mapping: {
          full: getSchemaPath(FullDayPlanDto),
          locked: getSchemaPath(LockedDayPlanDto),
        },
      },
    },
  })
  @Type(() => FullDayPlanDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: FullDayPlanDto, name: 'full' },
        { value: LockedDayPlanDto, name: 'locked' },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  days!: Array<FullDayPlanDto | LockedDayPlanDto>;

  @ApiProperty({
    description:
      'Non-fatal warnings produced by the solver or LL allocator. Example: "Seven Dwarfs Mine Train scheduled standby; upgrade to Royal Treatment for LL access." Always present; empty array when the plan has no warnings.',
    type: [String],
    example: [],
  })
  warnings!: string[];

  @ApiPropertyOptional({
    description:
      'Optional meta block. Populated with forecast_disclaimer when any day carries a low-confidence forecast bucket.',
    type: () => PlanMetaDto,
  })
  @Type(() => PlanMetaDto)
  meta?: PlanMetaDto;

  @ApiProperty({
    description: 'ISO 8601 creation timestamp',
    example: '2026-04-14T10:00:00.000Z',
  })
  created_at!: string;
}
