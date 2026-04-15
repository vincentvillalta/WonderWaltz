import Anthropic from '@anthropic-ai/sdk';
import type { Provider } from '@nestjs/common';

/**
 * DI token for the shared Anthropic client. Kept as a Symbol so nothing can
 * accidentally collide with a string token; also makes it trivial to stub
 * in @nestjs/testing via `.overrideProvider(ANTHROPIC_CLIENT_TOKEN)`.
 *
 * Tests inject `createAnthropicMock()` from `apps/api/tests/anthropic-mock.ts`
 * as the `useValue` override — which is shape-compatible with the real SDK
 * for the subset we actually call.
 */
export const ANTHROPIC_CLIENT_TOKEN = Symbol('ANTHROPIC_CLIENT');

/**
 * The NestJS DI surface exposes the Anthropic client as `unknown` to
 * downstream consumers (the mock isn't a real `Anthropic` instance, just
 * shape-compatible). Consumers cast to `Anthropic` at the service layer.
 */
export type AnthropicLike = Pick<Anthropic, 'messages'>;

/**
 * Reads `ANTHROPIC_API_KEY` from env and returns a live Anthropic client.
 * In test mode (`NODE_ENV === 'test'`) the absence of the key is not fatal —
 * tests almost always override this provider with the mock harness. We
 * still construct a real client with a placeholder key so any test that
 * forgets to override gets a clear network-error signal rather than a
 * `Cannot read properties of undefined`.
 */
export const anthropicClientProvider: Provider = {
  provide: ANTHROPIC_CLIENT_TOKEN,
  useFactory: (): AnthropicLike => {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey && process.env['NODE_ENV'] !== 'test') {
      throw new Error(
        'ANTHROPIC_API_KEY is required outside of NODE_ENV=test; ' +
          'see docs/ops/PROVISIONING_STATE.md for provisioning steps.',
      );
    }
    return new Anthropic({ apiKey: apiKey ?? 'test-key-placeholder' });
  },
};
