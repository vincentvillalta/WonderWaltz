import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AgeBracketEnum {
  ZERO_TO_TWO = '0-2',
  THREE_TO_SIX = '3-6',
  SEVEN_TO_NINE = '7-9',
  TEN_TO_THIRTEEN = '10-13',
  FOURTEEN_TO_SEVENTEEN = '14-17',
  EIGHTEEN_PLUS = '18+',
}

export enum BudgetTierEnum {
  PIXIE_DUST = 'pixie_dust',
  FAIRY_TALE = 'fairy_tale',
  ROYAL_TREATMENT = 'royal_treatment',
}

export enum EntitlementStateEnum {
  FREE = 'free',
  UNLOCKED = 'unlocked',
}

/**
 * GuestInput: uses age_bracket enum — no birthdate field (LEGL-07 COPPA compliance).
 */
export class GuestInputDto {
  @ApiProperty({
    description: 'Guest display name',
    example: 'Emma',
  })
  name!: string;

  @ApiProperty({
    description:
      'Age bracket for the guest. Uses bracket string instead of birthdate — LEGL-07 COPPA compliance (no collection of ages for under-13 guests).',
    enum: AgeBracketEnum,
    example: AgeBracketEnum.SEVEN_TO_NINE,
  })
  age_bracket!: AgeBracketEnum;

  @ApiProperty({
    description:
      'Whether the guest has a Disney Accessibility Service (DAS) accommodation. Affects attraction queuing strategy in the solver.',
    example: false,
  })
  has_das!: boolean;
}

export class TripPreferencesDto {
  @ApiProperty({
    description:
      'Budget tier for the trip. Affects Lightning Lane / LLMP recommendations. "pixie_dust" = budget-conscious; "fairy_tale" = moderate; "royal_treatment" = premium.',
    enum: BudgetTierEnum,
    example: BudgetTierEnum.FAIRY_TALE,
  })
  budget_tier!: BudgetTierEnum;

  @ApiProperty({
    description:
      'Internal attraction UUIDs the party absolutely wants to experience. Solver treats these as must-do constraints.',
    type: [String],
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
  })
  must_do_attraction_ids!: string[];

  @ApiPropertyOptional({
    description:
      'Free-text notes about mobility needs (e.g., "uses a wheelchair", "can\'t do steep ramps"). Passed to solver for routing adjustments.',
    example: 'Uses a manual wheelchair; avoid multi-level queue areas.',
  })
  mobility_notes?: string;
}

export class CreateTripDto {
  @ApiPropertyOptional({
    description:
      'Resort UUID. Defaults to Walt Disney World if omitted. Reserved for future multi-resort support.',
    example: 'wdw-resort-uuid',
  })
  resort_id?: string;

  @ApiProperty({
    description: 'Trip start date in YYYY-MM-DD format',
    example: '2026-06-01',
  })
  start_date!: string;

  @ApiProperty({
    description: 'Trip end date in YYYY-MM-DD format (inclusive)',
    example: '2026-06-05',
  })
  end_date!: string;

  @ApiProperty({
    description: 'Guests in the party. At least one guest is required.',
    type: [GuestInputDto],
  })
  guests!: GuestInputDto[];

  @ApiProperty({
    description: 'Trip planning preferences',
    type: () => TripPreferencesDto,
  })
  preferences!: TripPreferencesDto;
}

export class TripDto {
  @ApiProperty({
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Resort UUID (Walt Disney World if omitted)',
    example: 'wdw-resort-uuid',
  })
  resort_id?: string;

  @ApiProperty({
    description: 'Trip start date in YYYY-MM-DD format',
    example: '2026-06-01',
  })
  start_date!: string;

  @ApiProperty({
    description: 'Trip end date in YYYY-MM-DD format (inclusive)',
    example: '2026-06-05',
  })
  end_date!: string;

  @ApiProperty({
    description: 'Guests in the party',
    type: [GuestInputDto],
  })
  guests!: GuestInputDto[];

  @ApiProperty({
    description: 'Trip planning preferences',
    type: () => TripPreferencesDto,
  })
  preferences!: TripPreferencesDto;

  @ApiProperty({
    description:
      '"free" = plan not yet purchased (Phase 4 entitlements); "unlocked" = plan purchased and available.',
    enum: EntitlementStateEnum,
    example: EntitlementStateEnum.FREE,
  })
  entitlement_state!: EntitlementStateEnum;

  @ApiProperty({
    description: 'ISO 8601 creation timestamp',
    example: '2026-04-14T10:00:00.000Z',
  })
  created_at!: string;

  @ApiPropertyOptional({
    description:
      'UUID of the most recent plan for this trip, if one has been generated. ' +
      'Clients should poll GET /v1/trips/:id after POST /generate-plan, then fetch ' +
      'GET /v1/plans/:current_plan_id once it becomes non-null.',
    example: 'plan-uuid-here',
  })
  current_plan_id?: string | null;
}

export class GeneratePlanResponseDto {
  @ApiProperty({
    description:
      'BullMQ job ID for the plan generation job. Poll GET /v1/plans/:id to check status.',
    example: 'bullmq-job-id-123',
  })
  job_id!: string;
}
