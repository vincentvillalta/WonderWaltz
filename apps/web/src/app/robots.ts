import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin is localhost-gated by middleware, but also keep it out of
        // any crawler's map just to be sure.
        disallow: ['/admin', '/admin/'],
      },
    ],
    sitemap: 'https://wonderwaltz.app/sitemap.xml',
    host: 'https://wonderwaltz.app',
  };
}
