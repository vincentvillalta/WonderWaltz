import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * WebhookAuthGuard -- verifies RevenueCat webhook authorization.
 *
 * Compares the incoming Authorization header against
 * `Bearer ${REVENUECAT_WEBHOOK_AUTH_KEY}`. This is NOT a standard
 * user-auth guard -- it's specific to webhook verification.
 *
 * Per CONTEXT.md: RevenueCat sends a bearer token configured in
 * their dashboard; we verify it server-side.
 */
@Injectable()
export class WebhookAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = request['headers'] as Record<string, string | undefined>;
    const authHeader = headers['authorization'];

    const expectedKey = process.env['REVENUECAT_WEBHOOK_AUTH_KEY'];

    if (!authHeader || !authHeader.startsWith('Bearer ') || !expectedKey) {
      throw new UnauthorizedException('Invalid webhook authorization');
    }

    const token = authHeader.slice(7); // strip "Bearer "

    if (token !== expectedKey) {
      throw new UnauthorizedException('Invalid webhook authorization');
    }

    return true;
  }
}
