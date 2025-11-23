import { createSupabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * 检查订阅到期并发送续费提醒
 *
 * 该端点应该通过 cron job 定期调用（例如每天一次）
 * 它会检查所有即将在3天内到期的一次性支付订阅，并发送续费提醒
 */
export async function GET() {
  try {
    console.log('[check-expiry] Starting subscription expiry check...');

    const supabase = await createSupabaseServer();

    // 计算3天后的时间点
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const now = new Date();

    console.log('[check-expiry] Checking for subscriptions expiring between now and:', threeDaysFromNow);

    // 查找所有即将到期的一次性支付订阅
    const { data: expiringTeams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        subscription_expires_at,
        subscription_status,
        plan_name,
        team_members!inner (
          user_id,
          role,
          profiles:user_id (
            email,
            name
          )
        )
      `)
      .eq('subscription_status', 'onetime_active')
      .gte('subscription_expires_at', now.toISOString())
      .lte('subscription_expires_at', threeDaysFromNow.toISOString())
      .not('subscription_expires_at', 'is', null);

    if (error) {
      console.error('[check-expiry] Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to query expiring subscriptions' },
        { status: 500 }
      );
    }

    if (!expiringTeams || expiringTeams.length === 0) {
      console.log('[check-expiry] No expiring subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No expiring subscriptions found',
        count: 0
      });
    }

    console.log(`[check-expiry] Found ${expiringTeams.length} expiring subscriptions`);

    // 处理每个即将到期的团队
    const notifications = [];

    for (const team of expiringTeams) {
      const expiresAt = new Date(team.subscription_expires_at!);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`[check-expiry] Team ${team.id} expires in ${daysUntilExpiry} days`);

      // 获取团队的所有成员（特别是管理员）
      const members = team.team_members || [];

      for (const member of members) {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;

        if (!profile?.email) {
          console.warn(`[check-expiry] No email found for member in team ${team.id}`);
          continue;
        }

        // TODO: 这里应该发送实际的邮件通知
        // 可以使用 Supabase Auth 的邮件功能或第三方邮件服务
        console.log(`[check-expiry] Would send reminder to ${profile.email} for team ${team.name}`);

        notifications.push({
          teamId: team.id,
          teamName: team.name,
          email: profile.email,
          userName: profile.name || 'User',
          daysUntilExpiry,
          expiresAt: expiresAt.toISOString(),
          planName: team.plan_name
        });
      }
    }

    // TODO: 在这里实际发送邮件通知
    // 例如使用 Resend、SendGrid 或 Supabase 的邮件功能

    console.log(`[check-expiry] Completed. Processed ${notifications.length} notifications`);

    return NextResponse.json({
      success: true,
      message: `Found ${expiringTeams.length} expiring subscriptions`,
      notificationsSent: notifications.length,
      details: notifications
    });

  } catch (error) {
    console.error('[check-expiry] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 手动检查单个订阅状态（用于测试）
 */
export async function POST(request: Request) {
  try {
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, subscription_expires_at, subscription_status, plan_name')
      .eq('id', teamId)
      .single();

    if (error || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresAt = team.subscription_expires_at ? new Date(team.subscription_expires_at) : null;

    let status = 'active';
    let daysUntilExpiry = null;

    if (expiresAt) {
      daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        status = 'expired';

        // 如果已过期，更新团队状态
        await supabase
          .from('teams')
          .update({
            plan_name: 'free',
            subscription_status: 'expired'
          })
          .eq('id', teamId);
      } else if (daysUntilExpiry <= 3) {
        status = 'expiring_soon';
      }
    }

    return NextResponse.json({
      teamId: team.id,
      teamName: team.name,
      subscriptionStatus: team.subscription_status,
      planName: team.plan_name,
      expiresAt: expiresAt?.toISOString() || null,
      daysUntilExpiry,
      status
    });

  } catch (error) {
    console.error('[check-expiry] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
