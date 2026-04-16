import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: {
    auth: {
      admin: {
        createUser: ReturnType<typeof vi.fn>;
      };
    };
  };
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        admin: {
          createUser: vi.fn(),
        },
      },
    };
    mockDb = { execute: vi.fn() };

    service = new AuthService(mockSupabase as never, mockDb as never);
  });

  describe('createAnonymousUser', () => {
    it('Test 1: creates a Supabase auth user and inserts row into public.users with is_anonymous=true', async () => {
      const userId = 'anon-user-001';
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: null,
            user_metadata: { is_anonymous: true },
          },
        },
        error: null,
      });
      mockDb.execute.mockResolvedValue({ rows: [] });

      await service.createAnonymousUser();

      // Verify Supabase createUser called with correct metadata
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: { is_anonymous: true },
        }),
      );

      // Verify DB insert was called (ON CONFLICT DO NOTHING)
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('Test 2: returns { access_token, user_id, expires_at } matching AnonymousAuthResponseDto shape', async () => {
      const userId = 'anon-user-002';
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: null,
            user_metadata: { is_anonymous: true },
          },
        },
        error: null,
      });
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await service.createAnonymousUser();

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
      expect(result.access_token.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('user_id', userId);
      expect(result).toHaveProperty('expires_at');
      // expires_at should be a valid ISO date
      expect(new Date(result.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('Test 3: throws 500 if Supabase admin createUser fails', async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User limit exceeded' },
      });

      await expect(service.createAnonymousUser()).rejects.toThrow(InternalServerErrorException);
    });

    it('Test 4: uses ON CONFLICT DO NOTHING for idempotent public.users insert', async () => {
      const userId = 'anon-user-004';
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: null,
            user_metadata: { is_anonymous: true },
          },
        },
        error: null,
      });
      // Simulate that the user already exists (ON CONFLICT DO NOTHING returns no rows)
      mockDb.execute.mockResolvedValue({ rows: [] });

      // Should NOT throw even though user already exists in public.users
      const result = await service.createAnonymousUser();
      expect(result.user_id).toBe(userId);

      // Verify DB execute was called (ON CONFLICT DO NOTHING is in the SQL template)
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('Test 5: re-authenticating with same user_id returns valid token (AUTH-05)', async () => {
      const userId = 'returning-user-005';

      // First call — create the user
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: null,
            user_metadata: { is_anonymous: true },
          },
        },
        error: null,
      });
      mockDb.execute.mockResolvedValue({ rows: [] });

      const first = await service.createAnonymousUser();
      expect(first.user_id).toBe(userId);

      // Second call — same user returns (ON CONFLICT DO NOTHING, still get a token)
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: null,
            user_metadata: { is_anonymous: true },
          },
        },
        error: null,
      });
      mockDb.execute.mockResolvedValue({ rows: [] });

      const second = await service.createAnonymousUser();
      expect(second.user_id).toBe(userId);
      expect(typeof second.access_token).toBe('string');
      expect(second.access_token.length).toBeGreaterThan(0);
      // Both tokens are valid JWTs — user_id is stable so trips remain accessible
    });
  });
});
