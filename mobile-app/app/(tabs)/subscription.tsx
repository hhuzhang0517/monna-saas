/**
 * 订阅页面
 * 显示所有可用的订阅套餐并支持购买
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/lib/contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '@/lib/purchases/config';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/lib/supabase/client';
import { getApiUrl } from '@/config/api';
import Constants from 'expo-constants';
import { useTranslation } from '@/lib/contexts/i18n-context';

// 检查是否在 Expo Go 中运行
function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    isLoading: contextLoading,
    currentPlan: contextPlan,
    hasSubscription,
    offerings,
    purchase,
    restorePurchases,
    openManagement,
  } = useSubscription();

  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>('free');
  const [isLoading, setIsLoading] = useState(true);

  // 从后端API获取用户的实际订阅信息
  React.useEffect(() => {
    loadUserSubscription();
  }, []);

  const loadUserSubscription = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCurrentPlan('free');
        setIsLoading(false);
        return;
      }

      // 调用后端API获取用户统计信息（包含订阅计划）
      const response = await fetch(getApiUrl('api/user/stats'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const planName = data.planName || 'free';
        console.log('📊 从后端获取的订阅计划:', planName);
        setCurrentPlan(planName);
      } else {
        console.warn('⚠️ 获取订阅信息失败，使用默认值 free');
        setCurrentPlan('free');
      }
    } catch (error) {
      console.error('❌ 加载订阅信息失败:', error);
      setCurrentPlan('free');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理购买
  const handlePurchase = async (planId: string) => {
    // 在 Expo Go 中，订阅功能不可用
    if (isRunningInExpoGo()) {
      Alert.alert(
        t('subscription.featureUnavailable', 'Feature Unavailable'),
        t('subscription.expoGoMessage', 'In-app purchases are not available in Expo Go.\n\nTo test subscriptions:\n1. Create a Development Build\n2. Or use iOS Simulator / Android Emulator\n3. Or install development version on a real device'),
        [{ text: t('subscription.understand', 'Got it') }]
      );
      return;
    }

    try {
      setPurchasing(true);
      setSelectedPlan(planId);

      console.log('🛒 Starting purchase for plan:', planId);

      // 获取对应的 RevenueCat package identifier
      // 这里假设 package identifier 与 plan id 相同
      const success = await purchase(planId);

      if (success) {
        Alert.alert(
          t('subscription.subscribeSuccess', '订阅成功'),
          t('subscription.subscribeSuccessMessage', '感谢您的订阅！您现在可以享受所有功能。'),
          [{ text: t('common.ok', '好的'), onPress: () => loadUserSubscription() }]
        );
      } else {
        // 购买失败可能有多种原因，不一定是用户取消
        console.warn('⚠️ Purchase returned false - may be cancelled or product not found');
        Alert.alert(
          t('subscription.purchaseNotCompleted', '购买未完成'),
          t('subscription.purchaseNotCompletedMessage', '购买未能完成。可能原因：\n\n• 您取消了购买\n• 产品配置问题\n• 网络连接问题\n\n如果问题持续，请联系客服。'),
          [{ text: t('common.ok', '好的') }]
        );
      }
    } catch (error: any) {
      console.error('❌ Purchase error:', error);

      // 根据错误类型提供更详细的信息
      let errorTitle = t('subscription.purchaseFailed', '购买失败');
      let errorMessage = '';

      if (error.code === 'PRODUCT_NOT_AVAILABLE') {
        errorTitle = '产品暂时不可用';
        errorMessage = '该订阅产品暂时无法购买。\n\n这可能是因为：\n• 产品还在审核中\n• 产品配置未完成\n\n请稍后再试或联系客服。';
      } else if (error.code === 'PURCHASE_CANCELLED') {
        errorTitle = '购买已取消';
        errorMessage = '您已取消此次购买。';
      } else if (error.code === 'NETWORK_ERROR') {
        errorTitle = '网络错误';
        errorMessage = '网络连接失败，请检查您的网络设置后重试。';
      } else if (error.code === 'PURCHASE_NOT_ALLOWED' || error.message?.includes('已订阅') || error.message?.includes('already')) {
        // 用户已经订阅过了
        errorTitle = '订阅已存在';
        errorMessage = '您已经订阅了该计划。\n\n如需更改订阅，请前往订阅管理页面。';
      } else if (error.message) {
        errorMessage = `${error.message}\n\n如果问题持续，请联系客服。`;
      } else {
        errorMessage = t('subscription.purchaseFailedMessage', '无法完成购买，请稍后重试。\n\n如果问题持续，请联系客服。');
      }

      Alert.alert(errorTitle, errorMessage, [{ text: t('common.ok', '好的') }]);
    } finally {
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  // 恢复购买
  const handleRestore = async () => {
    // 在 Expo Go 中，订阅功能不可用
    if (isRunningInExpoGo()) {
      Alert.alert(
        t('subscription.featureUnavailable', 'Feature Unavailable'),
        t('subscription.expoGoMessage', 'In-app purchases are not available in Expo Go.'),
        [{ text: t('subscription.understand', 'Got it') }]
      );
      return;
    }

    try {
      setPurchasing(true);
      const success = await restorePurchases();

      if (success) {
        Alert.alert(
          t('subscription.restoreSuccess', 'Restore Successful'),
          t('subscription.restoreSuccessMessage', 'Your subscription has been restored!'),
          [{ text: t('common.ok', 'OK'), onPress: () => loadUserSubscription() }]
        );
      } else {
        Alert.alert(
          t('subscription.noSubscriptionFound', 'No Subscription Found'),
          t('subscription.noSubscriptionFoundMessage', 'No subscription to restore was found.'),
          [{ text: t('common.ok', 'OK') }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('subscription.restoreFailed', 'Restore Failed'),
        error.message || t('subscription.restoreFailedMessage', 'Unable to restore subscription, please try again later.'),
        [{ text: t('common.ok', 'OK') }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  // 管理订阅
  const handleManage = async () => {
    try {
      await openManagement();
    } catch (error) {
      Alert.alert(
        t('subscription.cannotOpen', 'Cannot Open'),
        t('subscription.cannotOpenMessage', 'Unable to open subscription management page, please try again later.'),
        [{ text: t('common.ok', 'OK') }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 导航栏 */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t('subscription.title', 'Subscription Plans')}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 导航栏 */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('subscription.title', 'Subscription Plans')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscription.title', 'Subscription Plans')}</Text>
        <Text style={styles.subtitle}>
          {t('subscription.subtitle', 'Unlock powerful AI generation capabilities')}
        </Text>
        
        {/* 调试信息 */}
        {__DEV__ && (
          <Text style={{ color: '#FF6B00', marginTop: 10, fontSize: 12 }}>
            Debug: currentPlan = {currentPlan || 'null/undefined'}
          </Text>
        )}

        {/* 当前计划状态 */}
        {currentPlan && currentPlan !== 'free' && (
          <View style={styles.currentPlanBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.currentPlanText}>
              {t('subscription.currentSubscription', 'Current Subscription')}: {SUBSCRIPTION_PLANS.find(p => p.id === currentPlan)?.name || t('generate.unknownError', 'Unknown')}
            </Text>
          </View>
        )}
      </View>

      {/* 订阅卡片 */}
      <View style={styles.plansContainer}>
        {SUBSCRIPTION_PLANS.map((plan, planIndex) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isBuying = purchasing && selectedPlan === plan.id;
          
          // 获取当前用户计划的索引
          const currentPlanIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === currentPlan);
          // 判断该计划是否低于当前计划
          const isBelowCurrentPlan = currentPlanIndex >= 0 && planIndex < currentPlanIndex;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                plan.highlighted && styles.planCardHighlighted,
                isCurrentPlan && styles.planCardActive,
                isBelowCurrentPlan && styles.planCardDisabled,
              ]}
              onPress={() => !isCurrentPlan && !isBelowCurrentPlan && handlePurchase(plan.id)}
              disabled={purchasing || isCurrentPlan || isBelowCurrentPlan}
              activeOpacity={0.8}
            >
              {/* 推荐标签 */}
              {plan.highlighted && !isBelowCurrentPlan && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>{t('pricing.mostPopular', 'Most Popular')}</Text>
                </View>
              )}

              {/* 当前订阅标签 */}
              {isCurrentPlan && (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.activeText}>{t('subscription.subscribed', 'Subscribed')}</Text>
                </View>
              )}

              <View style={styles.planContent}>
                {/* 计划名称 */}
                <Text style={[
                  styles.planName,
                  isBelowCurrentPlan && styles.textDisabled
                ]}>{plan.name}</Text>
                <Text style={[
                  styles.planDescription,
                  isBelowCurrentPlan && styles.textDisabled
                ]}>{plan.description}</Text>

                {/* 价格 */}
                <View style={styles.priceContainer}>
                  <Text style={[
                    styles.priceSymbol,
                    isBelowCurrentPlan && styles.textDisabled
                  ]}>$</Text>
                  <Text style={[
                    styles.priceAmount,
                    isBelowCurrentPlan && styles.textDisabled
                  ]}>{plan.price.usd}</Text>
                  <Text style={[
                    styles.pricePeriod,
                    isBelowCurrentPlan && styles.textDisabled
                  ]}>/{t('pricing.interval.month', 'mo')}</Text>
                </View>

                {/* 功能列表 */}
                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons 
                        name="checkmark" 
                        size={18} 
                        color={isBelowCurrentPlan ? "#4B5563" : "#10B981"} 
                      />
                      <Text style={[
                        styles.featureText,
                        isBelowCurrentPlan && styles.textDisabled
                      ]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* 购买按钮 */}
                {isCurrentPlan ? (
                  // 当前订阅 - 显示灰色不可点击"当前计划"按钮
                  <View style={styles.currentPlanButton}>
                    <Text style={styles.currentPlanButtonText}>{t('pricing.currentPlan', 'Current Plan')}</Text>
                  </View>
                ) : isBelowCurrentPlan ? (
                  // 低于当前订阅 - 显示灰色不可点击"已订阅更高档"按钮
                  <View style={styles.disabledButton}>
                    <Text style={styles.disabledButtonText}>{t('subscription.subscribed', 'Subscribed')}</Text>
                  </View>
                ) : (
                  // 高于当前订阅或未订阅 - 显示可点击的"立即开始"按钮
                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      plan.highlighted && styles.purchaseButtonHighlighted,
                      isBuying && styles.purchaseButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(plan.id)}
                    disabled={purchasing}
                  >
                    {isBuying ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.purchaseButtonText}>
                        {t('subscription.subscribe', 'Subscribe')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 底部操作 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchasing}
        >
          <Ionicons name="refresh" size={18} color="#6B7280" />
          <Text style={styles.restoreButtonText}>{t('subscription.restorePurchases', 'Restore Purchases')}</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          • {t('subscription.autoRenewNote', 'Subscription will auto-renew unless cancelled at least 24 hours before the end of the current period')}{'\n'}
          • {t('subscription.managedByNote', `Subscription managed by ${Platform.OS === 'ios' ? 'Apple' : 'Google'}`)}{'\n'}
          • {t('subscription.cancelNote', `To cancel, go to ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings`)}
        </Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10B98120',
    borderRadius: 20,
  },
  currentPlanText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  plansContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  planCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  planCardHighlighted: {
    borderColor: '#FF6B00',
  },
  planCardActive: {
    borderColor: '#10B981',
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: '#6B7280',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  activeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planContent: {
    padding: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  priceSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#D1D5DB',
  },
  purchaseButton: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonHighlighted: {
    backgroundColor: '#FF6B00',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currentPlanButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    opacity: 0.5,
  },
  disabledButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  manageButton: {
    backgroundColor: '#10B98120',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  restoreButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  footerNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
