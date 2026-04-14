import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_KEY = 'skip_envelope';

/**
 * Apply to a controller method to skip the response envelope wrapper.
 * Use for: health checks, file downloads, redirects, raw SSE streams.
 *
 * Example:
 * @Get('health')
 * @SkipEnvelope()
 * health() { return 'ok'; }
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
