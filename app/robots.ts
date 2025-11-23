/**
 * Dynamic robots.txt for Monna AI
 * 配置搜索引擎爬虫规则
 */

import { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // 私有路径 - 使用 noindex 而不是 robots.txt (SEO 最佳实践)
          '/api/',
          '/dashboard/',
          '/sign-in/',
          '/sign-up/',
          '/auth/',
          '/resend-confirmation/',
          '/error/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/sign-in/',
          '/sign-up/',
          '/auth/',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}
