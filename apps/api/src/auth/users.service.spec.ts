import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn() };
    service = new UsersService(mockDb as never);
  });

  describe('getUserProfile', () => {
    it('Test 1: returns UserMeDto shape for authenticated user', async () => {
      const userId = 'user-001';
      mockDb.execute.mockResolvedValue({
        rows: [
          {
            id: userId,
            email: 'test@example.com',
            is_anonymous: false,
            created_at: '2026-04-14T10:00:00.000Z',
          },
        ],
      });

      const result = await service.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        is_anonymous: false,
        created_at: '2026-04-14T10:00:00.000Z',
      });
    });

    it('Test 2: returns null for non-existent user', async () => {
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await service.getUserProfile('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('getTripsCount', () => {
    it('Test 3: returns number of non-deleted trips for user', async () => {
      const userId = 'user-002';
      mockDb.execute.mockResolvedValue({
        rows: [{ count: '3' }],
      });

      const result = await service.getTripsCount(userId);

      expect(result).toBe(3);
    });

    it('returns 0 when user has no trips', async () => {
      const userId = 'user-003';
      mockDb.execute.mockResolvedValue({
        rows: [{ count: '0' }],
      });

      const result = await service.getTripsCount(userId);

      expect(result).toBe(0);
    });
  });
});
