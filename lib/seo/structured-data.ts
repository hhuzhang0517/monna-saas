/**
 * Structured Data (JSON-LD) for SEO
 * 包含 Organization, WebSite, SoftwareApplication 等结构化数据
 */

import { SITE_CONFIG } from './config';

/**
 * Organization Schema
 * 用于首页，声明组织信息
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.alternateName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/figma-designs/monna_logo.png`,
    description: 'Professional AI image and video generation platform',
    email: SITE_CONFIG.email,
    // sameAs: 官方社交媒体和应用商店链接
    sameAs: [
      ...SITE_CONFIG.socialLinks,
      ...SITE_CONFIG.appStoreLinks,
    ].filter(Boolean),
  };
}

/**
 * WebSite Schema
 * 用于首页，声明网站信息
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.alternateName,
    url: SITE_CONFIG.url,
    description: 'AI-powered image and video generation platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * SoftwareApplication Schema
 * 用于产品/功能页面
 */
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_CONFIG.name,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: ['Web', 'iOS', 'Android'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2025-12-31',
      availability: 'https://schema.org/InStock',
      description: 'Free trial available with paid plans',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      reviewCount: '850',
    },
    description: 'AI-powered platform for generating professional images and videos using multiple AI models including DALL-E 3, Gemini, Ideogram, and Runway.',
    featureList: [
      'AI Image Generation',
      'AI Video Generation',
      'Text-to-Image',
      'Image-to-Image',
      'Text-to-Video',
      'Image-to-Video',
      'Multiple AI Models',
      'Professional Templates',
    ],
  };
}

/**
 * VideoObject Schema
 * 用于包含视频的页面
 */
export function getVideoObjectSchema(params: {
  name: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  uploadDate: string;
  duration?: string; // ISO 8601 格式，如 'PT1M30S' (1分30秒)
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: params.name,
    description: params.description,
    thumbnailUrl: params.thumbnailUrl,
    contentUrl: params.contentUrl,
    uploadDate: params.uploadDate,
    duration: params.duration || 'PT10S',
  };
}

/**
 * BreadcrumbList Schema
 * 用于展示页面层级结构
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * ImageObject Schema
 * 用于图片页面或画廊
 */
export function getImageObjectSchema(params: {
  name: string;
  description: string;
  contentUrl: string;
  thumbnail?: string;
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: params.name,
    description: params.description,
    contentUrl: params.contentUrl,
    thumbnail: params.thumbnail,
    author: params.author ? {
      '@type': 'Person',
      name: params.author,
    } : undefined,
  };
}

/**
 * Product Schema (for pricing pages)
 * 用于定价页面的产品信息
 */
export function getProductSchema(params: {
  name: string;
  description: string;
  price: string;
  priceCurrency: string;
  availability?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.name,
    description: params.description,
    offers: {
      '@type': 'Offer',
      price: params.price,
      priceCurrency: params.priceCurrency,
      availability: params.availability || 'https://schema.org/InStock',
      url: `${SITE_CONFIG.url}/pricing`,
    },
  };
}

/**
 * 生成结构化数据脚本标签
 */
export function generateStructuredDataScript(data: object | object[]) {
  const jsonLd = Array.isArray(data) ? data : [data];

  return {
    __html: JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd),
  };
}
