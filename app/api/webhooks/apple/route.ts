/**
 * Apple App Store Server Notifications Webhook
 * POST /api/webhooks/apple
 *
 * 接收Apple的服务器通知,处理订阅状态变更
 */

import { NextRequest, NextResponse } from 'next/server';
import { appleStoreService } from '@/lib/mobile-subscriptions/apple-store';
import { createSupabaseServiceRole } from '@/lib/supabase/server';
import CreditManager from '@/lib/credits/credit-manager';
import { SUBSCRIPTION_PLANS } from '@/lib/mobile-subscriptions/types';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n========== APPLE WEBHOOK START (${timestamp}) ==========`);

  try {
    // 1. 解析通知
    const body = await request.json();

    console.log('🍎 [Apple Webhook] Notification received');

    // 2. 处理通知
    const payload = await appleStoreService.handleServerNotification(body);

    if (!payload) {
      console.error('❌ [Apple Webhook] Failed to parse notification');
      return NextResponse.json({ received: true });
    }

    console.log(`   Type: ${payload.notificationType}`);
    console.log(`   Environment: ${payload.data.environment}`);

    // 3. 解码交易信息
    const { decodeJwt } = await import('jose');
    const transactionInfo = decodeJwt(payload.data.signedTransactionInfo) as any;

    console.log(`   Product ID: ${transactionInfo.productId}`);
    console.log(`   Transaction ID: ${transactionInfo.transactionId}`);
    console.log(`   Original Transaction ID: ${transactionInfo.originalTransactionId}`);

    // 4. 查找对应的订阅记录
    const supabase = createSupabaseServiceRole();
    const { data: subscription, error: subError } = await supabase
      .from('mobile_subscriptions')
      .select('*')
      .eq('platform', 'apple')
      .eq('original_transaction_id', transactionInfo.originalTransactionId)
      .single();

    if (subError || !subscription) {
      console.warn(`⚠️ [Apple Webhook] No subscription found for transaction: ${transactionInfo.originalTransactionId}`);
      return NextResponse.json({ received: true });
    }

    console.log(`   Found subscription: ${subscription.id}`);
    console.log(`   User ID: ${subscription.user_id}`);
    console.log(`   Team ID: ${subscription.team_id}`);

    // 5. 根据通知类型处理
    switch (payload.notificationType) {
      case 'DID_RENEW':
        // 订阅成功续订
        console.log('✅ [Apple Webhook] Subscription renewed');

        await supabase
          .from('mobile_subscriptions')
          .update({
            status: 'active',
            latest_transaction_id: transactionInfo.transactionId,
            expires_date: new Date(transactionInfo.expiresDate).toISOString(),
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
          console.log(`✅ [Apple Webhook] Allocated ${planConfig.credits} credits`);
        }
        break;

      case 'DID_FAIL_TO_RENEW':
        // 续订失败,进入宽限期
        console.log('⚠️ [Apple Webhook] Renewal failed, entering grace period');

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

      case 'EXPIRED':
        // 订阅过期
        console.log('❌ [Apple Webhook] Subscription expired');

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

      case 'DID_CHANGE_RENEWAL_STATUS':
        // 自动续订状态变更
        const renewalInfo = payload.data.signedRenewalInfo
          ? decodeJwt(payload.data.signedRenewalInfo) as any
          : null;

        const autoRenewing = renewalInfo?.autoRenewStatus === 1;
        console.log(`🔄 [Apple Webhook] Auto-renew status changed: ${autoRenewing}`);

        await supabase
          .from('mobile_subscriptions')
          .update({
            auto_renewing: autoRenewing,
            status: autoRenewing ? 'active' : 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        break;

      case 'REFUND':
        // 退款
        console.log('💰 [Apple Webhook] Subscription refunded');

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
        console.log(`⚠️ [Apple Webhook] Unhandled notification type: ${payload.notificationType}`);
    }

    console.log('✅ [Apple Webhook] Notification processed successfully');
    console.log(`========== APPLE WEBHOOK END (${timestamp}) ==========\n`);

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ [Apple Webhook] Error processing notification:', error.message);
    console.error('   Stack:', error.stack);
    console.log(`========== APPLE WEBHOOK END (${timestamp}) ==========\n`);

    // 仍然返回200,避免Apple重试
    return NextResponse.json({ received: true });
  }
}
