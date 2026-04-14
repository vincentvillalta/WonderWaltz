import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { CrowdIndexResponseDto } from '../shared/dto/crowd-index.dto.js';
import { ParksService } from './parks.service.js';

@ApiTags('parks')
@Controller('crowd-index')
export class CrowdIndexController {
  constructor(private readonly parksService: ParksService) {}

  /**
   * GET /v1/crowd-index
   * Returns the current global and per-park crowd indices from Redis.
   * Keys are written hourly by CrowdIndexProcessor (plan 02-07).
   */
  @Get()
  @ApiOperation({
    summary: 'Get current crowd index (global + per-park)',
    description:
      'Returns crowd index values for all four WDW parks plus a global aggregate. ' +
      'Values are 0–100 percentile scores against the trailing-90-day distribution. ' +
      'confidence="bootstrap" during the first 30 days; "percentile" thereafter.',
  })
  @ApiEnvelopedResponse(CrowdIndexResponseDto)
  async getCrowdIndex(): Promise<CrowdIndexResponseDto> {
    return this.parksService.getCrowdIndex();
  }
}
