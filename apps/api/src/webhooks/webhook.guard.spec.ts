import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { WebhookAuthGuard } from './webhook.guard.js';

describe('WebhookAuthGuard', () => {
  let guard: WebhookAuthGuard;
  const WEBHOOK_KEY = 'test-secret-key-123';

  beforeEach(() => {
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTH_KEY', WEBHOOK_KEY);
    guard = new WebhookAuthGuard();
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const request: Record<string, unknown> = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('Test 6: passes when Authorization header matches REVENUECAT_WEBHOOK_AUTH_KEY', () => {
    const ctx = createMockContext(`Bearer ${WEBHOOK_KEY}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Test 7: throws 401 when Authorization header is missing', () => {
    const ctx = createMockContext();
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('Test 7b: throws 401 when Authorization header has wrong value', () => {
    const ctx = createMockContext('Bearer wrong-key');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('Test 7c: throws 401 when Authorization header is not Bearer format', () => {
    const ctx = createMockContext(`Basic ${WEBHOOK_KEY}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
