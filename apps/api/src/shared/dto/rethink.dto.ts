import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsISO8601, IsUUID, ValidateNested } from 'class-validator';

/**
 * Client-authoritative Lightning Lane booking the user already holds in
 * Disney's system. Passed on POST /v1/trips/:id/rethink-today so the
 * solver can treat the ride + return window as a hard pin.
 */
export class LLBookingDto {
  @ApiProperty({
    description: 'Attraction UUID matching packages/content attractions.yaml.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4')
  attraction_id!: string;

  @ApiProperty({
    description: 'ISO 8601 start of the Lightning Lane return window.',
    example: '2026-06-01T13:40:00.000Z',
  })
  @IsISO8601()
  return_window_start!: string;

  @ApiProperty({
    description: 'ISO 8601 end of the Lightning Lane return window.',
    example: '2026-06-01T14:40:00.000Z',
  })
  @IsISO8601()
  return_window_end!: string;
}

/**
 * Request body for POST /v1/trips/:id/rethink-today (PLAN-04).
 *
 * Replaces the legacy RethinkTodayDto stub. The client is the source of
 * truth for:
 *   - current_time             (used for in-progress item inference)
 *   - completed_item_ids       (exclude these from resolving)
 *   - active_ll_bookings[]     (hard-pinned LL return windows)
 *
 * The server re-runs the solver on the remaining items with Haiku;
 * per-item tips are preserved from the initial generation.
 */
export class RethinkRequestDto {
  @ApiProperty({
    description: 'Client-side ISO 8601 current time. Solver uses this for in-progress inference.',
    example: '2026-06-01T13:15:00.000Z',
  })
  @IsISO8601()
  current_time!: string;

  @ApiProperty({
    description: 'PlanItem UUIDs the user has already completed today.',
    type: [String],
    example: ['b4b5b6b7-0000-4000-8000-000000000001'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  completed_item_ids!: string[];

  @ApiProperty({
    description:
      'Lightning Lane bookings the user currently holds. Each becomes a hard pin in the revised day plan.',
    type: [LLBookingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LLBookingDto)
  active_ll_bookings!: LLBookingDto[];
}
