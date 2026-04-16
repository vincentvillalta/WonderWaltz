import { Controller, Get, HttpException, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { SupabaseAuthGuard } from '../auth/auth.guard.js';
import { PlanDto } from '../shared/dto/plan.dto.js';
import { PlansService } from './plans.service.js';

@ApiTags('plans')
@Controller('plans')
@UseGuards(SupabaseAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * GET /v1/plans/:id
   * Retrieve a plan by ID with entitlement-based projection.
   *
   * Free tier: Day 0 = full details, Days 1+ = locked summary cards.
   * Unlocked/paid tier: all days with full details.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a plan by ID',
    description:
      'Returns the plan with day_plans projected by entitlement. ' +
      'Poll this endpoint after POST /v1/trips/:id/generate-plan or rethink-today. ' +
      'status="generating" while the job is in progress, "ready" when complete.',
  })
  @ApiParam({
    name: 'id',
    description: 'Plan UUID',
    example: 'plan-uuid-here',
  })
  @ApiEnvelopedResponse(PlanDto)
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string): Promise<PlanDto> {
    const plan = await this.plansService.getPlan(id);
    if (!plan) {
      throw new HttpException('Plan not found', 404);
    }
    return plan;
  }
}
