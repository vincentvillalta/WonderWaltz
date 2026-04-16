import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * AnonymousPurchaseGuard — NestJS guard that blocks anonymous users
 * from purchase-related endpoints (AUTH-04 server-side enforcement).
 *
 * Must be applied AFTER SupabaseAuthGuard so that request.user is populated.
 * If request.user is not set, throws 401 (guard ordering error).
 * If request.user.isAnonymous is true, throws 403 with upgrade_required.
 */
@Injectable()
export class AnonymousPurchaseGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request['user'] as { isAnonymous: boolean } | undefined;

    if (!user) {
      throw new UnauthorizedException(
        'Authentication required — SupabaseAuthGuard must run before AnonymousPurchaseGuard',
      );
    }

    if (user.isAnonymous) {
      throw new ForbiddenException({
        error: 'upgrade_required',
        message: 'Upgrade to a registered account before purchasing',
      });
    }

    return true;
  }
}
