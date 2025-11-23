/**
 * SEO Configuration for Monna AI
 * 包含所有SEO相关的配置，包括域名、元数据、结构化数据等
 */

// 首选域名配置 (根据 SEO_optimism.md 建议使用 www 版本)
export const SITE_CONFIG = {
  // 首选域名 (canonical domain)
  domain: 'www.monna.us',
  url: 'https://www.monna.us',

  // 品牌信息
  name: 'Monna AI',
  alternateName: 'Monna',

  // 联系方式
  email: 'support@monna.us',

  // 社交媒体链接 (用于 Organization schema 的 sameAs)
  socialLinks: [
    // 根据实际情况添加
    // 'https://twitter.com/monnaai',
    // 'https://facebook.com/monnaai',
    // 'https://linkedin.com/company/monnaai',
  ],

  // 应用商店链接
  appStoreLinks: [
    // 'https://apps.apple.com/app/monna-ai',
    // 'https://play.google.com/store/apps/details?id=com.monna.ai',
  ],
} as const;

// 默认SEO元数据 (中文)
// 默认SEO元数据 (中文)
export const DEFAULT_SEO_ZH = {
  title: 'Monna AI - 简单易用的AI图片与视频生成平台',
  description:
    'Monna AI是一款简单易用的AI图片与视频生成平台，无需复杂提示词即可生成精美头像、证件照、艺术插画和短视频，支持多模型智能生成与一键编辑。',
  keywords:
    'AI图片生成, AI视频生成, AI头像制作, AI证件照, AI艺术创作, 在线图片编辑, 短视频制作, 文生图, 文生视频',
} as const;

// 默认SEO元数据 (英文)
export const DEFAULT_SEO_EN = {
  title: 'Monna AI - Simple AI Image & Video Generation Platform',
  description:
    'Monna AI is a simple AI image and video generation platform that lets you create stunning avatars, portraits, artworks and short videos without complex prompts, powered by multiple advanced AI models.',
  keywords:
    'AI image generation, AI video generation, AI avatar maker, AI profile picture, AI art generator, image editing, video creation',
} as const;


// 页面特定的SEO配置
export const PAGE_SEO = {
  home: {
    zh: {
      title: 'Monna AI - 简单易用的AI图片与视频生成平台',
      description: 'Monna AI提供专业的AI图片和视频生成服务，支持多种AI模型。无需专业技能，轻松创建精美的AI作品。',
    },
    en: {
      title: 'Monna AI - Simple AI Image & Video Generation Platform',
      description: 'Monna AI offers professional AI image and video generation services with multiple AI models. Create stunning AI artworks easily without professional skills.',
    },
  },

  generate: {
    zh: {
      title: 'AI创作中心 - Monna AI',
      description: '使用Monna AI的创作中心，通过DALL-E 3、Gemini、Ideogram、Runway等AI模型生成专业图片和视频。支持文字生成、图像编辑、视频制作等多种功能。',
    },
    en: {
      title: 'AI Creation Studio - Monna AI',
      description: 'Use Monna AI Creation Studio to generate professional images and videos with DALL-E 3, Gemini, Ideogram, Runway. Supports text-to-image, image editing, video creation and more.',
    },
  },

  pricing: {
    zh: {
      title: '定价方案 - Monna AI',
      description: '查看Monna AI的定价方案，选择适合您的套餐。提供免费试用和多种付费方案，满足个人和企业用户的不同需求。',
    },
    en: {
      title: 'Pricing Plans - Monna AI',
      description: 'View Monna AI pricing plans and choose the right package for you. Free trial and multiple paid plans available for individuals and businesses.',
    },
  },
} as const;

/**
 * 生成 canonical URL
 * @param path - 页面路径 (如 '/generate', '/pricing')
 * @param locale - 语言代码 (如 'zh', 'en')
 */
export function getCanonicalUrl(path: string = '', locale?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const localePath = locale && locale !== 'zh' ? `/${locale}` : '';
  return `${SITE_CONFIG.url}${localePath}${cleanPath}`;
}

/**
 * 生成 hreflang 标签数据
 * @param path - 页面路径
 */
export function getHreflangLinks(path: string = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return [
    // 中文版本
    {
      hreflang: 'zh-CN',
      href: `${SITE_CONFIG.url}${cleanPath}`,
    },
    // 英文版本
    {
      hreflang: 'en-US',
      href: `${SITE_CONFIG.url}/en${cleanPath}`,
    },
    // x-default (默认语言选择页或自动检测)
    {
      hreflang: 'x-default',
      href: `${SITE_CONFIG.url}${cleanPath}`,
    },
  ];
}

/**
 * 获取页面元数据
 * @param page - 页面标识 ('home', 'generate', 'pricing' 等)
 * @param locale - 语言代码
 */
export function getPageMetadata(page: keyof typeof PAGE_SEO, locale: 'zh' | 'en' = 'zh') {
  return PAGE_SEO[page]?.[locale] || (locale === 'zh' ? DEFAULT_SEO_ZH : DEFAULT_SEO_EN);
}
