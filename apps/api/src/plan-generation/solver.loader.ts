import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { pathToFileURL } from 'url';

/**
 * SolverLoader — DI-injectable loader for the ESM solver package.
 *
 * Crosses the ESM/CJS boundary via dynamic import (same pattern as
 * WalkingGraphLoader and SharedInfraModule DB_TOKEN factory).
 * Caches the loaded module to avoid re-importing on every call.
 */

// Mirror types from solver — ESM boundary prevents import type
interface SolverInput {
  [key: string]: unknown;
}

interface DayPlan {
  dayIndex: number;
  date: string;
  parkId: string;
  items: unknown[];
  warnings: string[];
}

export interface SolverModule {
  solve: (input: SolverInput) => DayPlan[];
  computeSolverInputHash: (input: SolverInput) => string;
}

@Injectable()
export class SolverLoader {
  private readonly logger = new Logger(SolverLoader.name);
  private cached?: SolverModule;

  async load(): Promise<SolverModule> {
    if (this.cached) return this.cached;

    const require = createRequire(__filename);
    const pkgJsonPath = require.resolve('@wonderwaltz/solver/package.json');
    const solverPath = resolve(dirname(pkgJsonPath), 'dist/src/index.js');

    this.logger.log(`Loading solver from ${solverPath}`);
    const mod = (await import(pathToFileURL(solverPath).href)) as SolverModule;
    this.cached = mod;
    return mod;
  }
}
