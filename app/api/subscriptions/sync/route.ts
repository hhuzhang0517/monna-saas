/**
 * 移动端订阅同步 API
 * 用于将 iOS/Android 的订阅状态同步到 Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import CreditManager from '@/lib/credits/credit-manager';

interface SyncSubscriptionRequest {
  planKey: 'free' | 'basic' | 'pro' | 'enterprise';
  provider: 'app_store' | 'google_play';
  originalAppUserId: string;
  managementURL?: string;
  customerInfo: {
    activeEntitlements: string[];
    latestExpirationDate?: string | null;
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log('📱 [Mobile Subscription Sync] Starting sync...');

    // 验证身份
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = await createSupabaseServer();

    // 使用 token 获取用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // 解析请求体
    const body: SyncSubscriptionRequest = await req.json();
    const { planKey, provider, originalAppUserId, managementURL, customerInfo } = body;

    console.log('📋 Sync request:', {
      userId: user.id,
      planKey,
      provider,
      activeEntitlements: customerInfo.activeEntitlements,
    });

    // 验证 originalAppUserId 与 user.id 匹配（安全检查）
    if (originalAppUserId !== user.id) {
      console.error('❌ User ID mismatch:', {
        claimed: originalAppUserId,
        actual: user.id,
      });
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // 获取用户的 team
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, plan_name, subscription_status)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    if (teamError || !teamMember) {
      console.error('❌ Failed to get team:', teamError);
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const team = teamMember.teams as any;
    console.log('✅ Team found:', team.id);

    // 更新团队订阅状态
    const subscriptionStatus = customerInfo.activeEntitlements.length > 0 ? 'active' : 'canceled';
    const updateData: any = {
      plan_name: planKey,
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString(),
    };

    // 存储移动端订阅的额外信息
    const metadata: any = {
      provider,
      managementURL,
      lastSyncAt: new Date().toISOString(),
      activeEntitlements: customerInfo.activeEntitlements,
    };

    if (customerInfo.latestExpirationDate) {
      metadata.expirationDate = customerInfo.latestExpirationDate;
    }

    // 如果有现有的 metadata，合并它
    const { data: currentTeam } = await supabase
      .from('teams')
      .select('metadata')
      .eq('id', team.id)
      .single();

    if (currentTeam?.metadata) {
      Object.assign(metadata, currentTeam.metadata, metadata);
    }

    updateData.metadata = metadata;

    const { error: updateError } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', team.id);

    if (updateError) {
      console.error('❌ Failed to update team:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.log('✅ Team subscription updated:', {
      teamId: team.id,
      planKey,
      status: subscriptionStatus,
    });

    // 如果是新激活的订阅（从免费升级到付费），分配信用点
    const oldPlanName = team.plan_name || 'free';
    const isUpgrade = oldPlanName === 'free' && planKey !== 'free' && subscriptionStatus === 'active';

    if (isUpgrade) {
      console.log('🎁 New subscription detected, allocating credits...');

      const success = await CreditManager.allocateSubscriptionCredits({
        teamId: team.id,
        planName: planKey,
        supabaseClient: supabase,
      });

      if (success) {
        console.log('✅ Credits allocated successfully');
      } else {
        console.error('❌ Failed to allocate credits');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription synced successfully',
      subscription: {
        planKey,
        status: subscriptionStatus,
        provider,
      },
    });

  } catch (error: any) {
    console.error('❌ [Mobile Subscription Sync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 获取当前订阅状态
 */
export async function GET(req: NextRequest) {
  try {
    // 验证身份
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = await createSupabaseServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取用户的团队和订阅信息
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, plan_name, subscription_status, metadata)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({
        planKey: 'free',
        status: 'inactive',
        provider: null,
      });
    }

    const team = teamMember.teams as any;
    const metadata = team.metadata || {};

    return NextResponse.json({
      planKey: team.plan_name || 'free',
      status: team.subscription_status || 'inactive',
      provider: metadata.provider || null,
      managementURL: metadata.managementURL || null,
      activeEntitlements: metadata.activeEntitlements || [],
      expirationDate: metadata.expirationDate || null,
      lastSyncAt: metadata.lastSyncAt || null,
    });

  } catch (error: any) {
    console.error('❌ [Get Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
