// RLS integration test — implemented in Plan 06 (DB schema + RLS policies)
// Requires: supabase start
import { describe, it } from 'vitest';
describe('RLS policies', () => {
  it.todo('anon key cannot read trips of another user');
  it.todo('anon key cannot read guests of another user');
});
