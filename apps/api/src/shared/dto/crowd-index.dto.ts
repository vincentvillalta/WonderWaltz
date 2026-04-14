import { ApiProperty } from '@nestjs/swagger';

export type CrowdIndexConfidence = 'bootstrap' | 'percentile';

export class CrowdIndexValueDto {
  @ApiProperty({
    description:
      'Crowd index score from 0 to 100 (percentile of trailing-90-day distribution). Null during very early bootstrap period before any history exists.',
    example: 62,
    nullable: true,
    type: Number,
  })
  value!: number | null;

  @ApiProperty({
    description:
      '"bootstrap" during first 30 days (formula: min(100, avg_wait × 1.2)); "percentile" once ≥30 days of history exist. Clients can label early-life values honestly.',
    enum: ['bootstrap', 'percentile'],
    example: 'percentile',
  })
  confidence!: CrowdIndexConfidence;

  @ApiProperty({
    description:
      'Number of days of wait-time history available for the percentile calculation. Used to communicate confidence to the user.',
    example: 42,
  })
  sample_size_days!: number;
}

export class CrowdIndexParksDto {
  @ApiProperty({ type: () => CrowdIndexValueDto })
  magic_kingdom!: CrowdIndexValueDto;

  @ApiProperty({ type: () => CrowdIndexValueDto })
  epcot!: CrowdIndexValueDto;

  @ApiProperty({ type: () => CrowdIndexValueDto })
  hollywood_studios!: CrowdIndexValueDto;

  @ApiProperty({ type: () => CrowdIndexValueDto })
  animal_kingdom!: CrowdIndexValueDto;
}

export class CrowdIndexResponseDto {
  @ApiProperty({
    description:
      'Global crowd index across all four WDW parks (top 5 rides per park × 4 parks = top 20 rides).',
    type: () => CrowdIndexValueDto,
  })
  global!: CrowdIndexValueDto;

  @ApiProperty({
    description:
      'Per-park crowd indices for Magic Kingdom, EPCOT, Hollywood Studios, and Animal Kingdom.',
    type: () => CrowdIndexParksDto,
  })
  parks!: CrowdIndexParksDto;
}
