import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service.js';

/**
 * Metadata key for the @RateLimit() decorator.
 * Value: 'rethink' | 'free-tier-lifetime'
 */
export const RATE_LIMIT_KEY = 'rate_limit_type';

/**
 * Decorator to attach rate-limit metadata to a controller method.
 *
 * Usage:
 *   @RateLimit('rethink')
 *   @RateLimit('free-tier-lifetime')
 */
export const RateLimit = (type: 'rethink' | 'free-tier-lifetime') =>
  SetMetadata(RATE_LIMIT_KEY, type);

/**
 * RateLimitGuard — NestJS guard enforcing per-user rate limits.
 *
 * Applied via @UseGuards(RateLimitGuard) on controller endpoints.
 * Reads @RateLimit() metadata to determine which counter to check.
 *
 * - 'rethink': daily cap (LLM-08) — 429 when exceeded
 * - 'free-tier-lifetime': lifetime cap (PLAN-05) — 403 when exceeded
 * - No metadata: guard passes (no rate limit applied)
 * - No userId: 401 Unauthorized
 *
 * Resolves userId from request.user?.id (auth middleware, Phase 4)
 * or request.headers['x-anon-user-id'] (Phase 3 stub).
 *
 * When isUnlocked cannot be determined, defaults to free-tier (false)
 * for safety — tighter limit applied.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = this.reflector.get<string | undefined>(RATE_LIMIT_KEY, context.getHandler());

    // No @RateLimit decorator — pass through
    if (!type) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; isUnlocked?: boolean };
      headers: Record<string, string | undefined>;
    }>();

    // Resolve userId: prefer authenticated user, fall back to anon header
    const userId = request.user?.id ?? request.headers['x-anon-user-id'];
    if (!userId) {
      throw new HttpException('unauthorized', 401);
    }

    if (type === 'rethink') {
      const isUnlocked = request.user?.isUnlocked ?? false;
      const result = await this.rateLimitService.checkRethinkLimit(userId, isUnlocked);
      if (!result.allowed) {
        throw new HttpException('rate_limited', 429);
      }
      return true;
    }

    if (type === 'free-tier-lifetime') {
      const result = await this.rateLimitService.checkFreeTierLifetime(userId);
      if (!result.allowed) {
        throw new HttpException('free_tier_exhausted', 403);
      }
      return true;
    }

    // Unknown rate limit type — pass through (defensive)
    return true;
  }
}
