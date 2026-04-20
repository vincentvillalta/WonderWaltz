import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeatherService } from './weather.service.js';

/**
 * Unit tests for WeatherService — cache-aside OpenWeather One Call 3.0.
 *
 * DATA-08a: date > 8-day horizon → null, no API call
 * DATA-08b: cache hit → cached value returned, no API call
 * DATA-08c: cache miss → OpenWeather called; all 8 days cached (EX 21600); correct WeatherDto
 * DATA-08d: fetch throws → null returned, no exception propagated
 *
 * Follows the inline makeRedisClient() pattern from 02-04 SUMMARY to avoid
 * the CJS/ESM compiled-setup import error.
 */

/** Inline mock to avoid importing from compiled tests/setup.js */
function makeRedisClient() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    status: 'ready',
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
}

// Fixture: 8-day One Call 3.0 response with Orlando coords
const FIXTURE = {
  lat: 28.5421,
  lon: -81.3723,
  timezone: 'America/New_York',
  timezone_offset: -14400,
  daily: [
    {
      dt: 1744617600,
      temp: { day: 82, min: 70, max: 88, night: 72 },
      humidity: 65,
      uvi: 9.2,
      pop: 0.35,
      weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
    },
    {
      dt: 1744704000,
      temp: { day: 84, min: 71, max: 90, night: 74 },
      humidity: 60,
      uvi: 9.5,
      pop: 0.2,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    },
    {
      dt: 1744790400,
      temp: { day: 79, min: 68, max: 85, night: 70 },
      humidity: 72,
      uvi: 8.8,
      pop: 0.55,
      weather: [{ id: 501, main: 'Rain', description: 'moderate rain' }],
    },
    {
      dt: 1744876800,
      temp: { day: 83, min: 69, max: 89, night: 73 },
      humidity: 58,
      uvi: 10.1,
      pop: 0.15,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    },
    {
      dt: 1744963200,
      temp: { day: 85, min: 72, max: 91, night: 76 },
      humidity: 55,
      uvi: 9.8,
      pop: 0.1,
      weather: [{ id: 801, main: 'Clouds', description: 'few clouds' }],
    },
    {
      dt: 1745049600,
      temp: { day: 80, min: 67, max: 86, night: 69 },
      humidity: 70,
      uvi: 8.5,
      pop: 0.45,
      weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
    },
    {
      dt: 1745136000,
      temp: { day: 77, min: 65, max: 83, night: 67 },
      humidity: 68,
      uvi: 7.9,
      pop: 0.3,
      weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds' }],
    },
    {
      dt: 1745222400,
      temp: { day: 86, min: 73, max: 92, night: 75 },
      humidity: 52,
      uvi: 10.3,
      pop: 0.05,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    },
  ],
};

/** Build a date string N days from today using UTC date to avoid timezone skew */
function dateFromNow(offsetDays: number): string {
  const now = new Date();
  // Use UTC date components to match the service's UTC-based horizon check
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDay = now.getUTCDate();
  const d = new Date(Date.UTC(utcYear, utcMonth, utcDay + offsetDays));
  return d.toISOString().split('T')[0]!;
}

/** Build a fixture whose daily[0].dt maps to the given dateStr */
function fixtureForDate(dateStr: string) {
  const base = new Date(dateStr + 'T00:00:00Z').getTime() / 1000;
  return {
    ...FIXTURE,
    daily: FIXTURE.daily.map((day, i) => ({
      ...day,
      dt: base + i * 86400,
    })),
  };
}

describe('WeatherService', () => {
  let service: WeatherService;
  let mockRedis: ReturnType<typeof makeRedisClient>;
  let mockConfig: { get: ReturnType<typeof vi.fn> };
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRedis = makeRedisClient();
    mockConfig = { get: vi.fn().mockReturnValue('test-api-key') };

    // Stub climatology that always returns null — keeps prior test
    // semantics (null for beyond-horizon / API-error cases) intact.
    const mockClimatology = { lookup: vi.fn().mockReturnValue(null) };
    service = new WeatherService(mockConfig as never, mockRedis as never, mockClimatology as never);

    // Spy on globalThis.fetch
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // DATA-08a: beyond 8-day horizon → null, no API call
  // ---------------------------------------------------------------------------

  describe('DATA-08a: beyond 8-day horizon', () => {
    it('returns null for a date 9 days from today', async () => {
      const dateStr = dateFromNow(9);
      const result = await service.getForecast(dateStr);
      expect(result).toBeNull();
    });

    it('returns null for a date far in the future', async () => {
      const result = await service.getForecast('2099-01-01');
      expect(result).toBeNull();
    });

    it('does NOT call fetch when beyond horizon', async () => {
      const dateStr = dateFromNow(9);
      await service.getForecast(dateStr);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does NOT call redis.get when beyond horizon', async () => {
      const dateStr = dateFromNow(9);
      await service.getForecast(dateStr);
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('returns null for a date in the past', async () => {
      const result = await service.getForecast('2020-01-01');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-08b: cache hit → returns cached value, no API call
  // ---------------------------------------------------------------------------

  describe('DATA-08b: cache hit', () => {
    it('returns the cached WeatherDto without calling fetch', async () => {
      const dateStr = dateFromNow(1);
      const cached = {
        high_f: 88,
        low_f: 70,
        condition: 'Rain',
        precipitation_pct: 35,
        humidity_pct: 65,
        uv_index: 9,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.getForecast(dateStr);

      expect(result).toEqual(cached);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('checks the correct redis key weather:orlando:{dateStr}', async () => {
      const dateStr = dateFromNow(2);
      mockRedis.get.mockResolvedValueOnce(null); // No cache — just verify key called
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixtureForDate(dateStr)),
      });

      await service.getForecast(dateStr);

      expect(mockRedis.get).toHaveBeenCalledWith(`weather:orlando:${dateStr}`);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-08c: cache miss → fetch + cache all 8 days + return correct entry
  // ---------------------------------------------------------------------------

  describe('DATA-08c: cache miss — fetch and cache all 8 days', () => {
    it('calls the OpenWeather One Call API on cache miss', async () => {
      const dateStr = dateFromNow(0);
      mockRedis.get.mockResolvedValueOnce(null);
      const fixture = fixtureForDate(dateStr);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixture),
      });

      await service.getForecast(dateStr);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = (fetchSpy.mock.calls[0] as [string])[0];
      expect(url).toContain('api.openweathermap.org/data/3.0/onecall');
      expect(url).toContain('units=imperial');
      expect(url).toContain('lat=28.5421');
      expect(url).toContain('lon=-81.3723');
    });

    it('calls redis.set for all 8 days with EX 21600 on cache miss', async () => {
      const dateStr = dateFromNow(0);
      mockRedis.get.mockResolvedValueOnce(null);
      const fixture = fixtureForDate(dateStr);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixture),
      });

      await service.getForecast(dateStr);

      expect(mockRedis.set).toHaveBeenCalledTimes(8);
      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      for (const [, , exFlag, ttl] of setCalls) {
        expect(exFlag).toBe('EX');
        expect(ttl).toBe(21600);
      }
    });

    it('returns a WeatherDto with the correct 6-field shape', async () => {
      const dateStr = dateFromNow(0);
      mockRedis.get.mockResolvedValueOnce(null);
      const fixture = fixtureForDate(dateStr);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixture),
      });

      const result = await service.getForecast(dateStr);

      expect(result).not.toBeNull();
      // Verify each field exists and has the correct type
      expect(typeof result?.high_f).toBe('number');
      expect(typeof result?.low_f).toBe('number');
      expect(typeof result?.condition).toBe('string');
      expect(typeof result?.precipitation_pct).toBe('number');
      expect(typeof result?.humidity_pct).toBe('number');
      expect(typeof result?.uv_index).toBe('number');
    });

    it('maps OpenWeather fields correctly (day 0 of fixture)', async () => {
      const dateStr = dateFromNow(0);
      mockRedis.get.mockResolvedValueOnce(null);
      const fixture = fixtureForDate(dateStr);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixture),
      });

      const result = await service.getForecast(dateStr);

      // Day 0 from fixture: max=88, min=70, condition=Rain, pop=0.35→35, humidity=65, uvi=9.2→9
      expect(result).toEqual({
        high_f: 88,
        low_f: 70,
        condition: 'Rain',
        precipitation_pct: 35,
        humidity_pct: 65,
        uv_index: 9,
      });
    });

    it('caches Redis keys for all 8 days (weather:orlando:{date})', async () => {
      const dateStr = dateFromNow(0);
      mockRedis.get.mockResolvedValueOnce(null);
      const fixture = fixtureForDate(dateStr);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(fixture),
      });

      await service.getForecast(dateStr);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const keys = setCalls.map(([key]) => key);
      // All keys must start with 'weather:orlando:'
      for (const key of keys) {
        expect(key).toMatch(/^weather:orlando:\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-08d: API failure → null, no exception propagated
  // ---------------------------------------------------------------------------

  describe('DATA-08d: API failure returns null', () => {
    it('returns null when fetch throws a network error', async () => {
      const dateStr = dateFromNow(1);
      mockRedis.get.mockResolvedValueOnce(null);
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getForecast(dateStr);
      expect(result).toBeNull();
    });

    it('returns null when fetch response is not ok', async () => {
      const dateStr = dateFromNow(1);
      mockRedis.get.mockResolvedValueOnce(null);
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await service.getForecast(dateStr);
      expect(result).toBeNull();
    });

    it('returns null when JSON parse fails', async () => {
      const dateStr = dateFromNow(1);
      mockRedis.get.mockResolvedValueOnce(null);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      const result = await service.getForecast(dateStr);
      expect(result).toBeNull();
    });

    it('never throws from getForecast — always returns T | null', async () => {
      const dateStr = dateFromNow(1);
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.getForecast(dateStr)).resolves.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isWithinHorizon: boundary checks
  // ---------------------------------------------------------------------------

  describe('isWithinHorizon', () => {
    it('returns true for today (diffDays=0)', () => {
      expect(service.isWithinHorizon(dateFromNow(0))).toBe(true);
    });

    it('returns true for 7 days out (diffDays=7)', () => {
      expect(service.isWithinHorizon(dateFromNow(7))).toBe(true);
    });

    it('returns false for 8 days out (diffDays=8)', () => {
      expect(service.isWithinHorizon(dateFromNow(8))).toBe(false);
    });

    it('returns false for yesterday (diffDays=-1)', () => {
      // Past dates are outside the horizon
      expect(service.isWithinHorizon(dateFromNow(-1))).toBe(false);
    });
  });
});
