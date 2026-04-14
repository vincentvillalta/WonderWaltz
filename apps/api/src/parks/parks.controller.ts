import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { WaitTimeDto } from '../shared/dto/wait-time.dto.js';
import { ParksService, ParkDto } from './parks.service.js';

@ApiTags('parks')
@Controller('parks')
export class ParksController {
  constructor(private readonly parksService: ParksService) {}

  /**
   * GET /v1/parks
   * Returns the list of WDW parks from the catalog.
   */
  @Get()
  @ApiOperation({
    summary: 'List all WDW parks',
    description: 'Returns the catalog list of Walt Disney World parks.',
  })
  @ApiEnvelopedResponse(WaitTimeDto)
  async getParks(): Promise<ParkDto[]> {
    return this.parksService.getParks();
  }

  /**
   * GET /v1/parks/:parkId/waits
   * Returns current posted wait times for all rides in the specified park.
   * Reads from Redis with is_stale computation; falls back to DB last row.
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
  async getWaitTimes(@Param('parkId') parkId: string): Promise<WaitTimeDto[]> {
    return this.parksService.getWaitTimes(parkId);
  }
}
