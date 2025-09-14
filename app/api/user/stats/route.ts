import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 User stats API - cookies received:', {
      cookieCount: req.cookies.getAll().length,
      cookieNames: req.cookies.getAll().map(c => c.name),
      hasAuthCookies: req.cookies.getAll().some(c => c.name.includes('auth-token'))
    });
    
    const supa = await createSupabaseServer();
    const { data: { user }, error } = await supa.auth.getUser();
    
    console.log('🔍 User stats API - auth check:', {
      hasUser: !!user,
      userEmail: user?.email,
      error: error?.message
    });
    
    if (!user) {
      console.log('❌ User stats API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 查询用户的图片和视频生成总数
    const { data: jobs, error: jobsError } = await supa
      .from("jobs")
      .select("type, status")
      .eq("user_id", user.id)
      .eq("status", "done"); // 只统计成功完成的任务

    if (jobsError) {
      console.error("Failed to fetch user jobs:", jobsError);
      return NextResponse.json({ error: "failed to fetch statistics" }, { status: 500 });
    }

    // 统计图片和视频生成次数
    const imageCount = jobs?.filter(job => job.type === 'image').length || 0;
    const videoCount = jobs?.filter(job => job.type === 'video').length || 0;

    // 获取用户的订阅信息（简化版，实际应该关联team表）
    // 这里先使用默认值，后续可以扩展
    const userStats = {
      imageCount,
      videoCount,
      planName: 'free', // 默认免费计划
      subscriptionStatus: 'inactive' // 默认未订阅状态
    };

    return NextResponse.json(userStats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}