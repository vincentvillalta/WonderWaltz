import { ApiProperty } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiProperty({
    description: 'Disclaimer text — all WonderWaltz API responses include this.',
    example:
      'WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.',
  })
  disclaimer!: string;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response payload' })
  data!: T;

  @ApiProperty({ type: () => ApiMetaDto })
  meta!: ApiMetaDto;
}
