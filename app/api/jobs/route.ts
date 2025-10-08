import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { getUserTeamSubscriptionInfo } from "@/lib/db/queries";
import CreditManager, { SUBSCRIPTION_PLANS } from "@/lib/credits/credit-manager";

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    console.log("📥 Received API request:", {
      type: requestBody.type,
      provider: requestBody.provider,
      prompt: requestBody.prompt?.substring(0, 100) + "...",
      model: requestBody.model,
      duration: requestBody.duration,
      ratio: requestBody.ratio,
      hasReferenceImage: !!requestBody.referenceImageUrl,
      hasReferenceVideo: !!requestBody.referenceVideoUrl
    });

    const { type = "image", provider, prompt, referenceImageUrl, referenceImageUrl2, referenceVideoUrl, videoDuration, model, duration, ratio, fixedImagePath, imageToVideo } = requestBody;
    
    if (!provider || !prompt) {
      return NextResponse.json(
        { error: "provider and prompt are required" }, 
        { status: 400 }
      );
    }

    if (!["openai", "gemini", "ideogram", "runway"].includes(provider)) {
      return NextResponse.json(
        { error: "invalid provider" }, 
        { status: 400 }
      );
    }

    // 验证生成类型
    if (!["image", "video"].includes(type)) {
      return NextResponse.json(
        { error: "invalid type, must be 'image' or 'video'" }, 
        { status: 400 }
      );
    }

    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 获取用户团队订阅信息
    const subscriptionInfo = await getUserTeamSubscriptionInfo();
    if (!subscriptionInfo) {
      return NextResponse.json({ error: "team not found" }, { status: 404 });
    }

    const planName = subscriptionInfo.planName || 'free';
    const planConfig = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

    // 检查计划是否支持请求的功能
    if (type === 'video' && !planConfig.features.videoGeneration) {
      return NextResponse.json({
        error: "plan_restriction",
        message: `当前计划 ${planConfig.name} 不支持视频生成功能，请升级到专业档或企业档`
      }, { status: 403 });
    }

    // 计算所需信用点
    let requiredCredits: number;
    let estimatedDuration = 5; // 默认视频时长
    
    if (videoDuration) {
      estimatedDuration = parseInt(videoDuration);
    } else if (duration) {
      estimatedDuration = parseInt(duration);
    }

    try {
      requiredCredits = CreditManager.calculateRequiredCredits({
        taskType: type as 'image' | 'video' | 'longvideo',
        planName,
        duration: estimatedDuration
      });
    } catch (error) {
      return NextResponse.json({
        error: "invalid_task_config",
        message: error instanceof Error ? error.message : "无法计算所需信用点"
      }, { status: 400 });
    }

    // 检查信用点余额
    const hasEnoughCredits = await CreditManager.hasEnoughCredits(subscriptionInfo.id, requiredCredits);
    if (!hasEnoughCredits) {
      const currentCredits = await CreditManager.getTeamCredits(subscriptionInfo.id);
      return NextResponse.json({
        error: "insufficient_credits",
        message: `信用点余额不足。需要 ${requiredCredits} 信用点，当前余额 ${currentCredits?.credits || 0} 信用点`,
        required: requiredCredits,
        available: currentCredits?.credits || 0
      }, { status: 402 }); // 402 Payment Required
    }

    const jobId = crypto.randomUUID();
    
    // 先插入任务到数据库
    const { error: insertError } = await supa
      .from("jobs")
      .insert({
        id: jobId,
        user_id: user.id,
        provider,
        type,
        prompt,
        reference_image_url: referenceImageUrl,
        reference_image_url_2: referenceImageUrl2,
        reference_video_url: referenceVideoUrl,
        video_duration: type === "video" ? (duration || 5) : null, // 存储视频时长
        model,
        ratio,
        credits_consumed: requiredCredits,
        status: "queued"
      });

    if (insertError) {
      console.error("Job insertion failed:", insertError);
      return NextResponse.json(
        { error: "failed to create job" }, 
        { status: 500 }
      );
    }

    // Job创建成功后，扣减信用点
    const creditDeducted = await CreditManager.consumeCredits({
      teamId: subscriptionInfo.id,
      jobId: jobId,
      amount: requiredCredits,
      taskType: type as 'image' | 'video' | 'longvideo',
      planName: planName,
    });

    if (!creditDeducted) {
      // 信用点扣减失败，删除已创建的job
      await supa.from("jobs").delete().eq("id", jobId);
      console.error("Credit deduction failed, job deleted");
      
      return NextResponse.json({
        error: "credit_deduction_failed",
        message: "信用点扣费失败，请重试"
      }, { status: 500 });
    }

    console.log(`💳 Credit deducted: ${requiredCredits} credits for ${type} generation (Job: ${jobId})`);

    // 临时同步处理 - 确保功能正常工作
    // 生产环境将使用 Inngest 异步处理
    console.log("🔄 Processing job synchronously for development:", { jobId, provider, prompt, hasReferenceImage: !!referenceImageUrl });
    
    // 异步处理策略：立即返回处理中状态，后台完成生成和上传
    console.log("🚀 Starting async job processing:", { jobId, provider, type });
    
    // 立即返回processing状态，不等待生成完成
    const immediateResponse = NextResponse.json({ 
      id: jobId, 
      status: "processing", 
      message: "任务已开始处理，请稍后查看结果",
      credits_consumed: requiredCredits
    });

    // 异步执行生成任务，不阻塞响应
    (async () => {
      try {
        // 更新状态为处理中
        await supa.from("jobs").update({ status: "processing" }).eq("id", jobId);
        console.log("📝 Job status updated to processing");
        
        // 导入生成函数
        const { generateImageIdeogram } = await import("@/lib/providers/ideogram");
        const { generateImageGemini } = await import("@/lib/providers/gemini");
        const { generateVideoRunway } = await import("@/lib/providers/runway");

        // 调用 AI 提供商
        console.log("🎨 Calling AI provider:", provider, "for type:", type);
        let result;
      
      if (provider === "runway" && type === "video") {
        console.log("🎬 Using Runway video generation");
        
        // 检测是否为角色任务（同时有视频和图片）
        const isFaceSwap = referenceVideoUrl && referenceImageUrl;
        
        // 检测是否为视频文件（通过URL路径判断）
        const isVideo = !isFaceSwap && referenceImageUrl && (
          referenceImageUrl.includes('/videos/') || 
          referenceImageUrl.endsWith('.mp4') ||
          referenceImageUrl.includes('.mp4?')
        );
        
        console.log("🔍 Video detection:", {
          referenceImageUrl,
          referenceVideoUrl,
          isVideo,
          isFaceSwap,
          willUseVideoMode: isVideo || isFaceSwap,
          videoDuration
        });
        
        // 计算实际使用的时长
        let actualDuration = duration || 5; // 使用传递的duration参数，默认值为5
        if (isFaceSwap) {
          // 对于角色任务，固定使用10秒时长以获得最佳效果
          actualDuration = 10;
        } else if (isVideo && videoDuration) {
          // 对于普通视频输入，使用视频本身的时长，但不超过10秒
          actualDuration = Math.min(Math.ceil(videoDuration), 10);
        }
        
        // 设置比例参数，只支持 Runway 允许的比例
        const videoRatio = ratio || "1280:720";
        
        result = await generateVideoRunway({
          prompt,
          referenceImageUrl: isFaceSwap ? referenceImageUrl : (isVideo ? undefined : referenceImageUrl),
          referenceVideoUrl: isFaceSwap ? referenceVideoUrl : (isVideo ? referenceImageUrl : undefined),
          duration: actualDuration,
          ratio: videoRatio,
          model: model || "gen4_turbo",
          fixedImagePath: fixedImagePath, // 传递固定图片路径
          imageToVideo: imageToVideo // 传递图片转视频标识
        });
      } else if (provider === "gemini" && type === "image") {
        // 使用Gemini进行图片生成
        console.log("🤖 Using Gemini for image generation");
        if (referenceImageUrl2) {
          // 动漫合成：传递两张图片
          console.log("🎭 Using Gemini for anime merge with two images");
          result = await generateImageGemini(prompt, referenceImageUrl, referenceImageUrl2);
        } else {
          // 普通图片生成：传递一张图片
          result = await generateImageGemini(prompt, referenceImageUrl);
        }
      } else if (provider === "ideogram" && type === "image") {
        // If reference image URL is provided, use Image2Image generation
        if (referenceImageUrl) {
          console.log("🖼️ Using Image2Image generation with reference image:", referenceImageUrl);
          result = await generateImageIdeogram({
            prompt,
            referenceImageUrl,
            renderingSpeed: "DEFAULT",
            styleType: "REALISTIC"
          });
        } else {
          console.log("🎨 Using text-to-image generation");
          result = await generateImageIdeogram(prompt);
        }
      } else {
        throw new Error(`Provider ${provider} with type ${type} not supported in sync mode`);
      }
      
      console.log("✅ AI provider returned URL:", result.url);

      // 更新为完成状态
      const { error: updateError } = await supa.from("jobs").update({
        status: "done",
        result_url: result.url
      }).eq("id", jobId);

      if (updateError) {
        console.error("❌ Failed to update job status:", updateError);
      } else {
        console.log("✅ Job status updated to 'done' successfully");
      }
      
      console.log("🎉 Job completed successfully:", { jobId, url: result.url });
      
    } catch (processingError) {
      console.error("❌ Processing error:", processingError);
      
      // 更新为失败状态
      await supa.from("jobs").update({ status: "failed" }).eq("id", jobId);
      
      // 任务失败，退还信用点
      const refundSuccess = await CreditManager.refundCredits({
        teamId: subscriptionInfo.id,
        jobId: jobId,
        amount: requiredCredits,
        reason: `任务处理失败，自动退还信用点：${processingError.message}`
      });
      
      if (refundSuccess) {
        console.log(`💸 Credit refunded: ${requiredCredits} credits due to processing failure`);
      } else {
        console.error(`❌ Failed to refund credits for failed job: ${jobId}`);
      }
      
      console.log(`❌ Job ${jobId} failed, credits refunded: ${refundSuccess}`);
    }
  })().catch(error => {
    console.error("❌ Async job processing failed:", error);
  });

  // 立即返回，不等待异步处理完成
  return immediateResponse;
  
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supa
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}