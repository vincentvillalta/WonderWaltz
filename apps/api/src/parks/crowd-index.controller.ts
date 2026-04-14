import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { CrowdIndexResponseDto } from '../shared/dto/crowd-index.dto.js';

@ApiTags('parks')
@Controller('crowd-index')
export class CrowdIndexController {
  /**
   * GET /v1/crowd-index
   * Returns the current global and per-park crowd indices.
   * Live implementation delivered in plan 02-09 (CrowdIndexModule).
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
  getCrowdIndex(): CrowdIndexResponseDto {
    // Real implementation: CrowdIndexModule reads from Redis in plan 02-09
    return {
      global: { value: null, confidence: 'bootstrap', sample_size_days: 0 },
      parks: {
        magic_kingdom: { value: null, confidence: 'bootstrap', sample_size_days: 0 },
        epcot: { value: null, confidence: 'bootstrap', sample_size_days: 0 },
        hollywood_studios: { value: null, confidence: 'bootstrap', sample_size_days: 0 },
        animal_kingdom: { value: null, confidence: 'bootstrap', sample_size_days: 0 },
      },
    };
  }
}
