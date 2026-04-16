import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Redis from 'ioredis';

// ─── Mock Redis ─────────────────────────────────────────────────────
function createMockRedis() {
  const store = new Map<string, string>();
  return {
    incr: vi.fn().mockImplementation((key: string) => {
      const cur = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(cur));
      return Promise.resolve(cur);
    }),
    decr: vi.fn().mockImplementation((key: string) => {
      const cur = Math.max(0, Number(store.get(key) ?? '0') - 1);
      store.set(key, String(cur));
      return Promise.resolve(cur);
    }),
    ttl: vi.fn().mockResolvedValue(-1),
    expire: vi.fn().mockResolvedValue(1),
    _store: store,
  } as unknown as Redis & { _store: Map<string, string> };
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let RateLimitService: typeof import('../../src/plan-generation/rate-limit.service.js').RateLimitService;

beforeEach(async () => {
  const mod = await import('../../src/plan-generation/rate-limit.service.js');
  RateLimitService = mod.RateLimitService;
});

describe('RateLimitService — free-tier lifetime cap (PLAN-05)', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createMockRedis();
  });

  it('allows 3 plan generations for anonymous user', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 1; i <= 3; i++) {
      const result = await svc.checkFreeTierLifetime('anon-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3 - i);
    }
  });

  it('blocks the 4th plan generation', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 0; i < 3; i++) {
      await svc.checkFreeTierLifetime('anon-1');
    }
    const result = await svc.checkFreeTierLifetime('anon-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('does NOT set expiry on the key (permanent counter)', async () => {
    const svc = new RateLimitService(redis as never);
    await svc.checkFreeTierLifetime('anon-1');
    // expire should NOT be called for lifetime keys
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('remaining field decrements correctly', async () => {
    const svc = new RateLimitService(redis as never);
    const r1 = await svc.checkFreeTierLifetime('anon-1');
    expect(r1.remaining).toBe(2);
    const r2 = await svc.checkFreeTierLifetime('anon-1');
    expect(r2.remaining).toBe(1);
    const r3 = await svc.checkFreeTierLifetime('anon-1');
    expect(r3.remaining).toBe(0);
  });

  it('separate users have independent counters', async () => {
    const svc = new RateLimitService(redis as never);
    // User A uses 3
    for (let i = 0; i < 3; i++) {
      await svc.checkFreeTierLifetime('anon-a');
    }
    // User B still has 3
    const result = await svc.checkFreeTierLifetime('anon-b');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
