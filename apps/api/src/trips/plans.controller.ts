import { Controller, Get, HttpException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { PlanDto } from '../shared/dto/plan.dto.js';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  /**
   * GET /v1/plans/:id
   * Retrieve a plan by ID. Phase 3 implementation.
   * Status is "generating" | "ready" | "failed".
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a plan by ID (Phase 3)',
    description:
      'Returns the plan with day_plans. ' +
      'Poll this endpoint after POST /v1/trips/:id/generate-plan or rethink-today. ' +
      'status="generating" while the job is in progress, "ready" when complete. ' +
      'Returns 501 until Phase 3.',
  })
  @ApiParam({
    name: 'id',
    description: 'Plan UUID',
    example: 'plan-uuid-here',
  })
  @ApiEnvelopedResponse(PlanDto)
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 3' })
  getPlan(@Param('id') _id: string): never {
    throw new HttpException('Not Implemented', 501);
  }
}
