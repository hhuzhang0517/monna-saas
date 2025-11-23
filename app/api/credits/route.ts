import { NextRequest, NextResponse } from "next/server";
import { getUserTeamCredits, getUserTeamSubscriptionInfo, getUserTeamCreditHistory, getTeamForUser } from "@/lib/db/queries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS } from "@/lib/credits/credit-manager";
import { getAuthenticatedUser, createAuthenticatedSupabaseFromRequest } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Credits API - request info:', {
      hasAuthHeader: !!req.headers.get('authorization'),
      cookieCount: req.cookies.getAll().length,
    });
    
    // 使用统一的认证函数，支持 Cookie 和 Bearer token
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      console.log('❌ Credits API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    console.log('✅ Credits API - user authenticated:', user.email);

    // 获取带有正确认证上下文的 Supabase 客户端
    const supa = await createAuthenticatedSupabaseFromRequest(req);

    // 直接获取团队信息（包含积分和订阅信息）
    const team = await getTeamForUser(user, supa);
    
    if (!team) {
      return NextResponse.json({ error: "team not found" }, { status: 404 });
    }
    
    // 从团队信息中提取积分和订阅数据
    const credits = {
      credits: team.credits,
      total_credits: team.totalCredits || team.total_credits,
      credits_consumed: team.creditsConsumed || team.credits_consumed,
      last_credit_update: team.lastCreditUpdate || team.last_credit_update
    };
    
    const subscriptionInfo = {
      plan_name: team.planName || team.plan_name,
      subscription_status: team.subscriptionStatus || team.subscription_status
    };

    // 获取当前计划配置
    const planName = subscriptionInfo.plan_name || 'free';
    const planConfig = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

    const response = {
      // 信用点余额信息
      credits: credits.credits,
      totalCredits: credits.total_credits,
      creditsConsumed: credits.credits_consumed,
      lastCreditUpdate: credits.last_credit_update,

      // 订阅计划信息
      planName: subscriptionInfo.plan_name,
      subscriptionStatus: subscriptionInfo.subscription_status,
      
      // 计划配置信息
      planConfig: {
        name: planConfig.name,
        features: planConfig.features,
        creditCosts: planConfig.creditCosts,
      },
      
      // 功能权限检查
      canGenerateImage: planConfig.features.imageGeneration && credits.credits >= (planConfig.creditCosts.image || 0),
      canGenerateVideo: planConfig.features.videoGeneration && credits.credits >= (('videoPerSecond' in planConfig.creditCosts ? planConfig.creditCosts.videoPerSecond : 0) * 5), // 假设最少5秒视频
      canGenerateLongVideo: planConfig.features.longVideoGeneration && credits.credits >= (('longVideoPerSecond' in planConfig.creditCosts ? planConfig.creditCosts.longVideoPerSecond : 0) * 30), // 假设最少30秒长视频
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching credits info:", error);
    return NextResponse.json(
      { error: "failed to fetch credits information" }, 
      { status: 500 }
    );
  }
}

