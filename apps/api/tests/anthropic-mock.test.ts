import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createAnthropicMock, hashCachePrefix } from './anthropic-mock.js';

const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5';

/**
 * Byte-stable system prefix shared across calls in a session. Represents
 * the WDW catalog + BRAND voice guide. Any change to this string changes
 * the cache key — that is the whole point of the Anthropic cache, and the
 * whole reason we assert SHA-256 invariance in CACHED_PREFIX_SHA below.
 */
const CACHED_PREFIX =
  'WDW Catalog v1 | Parks: MK, EPCOT, HS, AK | 51 attractions | BRAND voice: warm, frank, expert.';

/**
 * Byte-stable SHA of CACHED_PREFIX. If someone edits the prefix string
 * above, this test fails and forces them to confront that they just
 * invalidated every production cache hit and blew up LLM-06 alerting.
 */
const CACHED_PREFIX_SHA = createHash('sha256').update(CACHED_PREFIX).digest('hex');

describe('CACHED_PREFIX byte-stability (LLM-02 invariant)', () => {
  it('has a SHA-256 that never drifts without a deliberate bump', () => {
    expect(CACHED_PREFIX_SHA).toBe(
      '1d0ff9b1774b6ac13d824ccb053edfea6c85c3e9086978325cb9d413602eae20',
    );
  });

  it('hashCachePrefix agrees with raw SHA-256 for string system prompts', () => {
    expect(hashCachePrefix(CACHED_PREFIX)).toBe(CACHED_PREFIX_SHA);
  });
});

describe('createAnthropicMock — cache-aware usage reporting', () => {
  it('first call with a new system prefix reports cache creation (miss)', async () => {
    const mock = createAnthropicMock();
    const res = await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'Generate a plan.' }],
    });
    expect(res.usage.cache_creation_input_tokens).toBeGreaterThan(0);
    expect(res.usage.cache_read_input_tokens).toBe(0);
    expect(res.model).toBe(SONNET);
  });

  it('second call with the SAME prefix reports a cache hit', async () => {
    const mock = createAnthropicMock();
    await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'first' }],
    });
    const second = await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'second' }],
    });
    expect(second.usage.cache_read_input_tokens).toBeGreaterThan(0);
    expect(second.usage.cache_creation_input_tokens).toBe(0);
  });

  it('a DIFFERENT prefix on the second call triggers fresh cache creation', async () => {
    const mock = createAnthropicMock();
    await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'first' }],
    });
    const changed = await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: CACHED_PREFIX + ' v2-mutation',
      messages: [{ role: 'user', content: 'second' }],
    });
    expect(changed.usage.cache_creation_input_tokens).toBeGreaterThan(0);
    expect(changed.usage.cache_read_input_tokens).toBe(0);
  });

  it('honors cache_control breakpoint when system is an array of blocks', async () => {
    const mock = createAnthropicMock();
    const systemBlocks = [
      { type: 'text' as const, text: CACHED_PREFIX, cache_control: { type: 'ephemeral' as const } },
      { type: 'text' as const, text: 'Dynamic per-trip context: guest-123' },
    ];
    const firstCallDynamicChange = [
      { type: 'text' as const, text: CACHED_PREFIX, cache_control: { type: 'ephemeral' as const } },
      { type: 'text' as const, text: 'Dynamic per-trip context: guest-999' },
    ];
    await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: systemBlocks,
      messages: [{ role: 'user', content: 'x' }],
    });
    const second = await mock.messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: firstCallDynamicChange,
      messages: [{ role: 'user', content: 'y' }],
    });
    // Prefix matches (same CACHED_PREFIX up to cache_control) even though
    // the dynamic suffix changed — this is the whole point of LLM-02.
    expect(second.usage.cache_read_input_tokens).toBeGreaterThan(0);
    expect(second.usage.cache_creation_input_tokens).toBe(0);
  });
});

describe('createAnthropicMock — model passthrough (LLM-03)', () => {
  it('echoes a Haiku model ID on the response when requested', async () => {
    const mock = createAnthropicMock();
    const res = await mock.messages.create({
      model: HAIKU,
      max_tokens: 512,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'rethink today' }],
    });
    expect(res.model).toBe(HAIKU);
  });
});

describe('createAnthropicMock — call tracking + fixture switching', () => {
  it('appends to calls[] on every invocation', async () => {
    const mock = createAnthropicMock();
    expect(mock.calls).toHaveLength(0);
    await mock.messages.create({
      model: SONNET,
      messages: [{ role: 'user', content: 'one' }],
      system: CACHED_PREFIX,
    });
    await mock.messages.create({
      model: SONNET,
      messages: [{ role: 'user', content: 'two' }],
      system: CACHED_PREFIX,
    });
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]?.messages[0]?.content).toBe('one');
    expect(mock.calls[1]?.messages[0]?.content).toBe('two');
  });

  it('setFixture("invalid-ride") switches to the Zod-rejection fixture', async () => {
    const mock = createAnthropicMock();
    mock.setFixture('invalid-ride');
    const res = await mock.messages.create({
      model: SONNET,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'bad plan' }],
    });
    const payload = JSON.parse(res.content[0]!.text) as {
      days: Array<{ items: Array<{ planItemId: string }> }>;
    };
    expect(payload.days[0]!.items[0]!.planItemId).toBe('00000000-dead-beef-0000-000000000042');
  });

  it('reset() clears calls, cache memory, and fixture override', async () => {
    const mock = createAnthropicMock();
    mock.setFixture('invalid-ride');
    await mock.messages.create({
      model: SONNET,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'x' }],
    });
    mock.reset();
    expect(mock.calls).toHaveLength(0);
    // After reset, CACHED_PREFIX is "new again" → cache miss
    const res = await mock.messages.create({
      model: SONNET,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'x' }],
    });
    expect(res.usage.cache_read_input_tokens).toBe(0);
    expect(res.usage.cache_creation_input_tokens).toBeGreaterThan(0);
  });
});

describe('createAnthropicMock — response shape matches real Messages API', () => {
  it('returns all required top-level fields in the right types', async () => {
    const mock = createAnthropicMock();
    const res = await mock.messages.create({
      model: SONNET,
      system: CACHED_PREFIX,
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.id).toMatch(/^msg_/);
    expect(res.type).toBe('message');
    expect(res.role).toBe('assistant');
    expect(Array.isArray(res.content)).toBe(true);
    expect(res.content[0]?.type).toBe('text');
    expect(typeof res.content[0]?.text).toBe('string');
    expect(res.stop_reason).toBe('end_turn');
    expect(typeof res.usage.input_tokens).toBe('number');
    expect(typeof res.usage.output_tokens).toBe('number');
    expect(typeof res.usage.cache_creation_input_tokens).toBe('number');
    expect(typeof res.usage.cache_read_input_tokens).toBe('number');
  });
});
