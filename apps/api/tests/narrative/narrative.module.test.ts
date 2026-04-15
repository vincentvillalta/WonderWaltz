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

  it('generate() rejects with a "03-12" not-implemented error', async () => {
    const moduleRef = await buildModule();
    const service = moduleRef.get(NarrativeService);
    await expect(
      service.generate({
        tripId: 'trip-1',
        guests: [{ ageBracket: '18+' }],
        budgetTier: 'fairy',
        days: [],
      }),
    ).rejects.toThrow(/03-12/);
  });

  it('generateRethinkIntro() rejects with a "03-12" not-implemented error', async () => {
    const moduleRef = await buildModule();
    const service = moduleRef.get(NarrativeService);
    await expect(
      service.generateRethinkIntro({
        tripId: 'trip-1',
        dayIndex: 0,
        completedItemIds: [],
        remainingItems: [],
      }),
    ).rejects.toThrow(/03-12/);
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
