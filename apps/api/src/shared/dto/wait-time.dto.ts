import { ApiProperty } from '@nestjs/swagger';

export type WaitTimeSource = 'queue-times' | 'themeparks-wiki';

export class WaitTimeDto {
  @ApiProperty({
    description: 'Internal attraction UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  attractionId!: string;

  @ApiProperty({
    description: 'Attraction display name',
    example: 'Jungle Cruise',
  })
  name!: string;

  @ApiProperty({
    description:
      'Current posted wait time in minutes. Null when no data is available (attraction not yet polled or no history).',
    example: 35,
    nullable: true,
    type: Number,
  })
  minutes!: number | null;

  @ApiProperty({
    description:
      'ISO 8601 timestamp when this wait time was last fetched from the source. Null when no data is available.',
    example: '2026-04-14T15:30:00.000Z',
    nullable: true,
    type: String,
  })
  fetched_at!: string | null;

  @ApiProperty({
    description: 'Data source identifier. Null when no data is available.',
    enum: ['queue-times', 'themeparks-wiki'],
    example: 'queue-times',
    nullable: true,
  })
  source!: WaitTimeSource | null;

  @ApiProperty({
    description:
      'True when fetched_at is more than 5 minutes ago — indicates potentially stale data. Clients should render staleness indicators.',
    example: false,
  })
  is_stale!: boolean;
}
