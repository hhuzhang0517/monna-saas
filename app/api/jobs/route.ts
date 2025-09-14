import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

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

    const { type = "image", provider, prompt, referenceImageUrl, referenceVideoUrl, videoDuration, model, duration, ratio } = requestBody;
    
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

    // TODO: 校验订阅/额度
    const jobId = crypto.randomUUID();
    
    // 插入任务到数据库
    const { error: insertError } = await supa
      .from("jobs")
      .insert({ 
        id: jobId, 
        user_id: user.id, 
        provider, 
        type, 
        prompt,
        reference_image_url: referenceImageUrl,
        status: "queued"
      });

    if (insertError) {
      return NextResponse.json(
        { error: "failed to create job" }, 
        { status: 500 }
      );
    }

    // 临时同步处理 - 确保功能正常工作
    // 生产环境将使用 Inngest 异步处理
    console.log("🔄 Processing job synchronously for development:", { jobId, provider, prompt, hasReferenceImage: !!referenceImageUrl });
    
    try {
      // 导入生成函数
      const { generateImageIdeogram } = await import("@/lib/providers/ideogram");
      const { generateVideoRunway } = await import("@/lib/providers/runway");
      
      // 更新状态为处理中
      await supa.from("jobs").update({ status: "processing" }).eq("id", jobId);
      console.log("📝 Job status updated to processing");

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
          model: model || "gen4_turbo"
        });
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
      return NextResponse.json({ id: jobId, status: "done", result_url: result.url });
      
    } catch (processingError) {
      console.error("❌ Processing error:", processingError);
      
      // 更新为失败状态
      await supa.from("jobs").update({ status: "failed" }).eq("id", jobId);
      
      return NextResponse.json({ 
        id: jobId, 
        status: "failed", 
        error: processingError.message 
      }, { status: 500 });
    }
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