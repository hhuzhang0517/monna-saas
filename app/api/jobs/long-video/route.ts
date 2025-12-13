import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserTeamSubscriptionInfo } from "@/lib/db/queries";
import { CreditManager, SUBSCRIPTION_PLANS } from "@/lib/credits/credit-manager";

export async function POST(req: NextRequest) {
  try {
    const { prompt, attachedImages = [], provider = "runway", model, action = "plan", shotPlan = null } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!["runway", "gemini"].includes(provider)) {
      return NextResponse.json(
        { error: "invalid provider, only 'runway' and 'gemini' are supported for long videos" },
        { status: 400 }
      );
    }

    // 尝试从 Authorization header 获取 token（用于移动端）
    const authHeader = req.headers.get('authorization');
    let user = null;
    let supa;

    if (authHeader?.startsWith('Bearer ')) {
      // 移动端：使用 Bearer token
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
      user = tokenUser;
      supa = supabase;
    } else {
      // Web端：使用 cookie
      supa = await createSupabaseServer();
      const { data: { user: cookieUser } } = await supa.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 如果是规划阶段
    if (action === "plan") {
      console.log("🎬 Starting shot planning for:", prompt.substring(0, 100) + "...");
      console.log(`📎 Attached images count: ${attachedImages.length}`);

      // 导入镜头规划器
      const { generateShotPlan } = await import("@/lib/llm/shot-planner");

      try {
        // 提取目标时长（从提示中）
        const durationMatch = prompt.match(/(\d+)[s秒]/);
        const targetSeconds = durationMatch ? parseInt(durationMatch[1]) : 30;

        // 生成镜头规划（传入参考图片）
        const plan = await generateShotPlan(
          prompt,
          targetSeconds,
          "1280:768",
          attachedImages.length > 0 ? attachedImages : undefined
        );

        console.log("📋 Shot plan generated successfully:", plan);

        return NextResponse.json({
          action: "plan",
          shotPlan: plan,
          targetSeconds,
          attachedImagesCount: attachedImages.length
        });

      } catch (planError) {
        console.error("❌ Shot planning failed:", planError);
        return NextResponse.json({
          error: "镜头规划失败: " + planError.message
        }, { status: 500 });
      }
    }

    // 如果是生成阶段
    if (action === "generate") {
      if (!shotPlan) {
        return NextResponse.json(
          { error: "shotPlan is required for generation" },
          { status: 400 }
        );
      }

      // 验证编辑后的镜头规划
      if (!shotPlan.shots || !Array.isArray(shotPlan.shots) || shotPlan.shots.length === 0) {
        return NextResponse.json(
          { error: "invalid shotPlan: shots array is required and cannot be empty" },
          { status: 400 }
        );
      }

      // 验证每个镜头的必需字段
      for (const shot of shotPlan.shots) {
        if (!shot.id || !shot.prompt || !shot.duration_s || !shot.camera) {
          return NextResponse.json(
            { error: "invalid shot: id, prompt, duration_s, and camera are required" },
            { status: 400 }
          );
        }

        // 验证时长范围
        if (shot.duration_s < 3 || shot.duration_s > 30) {
          return NextResponse.json(
            { error: "invalid shot duration: must be between 3 and 30 seconds" },
            { status: 400 }
          );
        }
      }

      // 重新计算总时长
      shotPlan.total_seconds = shotPlan.shots.reduce((sum: number, shot: any) => sum + shot.duration_s, 0);

      console.log("📝 Using edited shot plan:", {
        totalShots: shotPlan.shots.length,
        totalDuration: shotPlan.total_seconds,
        shotsPreview: shotPlan.shots.map((s: any) => ({
          id: s.id,
          duration: s.duration_s,
          camera: s.camera,
          promptLength: s.prompt.length
        }))
      });

      // 获取用户团队订阅信息并校验信用点（传递 user 和 supa 以支持 Bearer token）
      const subscriptionInfo = await getUserTeamSubscriptionInfo(user, supa);
      if (!subscriptionInfo) {
        return NextResponse.json({ error: "team not found" }, { status: 404 });
      }

      const planName = subscriptionInfo.plan_name || 'free';
      const planConfig = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

      // 检查计划是否支持长视频生成功能
      if (!planConfig.features.longVideoGeneration) {
        return NextResponse.json({
          error: "plan_restriction",
          message: `当前计划 ${planConfig.name} 不支持长视频生成功能，请升级到至尊档`
        }, { status: 403 });
      }

      // 计算所需信用点 (基于总时长)
      const totalDuration = shotPlan.total_seconds || 30;
      const requiredCredits = CreditManager.calculateRequiredCredits({
        taskType: 'longvideo',
        planName,
        duration: totalDuration
      });

      // 检查信用点余额
      const hasEnoughCredits = await CreditManager.hasEnoughCredits(subscriptionInfo.id, requiredCredits);
      if (!hasEnoughCredits) {
        const currentCredits = await CreditManager.getTeamCredits(subscriptionInfo.id);
        return NextResponse.json({
          error: "insufficient_credits",
          message: `长视频生成需要 ${requiredCredits} 信用点，当前余额 ${currentCredits?.credits || 0} 信用点`,
          required: requiredCredits,
          available: currentCredits?.credits || 0
        }, { status: 402 });
      }

      const jobId = crypto.randomUUID();

      // 先创建job记录
      const { error: insertError } = await supa
        .from("jobs")
        .insert({
          id: jobId,
          user_id: user.id,
          provider,
          type: "longvideo",
          prompt,
          video_duration: shotPlan.shots?.reduce((total: number, shot: any) => total + (shot.duration_s || 5), 0) || 30,
          credits_consumed: requiredCredits,
          status: "queued",
          metadata: JSON.stringify({
            attachedImages: attachedImages.length,
            shotPlan: shotPlan,
            totalShots: shotPlan.shots?.length || 0,
            createdAt: new Date().toISOString()
          })
        });

      if (insertError) {
        console.error("Long video job insertion failed:", insertError);
        return NextResponse.json(
          { error: "failed to create long video job" },
          { status: 500 }
        );
      }

      // Job创建成功后，扣减信用点
      const creditDeducted = await CreditManager.consumeCredits({
        teamId: subscriptionInfo.id,
        jobId: jobId,
        amount: requiredCredits,
        taskType: 'longvideo',
        planName: planName,
      });

      if (!creditDeducted) {
        // 信用点扣减失败，删除已创建的job
        await supa.from("jobs").delete().eq("id", jobId);
        console.error("Long video credit deduction failed, job deleted");
        return NextResponse.json({
          error: "credit_deduction_failed",
          message: "信用点扣费失败，请重试"
        }, { status: 500 });
      }

      console.log(`💳 Credit deducted: ${requiredCredits} credits for long video generation (Job: ${jobId})`);

      console.log("🎬 Triggering long video generation job via Inngest:", {
        jobId,
        provider,
        prompt: prompt.substring(0, 100) + "...",
        attachedImagesCount: attachedImages.length,
        totalShots: shotPlan.shots?.length || 0
      });

      // 发送 Inngest 事件触发异步处理
      const { inngest } = await import("@/inngest/client");

      try {
        const eventData = {
          jobId,
          provider,
          prompt,
          attachedImages,
          shotPlan,
          model: model || (provider === "gemini" ? "veo-3.1" : undefined),
          teamId: subscriptionInfo.id,
          requiredCredits
        };

        console.log("📤 Sending Inngest event:", {
          eventName: "app/longVideo.generate.requested",
          jobId,
          provider,
          hasEventKey: !!process.env.INNGEST_EVENT_KEY,
          eventKeyPrefix: process.env.INNGEST_EVENT_KEY?.substring(0, 10) + "..."
        });

        const result = await inngest.send({
          name: "app/longVideo.generate.requested",
          data: eventData
        });

        console.log("✅ Inngest event sent successfully:", result);
      } catch (inngestError) {
        console.error("❌ Failed to send Inngest event:", inngestError);

        // 如果 Inngest 发送失败，更新 job 状态为失败并退还信用点
        await supa.from("jobs").update({
          status: "failed",
          result_url: "ERROR: 无法启动后台任务处理，请联系技术支持"
        }).eq("id", jobId);

        await CreditManager.refundCredits({
          teamId: subscriptionInfo.id,
          jobId: jobId,
          amount: requiredCredits,
          reason: "Inngest事件发送失败，自动退还信用点"
        });

        return NextResponse.json({
          error: "failed_to_trigger_background_job",
          message: "无法启动后台任务处理，信用点已退还",
          details: inngestError instanceof Error ? inngestError.message : String(inngestError)
        }, { status: 500 });
      }

      // 立即返回 jobId，不等待生成完成
      return NextResponse.json({
        id: jobId,
        status: "queued",
        type: "longvideo",
        action: "generate",
        message: "长视频生成任务已创建，正在后台处理。您可以关闭此页面，稍后查看结果。"
      });
    }

    return NextResponse.json(
      { error: "invalid action, must be 'plan' or 'generate'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error in long video API:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

// 获取长视频生成进度
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 查询任务状态
    const { data: job, error } = await supa
      .from("jobs")
      .select("id, status, result_url, metadata, created_at")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .eq("type", "longvideo")
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "job not found" },
        { status: 404 }
      );
    }

    let metadata: {
      progress?: number;
      currentStep?: string;
      message?: string;
      segments?: number;
      [key: string]: any;
    } = {};
    try {
      metadata = job.metadata ? JSON.parse(job.metadata) : {};
    } catch (parseError) {
      console.error("Failed to parse job metadata:", parseError);
      // 如果解析失败，使用空对象
      metadata = {};
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      result_url: job.result_url,
      progress: metadata.progress || 0,
      currentStep: metadata.currentStep || "准备中",
      message: metadata.message || "",
      segments: metadata.segments || 1,
      created_at: job.created_at
    });

  } catch (error) {
    console.error("Error getting long video job status:", error);
    // 确保返回 JSON 格式的错误
    return NextResponse.json(
      {
        error: "internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
