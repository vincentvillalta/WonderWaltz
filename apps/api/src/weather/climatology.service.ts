import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { WeatherDto } from '../shared/dto/weather.dto.js';

/**
 * ClimatologyService — NOAA monthly normals for Orlando, loaded from
 * packages/content/wdw/orlando-climatology.json at boot.
 *
 * Used as the weather fallback when a trip is beyond the Open-Meteo /
 * OpenWeather live-forecast horizon (≥ 8 days out). Returns a climatology-
 * shaped WeatherDto so downstream code (packing list, LLM narrative) can
 * treat it uniformly. The `condition` string is deliberately humble —
 * "average August" rather than "sunny" — so it's obvious this is a
 * long-term mean, not a real forecast.
 */

interface MonthlyEntry {
  highF: number;
  lowF: number;
  precipitationProbability: number; // 0..1
  uvIndex: number;
  condition: string;
}

interface ClimatologyFile {
  monthlyByMonth: Record<string, MonthlyEntry>;
}

@Injectable()
export class ClimatologyService {
  private readonly log = new Logger(ClimatologyService.name);
  private readonly file: ClimatologyFile | null;

  constructor() {
    this.file = this.load();
    if (this.file) {
      this.log.log(`climatology loaded: ${Object.keys(this.file.monthlyByMonth).length} months`);
    }
  }

  /**
   * Returns a WeatherDto-shaped climatology value for the given date
   * (YYYY-MM-DD). Null only if the JSON failed to load — callers should
   * treat null the same way they treat a missing live forecast.
   */
  lookup(dateStr: string): WeatherDto | null {
    if (!this.file) return null;
    const month = parseInt(dateStr.slice(5, 7), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) return null;
    const entry = this.file.monthlyByMonth[String(month)];
    if (!entry) return null;
    return {
      high_f: entry.highF,
      low_f: entry.lowF,
      condition: entry.condition,
      // Normalize precipitation to the 0..100 scale WeatherDto uses.
      precipitation_pct: Math.round(entry.precipitationProbability * 100),
      // NOAA normals don't publish a humidity column — leave it at a sane
      // Orlando average (75%). Packing-list is the only consumer.
      humidity_pct: 75,
      uv_index: entry.uvIndex,
    };
  }

  private load(): ClimatologyFile | null {
    const path = this.resolveFilePath();
    if (!path) {
      this.log.warn('orlando-climatology.json not found; long-range trips will get null weather');
      return null;
    }
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as ClimatologyFile;
    } catch (err) {
      this.log.error(`orlando-climatology.json unreadable: ${(err as Error).message}`);
      return null;
    }
  }

  /** Walk up from __dirname until we find the content package. Same pattern
      as WaitBaselinesService. */
  private resolveFilePath(): string | null {
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
      const candidate = resolve(dir, 'packages', 'content', 'wdw', 'orlando-climatology.json');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }
}
