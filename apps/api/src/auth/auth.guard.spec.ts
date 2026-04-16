import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SupabaseAuthGuard } from './auth.guard.js';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn> } };
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      auth: { getUser: vi.fn() },
    };
    mockDb = { execute: vi.fn() };

    guard = new SupabaseAuthGuard(mockSupabase as never, mockDb as never);
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const request: Record<string, unknown> = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('Test 1: returns true and attaches user to request when valid token provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { is_anonymous: false },
        },
      },
      error: null,
    });
    mockDb.execute.mockResolvedValue({ rows: [{ deleted_at: null }] });

    const ctx = createMockContext('Bearer valid-token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
  });

  it('Test 2: throws 401 when no Authorization header present', async () => {
    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('Test 3: throws 401 when Bearer token is invalid (supabase.auth.getUser returns error)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const ctx = createMockContext('Bearer bad-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('Test 4: throws 403 when user has non-null deleted_at in public.users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-456',
          email: null,
          user_metadata: { is_anonymous: true },
        },
      },
      error: null,
    });
    mockDb.execute.mockResolvedValue({
      rows: [{ deleted_at: '2026-01-01T00:00:00Z' }],
    });

    const ctx = createMockContext('Bearer valid-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('Test 5: attaches { id, isAnonymous, email } to request.user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-789',
          email: 'anon@test.com',
          user_metadata: { is_anonymous: true },
        },
      },
      error: null,
    });
    mockDb.execute.mockResolvedValue({ rows: [{ deleted_at: null }] });

    const ctx = createMockContext('Bearer valid-token');
    await guard.canActivate(ctx);

    const request: Record<string, unknown> = ctx.switchToHttp().getRequest();
    expect(request['user']).toEqual({
      id: 'user-789',
      isAnonymous: true,
      email: 'anon@test.com',
    });
  });

  it('Test 5b: derives isAnonymous from !email when user_metadata.is_anonymous is not set', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-abc',
          email: null,
          user_metadata: {},
        },
      },
      error: null,
    });
    mockDb.execute.mockResolvedValue({ rows: [{ deleted_at: null }] });

    const ctx = createMockContext('Bearer valid-token');
    await guard.canActivate(ctx);

    const request: Record<string, unknown> = ctx.switchToHttp().getRequest();
    expect(request['user']).toEqual({
      id: 'user-abc',
      isAnonymous: true,
      email: undefined,
    });
  });
});
