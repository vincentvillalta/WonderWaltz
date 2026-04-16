import { Test, type TestingModule } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ANTHROPIC_CLIENT_TOKEN } from '../../src/narrative/anthropic.client.js';
import { NarrativeModule } from '../../src/narrative/narrative.module.js';
import { NarrativeService } from '../../src/narrative/narrative.service.js';
import { createAnthropicMock } from '../anthropic-mock.js';

describe('NarrativeModule DI wiring', () => {
  async function buildModule(): Promise<TestingModule> {
    const mock = createAnthropicMock();
    return Test.createTestingModule({ imports: [NarrativeModule] })
      .overrideProvider(ANTHROPIC_CLIENT_TOKEN)
      .useValue(mock)
      .compile();
  }

  it('resolves NarrativeService with the mocked Anthropic client', async () => {
    const moduleRef = await buildModule();
    const service = moduleRef.get(NarrativeService);
    expect(service).toBeInstanceOf(NarrativeService);
  });

  it('generate() is callable (no longer a 03-12 stub)', async () => {
    const moduleRef = await buildModule();
    const service = moduleRef.get(NarrativeService);
    // With empty days and the default mock fixture, generate should
    // run the full pipeline (may succeed or fail validation — but it
    // no longer rejects with the 03-12 marker).
    const result = await service.generate({
      tripId: 'trip-1',
      guests: [{ ageBracket: '18+' }],
      budgetTier: 'fairy',
      days: [],
    });
    // The mock returns a fixture with days — but our input has no days,
    // so the fixture's planItemIds won't match. Expect graceful degradation.
    expect(typeof result.narrativeAvailable).toBe('boolean');
    expect(result.usage).toBeDefined();
  });

  it('generateRethinkIntro() is callable (no longer a 03-12 stub)', async () => {
    const moduleRef = await buildModule();
    const service = moduleRef.get(NarrativeService);
    // The default fixture returns a full narrative (not an intro),
    // so this may throw a parse error — but NOT a /03-12/ rejection.
    try {
      await service.generateRethinkIntro({
        tripId: 'trip-1',
        dayIndex: 0,
        completedItemIds: [],
        remainingItems: [],
      });
    } catch (e) {
      // Acceptable: parse/validation error from default fixture
      // Not acceptable: /03-12/ marker
      expect(String(e)).not.toMatch(/03-12/);
    }
  });

  it('ANTHROPIC_CLIENT_TOKEN resolves to the override-supplied value', async () => {
    const moduleRef = await buildModule();
    const client: unknown = moduleRef.get(ANTHROPIC_CLIENT_TOKEN);
    // The override is the mock harness — it carries a `setFixture` method
    // that the real Anthropic SDK does not, so this is a cheap identity
    // check that the mock actually took effect in DI.
    expect(typeof (client as { setFixture?: unknown }).setFixture).toBe('function');
  });
});
