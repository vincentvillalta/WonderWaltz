import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { WaitTimeDto } from '../shared/dto/wait-time.dto.js';

@ApiTags('parks')
@Controller('parks')
export class ParksController {
  /**
   * GET /v1/parks/:parkId/waits
   * Returns current posted wait times for all rides in the specified park.
   * Live implementation delivered in plan 02-09 (QueueTimesModule).
   * Returns empty array as stub — real Redis/DB reads in 02-09.
   */
  @Get(':parkId/waits')
  @ApiOperation({
    summary: 'Get current wait times for a park',
    description:
      'Returns posted wait times for all tracked attractions in the park. ' +
      'is_stale=true when fetched_at is more than 5 minutes ago. ' +
      'Source is "queue-times" (primary, 5-min refresh) or "themeparks-wiki" (secondary).',
  })
  @ApiParam({
    name: 'parkId',
    description:
      'Park identifier slug (e.g., "magic-kingdom", "epcot", "hollywood-studios", "animal-kingdom")',
    example: 'magic-kingdom',
  })
  @ApiEnvelopedResponse(WaitTimeDto)
  getWaitTimes(@Param('parkId') _parkId: string): WaitTimeDto[] {
    // Real implementation: QueueTimesModule reads from Redis in plan 02-09
    return [];
  }
}
