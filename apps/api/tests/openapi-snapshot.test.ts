/**
 * OpenAPI v1 snapshot shape assertions — freezes the 03-03 amendment.
 *
 * After 03-03 lands, these shapes must remain stable for the rest of
 * Phase 3. Any subsequent plan that touches them is a deliberate
 * snapshot re-open (tracked explicitly), not drive-by drift.
 *
 * The companion CI gate in .github/workflows/ci.yml regenerates the
 * snapshot from the compiled dist and runs `git diff --exit-code` —
 * that gate enforces byte-stability. THIS test enforces shape
 * correctness so a future rebuild can't "regenerate cleanly" while
 * silently dropping a field.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type OpenApiDoc = {
  components: {
    schemas: Record<string, SchemaNode>;
  };
  paths: Record<string, Record<string, PathOp>>;
};

type SchemaNode = {
  type?: string;
  properties?: Record<string, PropertyNode>;
  required?: string[];
};

type PropertyNode = {
  type?: string;
  enum?: string[];
  items?: {
    $ref?: string;
    oneOf?: Array<{ $ref?: string }>;
    discriminator?: { propertyName: string; mapping?: Record<string, string> };
  };
  $ref?: string;
};

type PathOp = {
  responses?: Record<string, { content?: { 'application/json'?: { schema?: unknown } } }>;
  requestBody?: { content?: { 'application/json'?: { schema?: { $ref?: string } } } };
};

const SNAPSHOT_PATH = join(__dirname, '../../../packages/shared-openapi/openapi.v1.snapshot.json');

const loadSnapshot = (): OpenApiDoc => {
  const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
  return JSON.parse(raw) as OpenApiDoc;
};

describe('OpenAPI v1 snapshot — 03-03 amendment freeze', () => {
  const snapshot = loadSnapshot();
  const schemas = snapshot.components.schemas;

  it('includes FullDayPlanDto with discriminator tag', () => {
    expect(schemas.FullDayPlanDto).toBeDefined();
    const type = schemas.FullDayPlanDto!.properties!.type!;
    expect(type.enum).toContain('full');
  });

  it('includes LockedDayPlanDto with discriminator tag and all required fields', () => {
    expect(schemas.LockedDayPlanDto).toBeDefined();
    const props = schemas.LockedDayPlanDto!.properties!;
    expect(props.type!.enum).toContain('locked');
    expect(props.dayIndex).toBeDefined();
    expect(props.park).toBeDefined();
    expect(props.totalItems).toBeDefined();
    expect(props.headline).toBeDefined();
    expect(props.unlockTeaser).toBeDefined();

    const required = schemas.LockedDayPlanDto!.required ?? [];
    for (const field of ['type', 'dayIndex', 'park', 'totalItems', 'headline', 'unlockTeaser']) {
      expect(required).toContain(field);
    }
  });

  it('PlanDto.days is an array with oneOf discriminator over 2 subtypes', () => {
    const daysProp = schemas.PlanDto!.properties!.days!;
    expect(daysProp.type).toBe('array');
    const items = daysProp.items!;
    expect(items.oneOf).toHaveLength(2);
    const refs = (items.oneOf ?? []).map((entry) => entry.$ref).sort();
    expect(refs).toEqual(
      ['#/components/schemas/FullDayPlanDto', '#/components/schemas/LockedDayPlanDto'].sort(),
    );
    expect(items.discriminator?.propertyName).toBe('type');
    const mapping = items.discriminator?.mapping ?? {};
    expect(mapping.full).toContain('FullDayPlanDto');
    expect(mapping.locked).toContain('LockedDayPlanDto');
  });

  it('PlanDto carries a required warnings: string[] field', () => {
    const warnings = schemas.PlanDto!.properties!.warnings!;
    expect(warnings.type).toBe('array');
    expect(schemas.PlanDto!.required).toContain('warnings');
  });

  it('PlanDto no longer exposes the legacy day_plans field', () => {
    expect(schemas.PlanDto!.properties!.day_plans).toBeUndefined();
  });

  it('RethinkRequestDto exists with current_time, completed_item_ids, active_ll_bookings', () => {
    expect(schemas.RethinkRequestDto).toBeDefined();
    const props = schemas.RethinkRequestDto!.properties!;
    expect(props.current_time).toBeDefined();
    expect(props.completed_item_ids).toBeDefined();
    expect(props.active_ll_bookings).toBeDefined();
    expect(props.active_ll_bookings!.items!.$ref).toContain('LLBookingDto');
  });

  it('LLBookingDto exists with attraction_id + return window', () => {
    expect(schemas.LLBookingDto).toBeDefined();
    const props = schemas.LLBookingDto!.properties!;
    expect(props.attraction_id).toBeDefined();
    expect(props.return_window_start).toBeDefined();
    expect(props.return_window_end).toBeDefined();
  });

  it('PlanBudgetExhaustedDto references ResetOptionDto', () => {
    expect(schemas.PlanBudgetExhaustedDto).toBeDefined();
    expect(schemas.ResetOptionDto).toBeDefined();

    const props = schemas.PlanBudgetExhaustedDto!.properties!;
    expect(props.error!.enum).toContain('trip_budget_exhausted');
    expect(props.spent_cents).toBeDefined();
    expect(props.budget_cents).toBeDefined();
    expect(props.resetOptions!.items!.$ref).toContain('ResetOptionDto');

    const resetProps = schemas.ResetOptionDto!.properties!;
    expect(resetProps.type!.enum).toContain('top_up');
    expect(resetProps.sku).toBeDefined();
    expect(resetProps.usd_cents).toBeDefined();
  });

  it('generate-plan and rethink-today responses reference PlanBudgetExhausted on 402', () => {
    const generatePlan = snapshot.paths['/v1/trips/{id}/generate-plan']!.post!;
    const rethink = snapshot.paths['/v1/trips/{id}/rethink-today']!.post!;

    const schemaOf = (op: PathOp, status: string): string =>
      JSON.stringify(op.responses?.[status]?.content?.['application/json']?.schema ?? {});

    expect(schemaOf(generatePlan, '402')).toContain('PlanBudgetExhaustedDto');
    expect(schemaOf(rethink, '402')).toContain('PlanBudgetExhaustedDto');
  });

  it('rethink-today requestBody references RethinkRequestDto', () => {
    const rethink = snapshot.paths['/v1/trips/{id}/rethink-today']!.post!;
    const ref = rethink.requestBody?.content?.['application/json']?.schema?.$ref ?? '';
    expect(ref).toContain('RethinkRequestDto');
  });

  it('does not expose the legacy RethinkTodayDto shape', () => {
    expect(schemas.RethinkTodayDto).toBeUndefined();
  });
});
