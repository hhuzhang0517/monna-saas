/**
 * 移动端订阅状态查询 API
 * GET /api/mobile/subscriptions/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { mobileSubscriptionManager } from '@/lib/mobile-subscriptions/subscription-manager';
import { SUBSCRIPTION_PLANS, SubscriptionStatusResponse } from '@/lib/mobile-subscriptions/types';

export async function GET(request: NextRequest) {
  try {
    console.log('📱 [API] Mobile subscription status request');

    // 1. 验证用户身份
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [API] Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`   User ID: ${user.id}`);

    // 2. 获取用户的移动订阅
    const mobileSubscription = await mobileSubscriptionManager.getUserSubscription(user.id);

    // 3. 获取用户的team信息
    const { data: memberData } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (
          id,
          plan_name,
          subscription_status,
          credits
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1);

    const teamArray = memberData?.[0]?.teams as any;
    const team = Array.isArray(teamArray) ? teamArray[0] : teamArray;

    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // 4. 构建响应
    const response: SubscriptionStatusResponse = {
      hasActiveSubscription: false,
      currentPlan: team.plan_name || 'free',
      credits: team.credits || 0
    };

    if (mobileSubscription &&
        (mobileSubscription.status === 'active' ||
         mobileSubscription.status === 'in_grace_period')) {

      const planConfig = SUBSCRIPTION_PLANS[mobileSubscription.plan_name];

      response.hasActiveSubscription = true;
      response.subscription = {
        platform: mobileSubscription.platform,
        productId: mobileSubscription.product_id,
        planName: mobileSubscription.plan_name,
        displayName: planConfig?.displayName || mobileSubscription.plan_name,
        status: mobileSubscription.status,
        expiresDate: new Date(mobileSubscription.expires_date).getTime(),
        autoRenewing: mobileSubscription.auto_renewing,
        credits: planConfig?.credits || 0
      };
    }

    console.log(`✅ [API] Subscription status retrieved`);
    console.log(`   Has Active: ${response.hasActiveSubscription}`);
    console.log(`   Current Plan: ${response.currentPlan}`);
    console.log(`   Credits: ${response.credits}`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [API] Failed to get subscription status:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
