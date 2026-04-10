// Pure TypeScript solver — zero NestJS dependencies, zero I/O side effects.
// Full implementation in Phase 3 (SOLV-01..13).
// These type stubs allow apps/api to import types without circular deps.

export interface SolverInput {
  tripId: string;
  // Full type definition comes in Phase 3
}

export interface DayPlan {
  dayIndex: number;
  // Full type definition comes in Phase 3
}

export function solve(_input: SolverInput): DayPlan[] {
  throw new Error('Solver not yet implemented — Phase 3');
}
