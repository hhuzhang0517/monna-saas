import { NextRequest, NextResponse } from "next/server";
import { getUserTeamCredits, getUserTeamSubscriptionInfo, getUserTeamCreditHistory } from "@/lib/db/queries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS } from "@/lib/credits/credit-manager";

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user }, error } = await supa.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 获取信用点余额信息
    const credits = await getUserTeamCredits();
    
    // 获取订阅信息
    const subscriptionInfo = await getUserTeamSubscriptionInfo();
    
    if (!credits || !subscriptionInfo) {
      return NextResponse.json({ error: "team not found" }, { status: 404 });
    }

    // 获取当前计划配置
    const planName = subscriptionInfo.planName || 'free';
    const planConfig = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

    const response = {
      // 信用点余额信息
      credits: credits.credits,
      totalCredits: credits.totalCredits,
      creditsConsumed: credits.creditsConsumed,
      lastCreditUpdate: credits.lastCreditUpdate,
      
      // 订阅计划信息
      planName: subscriptionInfo.planName,
      subscriptionStatus: subscriptionInfo.subscriptionStatus,
      
      // 计划配置信息
      planConfig: {
        name: planConfig.name,
        features: planConfig.features,
        creditCosts: planConfig.creditCosts,
      },
      
      // 功能权限检查
      canGenerateImage: planConfig.features.imageGeneration && credits.credits >= (planConfig.creditCosts.image || 0),
      canGenerateVideo: planConfig.features.videoGeneration && credits.credits >= (planConfig.creditCosts.videoPerSecond || 0) * 5, // 假设最少5秒视频
      canGenerateLongVideo: planConfig.features.longVideoGeneration && credits.credits >= (planConfig.creditCosts.longVideoPerSecond || 0) * 30, // 假设最少30秒长视频
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

