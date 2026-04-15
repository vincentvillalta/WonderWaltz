import { Body, Controller, Get, HttpCode, HttpException, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { PlanBudgetExhaustedDto } from '../shared/dto/plan-budget-exhausted.dto.js';
import { RethinkRequestDto } from '../shared/dto/rethink.dto.js';
import { CreateTripDto, GeneratePlanResponseDto, TripDto } from '../shared/dto/trip.dto.js';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  /**
   * POST /v1/trips
   * Create a new trip. Phase 3 implementation.
   */
  @Post()
  @HttpCode(501)
  @ApiOperation({
    summary: 'Create a trip (Phase 3)',
    description:
      'Creates a new trip with guest list and preferences. ' +
      'Returns 501 until Phase 3 solver implementation.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiEnvelopedResponse(TripDto)
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 3' })
  createTrip(@Body() _body: CreateTripDto): never {
    throw new HttpException('Not Implemented', 501);
  }

  /**
   * GET /v1/trips/:id
   * Retrieve a trip by ID. Phase 3 implementation.
   */
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get a trip by ID (Phase 3)',
    description:
      'Returns the trip object including guests and preferences. Returns 501 until Phase 3.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiEnvelopedResponse(TripDto)
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 3' })
  getTrip(@Param('id') _id: string): never {
    throw new HttpException('Not Implemented', 501);
  }

  /**
   * POST /v1/trips/:id/generate-plan
   * Kick off async plan generation. Phase 3 implementation.
   */
  @Post(':id/generate-plan')
  @HttpCode(501)
  @ApiOperation({
    summary: 'Generate an itinerary plan (Phase 3)',
    description:
      'Enqueues a plan generation job for the trip. ' +
      'Returns a job_id to poll GET /v1/plans/:id for status. ' +
      'Returns 501 until Phase 3.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiEnvelopedResponse(GeneratePlanResponseDto)
  @ApiResponse({
    status: 402,
    description:
      'Per-trip LLM cost circuit breaker (LLM-07) has tripped for this trip. Client should surface the top-up paywall and retry after upgrading.',
    type: PlanBudgetExhaustedDto,
  })
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 3' })
  generatePlan(@Param('id') _id: string): never {
    throw new HttpException('Not Implemented', 501);
  }

  /**
   * POST /v1/trips/:id/rethink-today
   * Re-plan the remaining items for today. Phase 3 implementation.
   */
  @Post(':id/rethink-today')
  @HttpCode(501)
  @ApiOperation({
    summary: "Rethink today's remaining itinerary (Phase 3)",
    description:
      'Enqueues a re-planning job for the remaining items today. ' +
      'Returns a job_id to poll GET /v1/plans/:id for status. ' +
      'Returns 501 until Phase 3.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip UUID',
    example: 'trip-uuid-here',
  })
  @ApiBody({ type: RethinkRequestDto })
  @ApiEnvelopedResponse(GeneratePlanResponseDto)
  @ApiResponse({
    status: 402,
    description:
      'Per-trip LLM cost circuit breaker (LLM-07) has tripped for this trip. Client should surface the top-up paywall and retry after upgrading.',
    type: PlanBudgetExhaustedDto,
  })
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 3' })
  rethinkToday(@Param('id') _id: string, @Body() _body: RethinkRequestDto): never {
    throw new HttpException('Not Implemented', 501);
  }
}
