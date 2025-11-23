import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/payments/stripe";
import { getTeamForUser } from "@/lib/db/queries";
import { getAuthenticatedUser, createAuthenticatedSupabaseFromRequest } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 User stats API - request info:', {
      hasAuthHeader: !!req.headers.get('authorization'),
      cookieCount: req.cookies.getAll().length,
    });
    
    // 使用统一的认证函数，支持 Cookie 和 Bearer token
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      console.log('❌ User stats API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    console.log('✅ User stats API - user authenticated:', user.email);
    
    // 获取带有正确认证上下文的 Supabase 客户端（支持 Bearer token 和 Cookie）
    const supa = await createAuthenticatedSupabaseFromRequest(req);

    // 获取当前用户所属的团队信息（传入已认证的用户和 Supabase 客户端）
    const team = await getTeamForUser(user, supa);

    console.log('🔍 Team found for stats:', {
      hasTeam: !!team,
      teamId: team?.id,
      stripeSubscriptionId: team?.stripeSubscriptionId
    });

    let nextRenewalDate = null;

    // 方案1: 优先从 Stripe 获取精确的续费日期
    if (team?.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);
        if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
          // current_period_end 是 Unix 时间戳（秒），需要转换为毫秒
          // 使用类型断言来访问 Stripe 对象的属性
          const periodEnd = (subscription as any).current_period_end;
          if (periodEnd) {
            nextRenewalDate = new Date(periodEnd * 1000).toISOString();
          }
        }
      } catch (error) {
        console.error("Failed to fetch Stripe subscription:", error);
        // Stripe 调用失败，继续使用方案2
      }
    }

    // 方案2: 如果 Stripe 获取失败，从信用点充值记录推算
    if (!nextRenewalDate && team) {
      try {
        // 使用 Service Role 查询最近的 charge 类型交易（订阅续费）
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseServiceRole = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        const { data: latestCharge } = await supabaseServiceRole
          .from("credit_transactions")
          .select("created_at, reason")
          .eq("team_id", team.id)
          .eq("type", "charge")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestCharge) {
          // 从最近的充值日期推算下次续费日期（+1个月）
          const lastChargeDate = new Date(latestCharge.created_at);
          const nextRenewal = new Date(lastChargeDate);
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);
          nextRenewalDate = nextRenewal.toISOString();

          console.log('📅 Calculated next renewal from charge history:', {
            lastCharge: latestCharge.created_at,
            nextRenewal: nextRenewalDate
          });
        }
      } catch (error) {
        console.error("Failed to calculate renewal date from transactions:", error);
      }
    }

    // 获取本月开始时间（用于统计本月数据）
    // 注意：使用 UTC 时间来避免时区问题
    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)).toISOString();

    console.log('📅 Date range for stats:', {
      now: now.toISOString(),
      firstDayOfMonth,
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear()
    });

    // 查询用户的图片和视频生成总数（所有时间）
    const { data: allJobs, error: jobsError } = await supa
      .from("jobs")
      .select("type, status")
      .eq("user_id", user.id)
      .eq("status", "done"); // 只统计成功完成的任务

    if (jobsError) {
      console.error("Failed to fetch user jobs:", jobsError);
      return NextResponse.json({ error: "failed to fetch statistics" }, { status: 500 });
    }

    // 查询本月的任务（用于统计本月生成次数）
    const { data: monthJobs, error: monthJobsError } = await supa
      .from("jobs")
      .select("id, created_at, type")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("created_at", firstDayOfMonth);

    if (monthJobsError) {
      console.error("Failed to fetch month jobs:", monthJobsError);
    }

    // 查询本月的信用点消费记录（consume类型）
    // 注意：credit_transactions 通过 team_id 关联，不是 user_id
    // 使用 Service Role Key 来绕过 RLS 限制
    let monthCreditsConsumed = 0;
    if (team) {
      console.log('🔍 Querying credit transactions:', {
        teamId: team.id,
        firstDayOfMonth
      });

      // 使用 Service Role 客户端绕过 RLS
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: monthTransactions, error: monthTransError } = await supabaseServiceRole
        .from("credit_transactions")
        .select("amount, type, created_at")
        .eq("team_id", team.id)
        .eq("type", "consume")
        .gte("created_at", firstDayOfMonth);

      console.log('🔍 Credit transactions result:', {
        count: monthTransactions?.length || 0,
        transactions: monthTransactions?.map(t => ({
          amount: t.amount,
          created_at: t.created_at
        })),
        error: monthTransError?.message
      });

      if (monthTransError) {
        console.error("Failed to fetch month transactions:", monthTransError);
      } else {
        monthCreditsConsumed = monthTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        console.log('💰 Month credits consumed:', monthCreditsConsumed);
      }
    } else {
      console.log('❌ No team found for user');
    }

    // 统计数据
    const imageCount = allJobs?.filter(job => job.type === 'image').length || 0;
    const videoCount = allJobs?.filter(job => job.type === 'video').length || 0;
    const monthGenerationCount = monthJobs?.length || 0;
    const monthImageCount = monthJobs?.filter(job => job.type === 'image').length || 0;
    const monthVideoCount = monthJobs?.filter(job => job.type === 'video').length || 0;

    const userStats = {
      imageCount,
      videoCount,
      monthGenerationCount,
      monthImageCount,
      monthVideoCount,
      monthCreditsConsumed,
      remainingCredits: team?.credits || 0,
      nextRenewalDate,
      planName: team?.planName || 'free',
      subscriptionStatus: team?.subscriptionStatus || 'inactive'
    };

    console.log('📊 User stats calculated:', {
      userId: user.id,
      teamId: team?.id,
      monthGenerationCount,
      monthImageCount,
      monthVideoCount,
      monthCreditsConsumed,
      nextRenewalDate,
      planName: team?.planName || 'free',
      subscriptionStatus: team?.subscriptionStatus || 'inactive',
      firstDayOfMonth
    });

    return NextResponse.json(userStats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}