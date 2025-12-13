/**
 * 移动端订阅类型定义
 * 支持 Apple App Store 和 Google Play Store
 */

// ============ 通用类型 ============

export type SubscriptionPlatform = 'apple' | 'google';

export type SubscriptionStatus =
  | 'active'           // 订阅有效
  | 'expired'          // 订阅过期
  | 'cancelled'        // 已取消
  | 'in_grace_period'  // 宽限期(支付失败但仍有效)
  | 'on_hold'          // 暂停(Google特有)
  | 'paused'           // 用户主动暂停(Google特有)
  | 'billing_retry';   // 重试扣款

export interface SubscriptionPlanConfig {
  planName: 'basic' | 'professional' | 'enterprise';
  credits: number;
  displayName: string;
  features: string[];
}

// Web端计划配置（完整credits）
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  basic: {
    planName: 'basic',
    credits: 2000,
    displayName: '基础档',
    features: ['仅图片生成', '每张图片10积分', '邮件支持']
  },
  professional: {
    planName: 'professional',
    credits: 4000,
    displayName: '专业档',
    features: ['图片+短视频生成', '每张图片8积分', '每秒短视频15积分', '优先支持']
  },
  enterprise: {
    planName: 'enterprise',
    credits: 12000,
    displayName: '至尊档',
    features: ['完整功能访问', '每张图片8积分', '短视频15积分/秒', '长视频80积分/秒', '专属支持', 'API访问']
  }
};

// 移动端计划配置（credits减少30%以覆盖平台抽成）
export const MOBILE_SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  basic: {
    planName: 'basic',
    credits: Math.floor(2000 * 0.7), // 1400 credits
    displayName: '基础档',
    features: ['仅图片生成', '每张图片10积分', '邮件支持']
  },
  professional: {
    planName: 'professional',
    credits: Math.floor(4000 * 0.7), // 2800 credits
    displayName: '专业档',
    features: ['图片+短视频生成', '每张图片8积分', '每秒短视频15积分', '优先支持']
  },
  enterprise: {
    planName: 'enterprise',
    credits: Math.floor(12000 * 0.7), // 8400 credits
    displayName: '至尊档',
    features: ['完整功能访问', '每张图片8积分', '短视频15积分/秒', '长视频80积分/秒', '专属支持', 'API访问']
  }
};

// ============ Apple App Store 类型 ============

export interface AppleVerificationRequest {
  transactionId: string;  // 原始交易ID
  receiptData?: string;   // Base64编码的收据(可选,用于旧版验证)
}

export interface AppleVerificationResponse {
  success: boolean;
  subscriptionStatus: SubscriptionStatus;
  productId: string;
  planName: string;
  expiresDate: number;     // 过期时间戳(ms)
  originalTransactionId: string;
  environment: 'Sandbox' | 'Production';
  error?: string;
}

// Apple Product ID 映射
export const APPLE_PRODUCT_IDS: Record<string, string> = {
  'com.monna.ai.subscription.basic': 'basic',
  'com.monna.ai.subscription.professional': 'professional',
  'com.monna.ai.subscription.enterprise': 'enterprise'
};

// Apple Server Notification Types (Version 2)
export type AppleNotificationType =
  | 'SUBSCRIBED'                // 新订阅
  | 'DID_RENEW'                 // 续订成功
  | 'DID_FAIL_TO_RENEW'         // 续订失败
  | 'EXPIRED'                   // 订阅过期
  | 'DID_CHANGE_RENEWAL_STATUS' // 自动续订状态变更
  | 'GRACE_PERIOD_EXPIRED'      // 宽限期结束
  | 'REFUND'                    // 退款
  | 'REVOKE';                   // 撤销订阅

export interface AppleServerNotification {
  signedPayload: string;        // JWS格式的负载
}

export interface AppleDecodedPayload {
  notificationType: AppleNotificationType;
  subtype?: string;
  data: {
    bundleId: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string;    // JWS
    signedRenewalInfo?: string;       // JWS
  };
  notificationUUID: string;
}

export interface AppleTransactionInfo {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate: number;
  quantity: number;
  type: 'Auto-Renewable Subscription';
  environment: 'Sandbox' | 'Production';
}

// ============ Google Play Store 类型 ============

export interface GoogleVerificationRequest {
  purchaseToken: string;  // Google Play购买令牌
  productId: string;      // 产品ID (例如: basic_monthly)
}

export interface GoogleVerificationResponse {
  success: boolean;
  subscriptionStatus: SubscriptionStatus;
  productId: string;
  planName: string;
  expiresDate: number;     // 过期时间戳(ms)
  orderId: string;
  error?: string;
}

// Google Play Product ID 映射
export const GOOGLE_PRODUCT_IDS: Record<string, string> = {
  'basic_monthly': 'basic',
  'professional_monthly': 'professional',
  'enterprise_monthly': 'enterprise'
};

// Google Play Real-time Developer Notifications
export type GoogleNotificationType =
  | 'SUBSCRIPTION_PURCHASED'        // 新订阅
  | 'SUBSCRIPTION_RENEWED'          // 续订
  | 'SUBSCRIPTION_CANCELED'         // 取消
  | 'SUBSCRIPTION_EXPIRED'          // 过期
  | 'SUBSCRIPTION_ON_HOLD'          // 暂停
  | 'SUBSCRIPTION_IN_GRACE_PERIOD'  // 宽限期
  | 'SUBSCRIPTION_RECOVERED'        // 恢复
  | 'SUBSCRIPTION_PAUSED'           // 用户暂停
  | 'SUBSCRIPTION_RESTARTED'        // 重新启动
  | 'SUBSCRIPTION_REVOKED';         // 撤销

export interface GooglePubSubMessage {
  message: {
    data: string;           // Base64编码的JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface GoogleDeveloperNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;  // 对应 GoogleNotificationType
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: {
    version: string;
  };
}

export interface GoogleSubscriptionPurchase {
  kind: 'androidpublisher#subscriptionPurchase';
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoResumeTimeMillis?: string;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  developerPayload?: string;
  paymentState?: number;    // 0=pending, 1=received, 2=free_trial, 3=pending_deferred
  cancelReason?: number;    // 0=user, 1=system, 2=replaced, 3=developer
  userCancellationTimeMillis?: string;
  orderId: string;
  linkedPurchaseToken?: string;
  purchaseType?: number;    // 0=test, 1=promo, 2=rewarded
  acknowledgementState: number; // 0=not_acknowledged, 1=acknowledged
}

// ============ 数据库存储类型 ============

export interface MobileSubscription {
  id: string;
  user_id: string;
  team_id: number;
  platform: SubscriptionPlatform;
  product_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  original_transaction_id: string;  // Apple: originalTransactionId, Google: orderId
  latest_transaction_id: string;    // Apple: transactionId, Google: purchaseToken
  purchase_date: Date;
  expires_date: Date;
  auto_renewing: boolean;
  environment: 'sandbox' | 'production';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ============ API 响应类型 ============

export interface SubscriptionStatusResponse {
  hasActiveSubscription: boolean;
  subscription?: {
    platform: SubscriptionPlatform;
    productId: string;
    planName: string;
    displayName: string;
    status: SubscriptionStatus;
    expiresDate: number;
    autoRenewing: boolean;
    credits: number;
  };
  currentPlan: string;
  credits: number;
}

export interface VerifyPurchaseResponse {
  success: boolean;
  message?: string;
  subscription?: {
    planName: string;
    expiresDate: number;
    status: SubscriptionStatus;
  };
  error?: string;
}
