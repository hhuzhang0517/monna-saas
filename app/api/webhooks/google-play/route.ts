/**
 * Google Play Real-time Developer Notifications (RTDN) Webhook
 * POST /api/webhooks/google-play
 *
 * 接收Google Play的实时通知,处理订阅状态变更
 */

import { NextRequest, NextResponse } from 'next/server';
import { googlePlayService } from '@/lib/mobile-subscriptions/google-play';
import { createSupabaseServiceRole } from '@/lib/supabase/server';
import CreditManager from '@/lib/credits/credit-manager';
import { SUBSCRIPTION_PLANS } from '@/lib/mobile-subscriptions/types';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n========== GOOGLE PLAY WEBHOOK START (${timestamp}) ==========`);

  try {
    // 1. 解析Pub/Sub消息
    const body = await request.json();

    console.log('🤖 [Google Play Webhook] Notification received');

    // 2. 处理通知
    const notification = await googlePlayService.handleDeveloperNotification(body);

    if (!notification) {
      console.error('❌ [Google Play Webhook] Failed to parse notification');
      return NextResponse.json({ received: true });
    }

    // 3. 处理测试通知
    if (notification.testNotification) {
      console.log('✅ [Google Play Webhook] Test notification received');
      return NextResponse.json({ received: true });
    }

    // 4. 处理订阅通知
    if (!notification.subscriptionNotification) {
      console.log('⚠️ [Google Play Webhook] Not a subscription notification');
      return NextResponse.json({ received: true });
    }

    const subNotification = notification.subscriptionNotification;

    console.log(`   Notification Type: ${getNotificationTypeName(subNotification.notificationType)}`);
    console.log(`   Subscription ID: ${subNotification.subscriptionId}`);
    console.log(`   Purchase Token: ${subNotification.purchaseToken.substring(0, 20)}...`);

    // 5. 查找对应的订阅记录
    const supabase = createSupabaseServiceRole();
    const { data: subscription, error: subError } = await supabase
      .from('mobile_subscriptions')
      .select('*')
      .eq('platform', 'google')
      .eq('latest_transaction_id', subNotification.purchaseToken)
      .single();

    if (subError || !subscription) {
      console.warn(`⚠️ [Google Play Webhook] No subscription found for token: ${subNotification.purchaseToken.substring(0, 20)}...`);

      // 对于新购买,尝试使用productId查找最近的记录
      if (subNotification.notificationType === 4) { // SUBSCRIPTION_PURCHASED
        console.log('   Trying to find by product_id for new purchase...');
        // 这种情况通常在客户端已调用verify API后不会发生
      }

      return NextResponse.json({ received: true });
    }

    console.log(`   Found subscription: ${subscription.id}`);
    console.log(`   User ID: ${subscription.user_id}`);
    console.log(`   Team ID: ${subscription.team_id}`);

    // 6. 根据通知类型处理
    switch (subNotification.notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        console.log('✅ [Google Play Webhook] Subscription recovered');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        await supabase
          .from('teams')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);
        break;

      case 2: // SUBSCRIPTION_RENEWED
        console.log('✅ [Google Play Webhook] Subscription renewed');

        // 获取最新的订阅详情
        const purchaseDetails = await googlePlayService.getSubscriptionDetails(
          subNotification.purchaseToken,
          subNotification.subscriptionId
        );

        if (purchaseDetails) {
          await supabase
            .from('mobile_subscriptions')
            .update({
              status: 'active',
              expires_date: new Date(parseInt(purchaseDetails.expiryTimeMillis)).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          // 分配新的积分
          const planConfig = SUBSCRIPTION_PLANS[subscription.plan_name];
          if (planConfig) {
            await CreditManager.allocateSubscriptionCredits({
              teamId: subscription.team_id,
              planName: subscription.plan_name,
              supabaseClient: supabase
            });
            console.log(`✅ [Google Play Webhook] Allocated ${planConfig.credits} credits`);
          }
        }
        break;

      case 3: // SUBSCRIPTION_CANCELED
        console.log('⚠️ [Google Play Webhook] Subscription canceled');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'cancelled',
            auto_renewing: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        break;

      case 5: // SUBSCRIPTION_ON_HOLD
        console.log('⚠️ [Google Play Webhook] Subscription on hold');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'on_hold',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        await supabase
          .from('teams')
          .update({
            subscription_status: 'on_hold',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);
        break;

      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        console.log('⚠️ [Google Play Webhook] Subscription in grace period');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'in_grace_period',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        await supabase
          .from('teams')
          .update({
            subscription_status: 'in_grace_period',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);
        break;

      case 10: // SUBSCRIPTION_PAUSED
        console.log('⚠️ [Google Play Webhook] Subscription paused');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        break;

      case 12: // SUBSCRIPTION_REVOKED
        console.log('❌ [Google Play Webhook] Subscription revoked');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'expired',
            auto_renewing: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        // 降级为免费计划
        await supabase
          .from('teams')
          .update({
            plan_name: 'free',
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);
        break;

      case 13: // SUBSCRIPTION_EXPIRED
        console.log('❌ [Google Play Webhook] Subscription expired');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'expired',
            auto_renewing: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        // 降级为免费计划
        await supabase
          .from('teams')
          .update({
            plan_name: 'free',
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.team_id);
        break;

      default:
        console.log(`⚠️ [Google Play Webhook] Unhandled notification type: ${subNotification.notificationType}`);
    }

    console.log('✅ [Google Play Webhook] Notification processed successfully');
    console.log(`========== GOOGLE PLAY WEBHOOK END (${timestamp}) ==========\n`);

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ [Google Play Webhook] Error processing notification:', error.message);
    console.error('   Stack:', error.stack);
    console.log(`========== GOOGLE PLAY WEBHOOK END (${timestamp}) ==========\n`);

    // 仍然返回200,避免Google重试
    return NextResponse.json({ received: true });
  }
}

function getNotificationTypeName(type: number): string {
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
