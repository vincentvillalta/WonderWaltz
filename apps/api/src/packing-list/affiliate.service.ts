import { Injectable, Logger } from '@nestjs/common';

/**
 * AffiliateService -- rewrites Amazon URLs with the Associates tag at read time.
 *
 * The tag is sourced from AMAZON_ASSOCIATES_TAG env var (default: 'wonderwaltz-20').
 * Non-Amazon URLs pass through unchanged. Existing tag= params are replaced.
 *
 * LEGL-03: the raw tag string is never exposed to the client -- it's embedded
 * in the rewritten URL only.
 */
@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);
  private readonly tag: string;

  constructor() {
    this.tag = process.env.AMAZON_ASSOCIATES_TAG ?? 'wonderwaltz-20';
  }

  /**
   * Rewrite a URL to include the Amazon Associates tag.
   * - Amazon URLs: append/replace `tag` query param.
   * - Non-Amazon URLs: passthrough unchanged.
   * - Null/undefined URLs: return as-is.
   */
  rewriteUrl(url: string | undefined | null): string | undefined | null {
    if (!url) return url;

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // Only rewrite amazon.com domains (including subdomains like www.amazon.com, smile.amazon.com)
      if (!host.endsWith('amazon.com') && host !== 'amazon.com') {
        return url;
      }

      // Set/replace the tag parameter
      parsed.searchParams.set('tag', this.tag);
      return parsed.toString();
    } catch {
      // Invalid URL — return as-is
      this.logger.warn(`Invalid URL passed to rewriteUrl: ${url}`);
      return url;
    }
  }
}
