import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { RateLimitService } from '../../src/plan-generation/rate-limit.service.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let RateLimitGuard: typeof import('../../src/plan-generation/rate-limit.guard.js').RateLimitGuard;

beforeEach(async () => {
  const mod = await import('../../src/plan-generation/rate-limit.guard.js');
  RateLimitGuard = mod.RateLimitGuard;
});

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockReflector(returnValue: string | undefined): Reflector {
  return {
    get: vi.fn().mockReturnValue(returnValue),
    getAll: vi.fn(),
    getAllAndMerge: vi.fn(),
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;
}

function createMockRateLimitService(): RateLimitService {
  let rethinkCount = 0;
  let freeTierCount = 0;
  return {
    checkRethinkLimit: vi.fn().mockImplementation((_userId: string, _isUnlocked: boolean) => {
      rethinkCount++;
      const cap = _isUnlocked ? 15 : 5;
      if (rethinkCount > cap) {
        return Promise.resolve({ allowed: false, remaining: 0, resetAt: new Date() });
      }
      return Promise.resolve({ allowed: true, remaining: cap - rethinkCount, resetAt: new Date() });
    }),
    checkFreeTierLifetime: vi.fn().mockImplementation(() => {
      freeTierCount++;
      if (freeTierCount > 3) {
        return Promise.resolve({ allowed: false, remaining: 0 });
      }
      return Promise.resolve({ allowed: true, remaining: 3 - freeTierCount });
    }),
    _resetCounts: () => {
      rethinkCount = 0;
      freeTierCount = 0;
    },
  } as unknown as RateLimitService & { _resetCounts: () => void };
}

function createMockContext(userId?: string, isUnlocked = false): ExecutionContext {
  const request = {
    user: userId ? { id: userId, isUnlocked } : undefined,
    headers: userId ? { 'x-anon-user-id': userId } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  let rateLimitService: ReturnType<typeof createMockRateLimitService>;

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitService = createMockRateLimitService();
  });

  describe('rethink rate limit', () => {
    it('allows 15 rethinks for unlocked user', async () => {
      const reflector = createMockReflector('rethink');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      for (let i = 0; i < 15; i++) {
        const ctx = createMockContext('user-1', true);
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
      }
    });

    it('throws 429 on 16th rethink for unlocked user', async () => {
      const reflector = createMockReflector('rethink');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      // Exhaust 15 calls
      for (let i = 0; i < 15; i++) {
        const ctx = createMockContext('user-1', true);
        await guard.canActivate(ctx);
      }

      // 16th should throw 429
      const ctx = createMockContext('user-1', true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(ctx);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(429);
      }
    });
  });

  describe('free-tier lifetime limit', () => {
    it('allows 3 plan generations', async () => {
      const reflector = createMockReflector('free-tier-lifetime');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      for (let i = 0; i < 3; i++) {
        const ctx = createMockContext('anon-1');
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
      }
    });

    it('throws 403 on 4th plan generation', async () => {
      const reflector = createMockReflector('free-tier-lifetime');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      // Exhaust 3 calls
      for (let i = 0; i < 3; i++) {
        const ctx = createMockContext('anon-1');
        await guard.canActivate(ctx);
      }

      // 4th should throw 403
      const ctx = createMockContext('anon-1');
      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(ctx);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(403);
      }
    });
  });

  describe('missing userId', () => {
    it('throws 401 when no user identity is available', async () => {
      const reflector = createMockReflector('rethink');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      const ctx = createMockContext(undefined);
      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(ctx);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(401);
      }
    });
  });

  describe('no rate limit metadata', () => {
    it('allows request when no @RateLimit decorator is present', async () => {
      const reflector = createMockReflector(undefined);
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      const ctx = createMockContext('user-1');
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('defaults to free-tier when isUnlocked unknown', () => {
    it('uses free-tier cap (5/day) when request.user has no isUnlocked flag', async () => {
      const reflector = createMockReflector('rethink');
      const guard = new RateLimitGuard(reflector, rateLimitService as never);

      // User exists but isUnlocked defaults to false
      const ctx = createMockContext('user-1', false);
      await guard.canActivate(ctx);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(rateLimitService.checkRethinkLimit).toHaveBeenCalledWith('user-1', false);
    });
  });
});
