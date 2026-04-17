/**
 * Extract rows from a Drizzle db.execute() result.
 * postgres-js driver returns an array directly, while other drivers
 * return { rows: T[] }. This helper handles both shapes.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
