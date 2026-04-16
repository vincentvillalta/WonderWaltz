import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AnonymousPurchaseGuard } from './anonymous-purchase.guard.js';

function createMockContext(user?: { isAnonymous: boolean }): ExecutionContext {
  const request: Record<string, unknown> = {};
  if (user) {
    request['user'] = user;
  }

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AnonymousPurchaseGuard', () => {
  let guard: AnonymousPurchaseGuard;

  beforeEach(() => {
    guard = new AnonymousPurchaseGuard();
  });

  it('Test 1: passes when request.user.isAnonymous is false', () => {
    const context = createMockContext({ isAnonymous: false });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('Test 2: throws 403 with upgrade_required when request.user.isAnonymous is true', () => {
    const context = createMockContext({ isAnonymous: true });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

    try {
      guard.canActivate(context);
    } catch (e) {
      const err = e as ForbiddenException;
      const response = err.getResponse() as Record<string, unknown>;
      expect(response['error']).toBe('upgrade_required');
      expect(response['message']).toBe('Upgrade to a registered account before purchasing');
    }
  });

  it('Test 3: throws 401 when request.user is not set', () => {
    const context = createMockContext(); // no user

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
