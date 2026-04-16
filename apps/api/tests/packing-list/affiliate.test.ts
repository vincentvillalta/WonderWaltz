import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AffiliateService } from '../../src/packing-list/affiliate.service.js';

describe('AffiliateService', () => {
  let service: AffiliateService;

  beforeEach(() => {
    // Ensure clean env for each test
    delete process.env.AMAZON_ASSOCIATES_TAG;
    service = new AffiliateService();
  });

  afterEach(() => {
    delete process.env.AMAZON_ASSOCIATES_TAG;
  });

  describe('rewriteUrl', () => {
    it('appends tag to amazon.com URL without query params', () => {
      const result = service.rewriteUrl('https://www.amazon.com/dp/B0XYZ');
      expect(result).toBe('https://www.amazon.com/dp/B0XYZ?tag=wonderwaltz-20');
    });

    it('preserves existing query params and adds tag', () => {
      const result = service.rewriteUrl('https://www.amazon.com/dp/B0XYZ?ref=foo');
      expect(result).toContain('ref=foo');
      expect(result).toContain('tag=wonderwaltz-20');
    });

    it('replaces existing tag param with associates tag', () => {
      const result = service.rewriteUrl('https://www.amazon.com/dp/B0XYZ?tag=other');
      expect(result).toContain('tag=wonderwaltz-20');
      expect(result).not.toContain('tag=other');
    });

    it('passes through non-Amazon URLs unchanged', () => {
      const url = 'https://rei.com/product/x';
      expect(service.rewriteUrl(url)).toBe(url);
    });

    it('handles amazon.com without www prefix', () => {
      const result = service.rewriteUrl('https://amazon.com/dp/B0XYZ');
      expect(result).toContain('tag=wonderwaltz-20');
    });

    it('handles smile.amazon.com subdomain', () => {
      const result = service.rewriteUrl('https://smile.amazon.com/dp/B0XYZ');
      expect(result).toContain('tag=wonderwaltz-20');
    });

    it('returns null for null input', () => {
      expect(service.rewriteUrl(null)).toBeNull();
    });

    it('returns undefined for undefined input', () => {
      expect(service.rewriteUrl(undefined)).toBeUndefined();
    });

    it('returns empty string for empty string input', () => {
      expect(service.rewriteUrl('')).toBe('');
    });

    it('returns invalid URL string as-is', () => {
      const bad = 'not-a-url';
      expect(service.rewriteUrl(bad)).toBe(bad);
    });
  });

  describe('env var override', () => {
    it('uses AMAZON_ASSOCIATES_TAG env var when set', () => {
      process.env.AMAZON_ASSOCIATES_TAG = 'custom-tag-99';
      const customService = new AffiliateService();
      const result = customService.rewriteUrl('https://www.amazon.com/dp/B0XYZ');
      expect(result).toContain('tag=custom-tag-99');
      expect(result).not.toContain('wonderwaltz-20');
    });
  });

  describe('response serialization contract', () => {
    it('no amazon.com URL in mock plan response lacks the tag', () => {
      // Simulate a plan response with packing list items containing Amazon URLs
      const packingListItems = [
        {
          name: 'Sunscreen SPF 50',
          recommendedAmazonUrl: 'https://www.amazon.com/dp/B0BX4NQFNQ',
        },
        {
          name: 'Cooling Towel',
          recommendedAmazonUrl: 'https://www.amazon.com/dp/B0CHMDGYKR?ref=sr',
        },
        {
          name: 'Park Map',
          recommendedAmazonUrl: undefined,
        },
        {
          name: 'ECV Backup',
          recommendedAmazonUrl: undefined,
        },
      ];

      // Rewrite all URLs
      const rewritten = packingListItems.map((item) => ({
        ...item,
        recommendedAmazonUrl: service.rewriteUrl(item.recommendedAmazonUrl),
      }));

      // Scan entire response body for amazon.com URLs without tag
      const responseBody = JSON.stringify(rewritten);
      const amazonUrlRegex = /https?:\/\/[^"]*amazon\.com[^"]*/g;
      const amazonUrls = responseBody.match(amazonUrlRegex) ?? [];

      for (const url of amazonUrls) {
        expect(url).toContain('tag=');
      }

      // Verify the tag value is present in every Amazon URL
      for (const url of amazonUrls) {
        expect(url).toContain('tag=wonderwaltz-20');
      }
    });
  });
});
