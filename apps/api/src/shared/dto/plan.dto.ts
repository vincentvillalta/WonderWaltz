import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class DayPlanDto {
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
  items!: PlanItemDto[];

  @ApiPropertyOptional({
    description: 'Crowd index for this park on this date. Omitted if no crowd data is available.',
    type: () => CrowdIndexValueDto,
  })
  crowd_index?: CrowdIndexValueDto;

  @ApiPropertyOptional({
    description:
      "Weather forecast for this day. Omitted if date is beyond OpenWeather's 8-day forecast horizon.",
    type: () => WeatherDto,
  })
  weather?: WeatherDto;
}

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
    description: 'Day plans — one per day in the trip, ordered by date',
    type: [DayPlanDto],
  })
  day_plans!: DayPlanDto[];

  @ApiProperty({
    description: 'ISO 8601 creation timestamp',
    example: '2026-04-14T10:00:00.000Z',
  })
  created_at!: string;
}
