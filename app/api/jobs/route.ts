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

    // 尝试从 Authorization header 获取 token（用于移动端）
    const authHeader = req.headers.get('authorization');
    let user = null;
    let supa;
    let supaServiceRole; // Service Role 客户端用于绕过RLS限制

    if (authHeader?.startsWith('Bearer ')) {
      // 移动端：使用 Bearer token
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');

      // 验证用户身份使用 ANON_KEY
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user: tokenUser } } = await authClient.auth.getUser(token);
      user = tokenUser;

      // 数据库操作使用 Service Role Key（移动端需要绕过RLS）
      supaServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      supa = supaServiceRole;
    } else {
      // Web端：使用 cookie
      supa = await createSupabaseServer();
      const { data: { user: cookieUser } } = await supa.auth.getUser();
      user = cookieUser;

      // Web端也需要Service Role客户端用于验证插入（绕过RLS）
      const { createClient } = await import('@supabase/supabase-js');
      supaServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 获取用户团队订阅信息（移动端会使用 Service Role Key）
    let subscriptionInfo = await getUserTeamSubscriptionInfo(user, supa);
    if (!subscriptionInfo) {
      console.log('No team found for user:', user.id, '- will attempt to create one');

      // 如果没有团队，尝试创建一个（支持移动端首次使用）
      try {
        const { createUserTeam } = await import('@/lib/db/queries');
        console.log('Calling createUserTeam for user:', user.id);
        const createdTeam = await createUserTeam(user, supa);
        console.log('createUserTeam returned:', createdTeam);

        // 直接使用创建返回的团队信息，避免RLS权限问题
        // 因为 getTeamForUser 使用 ANON_KEY 无法看到 Service Role Key 创建的数据
        subscriptionInfo = {
          id: createdTeam.id,
          name: createdTeam.name,
          plan_name: createdTeam.plan_name || 'free',
          subscription_status: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_product_id: null,
          credits: createdTeam.credits,
          total_credits: createdTeam.total_credits,
          credits_consumed: createdTeam.credits_consumed || 0,
          last_credit_update: null,
          created_at: createdTeam.created_at,
          updated_at: createdTeam.updated_at
        };
        console.log('Using created team info directly:', subscriptionInfo)
      } catch (createError) {
        console.error('Failed to create team for user:', createError);
        console.error('Error stack:', createError instanceof Error ? createError.stack : 'no stack');
        return NextResponse.json({
          error: "team not found and creation failed",
          details: createError instanceof Error ? createError.message : 'unknown error'
        }, { status: 404 });
      }
    }

    const planName = subscriptionInfo.plan_name || 'free';
    const planConfig = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

    // 检查计划是否支持请求的功能
    if (type === 'video' && !planConfig.features.videoGeneration) {
      return NextResponse.json({
        error: "plan_restriction",
        message: `当前计划 ${planConfig.name} 不支持视频生成功能，请升级到专业档或至尊档`
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

    // 检查信用点余额（移动端使用 Service Role Key）
    const hasEnoughCredits = await CreditManager.hasEnoughCredits(subscriptionInfo.id, requiredCredits, supa);
    if (!hasEnoughCredits) {
      const currentCredits = await CreditManager.getTeamCredits(subscriptionInfo.id, supa);
      console.log('Insufficient credits check:', {
        teamId: subscriptionInfo.id,
        required: requiredCredits,
        available: currentCredits?.credits || 0
      });
      return NextResponse.json({
        error: "insufficient_credits",
        message: `信用点余额不足。需要 ${requiredCredits} 信用点，当前余额 ${currentCredits?.credits || 0} 信用点`,
        required: requiredCredits,
        available: currentCredits?.credits || 0
      }, { status: 402 }); // 402 Payment Required
    }

    const jobId = crypto.randomUUID();
    
    console.log('💾 准备插入任务到数据库:', {
      jobId,
      userId: user.id,
      userEmail: user.email,
      provider,
      type,
      status: 'queued',
      usingServiceRole: authHeader?.startsWith('Bearer ')
    });
    
    // 对于移动端，使用Service Role客户端插入，绕过RLS
    // 对于Web端，使用带有用户认证的客户端
    const insertClient = authHeader?.startsWith('Bearer ') ? supaServiceRole : supa;
    
    console.log('🔑 使用的客户端类型:', authHeader?.startsWith('Bearer ') ? 'Service Role (绕过RLS)' : '用户认证客户端');
    
    // 先插入任务到数据库
    const { data: insertedJob, error: insertError } = await insertClient
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
      })
      .select();

    if (insertError) {
      console.error("❌ Job insertion failed:", insertError);
      console.error("详细错误信息:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json(
        { error: "failed to create job", details: insertError.message }, 
        { status: 500 }
      );
    }

    console.log('✅ 任务插入成功:', insertedJob);
    
    // 验证插入：使用Service Role客户端查询（确保能看到）
    const { data: verifyJob, error: verifyError } = await supaServiceRole
      .from("jobs")
      .select("id, user_id, status")
      .eq("id", jobId)
      .single();
    
    if (verifyError || !verifyJob) {
      console.error("⚠️ 无法验证任务插入:", verifyError);
    } else {
      console.log('✅ 验证任务存在:', verifyJob);
    }

    // Job创建成功后，扣减信用点（移动端使用 Service Role Key）
    const creditDeducted = await CreditManager.consumeCredits({
      teamId: subscriptionInfo.id,
      userId: user.id,
      jobId: jobId,
      amount: requiredCredits,
      taskType: type as 'image' | 'video' | 'longvideo',
      planName: planName,
      supabaseClient: supa,
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
        
        // 检测是否为视频文件（优先检查 referenceVideoUrl，其次检查 referenceImageUrl 中的视频）
        const isVideo = !isFaceSwap && (
          // 情况1：正确使用 referenceVideoUrl（移动端）
          (referenceVideoUrl && !referenceImageUrl) ||
          // 情况2：referenceImageUrl 实际上是视频（旧的Web端兼容）
          (referenceImageUrl && (
            referenceImageUrl.includes('/videos/') || 
            referenceImageUrl.endsWith('.mp4') ||
            referenceImageUrl.includes('.mp4?')
          ))
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
          // 优先使用 referenceVideoUrl，如果没有且是video模式则使用 referenceImageUrl（兼容旧逻辑）
          referenceVideoUrl: isFaceSwap 
            ? referenceVideoUrl 
            : (referenceVideoUrl || (isVideo ? referenceImageUrl : undefined)),
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
      } else if (provider === "openai" && type === "image") {
        // 使用OpenAI DALL-E进行图片生成
        console.log("🎨 Using OpenAI DALL-E for image generation");
        const { generateImageOpenAI } = await import('@/lib/providers/openai');
        result = await generateImageOpenAI(prompt);
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
      console.log('📝 准备更新任务状态为done:', { jobId, resultUrl: result.url });
      
      const { data: updatedJob, error: updateError } = await supa
        .from("jobs")
        .update({
          status: "done",
          result_url: result.url
        })
        .eq("id", jobId)
        .select();

      if (updateError) {
        console.error("❌ Failed to update job status:", updateError);
      } else {
        console.log("✅ Job status updated to 'done' successfully:", updatedJob);
      }
      
      // 验证更新：再次查询确认
      const { data: verifyDone, error: verifyDoneError } = await supa
        .from("jobs")
        .select("id, user_id, status, result_url")
        .eq("id", jobId)
        .single();
      
      if (verifyDoneError) {
        console.error("❌ 无法验证done状态:", verifyDoneError);
      } else {
        console.log("✅ 验证done状态:", verifyDone);
      }
      
      console.log("🎉 Job completed successfully:", { jobId, url: result.url });
      
    } catch (processingError) {
      console.error("❌ Processing error:", processingError);

      // 提取用户友好的错误信息
      let userFriendlyMessage = "生成失败，请重试";
      const errorMsg = (processingError as Error).message || '';

      // 从错误信息中提取PERMANENT_FAILURE后的内容
      if (errorMsg.includes('PERMANENT_FAILURE:')) {
        userFriendlyMessage = errorMsg.split('PERMANENT_FAILURE:')[1].trim();
      } else if (errorMsg.includes('未在图片或视频中检测到人脸')) {
        userFriendlyMessage = errorMsg;
      } else if (errorMsg.includes('视频内容不符合平台政策')) {
        userFriendlyMessage = errorMsg;
      } else if (errorMsg.includes('视频生成超时')) {
        userFriendlyMessage = errorMsg;
      } else if (errorMsg.length > 0 && errorMsg.length < 200) {
        // 如果错误消息不太长且不包含技术细节，直接使用
        if (!errorMsg.toLowerCase().includes('error') &&
            !errorMsg.toLowerCase().includes('exception') &&
            !errorMsg.toLowerCase().includes('stack')) {
          userFriendlyMessage = errorMsg;
        }
      }

      console.log('📝 User-friendly error message:', userFriendlyMessage);

      // 更新为失败状态，并保存错误信息到result_url字段（临时方案）
      await supa.from("jobs").update({
        status: "failed",
        result_url: `ERROR: ${userFriendlyMessage}` // 使用特殊前缀标记这是错误信息
      }).eq("id", jobId);

      // 任务失败，退还信用点（移动端使用 Service Role Key）
      const refundSuccess = await CreditManager.refundCredits({
        teamId: subscriptionInfo.id,
        userId: user.id,
        jobId: jobId,
        amount: requiredCredits,
        reason: `任务处理失败，自动退还信用点：${userFriendlyMessage}`,
        supabaseClient: supa
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

    // 尝试从 Authorization header 获取 token（用于移动端）
    const authHeader = req.headers.get('authorization');
    let user = null;
    let supa;

    if (authHeader?.startsWith('Bearer ')) {
      // 移动端：使用 Bearer token
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');

      // 验证用户身份使用 ANON_KEY
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user: tokenUser } } = await authClient.auth.getUser(token);
      user = tokenUser;

      // 数据库操作使用 Service Role Key（移动端需要绕过RLS）
      supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    } else {
      // Web端：使用 cookie
      supa = await createSupabaseServer();
      const { data: { user: cookieUser } } = await supa.auth.getUser();
      user = cookieUser;
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // 尝试从 Authorization header 获取 token（用于移动端）
    const authHeader = req.headers.get('authorization');
    let user = null;
    let supa;

    if (authHeader?.startsWith('Bearer ')) {
      // 移动端：使用 Bearer token
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');

      // 验证用户身份使用 ANON_KEY
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user: tokenUser } } = await authClient.auth.getUser(token);
      user = tokenUser;

      // 数据库操作使用 Service Role Key（移动端需要绕过RLS）
      supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    } else {
      // Web端：使用 cookie
      supa = await createSupabaseServer();
      const { data: { user: cookieUser } } = await supa.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      console.log('❌ Delete job API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    console.log('✅ Delete job API - user authenticated:', user.email, 'jobId:', id);

    // 首先获取任务信息（用于删除存储文件）
    const { data: job, error: fetchError } = await supa
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !job) {
      console.log('❌ Job not found:', id);
      return NextResponse.json({ error: "job not found" }, { status: 404 });
    }

    // 如果有结果文件，尝试从存储中删除
    if (job.result_url) {
      try {
        const url = new URL(job.result_url);
        const pathSegments = url.pathname.split('/');
        const fileName = pathSegments[pathSegments.length - 1];
        const bucket = pathSegments[pathSegments.length - 2];
        
        if (bucket && fileName) {
          console.log('🗑️ Deleting storage file:', bucket, fileName);
          const { error: storageError } = await supa.storage
            .from(bucket)
            .remove([fileName]);
          
          if (storageError) {
            console.warn('⚠️ Failed to delete storage file:', storageError);
          } else {
            console.log('✅ Storage file deleted successfully');
          }
        }
      } catch (storageDeleteError) {
        console.warn('⚠️ Failed to parse or delete storage file:', storageDeleteError);
      }
    }

    // 从数据库中删除任务记录
    const { error: deleteError } = await supa
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error('❌ Failed to delete job from database:', deleteError);
      return NextResponse.json({ error: "failed to delete job" }, { status: 500 });
    }

    console.log('✅ Job deleted successfully:', id);
    return NextResponse.json({ success: true, message: "job deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting job:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}