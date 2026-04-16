import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AnonymousTripLimitGuard } from './anonymous-trip-limit.guard.js';

interface MockUsersService {
  getTripsCount: ReturnType<typeof vi.fn>;
  getUserProfile: ReturnType<typeof vi.fn>;
}

function createMockContext(user?: { id: string; isAnonymous: boolean }): ExecutionContext {
  const request: Record<string, unknown> = {};
  if (user) {
    request['user'] = user;
  }

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createMockUsersService(tripsCount: number): MockUsersService {
  return {
    getTripsCount: vi.fn().mockResolvedValue(tripsCount),
    getUserProfile: vi.fn(),
  };
}

describe('AnonymousTripLimitGuard', () => {
  let guard: AnonymousTripLimitGuard;
  let mockService: MockUsersService;

  describe('Test 1: passes when user is not anonymous', () => {
    beforeEach(() => {
      mockService = createMockUsersService(5);
      guard = new AnonymousTripLimitGuard(mockService as never);
    });

    it('allows registered users regardless of trip count', async () => {
      const context = createMockContext({
        id: 'user-1',
        isAnonymous: false,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should NOT call getTripsCount for registered users
      expect(mockService.getTripsCount).not.toHaveBeenCalled();
    });
  });

  describe('Test 2: passes when anonymous user has 0 trips', () => {
    beforeEach(() => {
      mockService = createMockUsersService(0);
      guard = new AnonymousTripLimitGuard(mockService as never);
    });

    it('allows first trip creation for anonymous user', async () => {
      const context = createMockContext({
        id: 'anon-1',
        isAnonymous: true,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockService.getTripsCount).toHaveBeenCalledWith('anon-1');
    });
  });

  describe('Test 3: throws 403 when anonymous user already has 1+ trips', () => {
    beforeEach(() => {
      mockService = createMockUsersService(1);
      guard = new AnonymousTripLimitGuard(mockService as never);
    });

    it('blocks second trip creation with upgrade_required', async () => {
      const context = createMockContext({
        id: 'anon-1',
        isAnonymous: true,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      try {
        await guard.canActivate(context);
      } catch (e) {
        const err = e as ForbiddenException;
        const response = err.getResponse() as Record<string, unknown>;
        expect(response['error']).toBe('upgrade_required');
        expect(response['message']).toBe(
          'Anonymous users can create one trip. Upgrade to create more.',
        );
      }
    });
  });

  describe('Test 4: reads trip count from UsersService.getTripsCount', () => {
    beforeEach(() => {
      mockService = createMockUsersService(3);
      guard = new AnonymousTripLimitGuard(mockService as never);
    });

    it('calls getTripsCount with the correct user ID', async () => {
      const context = createMockContext({
        id: 'anon-xyz',
        isAnonymous: true,
      });

      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw for 3 trips
      }

      expect(mockService.getTripsCount).toHaveBeenCalledWith('anon-xyz');
    });
  });
});
