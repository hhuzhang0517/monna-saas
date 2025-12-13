/**
 * Apple App Store 订阅验证服务
 * 支持 App Store Server API 和收据验证
 */

import {
  AppleVerificationRequest,
  AppleVerificationResponse,
  AppleTransactionInfo,
  AppleDecodedPayload,
  AppleServerNotification,
  SubscriptionStatus,
  APPLE_PRODUCT_IDS,
  SUBSCRIPTION_PLANS
} from './types';
import { jwtVerify, decodeJwt } from 'jose';

// Apple App Store Server API URLs
const PRODUCTION_URL = 'https://api.storekit.itunes.apple.com';
const SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com';

// 收据验证URLs (旧版API)
const PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

/**
 * Apple订阅验证服务
 */
export class AppleStoreService {
  private keyId: string;
  private issuerId: string;
  private privateKey: string;
  private bundleId: string;
  private sharedSecret: string;

  constructor() {
    this.keyId = process.env.APPLE_KEY_ID || '';
    this.issuerId = process.env.APPLE_ISSUER_ID || '';
    this.privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    this.bundleId = process.env.APPLE_BUNDLE_ID || 'com.monna.ai';
    this.sharedSecret = process.env.APPLE_SHARED_SECRET || '';

    if (!this.keyId || !this.issuerId || !this.privateKey) {
      console.warn('⚠️ Apple App Store credentials not fully configured');
    }
  }

  /**
   * 生成JWT令牌用于App Store Server API
   */
  private async generateJWT(): Promise<string> {
    const { SignJWT } = await import('jose');

    const privateKeyData = Buffer.from(this.privateKey);
    const alg = 'ES256';

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg, kid: this.keyId, typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.issuerId)
      .setAudience('appstoreconnect-v1')
      .setExpirationTime('5m')
      .sign(await this.importPrivateKey(privateKeyData));

    return jwt;
  }

  /**
   * 导入Apple私钥
   */
  private async importPrivateKey(keyData: Buffer) {
    const { importPKCS8 } = await import('jose');
    return importPKCS8(keyData.toString(), 'ES256');
  }

  /**
   * 验证购买 - 使用App Store Server API (推荐)
   */
  async verifyPurchase(request: AppleVerificationRequest): Promise<AppleVerificationResponse> {
    try {
      console.log('🍎 [Apple] Verifying purchase:', request.transactionId);

      // 方法1: 使用App Store Server API获取交易信息
      const transactionInfo = await this.getTransactionInfo(request.transactionId);

      if (!transactionInfo) {
        // 方法2: 如果提供了收据,使用收据验证(向后兼容)
        if (request.receiptData) {
          return await this.verifyReceipt(request.receiptData);
        }

        throw new Error('Unable to verify transaction');
      }

      // 解析产品ID和计划名称
      const planName = APPLE_PRODUCT_IDS[transactionInfo.productId];
      if (!planName) {
        throw new Error(`Unknown product ID: ${transactionInfo.productId}`);
      }

      // 确定订阅状态
      const now = Date.now();
      const expiresDate = transactionInfo.expiresDate;
      let status: SubscriptionStatus = 'active';

      if (expiresDate < now) {
        status = 'expired';
      }

      console.log('✅ [Apple] Purchase verified successfully');
      console.log(`   Product: ${transactionInfo.productId} → ${planName}`);
      console.log(`   Status: ${status}`);
      console.log(`   Expires: ${new Date(expiresDate).toISOString()}`);

      return {
        success: true,
        subscriptionStatus: status,
        productId: transactionInfo.productId,
        planName,
        expiresDate,
        originalTransactionId: transactionInfo.originalTransactionId,
        environment: transactionInfo.environment
      };

    } catch (error: any) {
      console.error('❌ [Apple] Purchase verification failed:', error.message);
      return {
        success: false,
        subscriptionStatus: 'expired',
        productId: '',
        planName: '',
        expiresDate: 0,
        originalTransactionId: '',
        environment: 'Production',
        error: error.message
      };
    }
  }

  /**
   * 获取交易信息 - App Store Server API
   */
  private async getTransactionInfo(transactionId: string): Promise<AppleTransactionInfo | null> {
    try {
      const jwt = await this.generateJWT();

      // 先尝试生产环境
      let response = await fetch(`${PRODUCTION_URL}/inApps/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });

      // 如果失败,尝试沙盒环境
      if (!response.ok) {
        console.log('🔄 [Apple] Trying sandbox environment...');
        response = await fetch(`${SANDBOX_URL}/inApps/v1/transactions/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      // 解码JWS签名的交易信息
      const transactionInfo = await this.decodeSignedTransaction(data.signedTransactionInfo);

      return transactionInfo;

    } catch (error: any) {
      console.error('❌ [Apple] Failed to get transaction info:', error.message);
      return null;
    }
  }

  /**
   * 解码签名的交易信息 (JWS)
   */
  private async decodeSignedTransaction(signedTransaction: string): Promise<AppleTransactionInfo> {
    // 简单解码JWT(不验证签名,因为来自Apple可信源)
    const decoded = decodeJwt(signedTransaction) as any;

    return {
      originalTransactionId: decoded.originalTransactionId,
      transactionId: decoded.transactionId,
      productId: decoded.productId,
      purchaseDate: decoded.purchaseDate,
      expiresDate: decoded.expiresDate,
      quantity: decoded.quantity || 1,
      type: decoded.type,
      environment: decoded.environment
    };
  }

  /**
   * 验证收据 - 旧版API (向后兼容)
   */
  private async verifyReceipt(receiptData: string): Promise<AppleVerificationResponse> {
    try {
      console.log('🍎 [Apple] Verifying receipt (legacy API)');

      const requestBody = {
        'receipt-data': receiptData,
        'password': this.sharedSecret,
        'exclude-old-transactions': true
      };

      // 先尝试生产环境
      let response = await fetch(PRODUCTION_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      let data = await response.json();

      // 如果是沙盒收据(status 21007),重定向到沙盒环境
      if (data.status === 21007) {
        console.log('🔄 [Apple] Redirecting to sandbox environment');
        response = await fetch(SANDBOX_VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        data = await response.json();
      }

      if (data.status !== 0) {
        throw new Error(`Receipt validation failed with status: ${data.status}`);
      }

      // 提取最新的订阅信息
      const latestReceipt = data.latest_receipt_info?.[0];
      if (!latestReceipt) {
        throw new Error('No subscription found in receipt');
      }

      const productId = latestReceipt.product_id;
      const planName = APPLE_PRODUCT_IDS[productId];
      const expiresDate = parseInt(latestReceipt.expires_date_ms, 10);
      const now = Date.now();

      let status: SubscriptionStatus = 'active';
      if (expiresDate < now) {
        status = 'expired';
      }

      return {
        success: true,
        subscriptionStatus: status,
        productId,
        planName,
        expiresDate,
        originalTransactionId: latestReceipt.original_transaction_id,
        environment: data.environment === 'Sandbox' ? 'Sandbox' : 'Production'
      };

    } catch (error: any) {
      console.error('❌ [Apple] Receipt verification failed:', error.message);
      return {
        success: false,
        subscriptionStatus: 'expired',
        productId: '',
        planName: '',
        expiresDate: 0,
        originalTransactionId: '',
        environment: 'Production',
        error: error.message
      };
    }
  }

  /**
   * 处理服务器通知 (Webhook)
   */
  async handleServerNotification(notification: AppleServerNotification): Promise<AppleDecodedPayload | null> {
    try {
      console.log('📩 [Apple] Processing server notification');

      // 解码签名的负载
      const payload = await this.decodeSignedPayload(notification.signedPayload);

      console.log(`   Notification Type: ${payload.notificationType}`);
      console.log(`   UUID: ${payload.notificationUUID}`);
      console.log(`   Environment: ${payload.data.environment}`);

      return payload;

    } catch (error: any) {
      console.error('❌ [Apple] Failed to process notification:', error.message);
      return null;
    }
  }

  /**
   * 解码签名的负载 (JWS)
   */
  private async decodeSignedPayload(signedPayload: string): Promise<AppleDecodedPayload> {
    // 简单解码JWT
    const decoded = decodeJwt(signedPayload) as any;

    return {
      notificationType: decoded.notificationType,
      subtype: decoded.subtype,
      data: decoded.data,
      notificationUUID: decoded.notificationUUID
    };
  }

  /**
   * 获取订阅状态
   */
  async getSubscriptionStatus(originalTransactionId: string): Promise<SubscriptionStatus> {
    try {
      const jwt = await this.generateJWT();

      // 获取订阅状态
      const response = await fetch(
        `${PRODUCTION_URL}/inApps/v1/subscriptions/${originalTransactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        // 尝试沙盒环境
        const sandboxResponse = await fetch(
          `${SANDBOX_URL}/inApps/v1/subscriptions/${originalTransactionId}`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!sandboxResponse.ok) {
          return 'expired';
        }

        const data = await sandboxResponse.json();
        return this.parseSubscriptionStatus(data);
      }

      const data = await response.json();
      return this.parseSubscriptionStatus(data);

    } catch (error: any) {
      console.error('❌ [Apple] Failed to get subscription status:', error.message);
      return 'expired';
    }
  }

  /**
   * 解析订阅状态
   */
  private parseSubscriptionStatus(data: any): SubscriptionStatus {
    const lastTransaction = data.data?.[0]?.lastTransactions?.[0];
    if (!lastTransaction) return 'expired';

    const transactionInfo = decodeJwt(lastTransaction.signedTransactionInfo) as any;
    const expiresDate = transactionInfo.expiresDate;
    const now = Date.now();

    if (expiresDate > now) {
      return 'active';
    } else {
      return 'expired';
    }
  }
}

// 导出单例
export const appleStoreService = new AppleStoreService();
