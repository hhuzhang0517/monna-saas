/**
 * RevenueCat 配置
 * 用于管理 iOS App Store 和 Google Play 订阅
 */

export const REVENUECAT_CONFIG = {
  // RevenueCat API Keys (需要在 RevenueCat Dashboard 创建项目后获取)
  // https://app.revenuecat.com
  apiKeys: {
    apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '',
    google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '',
  },

  // 订阅产品 IDs (需要在 App Store Connect 和 Google Play Console 配置)
  products: {
    // 基础档 - 2000 信用点/月
    basic: {
      // iOS: App Store Connect 中配置的 Product ID
      ios: 'com.monna.app.basic.monthly',
      // Android: Google Play Console 中配置的 Product ID
      android: 'com.monna.app.basic.monthly',
      // 对应的 Stripe Plan Key (用于后端同步)
      planKey: 'basic',
      credits: 2000,
    },

    // 专业档 - 4000 信用点/月
    pro: {
      ios: 'com.monna.app.pro.monthly',
      android: 'com.monna.app.pro.monthly',
      planKey: 'pro',
      credits: 4000,
    },

    // 至尊档 - 12000 信用点/月
    enterprise: {
      ios: 'com.monna.app.enterprise.monthly',
      android: 'com.monna.app.enterprise.monthly',
      planKey: 'enterprise',
      credits: 12000,
    },
  },

  // RevenueCat Entitlement IDs
  // Entitlements 是 RevenueCat 的权限标识符
  entitlements: {
    pro: 'pro', // 专业功能权限
    enterprise: 'enterprise', // 企业功能权限
  },
};

/**
 * 订阅计划显示信息
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: '基础档',
    nameEn: 'Basic',
    description: '每月 2000 积分',
    descriptionEn: '2000 Credits/Month',
    features: [
      '每月 2000 积分',
      '仅图片生成',
      '每张图片 10 积分',
      '邮件支持',
    ],
    featuresEn: [
      '2000 Credits Monthly',
      'Image Only',
      '10 Credits per Image',
      'Email Support',
    ],
    price: {
      usd: 20,
      cny: 20, // 使用美元价格以保持一致
    },
    highlighted: false,
  },
  {
    id: 'pro',
    name: '专业档',
    nameEn: 'Professional',
    description: '每月 4000 积分',
    descriptionEn: '4000 Credits/Month',
    features: [
      '每月 4000 积分',
      '图片 + 短视频生成',
      '每张图片 8 积分',
      '每秒 15 积分（短视频）',
      '优先支持',
    ],
    featuresEn: [
      '4000 Credits Monthly',
      'Image + Short Video',
      '8 Credits per Image',
      '15 Credits per Second (Short Video)',
      'Priority Support',
    ],
    price: {
      usd: 40,
      cny: 40,
    },
    highlighted: true, // 推荐计划
  },
  {
    id: 'enterprise',
    name: '至尊档',
    nameEn: 'Enterprise',
    description: '每月 12000 积分',
    descriptionEn: '12000 Credits/Month',
    features: [
      '每月 12000 积分',
      '完整功能访问',
      '每张图片 8 积分',
      '每秒 15 积分（短视频）',
      '每秒 80 积分（长视频）',
      '专属支持',
      'API 访问',
    ],
    featuresEn: [
      '12000 Credits Monthly',
      'Full Access',
      '8 Credits per Image',
      '15 Credits per Second (Short Video)',
      '80 Credits per Second (Long Video)',
      'Dedicated Support',
      'API Access',
    ],
    price: {
      usd: 100,
      cny: 100,
    },
    highlighted: false,
  },
];

/**
 * 根据平台获取产品 ID
 */
export function getProductId(planId: string, platform: 'ios' | 'android'): string {
  const product = REVENUECAT_CONFIG.products[planId as keyof typeof REVENUECAT_CONFIG.products];
  if (!product) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return product[platform];
}

/**
 * 根据产品 ID 获取计划信息
 */
export function getPlanByProductId(productId: string) {
  for (const [key, value] of Object.entries(REVENUECAT_CONFIG.products)) {
    if (value.ios === productId || value.android === productId) {
      return {
        id: key,
        ...value,
      };
    }
  }
  return null;
}
