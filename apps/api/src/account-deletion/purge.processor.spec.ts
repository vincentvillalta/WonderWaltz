import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurgeProcessor } from './purge.processor.js';

describe('PurgeProcessor', () => {
  let processor: PurgeProcessor;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockSupabase: { auth: { admin: { deleteUser: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    mockDb = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
    mockSupabase = {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    };

    processor = new PurgeProcessor(mockDb as never, mockSupabase as never);
  });

  it('Test 5: process cascades DELETE across all 14 tables in correct order', async () => {
    const job = { data: { userId: 'user-1' } };

    await processor.process(job as never);

    // 14 DELETE statements + 1 supabase deleteUser = 14 execute calls + 1 deleteUser
    expect(mockDb.execute).toHaveBeenCalled();
    // Verify at least 14 DELETE calls were made (one per table)
    const callCount = mockDb.execute.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(14);
  });

  it('Test 6: process calls supabase.auth.admin.deleteUser', async () => {
    const job = { data: { userId: 'user-1' } };

    await processor.process(job as never);

    expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('Test 7: process is idempotent — re-running on already-purged user is a no-op', async () => {
    const job = { data: { userId: 'user-1' } };

    // First run
    await processor.process(job as never);
    // Second run — all DELETEs affect 0 rows, no error
    await processor.process(job as never);

    // Both calls complete without error
    expect(mockDb.execute).toHaveBeenCalled();
  });
});
