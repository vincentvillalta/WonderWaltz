import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';

/** Shape of the weather forecast returned to API clients */
export interface WeatherDto {
  high_f: number;
  low_f: number;
  condition: string;
  precipitation_pct: number;
  humidity_pct: number;
  uv_index: number;
}

/** Shape of a single day entry from OpenWeather One Call 3.0 daily[] */
interface OpenWeatherDailyItem {
  dt: number;
  temp: { max: number; min: number };
  humidity: number;
  uvi: number;
  pop: number;
  weather: Array<{ id: number; main: string; description: string }>;
}

/** Subset of the One Call 3.0 response we care about */
interface OneCallResponse {
  daily: OpenWeatherDailyItem[];
}

/** Orlando, FL coordinates */
const ORLANDO_LAT = 28.5421;
const ORLANDO_LON = -81.3723;

/** Redis TTL for cached weather (6 hours) */
const CACHE_TTL_SECONDS = 21_600;

/**
 * WeatherService — on-demand cache-aside weather forecasts.
 *
 * Implements DATA-08: fetch from OpenWeather One Call 3.0, cache per date in
 * Redis with a 6-hour TTL, return null beyond the 8-day horizon or on any
 * failure (best-effort, no retry, no circuit breaker).
 *
 * Optimization: on a cache miss, fetches the full 8-day forecast and caches
 * ALL 8 days simultaneously (1 API call → 8 Redis keys).
 *
 * Registered in AppModule so HTTP endpoints can inject it.
 */
@Injectable()
export class WeatherService {
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
  ) {}

  /**
   * Returns true when the target date is within the 8-day OpenWeather horizon.
   *
   * "Within horizon" means: today (diffDays=0) through 7 days from now
   * (diffDays=7), giving 8 days total (indices 0–7 in One Call 3.0 daily[]).
   * Past dates and anything ≥ 8 days out return false.
   */
  isWithinHorizon(dateStr: string): boolean {
    // Use UTC midnight for both sides to avoid local-timezone offset skewing
    // the diff. `new Date(dateStr)` where dateStr='YYYY-MM-DD' is already
    // parsed as UTC midnight by the spec.
    const todayUtc = new Date();
    const todayStr = todayUtc.toISOString().split('T')[0]!;
    const todayMidnight = new Date(todayStr + 'T00:00:00Z');
    const target = new Date(dateStr + 'T00:00:00Z');
    const diffDays = (target.getTime() - todayMidnight.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 7;
  }

  /**
   * Returns weather forecast for a specific date, or null if unavailable.
   *
   * Flow:
   * 1. If date is beyond the 8-day horizon, return null immediately.
   * 2. Check Redis cache — return cached value on hit.
   * 3. On cache miss, fetch One Call API and cache all 8 days.
   * 4. Any error at any step → return null silently (best-effort).
   */
  async getForecast(dateStr: string): Promise<WeatherDto | null> {
    if (!this.isWithinHorizon(dateStr)) {
      return null;
    }

    try {
      const cached = await this.redis.get(`weather:orlando:${dateStr}`);
      if (cached) {
        return JSON.parse(cached) as WeatherDto;
      }

      return await this.fetchAndCacheAll(dateStr);
    } catch {
      return null;
    }
  }

  /**
   * Fetches the full 8-day forecast from OpenWeather One Call 3.0 and caches
   * every day simultaneously. Returns the WeatherDto for the requested date.
   *
   * Using units=imperial to get Fahrenheit directly — no Kelvin conversion.
   * Excluding minutely, hourly, and alerts to minimize response payload.
   */
  private async fetchAndCacheAll(requestedDate: string): Promise<WeatherDto | null> {
    const apiKey = this.config.get<string>('OPENWEATHER_API_KEY') ?? '';
    const url =
      `https://api.openweathermap.org/data/3.0/onecall` +
      `?lat=${ORLANDO_LAT}&lon=${ORLANDO_LON}` +
      `&appid=${apiKey}` +
      `&units=imperial` +
      `&exclude=minutely,hourly,alerts`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OneCallResponse;
    const daily = data.daily.slice(0, 8); // Never exceed 8-day horizon

    let result: WeatherDto | null = null;

    for (const day of daily) {
      const date = new Date(day.dt * 1000).toISOString().split('T')[0]!;
      const dto: WeatherDto = {
        high_f: day.temp.max,
        low_f: day.temp.min,
        condition: day.weather[0]?.main ?? '',
        precipitation_pct: Math.round(day.pop * 100),
        humidity_pct: day.humidity,
        uv_index: Math.round(day.uvi),
      };

      await this.redis.set(`weather:orlando:${date}`, JSON.stringify(dto), 'EX', CACHE_TTL_SECONDS);

      if (date === requestedDate) {
        result = dto;
      }
    }

    return result;
  }
}
