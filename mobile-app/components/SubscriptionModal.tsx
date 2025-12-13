/**
 * 订阅模态窗口组件
 * 在用户尝试使用付费功能时弹出，引导用户订阅
 * 基于现有 subscription.tsx 改造为 Modal 形式
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import { useSubscription } from '@/lib/contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '@/lib/purchases/config';
import { useTranslation } from '@/lib/contexts/i18n-context';
import Constants from 'expo-constants';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed: () => void; // 订阅成功后的回调
  reason?: string; // 触发订阅的原因（如："图片生成"、"视频生成"）
}

// 检查是否在 Expo Go 中运行
function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function SubscriptionModal({ 
  visible, 
  onClose, 
  onSubscribed,
  reason = '使用高级功能',
}: SubscriptionModalProps) {
  const { t } = useTranslation();
  const {
    purchase,
    restorePurchases,
    isLoading: contextLoading,
  } = useSubscription();

  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // 处理购买
  const handlePurchase = async (planId: string) => {
    // 在 Expo Go 中，订阅功能不可用
    if (isRunningInExpoGo()) {
      Alert.alert(
        t('subscription.featureUnavailable', '功能不可用'),
        t('subscription.expoGoMessage', '应用内购买在 Expo Go 中不可用。\n\n要测试订阅功能：\n1. 创建 Development Build\n2. 或使用 iOS 模拟器 / Android 模拟器\n3. 或在真机上安装开发版本'),
        [{ text: t('subscription.understand', '知道了') }]
      );
      return;
    }

    try {
      setPurchasing(true);
      setSelectedPlan(planId);

      console.log('🛒 开始购买套餐:', planId);
      const success = await purchase(planId);

      if (success) {
        // 订阅成功
        console.log('✅ 订阅成功');
        Alert.alert(
          t('subscription.subscribeSuccess', '订阅成功'),
          t('subscription.subscribeSuccessMessage', '感谢您的订阅！正在为您激活功能...'),
          [
            { 
              text: t('common.ok', '好的'), 
              onPress: () => {
                onSubscribed(); // 调用回调，自动继续用户操作
                onClose();
              }
            }
          ]
        );
      } else {
        console.warn('⚠️ 购买未完成');
        Alert.alert(
          t('subscription.purchaseNotCompleted', '购买未完成'),
          t('subscription.purchaseNotCompletedMessage', '购买未能完成。\n\n可能原因：\n• 您取消了购买\n• 产品配置问题\n• 网络连接问题\n\n如果问题持续，请联系客服。'),
          [{ text: t('common.ok', '好的') }]
        );
      }
    } catch (error: any) {
      console.error('❌ 购买失败:', error);

      let errorTitle = t('subscription.purchaseFailed', '购买失败');
      let errorMessage = '';

      if (error.code === 'PRODUCT_NOT_AVAILABLE') {
        errorTitle = '产品暂时不可用';
        errorMessage = '该订阅产品暂时无法购买。\n\n可能原因：\n• 产品还在审核中\n• 产品配置未完成\n\n请稍后再试或联系客服。';
      } else if (error.code === 'PURCHASE_CANCELLED') {
        errorTitle = '购买已取消';
        errorMessage = '您已取消此次购买。';
      } else if (error.code === 'NETWORK_ERROR') {
        errorTitle = '网络错误';
        errorMessage = '网络连接失败，请检查您的网络设置后重试。';
      } else if (error.code === 'PURCHASE_NOT_ALLOWED' || error.message?.includes('已订阅') || error.message?.includes('already')) {
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
    if (isRunningInExpoGo()) {
      Alert.alert(
        t('subscription.featureUnavailable', '功能不可用'),
        t('subscription.expoGoMessage', '应用内购买在 Expo Go 中不可用。'),
        [{ text: t('subscription.understand', '知道了') }]
      );
      return;
    }

    try {
      setRestoring(true);
      const success = await restorePurchases();

      if (success) {
        Alert.alert(
          t('subscription.restoreSuccess', '恢复成功'),
          t('subscription.restoreSuccessMessage', '您的订阅已恢复！'),
          [
            { 
              text: t('common.ok', '好的'), 
              onPress: () => {
                onSubscribed(); // 调用回调
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('subscription.noSubscriptionFound', '未找到订阅'),
          t('subscription.noSubscriptionFoundMessage', '未找到可恢复的订阅。'),
          [{ text: t('common.ok', '好的') }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('subscription.restoreFailed', '恢复失败'),
        error.message || t('subscription.restoreFailedMessage', '无法恢复订阅，请稍后重试。'),
        [{ text: t('common.ok', '好的') }]
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 关闭按钮 */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            disabled={purchasing || restoring}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={styles.title}>解锁完整功能</Text>
            <Text style={styles.subtitle}>
              订阅后可{reason}，享受更多AI创作体验
            </Text>
          </View>

          {/* 订阅套餐列表 */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.plansContainer}
            showsVerticalScrollIndicator={false}
          >
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isBuying = purchasing && selectedPlan === plan.id;
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.highlighted && styles.planCardHighlighted,
                  ]}
                  onPress={() => handlePurchase(plan.id)}
                  disabled={purchasing || restoring}
                  activeOpacity={0.8}
                >
                  {/* 推荐标签 */}
                  {plan.highlighted && (
                    <View style={styles.recommendedBadge}>
                      <Ionicons name="star" size={12} color="#FFFFFF" />
                      <Text style={styles.recommendedText}>推荐</Text>
                    </View>
                  )}

                  <View style={styles.planContent}>
                    {/* 计划名称和价格 */}
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceSymbol}>$</Text>
                        <Text style={styles.priceAmount}>{plan.price.usd}</Text>
                        <Text style={styles.pricePeriod}>/{t('pricing.interval.month', 'mo')}</Text>
                      </View>
                    </View>

                    <Text style={styles.planDescription}>{plan.description}</Text>

                    {/* 功能列表（只显示前3个） */}
                    <View style={styles.featuresContainer}>
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    {/* 订阅按钮 */}
                    <View
                      style={[
                        styles.purchaseButton,
                        plan.highlighted && styles.purchaseButtonHighlighted,
                        isBuying && styles.purchaseButtonDisabled,
                      ]}
                    >
                      {isBuying ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.purchaseButtonText}>
                          {t('subscription.subscribe', '立即订阅')}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 底部操作 */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={purchasing || restoring}
              style={styles.restoreButton}
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#6B7280" />
                  <Text style={styles.restoreButtonText}>
                    {t('subscription.restorePurchases', '恢复购买')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              • {t('subscription.autoRenewNote', '订阅将自动续订，除非在当前周期结束前至少24小时取消')}{'\n'}
              • {t('subscription.managedByNote', `订阅由 ${Platform.OS === 'ios' ? 'Apple' : 'Google'} 管理`)}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    maxHeight: 400,
  },
  plansContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
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
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planContent: {
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  pricePeriod: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  planDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  featuresContainer: {
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#D1D5DB',
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    alignItems: 'center',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  restoreButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  footerNote: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
});

