// Pure TypeScript solver — zero NestJS dependencies, zero I/O side effects.
// Type contract + deterministic hash are complete (plan 03-04).
// The `solve()` implementation lands across plans 03-07..03-10.

export * from './types.js';
export * from './hash.js';
export * from './walkingGraph.js';
export * from './filter.js';
export * from './score.js';
export * from './construct.js';

import type { SolverInput, DayPlan } from './types.js';

/**
 * Runs the constructive + local-search pipeline. Throws until 03-07..03-10
 * land the implementation. Signature is frozen: downstream plans import
 * this symbol directly.
 */
export function solve(_input: SolverInput): DayPlan[] {
  throw new Error('Solver not yet implemented — lands in plans 03-07..03-10');
}
