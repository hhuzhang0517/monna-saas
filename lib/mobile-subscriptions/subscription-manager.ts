/**
 * 移动端订阅统一管理服务
 * 处理Apple和Google Play的订阅,同步到数据库
 */

import { createSupabaseServiceRole } from '@/lib/supabase/server';
import { appleStoreService } from './apple-store';
import { googlePlayService } from './google-play';
import CreditManager from '@/lib/credits/credit-manager';
import {
  SubscriptionPlatform,
  SubscriptionStatus,
  MobileSubscription,
  AppleVerificationRequest,
  GoogleVerificationRequest,
  MOBILE_SUBSCRIPTION_PLANS
} from './types';

/**
 * 移动订阅管理器
 */
export class MobileSubscriptionManager {

  /**
   * 验证并同步Apple订阅
   */
  async verifyAndSyncAppleSubscription(
    userId: string,
    request: AppleVerificationRequest
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('🔄 [SubscriptionManager] Verifying Apple subscription for user:', userId);

      // 1. 验证购买
      const verification = await appleStoreService.verifyPurchase(request);

      if (!verification.success) {
        return {
          success: false,
          error: verification.error || 'Verification failed'
        };
      }

      // 2. 检查该订阅是否已被其他用户使用
      const supabase = createSupabaseServiceRole();
      const { data: existingSubscription, error: checkError } = await supabase
        .from('mobile_subscriptions')
        .select('user_id, status, expires_date')
        .eq('platform', 'apple')
        .eq('original_transaction_id', verification.originalTransactionId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ [SubscriptionManager] Failed to check existing subscription:', checkError.message);
      }

      // 如果订阅已被其他用户使用且仍然有效
      if (existingSubscription && existingSubscription.user_id !== userId) {
        const expiresDate = new Date(existingSubscription.expires_date);
        const now = new Date();

        // 检查是否仍然有效（未过期）
        if (expiresDate > now && ['active', 'in_grace_period', 'cancelled'].includes(existingSubscription.status)) {
          console.warn(`⚠️ [SubscriptionManager] Subscription already owned by user: ${existingSubscription.user_id}`);
          return {
            success: false,
            error: '此订阅已绑定到其他账号。如需在当前账号使用，请先在原账号中取消订阅，或使用不同的Apple ID购买。'
          };
        } else {
          console.log('ℹ️ [SubscriptionManager] Existing subscription is expired, allowing transfer');
        }
      }

      // 3. 获取用户的team
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1);

      if (memberError || !memberData || memberData.length === 0) {
        throw new Error('No team found for user');
      }

      const teamId = memberData[0].team_id;

      // 4. 检查用户是否已有其他渠道的活跃订阅（跨渠道冲突检测）
      const conflictCheck = await this.checkCrossChannelSubscription(userId, teamId, 'apple');
      if (!conflictCheck.allowed) {
        return {
          success: false,
          error: conflictCheck.error || '您已有活跃订阅，无需重复购买'
        };
      }

      // 5. 保存/更新订阅记录
      await this.upsertSubscription({
        userId,
        teamId,
        platform: 'apple',
        productId: verification.productId,
        planName: verification.planName,
        status: verification.subscriptionStatus,
        originalTransactionId: verification.originalTransactionId,
        latestTransactionId: request.transactionId,
        expiresDate: new Date(verification.expiresDate),
        environment: verification.environment === 'Sandbox' ? 'sandbox' : 'production'
      });

      // 6. 同步订阅到team表（包含订阅来源）
      await this.syncSubscriptionToTeam(teamId, verification.planName, verification.subscriptionStatus, 'apple');

      // 7. 如果是活跃订阅,分配积分（使用移动端配置，credits减少30%）
      if (verification.subscriptionStatus === 'active') {
        const mobilePlanConfig = MOBILE_SUBSCRIPTION_PLANS[verification.planName];
        if (mobilePlanConfig) {
          // 使用移动端专用的credits配置（已减少30%）
          await CreditManager.chargeCredits({
            teamId,
            amount: mobilePlanConfig.credits,
            reason: `订阅激活: ${mobilePlanConfig.displayName} (Apple)`,
            planName: verification.planName,
            supabaseClient: supabase
          });

          console.log(`✅ [SubscriptionManager] Allocated ${mobilePlanConfig.credits} mobile credits to team ${teamId} (Apple, -30% for platform fee)`);
        }
      }

      console.log('✅ [SubscriptionManager] Apple subscription synced successfully');
      return {
        success: true,
        message: 'Subscription verified and activated'
      };

    } catch (error: any) {
      console.error('❌ [SubscriptionManager] Failed to sync Apple subscription:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证并同步Google Play订阅
   */
  async verifyAndSyncGoogleSubscription(
    userId: string,
    request: GoogleVerificationRequest
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('🔄 [SubscriptionManager] Verifying Google Play subscription for user:', userId);

      // 1. 验证购买
      const verification = await googlePlayService.verifyPurchase(request);

      if (!verification.success) {
        return {
          success: false,
          error: verification.error || 'Verification failed'
        };
      }

      // 2. 检查该订阅是否已被其他用户使用
      const supabase = createSupabaseServiceRole();
      const { data: existingSubscription, error: checkError } = await supabase
        .from('mobile_subscriptions')
        .select('user_id, status, expires_date')
        .eq('platform', 'google')
        .eq('original_transaction_id', verification.orderId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ [SubscriptionManager] Failed to check existing subscription:', checkError.message);
      }

      // 如果订阅已被其他用户使用且仍然有效
      if (existingSubscription && existingSubscription.user_id !== userId) {
        const expiresDate = new Date(existingSubscription.expires_date);
        const now = new Date();

        // 检查是否仍然有效（未过期）
        if (expiresDate > now && ['active', 'in_grace_period', 'cancelled'].includes(existingSubscription.status)) {
          console.warn(`⚠️ [SubscriptionManager] Subscription already owned by user: ${existingSubscription.user_id}`);
          return {
            success: false,
            error: '此订阅已绑定到其他账号。如需在当前账号使用，请先在原账号中取消订阅，或使用不同的Google Play账号购买。'
          };
        } else {
          console.log('ℹ️ [SubscriptionManager] Existing subscription is expired, allowing transfer');
        }
      }

      // 3. 获取用户的team（提前获取，用于后续检查）
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1);

      if (memberError || !memberData || memberData.length === 0) {
        throw new Error('No team found for user');
      }

      const teamId = memberData[0].team_id;

      // 4. 检查用户是否已有其他渠道的活跃订阅（跨渠道冲突检测）
      const conflictCheck = await this.checkCrossChannelSubscription(userId, teamId, 'google');
      if (!conflictCheck.allowed) {
        return {
          success: false,
          error: conflictCheck.error || '您已有活跃订阅，无需重复购买'
        };
      }

      // 5. 确认购买(Google Play要求)
      await googlePlayService.acknowledgePurchase(request.purchaseToken, request.productId);

      // 6. 保存/更新订阅记录
      await this.upsertSubscription({
        userId,
        teamId,
        platform: 'google',
        productId: verification.productId,
        planName: verification.planName,
        status: verification.subscriptionStatus,
        originalTransactionId: verification.orderId,
        latestTransactionId: request.purchaseToken,
        expiresDate: new Date(verification.expiresDate),
        environment: 'production'
      });

      // 7. 同步订阅到team表（包含订阅来源）
      await this.syncSubscriptionToTeam(teamId, verification.planName, verification.subscriptionStatus, 'google');

      // 8. 如果是活跃订阅,分配积分（使用移动端配置，credits减少30%）
      if (verification.subscriptionStatus === 'active') {
        const mobilePlanConfig = MOBILE_SUBSCRIPTION_PLANS[verification.planName];
        if (mobilePlanConfig) {
          // 使用移动端专用的credits配置（已减少30%）
          await CreditManager.chargeCredits({
            teamId,
            amount: mobilePlanConfig.credits,
            reason: `订阅激活: ${mobilePlanConfig.displayName} (Google Play)`,
            planName: verification.planName,
            supabaseClient: supabase
          });

          console.log(`✅ [SubscriptionManager] Allocated ${mobilePlanConfig.credits} mobile credits to team ${teamId} (Google Play, -30% for platform fee)`);
        }
      }

      console.log('✅ [SubscriptionManager] Google Play subscription synced successfully');
      return {
        success: true,
        message: 'Subscription verified and activated'
      };

    } catch (error: any) {
      console.error('❌ [SubscriptionManager] Failed to sync Google subscription:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 保存或更新订阅记录
   */
  private async upsertSubscription(subscription: {
    userId: string;
    teamId: number;
    platform: SubscriptionPlatform;
    productId: string;
    planName: string;
    status: SubscriptionStatus;
    originalTransactionId: string;
    latestTransactionId: string;
    expiresDate: Date;
    environment: 'sandbox' | 'production';
  }): Promise<void> {
    const supabase = createSupabaseServiceRole();

    // 检查是否已存在订阅记录
    const { data: existing } = await supabase
      .from('mobile_subscriptions')
      .select('*')
      .eq('user_id', subscription.userId)
      .eq('platform', subscription.platform)
      .eq('original_transaction_id', subscription.originalTransactionId)
      .single();

    if (existing) {
      // 更新现有记录
      const { error } = await supabase
        .from('mobile_subscriptions')
        .update({
          status: subscription.status,
          latest_transaction_id: subscription.latestTransactionId,
          expires_date: subscription.expiresDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      }

      console.log(`✅ [SubscriptionManager] Updated subscription record: ${existing.id}`);
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('mobile_subscriptions')
        .insert({
          user_id: subscription.userId,
          team_id: subscription.teamId,
          platform: subscription.platform,
          product_id: subscription.productId,
          plan_name: subscription.planName,
          status: subscription.status,
          original_transaction_id: subscription.originalTransactionId,
          latest_transaction_id: subscription.latestTransactionId,
          purchase_date: new Date().toISOString(),
          expires_date: subscription.expiresDate.toISOString(),
          auto_renewing: subscription.status === 'active',
          environment: subscription.environment,
          metadata: {}
        });

      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      console.log('✅ [SubscriptionManager] Created new subscription record');
    }
  }

  /**
   * 检查跨渠道订阅冲突
   * 防止用户在不同渠道重复订阅
   */
  private async checkCrossChannelSubscription(
    userId: string,
    teamId: number,
    currentPlatform: 'apple' | 'google'
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      const supabase = createSupabaseServiceRole();

      // 1. 检查用户是否在其他移动平台有活跃订阅
      const otherPlatform = currentPlatform === 'apple' ? 'google' : 'apple';
      const { data: otherMobileSubscription } = await supabase
        .from('mobile_subscriptions')
        .select('platform, plan_name, status, expires_date')
        .eq('user_id', userId)
        .eq('platform', otherPlatform)
        .in('status', ['active', 'in_grace_period'])
        .maybeSingle();

      if (otherMobileSubscription) {
        const expiresDate = new Date(otherMobileSubscription.expires_date);
        const now = new Date();

        if (expiresDate > now) {
          const platformName = otherPlatform === 'apple' ? 'iOS' : 'Android';
          return {
            allowed: false,
            error: `您已在${platformName}订阅${otherMobileSubscription.plan_name}套餐，无需重复购买。所有功能已在当前设备生效。`
          };
        }
      }

      // 2. 检查用户是否在Web端有活跃订阅
      const { data: team } = await supabase
        .from('teams')
        .select('subscription_status, subscription_source, plan_name, stripe_subscription_id')
        .eq('id', teamId)
        .single();

      if (team?.stripe_subscription_id &&
          team.subscription_status === 'active' &&
          team.subscription_source === 'web') {
        return {
          allowed: false,
          error: `您已在Web端订阅${team.plan_name}套餐，无需在移动端重复购买。所有功能已自动同步到移动端。`
        };
      }

      // 3. 通过所有检查，允许订阅
      console.log('✅ [SubscriptionManager] No cross-channel subscription conflict');
      return { allowed: true };

    } catch (error: any) {
      console.error('❌ [SubscriptionManager] Failed to check cross-channel subscription:', error.message);
      // 检查失败时，为了安全起见，拒绝订阅
      return {
        allowed: false,
        error: '订阅检查失败，请稍后重试'
      };
    }
  }

  /**
   * 同步订阅到team表
   */
  private async syncSubscriptionToTeam(
    teamId: number,
    planName: string,
    status: SubscriptionStatus,
    subscriptionSource?: 'web' | 'apple' | 'google'
  ): Promise<void> {
    const supabase = createSupabaseServiceRole();

    const updateData: any = {
      plan_name: planName,
      subscription_status: status,
      updated_at: new Date().toISOString()
    };

    // 如果提供了订阅来源，则更新
    if (subscriptionSource) {
      updateData.subscription_source = subscriptionSource;
    }

    const { error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId);

    if (error) {
      throw new Error(`Failed to update team subscription: ${error.message}`);
    }

    console.log(`✅ [SubscriptionManager] Updated team ${teamId} to plan: ${planName}, status: ${status}, source: ${subscriptionSource || 'N/A'}`);
  }

  /**
   * 获取用户的订阅状态
   */
  async getUserSubscription(userId: string): Promise<MobileSubscription | null> {
    const supabase = createSupabaseServiceRole();

    // 查找最新的活跃订阅
    const { data, error } = await supabase
      .from('mobile_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'in_grace_period', 'cancelled'])
      .order('expires_date', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as MobileSubscription;
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(
    userId: string,
    platform: SubscriptionPlatform
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // 获取订阅记录
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || subscription.platform !== platform) {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      // 根据平台取消订阅
      if (platform === 'apple') {
        // Apple不支持服务器端取消,引导用户到设置
        return {
          success: false,
          error: 'Please cancel your subscription through the App Store settings'
        };
      } else {
        // Google Play可以服务器端取消
        const cancelled = await googlePlayService.cancelSubscription(
          subscription.latest_transaction_id,
          subscription.product_id
        );

        if (!cancelled) {
          return {
            success: false,
            error: 'Failed to cancel subscription'
          };
        }

        // 更新订阅状态
        const supabase = createSupabaseServiceRole();
        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        return {
          success: true,
          message: 'Subscription cancelled successfully'
        };
      }

    } catch (error: any) {
      console.error('❌ [SubscriptionManager] Failed to cancel subscription:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查并更新过期订阅
   * 定时任务调用
   */
  async checkExpiredSubscriptions(): Promise<number> {
    try {
      console.log('🔍 [SubscriptionManager] Checking for expired subscriptions');

      const supabase = createSupabaseServiceRole();
      const now = new Date().toISOString();

      // 查找所有应该过期但状态未更新的订阅
      const { data: subscriptions, error } = await supabase
        .from('mobile_subscriptions')
        .select('*')
        .in('status', ['active', 'in_grace_period'])
        .lt('expires_date', now);

      if (error || !subscriptions) {
        throw new Error(`Failed to query subscriptions: ${error?.message}`);
      }

      let updatedCount = 0;

      for (const subscription of subscriptions) {
        // 更新订阅状态为过期
        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        // 同步到team表,降级为免费计划
        await supabase
          .from('teams')
          .update({
            plan_name: 'free',
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);

        updatedCount++;
        console.log(`✅ [SubscriptionManager] Expired subscription: ${subscription.id}`);
      }

      console.log(`✅ [SubscriptionManager] Updated ${updatedCount} expired subscriptions`);
      return updatedCount;

    } catch (error: any) {
      console.error('❌ [SubscriptionManager] Failed to check expired subscriptions:', error.message);
      return 0;
    }
  }
}

// 导出单例
export const mobileSubscriptionManager = new MobileSubscriptionManager();
