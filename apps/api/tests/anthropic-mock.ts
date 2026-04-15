/**
 * Deterministic Anthropic Messages API mock for Phase 03 (Engine).
 *
 * Shape-compatible with `new Anthropic({ apiKey }).messages.create(params)`
 * for the subset Phase 03 actually uses:
 *   - `params.model` — echoed back on the response so LLM-03 model-pinning
 *     tests can assert `response.model === 'claude-haiku-4-5'` etc.
 *   - `params.system` — can be a string OR an array of content blocks with
 *     `cache_control` markers. The mock hashes the prefix up to (and
 *     including) the first block flagged `cache_control.type === 'ephemeral'`
 *     and uses the hash to decide cache-miss vs cache-hit usage reporting.
 *   - `params.messages` — ignored for routing; not cached.
 *
 * Response shape matches the real Messages API:
 *   { id, type, role, model, content, stop_reason, stop_sequence, usage }
 * …with usage reporting cache_creation_input_tokens / cache_read_input_tokens
 * that downstream cost-tracking tests (plan 03-11 `llm_costs.insert`) assert
 * on.
 *
 * LLM-06 (cache hit-rate alerting) and LLM-07 (circuit breaker) are tested
 * against this mock; keeping its usage shape honest is load-bearing.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface MockMessageCreateParams {
  model: string;
  max_tokens?: number;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  system?:
    | string
    | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' | 'persistent' } }>;
  [key: string]: unknown;
}

export interface MockUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface MockMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: Array<{ type: 'text'; text: string }>;
  stop_reason: string;
  stop_sequence: string | null;
  usage: MockUsage;
}

export interface AnthropicMock {
  messages: { create: (params: MockMessageCreateParams) => Promise<MockMessage> };
  calls: MockMessageCreateParams[];
  setFixture: (name: string) => void;
  reset: () => void;
  /** For tests that want to inspect cache-prefix hashes directly. */
  seenPrefixes: () => string[];
}

const FIXTURE_DIR = resolve(__dirname, 'fixtures');

function loadFixture(name: string): MockMessage {
  const file = name.endsWith('.json')
    ? name
    : `narrative-response${name === 'default' ? '' : '.' + name}.json`;
  const full = resolve(FIXTURE_DIR, file);
  const raw = readFileSync(full, 'utf-8');
  return JSON.parse(raw) as MockMessage;
}

/**
 * Computes a byte-stable hash of the cache prefix. For string `system`, the
 * whole string is the prefix. For array `system`, the prefix is the
 * concatenation of `text` from every block up to and including the first
 * block carrying `cache_control`. Anything after the first cache_control
 * marker is dynamic suffix — NOT hashed.
 */
export function hashCachePrefix(system: MockMessageCreateParams['system']): string {
  if (system == null) return '';
  if (typeof system === 'string') {
    return createHash('sha256').update(system).digest('hex');
  }
  let prefix = '';
  for (const block of system) {
    prefix += block.text;
    if (block.cache_control) break;
  }
  return createHash('sha256').update(prefix).digest('hex');
}

export interface CreateMockOptions {
  fixture?: string;
  /** Override the default fixture usage to control test scenarios. */
  usageOverride?: Partial<MockUsage>;
}

export function createAnthropicMock(opts: CreateMockOptions = {}): AnthropicMock {
  const calls: MockMessageCreateParams[] = [];
  const prefixHashes: string[] = [];
  const seenPrefixes = new Set<string>();
  let activeFixture = opts.fixture ?? 'default';

  const create = (params: MockMessageCreateParams): Promise<MockMessage> => {
    calls.push(params);

    const fixture = loadFixture(activeFixture);
    const prefixHash = hashCachePrefix(params.system);
    prefixHashes.push(prefixHash);
    const isCacheHit = prefixHash !== '' && seenPrefixes.has(prefixHash);
    if (prefixHash) seenPrefixes.add(prefixHash);

    // Compute cache-aware usage. On hit, roughly 96% of the cache-creation
    // tokens are re-read (Anthropic billed the writer on the prior miss and
    // only charges 0.1× on the hit). Exact ratio is pinned so tests can
    // assert on the numbers.
    const baseUsage = fixture.usage;
    const usage: MockUsage = isCacheHit
      ? {
          input_tokens: baseUsage.input_tokens,
          output_tokens: baseUsage.output_tokens,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: Math.round(baseUsage.cache_creation_input_tokens * 0.96),
        }
      : {
          input_tokens: baseUsage.input_tokens,
          output_tokens: baseUsage.output_tokens,
          cache_creation_input_tokens: baseUsage.cache_creation_input_tokens,
          cache_read_input_tokens: 0,
        };

    if (opts.usageOverride) Object.assign(usage, opts.usageOverride);

    // Deep-clone content so callers mutating it don't poison the fixture.
    const content = fixture.content.map((c) => ({ ...c }));

    // Echo the requested model (LLM-03 contract).
    const model = params.model;

    return Promise.resolve({
      id: fixture.id,
      type: 'message' as const,
      role: 'assistant' as const,
      model,
      content,
      stop_reason: fixture.stop_reason,
      stop_sequence: fixture.stop_sequence,
      usage,
    });
  };

  return {
    messages: { create },
    calls,
    setFixture: (name) => {
      activeFixture = name;
    },
    reset: () => {
      calls.length = 0;
      prefixHashes.length = 0;
      seenPrefixes.clear();
      activeFixture = opts.fixture ?? 'default';
    },
    seenPrefixes: () => [...prefixHashes],
  };
}
