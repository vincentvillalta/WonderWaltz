import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { ForecastConfidence } from './confidence.js';

/**
 * Static wait-time baselines loaded from
 * `packages/content/wdw/wait-baselines.json` at boot.
 *
 * Replaces the per-attraction DB round-trip that predictWait does when
 * we have no historical data (which is our current reality). The JSON
 * gives us decent per-hour signal for the 12 headliners that drive
 * scoring; everything else falls back to the solver's hash-based
 * baseline.
 *
 * Keyed by attraction external_id in the source file; the consumer
 * passes an {externalId → UUID} resolver so this service doesn't have
 * to query the DB.
 */

interface BucketRange {
  startHour: number;
  endHour: number;
}

interface AttractionBaseline {
  open?: { minutes: number; confidence: ForecastConfidence };
  midday?: { minutes: number; confidence: ForecastConfidence };
  afternoon?: { minutes: number; confidence: ForecastConfidence };
  evening?: { minutes: number; confidence: ForecastConfidence };
}

interface BaselinesFile {
  buckets: Record<'open' | 'midday' | 'afternoon' | 'evening', BucketRange>;
  attractions: Record<string, AttractionBaseline>;
}

export interface WaitBaseline {
  minutes: number;
  confidence: ForecastConfidence;
}

@Injectable()
export class WaitBaselinesService {
  private readonly log = new Logger(WaitBaselinesService.name);
  private readonly file: BaselinesFile | null;

  constructor() {
    this.file = this.load();
    if (this.file) {
      this.log.log(
        `wait-baselines loaded: ${Object.keys(this.file.attractions).length} attractions`,
      );
    }
  }

  /**
   * Look up the predicted wait for (externalId, hour). Returns null when
   * no baseline exists for that attraction — the caller should fall
   * through to the solver's hash-based default.
   */
  lookup(externalId: string, hourOfDay: number): WaitBaseline | null {
    if (!this.file) return null;
    const entry = this.file.attractions[externalId];
    if (!entry) return null;
    const bucketName = this.bucketFor(hourOfDay);
    if (!bucketName) return null;
    const slot = entry[bucketName];
    if (!slot) return null;
    return { minutes: slot.minutes, confidence: slot.confidence };
  }

  /** True when the service has data for this attraction in any bucket. */
  has(externalId: string): boolean {
    if (!this.file) return false;
    return Object.prototype.hasOwnProperty.call(this.file.attractions, externalId);
  }

  private bucketFor(hour: number): keyof BaselinesFile['buckets'] | null {
    if (!this.file) return null;
    for (const key of ['open', 'midday', 'afternoon', 'evening'] as const) {
      const range = this.file.buckets[key];
      if (hour >= range.startHour && hour < range.endHour) return key;
    }
    return null;
  }

  private load(): BaselinesFile | null {
    const path = this.resolveFilePath();
    if (!path) {
      this.log.warn('wait-baselines.json not found; every forecast will use fallback');
      return null;
    }
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as BaselinesFile;
    } catch (err) {
      this.log.error(`wait-baselines.json unreadable (${path}): ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Walk up from __dirname looking for packages/content/wdw/wait-baselines.json.
   * Matches the resolveMonorepoRoot pattern in narrative/prompt.ts — the
   * Nest bundle's file layout differs between local tsx, compiled CJS, and
   * the Railway Docker image, so probing is more robust than hard-coded.
   */
  private resolveFilePath(): string | null {
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
      const candidate = resolve(dir, 'packages', 'content', 'wdw', 'wait-baselines.json');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }
}
