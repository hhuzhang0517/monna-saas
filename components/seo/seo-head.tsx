/**
 * SEO Head Component
 * 用于在页面中注入SEO相关的meta标签、canonical链接和hreflang标签
 */

import Head from 'next/head';
import { getCanonicalUrl, getHreflangLinks } from '@/lib/seo/config';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  path?: string;
  locale?: string;
  image?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  keywords,
  path = '',
  locale = 'zh',
  image,
  noindex = false,
}: SEOHeadProps) {
  const canonicalUrl = getCanonicalUrl(path, locale);
  const hreflangLinks = getHreflangLinks(path);
  const ogImage = image || 'https://www.monna.us/figma-designs/monna_logo.png';

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang Links */}
      {hreflangLinks.map((link) => (
        <link
          key={link.hreflang}
          rel="alternate"
          hrefLang={link.hreflang}
          href={link.href}
        />
      ))}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Monna AI" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Language */}
      <meta httpEquiv="content-language" content={locale === 'zh' ? 'zh-CN' : 'en-US'} />
    </Head>
  );
}
