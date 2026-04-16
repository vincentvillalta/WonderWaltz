import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Redis from 'ioredis';

// ─── Mock Redis ─────────────────────────────────────────────────────
function createMockRedis() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
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
    ttl: vi.fn().mockImplementation((key: string) => {
      const t = ttls.get(key);
      return Promise.resolve(t !== undefined ? t : -1);
    }),
    expire: vi.fn().mockImplementation((key: string, seconds: number) => {
      ttls.set(key, seconds);
      return Promise.resolve(1);
    }),
    _store: store,
    _ttls: ttls,
  } as unknown as Redis & { _store: Map<string, string>; _ttls: Map<string, number> };
}

// Lazy import — module does not exist yet (RED phase expects import failure or test failure)
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let RateLimitService: typeof import('../../src/plan-generation/rate-limit.service.js').RateLimitService;

beforeEach(async () => {
  const mod = await import('../../src/plan-generation/rate-limit.service.js');
  RateLimitService = mod.RateLimitService;
});

describe('RateLimitService — rethink daily cap (LLM-08)', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createMockRedis();
  });

  it('allows 15 rethinks for unlocked user', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 1; i <= 15; i++) {
      const result = await svc.checkRethinkLimit('user-1', true);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(15 - i);
    }
  });

  it('blocks the 16th rethink for unlocked user', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 0; i < 15; i++) {
      await svc.checkRethinkLimit('user-1', true);
    }
    const result = await svc.checkRethinkLimit('user-1', true);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows 5 rethinks for free-tier user', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 1; i <= 5; i++) {
      const result = await svc.checkRethinkLimit('user-2', false);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }
  });

  it('blocks the 6th rethink for free-tier user', async () => {
    const svc = new RateLimitService(redis as never);
    for (let i = 0; i < 5; i++) {
      await svc.checkRethinkLimit('user-2', false);
    }
    const result = await svc.checkRethinkLimit('user-2', false);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('remaining field is correct across the sequence', async () => {
    const svc = new RateLimitService(redis as never);
    const r1 = await svc.checkRethinkLimit('user-1', true);
    expect(r1.remaining).toBe(14);
    const r2 = await svc.checkRethinkLimit('user-1', true);
    expect(r2.remaining).toBe(13);
  });

  it('sets TTL to 86400 on first call via expire', async () => {
    const svc = new RateLimitService(redis as never);
    // First call — TTL returns -1 (no expiry yet), so service sets EXPIRE

    redis.ttl = vi.fn().mockResolvedValue(-1) as typeof redis.ttl;
    await svc.checkRethinkLimit('user-1', true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringMatching(/^rethink:user-1:\d{4}-\d{2}-\d{2}$/),
      86400,
    );
  });

  it('does NOT re-set TTL on subsequent calls', async () => {
    const svc = new RateLimitService(redis as never);
    // First call — TTL is -1

    redis.ttl = vi.fn().mockResolvedValueOnce(-1).mockResolvedValue(85000) as typeof redis.ttl;
    await svc.checkRethinkLimit('user-1', true);
    await svc.checkRethinkLimit('user-1', true);
    // expire called only once (for the first call)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redis.expire).toHaveBeenCalledTimes(1);
  });

  it('resets counter on a new UTC day', async () => {
    const svc = new RateLimitService(redis as never);

    // Simulate 5 calls on day 1
    for (let i = 0; i < 5; i++) {
      await svc.checkRethinkLimit('user-1', true);
    }

    // Simulate date change — new key = no stored value
    // Reset the mock Redis store to simulate a new day's key
    redis._store.clear();
    redis._ttls.clear();

    const result = await svc.checkRethinkLimit('user-1', true);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14);
  });

  it('returns resetAt as a future Date', async () => {
    const svc = new RateLimitService(redis as never);
    const result = await svc.checkRethinkLimit('user-1', true);
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});
