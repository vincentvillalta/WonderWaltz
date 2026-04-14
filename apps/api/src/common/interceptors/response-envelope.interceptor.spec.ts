import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ResponseEnvelopeInterceptor, DISCLAIMER } from './response-envelope.interceptor.js';

// Import the disclaimer from packages/content for cross-verification
// Note: in a real integration we'd import from @wonderwaltz/content.
// The inline constant must match.
const EXPECTED_DISCLAIMER =
  'WonderWaltz is an independent, unofficial planning app. ' +
  'Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.';

function mockContext(skipEnvelope = false): ExecutionContext {
  const headerFn = vi.fn();
  return {
    getHandler: () => ({ __metadata: skipEnvelope ? { skip_envelope: true } : {} }),
    getClass: () => ({}),
    switchToHttp: () => ({
      getResponse: () => ({ header: headerFn, _headerFn: headerFn }),
    }),
  } as unknown as ExecutionContext;
}

function mockCallHandler<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) };
}

describe('ResponseEnvelopeInterceptor', () => {
  let interceptor: ResponseEnvelopeInterceptor<unknown>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseEnvelopeInterceptor(reflector);
  });

  it('wraps JSON response in { data, meta: { disclaimer } }', async () => {
    const ctx = mockContext(false);
    const handler = mockCallHandler({ id: '123', name: 'Test Trip' });

    // Override reflector to return false for skip
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const result$ = interceptor.intercept(ctx, handler);
    const result = await firstValueFrom(result$);

    expect(result).toEqual({
      data: { id: '123', name: 'Test Trip' },
      meta: { disclaimer: EXPECTED_DISCLAIMER },
    });
  });

  it('sets X-WW-Disclaimer header on response', async () => {
    const headerFn = vi.fn();
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ header: headerFn }),
      }),
    } as unknown as ExecutionContext;
    const handler = mockCallHandler({ id: '123' });

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    await firstValueFrom(interceptor.intercept(ctx, handler));

    expect(headerFn).toHaveBeenCalledWith('X-WW-Disclaimer', EXPECTED_DISCLAIMER);
  });

  it('passes through string responses without wrapping', async () => {
    const ctx = mockContext(false);
    const handler = mockCallHandler('ok');

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const result$ = interceptor.intercept(ctx, handler);
    const result = await firstValueFrom(result$);

    expect(result).toBe('ok');
    expect(typeof result).toBe('string');
  });

  it('@SkipEnvelope() handler bypasses envelope', async () => {
    const ctx = mockContext(false);
    const handler = mockCallHandler({ raw: 'data' });

    // Simulate @SkipEnvelope() being on the handler
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result$ = interceptor.intercept(ctx, handler);
    const result = await firstValueFrom(result$);

    expect(result).toEqual({ raw: 'data' });
    expect((result as Record<string, unknown>)['meta']).toBeUndefined();
  });

  it('DISCLAIMER constant matches expected text (LEGL-02)', () => {
    expect(DISCLAIMER).toBe(EXPECTED_DISCLAIMER);
    expect(DISCLAIMER).toContain('unofficial');
    expect(DISCLAIMER).toContain('Not affiliated');
    expect(DISCLAIMER).toContain('Walt Disney Company');
  });
});
