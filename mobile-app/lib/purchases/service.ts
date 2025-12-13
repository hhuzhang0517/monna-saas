/**
 * RevenueCat 订阅服务
 * 封装所有订阅相关的操作
 */

import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import Constants from 'expo-constants';
import { REVENUECAT_CONFIG, getPlanByProductId } from './config';
import { supabase } from '../supabase/client';

/**
 * 检查是否在 Expo Go 中运行
 * Expo Go 不支持原生模块，包括 RevenueCat
 */
export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * 初始化 RevenueCat SDK
 * 必须在应用启动时调用
 */
export async function initializePurchases(userId: string): Promise<void> {
  try {
    // 在 Expo Go 中跳过初始化
    if (isRunningInExpoGo()) {
      console.log('⚠️ Running in Expo Go - Skipping RevenueCat initialization');
      console.log('💡 To test in-app purchases, create a development build');
      return;
    }

    console.log('🛒 Initializing RevenueCat with user:', userId);

    // 根据平台选择 API Key
    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_CONFIG.apiKeys.apple
      : REVENUECAT_CONFIG.apiKeys.google;

    if (!apiKey) {
      console.error('❌ RevenueCat API key not configured for platform:', Platform.OS);
      throw new Error('RevenueCat API key not configured');
    }

    // 配置 SDK
    Purchases.configure({
      apiKey,
      appUserID: userId, // 使用 Supabase User ID
    });

    // 设置调试日志级别 (生产环境应关闭)
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
    throw error;
  }
}

/**
 * 获取可用的订阅套餐
 */
export async function getOfferings(): Promise<PurchasesOffering[]> {
  try {
    if (isRunningInExpoGo()) {
      console.log('⚠️ Running in Expo Go - No offerings available');
      return [];
    }

    console.log('🛍️ Fetching offerings...');
    const offerings = await Purchases.getOfferings();

    if (offerings.current) {
      console.log('✅ Current offering:', offerings.current.identifier);
      console.log('📦 Available packages:', offerings.current.availablePackages.length);
      return [offerings.current];
    }

    console.log('⚠️ No current offering configured in RevenueCat');
    return [];
  } catch (error) {
    console.error('❌ Failed to fetch offerings:', error);
    return [];
  }
}

/**
 * 购买订阅
 * @param packageToPurchase - RevenueCat 套餐对象
 * @returns 购买结果和用户信息
 */
export async function purchasePackage(
  packageToPurchase: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; success: boolean }> {
  try {
    if (isRunningInExpoGo()) {
      throw new Error('In-app purchases are not available in Expo Go. Please create a development build.');
    }

    console.log('💳 Starting purchase:', packageToPurchase.identifier);

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    console.log('✅ Purchase successful');
    console.log('📊 Active entitlements:', Object.keys(customerInfo.entitlements.active));

    // 同步订阅状态到后端
    await syncSubscriptionToBackend(customerInfo);

    return {
      customerInfo,
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Purchase failed:', error);

    // 处理用户取消购买
    if (error.userCancelled) {
      console.log('ℹ️ User cancelled the purchase');
      return {
        customerInfo: await Purchases.getCustomerInfo(),
        success: false,
      };
    }

    throw error;
  }
}

/**
 * 恢复购买
 * 用户在新设备上登录时调用
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (isRunningInExpoGo()) {
      throw new Error('Restore purchases is not available in Expo Go. Please create a development build.');
    }

    console.log('🔄 Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();

    console.log('✅ Purchases restored');
    console.log('📊 Active entitlements:', Object.keys(customerInfo.entitlements.active));

    // 同步到后端
    await syncSubscriptionToBackend(customerInfo);

    return customerInfo;
  } catch (error) {
    console.error('❌ Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * 获取当前用户的订阅信息
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (isRunningInExpoGo()) {
      console.log('⚠️ Running in Expo Go - No customer info available');
      return null;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('❌ Failed to get customer info:', error);
    throw error;
  }
}

/**
 * 检查用户是否有活跃订阅
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    return activeEntitlements.length > 0;
  } catch (error) {
    console.error('❌ Failed to check subscription status:', error);
    return false;
  }
}

/**
 * 获取用户当前的订阅计划
 */
export async function getCurrentPlan(): Promise<string | null> {
  try {
    const customerInfo = await getCustomerInfo();
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);

    if (activeEntitlements.length === 0) {
      return 'free';
    }

    // 返回最高级别的订阅
    if (activeEntitlements.includes('enterprise')) return 'enterprise';
    if (activeEntitlements.includes('pro')) return 'pro';
    if (activeEntitlements.includes('basic')) return 'basic';

    return 'free';
  } catch (error) {
    console.error('❌ Failed to get current plan:', error);
    return 'free';
  }
}

/**
 * 同步订阅状态到后端 Supabase
 * 这样 Web 端和移动端的订阅状态可以保持一致
 */
async function syncSubscriptionToBackend(customerInfo: CustomerInfo): Promise<void> {
  try {
    console.log('🔄 Syncing subscription to backend...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('❌ No active session, cannot sync to backend');
      return;
    }

    // 提取订阅信息
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    let planKey = 'free';

    if (activeEntitlements.includes('enterprise')) {
      planKey = 'enterprise';
    } else if (activeEntitlements.includes('pro')) {
      planKey = 'pro';
    } else if (activeEntitlements.includes('basic')) {
      planKey = 'basic';
    }

    // 获取原始购买收据信息
    const originalAppUserId = customerInfo.originalAppUserId;
    const managementURL = customerInfo.managementURL;

    console.log('📤 Syncing plan:', planKey);
    console.log('👤 User ID:', originalAppUserId);

    // 调用后端 API 更新订阅状态
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/subscriptions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        planKey,
        provider: Platform.OS === 'ios' ? 'app_store' : 'google_play',
        originalAppUserId,
        managementURL,
        customerInfo: {
          activeEntitlements,
          latestExpirationDate: customerInfo.latestExpirationDate,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to sync to backend:', error);
      return;
    }

    console.log('✅ Successfully synced to backend');
  } catch (error) {
    console.error('❌ Error syncing to backend:', error);
    // 不抛出错误，因为购买已经成功了
  }
}

/**
 * 打开订阅管理页面
 * iOS: App Store 订阅管理
 * Android: Google Play 订阅管理
 */
export async function openSubscriptionManagement(): Promise<void> {
  try {
    const customerInfo = await getCustomerInfo();
    const managementURL = customerInfo.managementURL;

    if (managementURL) {
      // 在 React Native 中打开 URL
      const { Linking } = await import('react-native');
      await Linking.openURL(managementURL);
    } else {
      console.warn('⚠️ No management URL available');
    }
  } catch (error) {
    console.error('❌ Failed to open subscription management:', error);
    throw error;
  }
}

/**
 * 格式化价格显示
 */
export function formatPrice(product: PurchasesStoreProduct): string {
  return product.priceString;
}
