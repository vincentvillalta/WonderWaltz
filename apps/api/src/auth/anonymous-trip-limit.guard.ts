import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from './users.service.js';

/**
 * AnonymousTripLimitGuard — NestJS guard that limits anonymous users
 * to creating exactly one trip (AUTH-02 server-side enforcement).
 *
 * Must be applied AFTER SupabaseAuthGuard so that request.user is populated.
 * Registered users (isAnonymous=false) pass unconditionally.
 * Anonymous users with 1+ existing trips receive 403 with upgrade_required.
 */
@Injectable()
export class AnonymousTripLimitGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request['user'] as { id: string; isAnonymous: boolean } | undefined;

    // If user is not anonymous (registered), no trip limit applies
    if (!user || !user.isAnonymous) {
      return true;
    }

    // Check how many trips the anonymous user already has
    const tripsCount = await this.usersService.getTripsCount(user.id);

    if (tripsCount >= 1) {
      throw new ForbiddenException({
        error: 'upgrade_required',
        message: 'Anonymous users can create one trip. Upgrade to create more.',
      });
    }

    return true;
  }
}
