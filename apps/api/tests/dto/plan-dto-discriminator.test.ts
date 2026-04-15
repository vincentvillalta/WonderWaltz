/**
 * Discriminator parsing contract for PlanDto.days.
 *
 * PlanDto.days is a discriminated union:
 *   - FullDayPlanDto  (type: 'full')   — existing full itinerary
 *   - LockedDayPlanDto (type: 'locked') — free-tier teaser
 *
 * class-transformer.plainToInstance must parse each variant into the
 * correct class when given `{ discriminator: { property: 'type', subTypes: [...] } }`.
 *
 * This test is load-bearing for PLAN-02 (free-tier blur) — the discriminator
 * is the contract mobile clients generate their switch/sealed-class over.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import {
  FullDayPlanDto,
  LockedDayPlanDto,
  PlanDto,
  PlanItemTypeEnum,
  PlanStatusEnum,
} from '../../src/shared/dto/plan.dto.js';

describe('PlanDto discriminated union — FullDayPlan | LockedDayPlan', () => {
  const fixture = {
    id: 'plan-1',
    trip_id: 'trip-1',
    version: 1,
    status: PlanStatusEnum.READY,
    warnings: [],
    created_at: '2026-06-01T08:00:00.000Z',
    days: [
      {
        type: 'full',
        id: 'day-1',
        date: '2026-06-01',
        park_id: 'magic-kingdom',
        items: [
          {
            id: 'item-1',
            type: PlanItemTypeEnum.ATTRACTION,
            name: 'Space Mountain',
            start_time: '2026-06-01T09:30:00.000Z',
            end_time: '2026-06-01T10:00:00.000Z',
          },
        ],
      },
      {
        type: 'locked',
        dayIndex: 1,
        park: 'EPCOT',
        totalItems: 7,
        headline: 'Your EPCOT fairy_tale day centers on Guardians.',
        unlockTeaser: 'Upgrade to see all 7 items.',
      },
    ],
  };

  it('parses both full and locked day variants via discriminator', () => {
    const plan = plainToInstance(PlanDto, fixture);

    expect(plan).toBeInstanceOf(PlanDto);
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]).toBeInstanceOf(FullDayPlanDto);
    expect(plan.days[1]).toBeInstanceOf(LockedDayPlanDto);
  });

  it('preserves discriminator tag values', () => {
    const plan = plainToInstance(PlanDto, fixture);

    const [full, locked] = plan.days;
    expect((full as FullDayPlanDto).type).toBe('full');
    expect((locked as LockedDayPlanDto).type).toBe('locked');
  });

  it('retains LockedDayPlan fields after parsing', () => {
    const plan = plainToInstance(PlanDto, fixture);
    const locked = plan.days[1] as LockedDayPlanDto;

    expect(locked.dayIndex).toBe(1);
    expect(locked.park).toBe('EPCOT');
    expect(locked.totalItems).toBe(7);
    expect(locked.headline).toContain('EPCOT');
    expect(locked.unlockTeaser).toBe('Upgrade to see all 7 items.');
  });

  it('retains FullDayPlan fields (items array) after parsing', () => {
    const plan = plainToInstance(PlanDto, fixture);
    const full = plan.days[0] as FullDayPlanDto;

    expect(full.date).toBe('2026-06-01');
    expect(full.park_id).toBe('magic-kingdom');
    expect(full.items).toHaveLength(1);
    expect(full.items[0]!.name).toBe('Space Mountain');
  });

  it('defaults warnings to empty array shape', () => {
    const plan = plainToInstance(PlanDto, fixture);
    expect(plan.warnings).toEqual([]);
  });
});
