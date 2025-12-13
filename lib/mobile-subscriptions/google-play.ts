/**
 * Google Play Store 订阅验证服务
 * 使用 Google Play Android Publisher API
 */

import { google } from 'googleapis';
import {
  GoogleVerificationRequest,
  GoogleVerificationResponse,
  GoogleSubscriptionPurchase,
  GoogleDeveloperNotification,
  GooglePubSubMessage,
  SubscriptionStatus,
  GOOGLE_PRODUCT_IDS,
  SUBSCRIPTION_PLANS
} from './types';

const androidpublisher = google.androidpublisher('v3');

/**
 * Google Play订阅验证服务
 */
export class GooglePlayService {
  private packageName: string;
  private auth: any;

  constructor() {
    this.packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.monna.ai';

    // 初始化Google API认证
    try {
      const serviceAccount = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
      if (serviceAccount) {
        const credentials = JSON.parse(serviceAccount);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/androidpublisher']
        });
      } else {
        console.warn('⚠️ Google Play service account not configured');
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize Google Play auth:', error.message);
    }
  }

  /**
   * 验证订阅购买
   */
  async verifyPurchase(request: GoogleVerificationRequest): Promise<GoogleVerificationResponse> {
    try {
      console.log('🤖 [Google Play] Verifying purchase');
      console.log(`   Product ID: ${request.productId}`);
      console.log(`   Token: ${request.purchaseToken.substring(0, 20)}...`);

      if (!this.auth) {
        throw new Error('Google Play authentication not configured');
      }

      // 获取订阅信息
      const authClient = await this.auth.getClient();
      const response = await androidpublisher.purchases.subscriptions.get({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: request.productId,
        token: request.purchaseToken
      });

      const purchase = response.data as GoogleSubscriptionPurchase;

      // 解析产品ID和计划名称
      const planName = GOOGLE_PRODUCT_IDS[request.productId];
      if (!planName) {
        throw new Error(`Unknown product ID: ${request.productId}`);
      }

      // 确定订阅状态
      const status = this.parseSubscriptionStatus(purchase);
      const expiresDate = parseInt(purchase.expiryTimeMillis || '0', 10);

      console.log('✅ [Google Play] Purchase verified successfully');
      console.log(`   Product: ${request.productId} → ${planName}`);
      console.log(`   Status: ${status}`);
      console.log(`   Expires: ${new Date(expiresDate).toISOString()}`);
      console.log(`   Auto-renewing: ${purchase.autoRenewing}`);

      return {
        success: true,
        subscriptionStatus: status,
        productId: request.productId,
        planName,
        expiresDate,
        orderId: purchase.orderId
      };

    } catch (error: any) {
      console.error('❌ [Google Play] Purchase verification failed:', error.message);
      return {
        success: false,
        subscriptionStatus: 'expired',
        productId: request.productId,
        planName: '',
        expiresDate: 0,
        orderId: '',
        error: error.message
      };
    }
  }

  /**
   * 解析订阅状态
   */
  private parseSubscriptionStatus(purchase: GoogleSubscriptionPurchase): SubscriptionStatus {
    const now = Date.now();
    const expiresDate = parseInt(purchase.expiryTimeMillis || '0', 10);

    // 检查是否过期
    if (expiresDate < now) {
      return 'expired';
    }

    // 检查支付状态
    // paymentState: 0=pending, 1=received, 2=free_trial, 3=pending_deferred
    if (purchase.paymentState === 0) {
      // 支付待处理,可能在宽限期
      return 'in_grace_period';
    }

    // 检查取消状态
    if (purchase.userCancellationTimeMillis) {
      // 已取消但未过期
      return 'cancelled';
    }

    // 检查是否暂停
    if (purchase.autoResumeTimeMillis) {
      return 'paused';
    }

    // 正常活跃状态
    return 'active';
  }

  /**
   * 确认订阅购买
   * Google Play要求在订阅后3天内确认,否则会退款
   */
  async acknowledgePurchase(purchaseToken: string, productId: string): Promise<boolean> {
    try {
      console.log('🤖 [Google Play] Acknowledging purchase');

      if (!this.auth) {
        throw new Error('Google Play authentication not configured');
      }

      const authClient = await this.auth.getClient();

      // 检查是否已确认
      const purchaseResponse = await androidpublisher.purchases.subscriptions.get({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      const purchase = purchaseResponse.data as GoogleSubscriptionPurchase;

      // acknowledgementState: 0=not_acknowledged, 1=acknowledged
      if (purchase.acknowledgementState === 1) {
        console.log('✅ [Google Play] Purchase already acknowledged');
        return true;
      }

      // 确认购买
      await androidpublisher.purchases.subscriptions.acknowledge({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      console.log('✅ [Google Play] Purchase acknowledged successfully');
      return true;

    } catch (error: any) {
      console.error('❌ [Google Play] Failed to acknowledge purchase:', error.message);
      return false;
    }
  }

  /**
   * 处理实时开发者通知 (RTDN)
   */
  async handleDeveloperNotification(
    pubsubMessage: GooglePubSubMessage
  ): Promise<GoogleDeveloperNotification | null> {
    try {
      console.log('📩 [Google Play] Processing developer notification');

      // 解码Base64消息
      const decodedData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
      const notification: GoogleDeveloperNotification = JSON.parse(decodedData);

      console.log(`   Package: ${notification.packageName}`);
      console.log(`   Version: ${notification.version}`);

      if (notification.testNotification) {
        console.log('   Type: TEST_NOTIFICATION');
        return notification;
      }

      if (notification.subscriptionNotification) {
        const sub = notification.subscriptionNotification;
        console.log(`   Type: ${this.getNotificationTypeName(sub.notificationType)}`);
        console.log(`   Subscription ID: ${sub.subscriptionId}`);
        console.log(`   Token: ${sub.purchaseToken.substring(0, 20)}...`);
      }

      return notification;

    } catch (error: any) {
      console.error('❌ [Google Play] Failed to process notification:', error.message);
      return null;
    }
  }

  /**
   * 获取通知类型名称
   */
  private getNotificationTypeName(type: number): string {
    const types: Record<number, string> = {
      1: 'SUBSCRIPTION_RECOVERED',
      2: 'SUBSCRIPTION_RENEWED',
      3: 'SUBSCRIPTION_CANCELED',
      4: 'SUBSCRIPTION_PURCHASED',
      5: 'SUBSCRIPTION_ON_HOLD',
      6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
      7: 'SUBSCRIPTION_RESTARTED',
      8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
      9: 'SUBSCRIPTION_DEFERRED',
      10: 'SUBSCRIPTION_PAUSED',
      11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
      12: 'SUBSCRIPTION_REVOKED',
      13: 'SUBSCRIPTION_EXPIRED'
    };
    return types[type] || `UNKNOWN_${type}`;
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(purchaseToken: string, productId: string): Promise<boolean> {
    try {
      console.log('🤖 [Google Play] Canceling subscription');

      if (!this.auth) {
        throw new Error('Google Play authentication not configured');
      }

      const authClient = await this.auth.getClient();

      await androidpublisher.purchases.subscriptions.cancel({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      console.log('✅ [Google Play] Subscription canceled successfully');
      return true;

    } catch (error: any) {
      console.error('❌ [Google Play] Failed to cancel subscription:', error.message);
      return false;
    }
  }

  /**
   * 撤销订阅
   * 立即撤销订阅并退款给用户
   */
  async revokeSubscription(purchaseToken: string, productId: string): Promise<boolean> {
    try {
      console.log('🤖 [Google Play] Revoking subscription');

      if (!this.auth) {
        throw new Error('Google Play authentication not configured');
      }

      const authClient = await this.auth.getClient();

      await androidpublisher.purchases.subscriptions.revoke({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      console.log('✅ [Google Play] Subscription revoked successfully');
      return true;

    } catch (error: any) {
      console.error('❌ [Google Play] Failed to revoke subscription:', error.message);
      return false;
    }
  }

  /**
   * 获取订阅详情
   */
  async getSubscriptionDetails(
    purchaseToken: string,
    productId: string
  ): Promise<GoogleSubscriptionPurchase | null> {
    try {
      if (!this.auth) {
        throw new Error('Google Play authentication not configured');
      }

      const authClient = await this.auth.getClient();

      const response = await androidpublisher.purchases.subscriptions.get({
        auth: authClient,
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      return response.data as GoogleSubscriptionPurchase;

    } catch (error: any) {
      console.error('❌ [Google Play] Failed to get subscription details:', error.message);
      return null;
    }
  }
}

// 导出单例
export const googlePlayService = new GooglePlayService();
