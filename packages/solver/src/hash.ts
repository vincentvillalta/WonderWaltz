import type { SolverInput } from './types.js';

/**
 * Placeholder — real implementation lands in the GREEN commit.
 * Kept exported so the test file can import both symbols for the RED run.
 */
export function canonicalize(_value: unknown): unknown {
  throw new Error('canonicalize not implemented (RED phase)');
}

export function computeSolverInputHash(_input: SolverInput): string {
  throw new Error('computeSolverInputHash not implemented (RED phase)');
}
