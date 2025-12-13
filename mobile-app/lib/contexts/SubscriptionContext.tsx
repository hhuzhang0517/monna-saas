/**
 * 订阅状态上下文
 * 提供全局的订阅状态管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import {
  initializePurchases,
  getOfferings,
  getCustomerInfo,
  hasActiveSubscription,
  getCurrentPlan,
  purchasePackage,
  restorePurchases as restorePurchasesService,
  openSubscriptionManagement,
} from '../purchases/service';
import { REVENUECAT_CONFIG } from '../purchases/config';
import { useAuth } from './auth-context';

interface SubscriptionContextType {
  // 状态
  isLoading: boolean;
  currentPlan: string | null;
  hasSubscription: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering[];

  // 方法
  refreshSubscription: () => Promise<void>;
  purchase: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  openManagement: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>('free');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);

  // 初始化 RevenueCat
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    initializeRevenueCat();
  }, [user]);

  // 监听订阅状态变化
  useEffect(() => {
    if (!user) return;

    const customerInfoUpdateListener = (info: CustomerInfo) => {
      console.log('📊 Customer info updated');
      updateSubscriptionState(info);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
    };
  }, [user]);

  async function initializeRevenueCat() {
    try {
      setIsLoading(true);

      if (!user) {
        console.log('⚠️ No user, skipping RevenueCat initialization');
        return;
      }

      // 初始化 SDK
      await initializePurchases(user.id);

      // 获取当前订阅信息
      const info = await getCustomerInfo();
      if (info) {
        updateSubscriptionState(info);
      }

      // 获取可用套餐
      const availableOfferings = await getOfferings();
      setOfferings(availableOfferings);

      console.log('✅ Subscription context initialized');
    } catch (error) {
      console.error('❌ Failed to initialize subscription context:', error);
      // 在 Expo Go 中失败是预期的，不需要抛出错误
    } finally {
      setIsLoading(false);
    }
  }

  function updateSubscriptionState(info: CustomerInfo) {
    setCustomerInfo(info);

    const activeEntitlements = Object.keys(info.entitlements.active);
    setHasSubscription(activeEntitlements.length > 0);

    // 确定当前计划
    let plan = 'free';
    if (activeEntitlements.includes('enterprise')) {
      plan = 'enterprise';
    } else if (activeEntitlements.includes('pro')) {
      plan = 'pro';
    } else if (activeEntitlements.includes('basic')) {
      plan = 'basic';
    }
    setCurrentPlan(plan);

    console.log('📊 Subscription state updated:', {
      plan,
      hasSubscription: activeEntitlements.length > 0,
      activeEntitlements,
    });
  }

  async function refreshSubscription() {
    try {
      setIsLoading(true);
      const info = await getCustomerInfo();
      if (info) {
        updateSubscriptionState(info);
      }
    } catch (error) {
      console.error('❌ Failed to refresh subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function purchase(planId: string): Promise<boolean> {
    try {
      console.log('🛒 Starting purchase for plan:', planId);
      console.log('📦 Available offerings:', offerings.length);

      // 获取对应的产品ID（来自配置）
      const productConfig = REVENUECAT_CONFIG.products[planId as keyof typeof REVENUECAT_CONFIG.products];
      if (!productConfig) {
        console.error('❌ Product config not found for plan:', planId);
        return false;
      }

      const productId = Platform.OS === 'ios' ? productConfig.ios : productConfig.android;
      console.log('🎯 Looking for product ID:', productId);

      // 查找包含该产品的 package
      let targetPackage = null;

      for (const offering of offerings) {
        console.log('📋 Checking offering:', offering.identifier);
        console.log('📦 Available packages:', offering.availablePackages.length);

        for (const pkg of offering.availablePackages) {
          console.log('  Package:', pkg.identifier, 'Product:', pkg.product.identifier);

          // 通过产品ID匹配（去除权益后缀）
          // RevenueCat可能会返回带有权益后缀的产品ID，如 "com.monna.app.basic.monthly:basic"
          // 我们需要去除后缀进行匹配
          const productIdBase = pkg.product.identifier.split(':')[0];
          if (productIdBase === productId) {
            targetPackage = pkg;
            console.log('✅ Found matching package:', pkg.identifier);
            break;
          }
        }

        if (targetPackage) break;
      }

      if (!targetPackage) {
        console.error('❌ Package not found for product:', productId);
        console.error('Available products:',
          offerings.flatMap(o => o.availablePackages.map(p => p.product.identifier))
        );
        return false;
      }

      console.log('💳 Purchasing package:', targetPackage.identifier);
      const result = await purchasePackage(targetPackage);

      if (result.success) {
        console.log('✅ Purchase successful');
        updateSubscriptionState(result.customerInfo);
      } else {
        console.log('⚠️ Purchase was not successful');
      }

      return result.success;
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      return false;
    }
  }

  async function restorePurchases(): Promise<boolean> {
    try {
      setIsLoading(true);
      const info = await restorePurchasesService();
      if (info) {
        updateSubscriptionState(info);
      }
      return true;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function openManagement() {
    try {
      await openSubscriptionManagement();
    } catch (error) {
      console.error('❌ Failed to open management:', error);
    }
  }

  const value: SubscriptionContextType = {
    isLoading,
    currentPlan,
    hasSubscription,
    customerInfo,
    offerings,
    refreshSubscription,
    purchase,
    restorePurchases,
    openManagement,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
