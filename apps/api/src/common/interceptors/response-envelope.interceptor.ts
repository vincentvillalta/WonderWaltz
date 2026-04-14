import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator.js';

// DISCLAIMER sourced from packages/content — single source of truth (LEGL-02).
// Using inline constant here because the CommonJS/ESM boundary between
// packages/content (ESM) and apps/api (CommonJS) requires careful import handling.
// Update this constant if packages/content/legal/disclaimer.en.json changes.
export const DISCLAIMER =
  'WonderWaltz is an independent, unofficial planning app. ' +
  'Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.';

export interface EnvelopedResponse<T> {
  data: T;
  meta: {
    disclaimer: string;
  };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  EnvelopedResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<EnvelopedResponse<T> | T> {
    // Check @SkipEnvelope() on the handler or controller class
    const skipEnvelope = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipEnvelope) {
      return next.handle() as Observable<EnvelopedResponse<T> | T>;
    }

    const response = context.switchToHttp().getResponse<{
      header: (key: string, value: string) => void;
    }>();
    response.header('X-WW-Disclaimer', DISCLAIMER);

    return next.handle().pipe(
      map((data: T) => {
        // Pass through non-JSON responses without wrapping:
        // - string responses (e.g., health check 'ok')
        // - null/undefined
        // - StreamableFile instances
        if (
          data === null ||
          data === undefined ||
          typeof data === 'string' ||
          // StreamableFile check without importing it (avoids circular dep)
          (typeof data === 'object' && data !== null && 'file' in (data as object))
        ) {
          // Still set the header, but don't wrap the body
          return data;
        }

        return {
          data,
          meta: { disclaimer: DISCLAIMER },
        };
      }),
    );
  }
}
