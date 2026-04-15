import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export type TripBudgetExhaustedError = 'trip_budget_exhausted';

export type ResetOptionType = 'top_up';

/**
 * Reset option offered when the per-trip $0.50 LLM cost circuit
 * breaker (LLM-07) trips. Phase 3 publishes this contract; Phase 4
 * wires the RevenueCat IAP SKU that actually mutates
 * trips.llm_budget_cents.
 */
export class ResetOptionDto {
  @ApiProperty({
    description: 'Reset option kind. Only "top_up" in v1.',
    enum: ['top_up'],
    example: 'top_up',
    type: String,
  })
  type!: ResetOptionType;

  @ApiProperty({
    description:
      'IAP SKU identifier (RevenueCat product). Client passes this to StoreKit / Google Play Billing.',
    example: 'wonderwaltz.plan.topup.50c',
  })
  sku!: string;

  @ApiProperty({
    description: 'Top-up amount in USD cents.',
    example: 99,
  })
  usd_cents!: number;
}

/**
 * 402 Payment Required response body when the per-trip LLM cost
 * circuit breaker (LLM-07) has already tripped for this trip and the
 * user attempts to regenerate or rethink.
 *
 * See CONTEXT.md "Cost Circuit Breaker (LLM-07)".
 */
@ApiExtraModels(ResetOptionDto)
export class PlanBudgetExhaustedDto {
  @ApiProperty({
    description: 'Discriminated error code — always "trip_budget_exhausted".',
    enum: ['trip_budget_exhausted'],
    example: 'trip_budget_exhausted',
    type: String,
  })
  error!: TripBudgetExhaustedError;

  @ApiProperty({
    description: 'Cumulative LLM spend on this trip so far, in USD cents.',
    example: 52,
  })
  spent_cents!: number;

  @ApiProperty({
    description: 'Per-trip LLM budget cap, in USD cents. Default 50 (from trips.llm_budget_cents).',
    example: 50,
  })
  budget_cents!: number;

  @ApiProperty({
    description:
      'Options to top-up the budget and retry. Phase 4 wires the actual RevenueCat mutation; Phase 3 just publishes the contract.',
    type: [ResetOptionDto],
  })
  @Type(() => ResetOptionDto)
  resetOptions!: ResetOptionDto[];
}
