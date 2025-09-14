import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateLongVideoRunway } from "@/lib/providers/runway";

export async function POST(req: NextRequest) {
  try {
    const { prompt, attachedImages = [], provider = "runway", action = "plan", shotPlan = null } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" }, 
        { status: 400 }
      );
    }

    if (!["runway"].includes(provider)) {
      return NextResponse.json(
        { error: "invalid provider, only 'runway' is supported for long videos" }, 
        { status: 400 }
      );
    }

    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 如果是规划阶段
    if (action === "plan") {
      console.log("🎬 Starting shot planning for:", prompt.substring(0, 100) + "...");
      
      // 导入镜头规划器
      const { generateShotPlan } = await import("@/lib/llm/shot-planner");
      
      try {
        // 提取目标时长（从提示中）
        const durationMatch = prompt.match(/(\d+)[s秒]/);
        const targetSeconds = durationMatch ? parseInt(durationMatch[1]) : 30;
        
        // 生成镜头规划
        const plan = await generateShotPlan(prompt, targetSeconds, "1280:768");
        
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

      // TODO: 校验订阅/额度
      const jobId = crypto.randomUUID();
      
      // 插入长视频任务到数据库
      const { error: insertError } = await supa
        .from("jobs")
        .insert({ 
          id: jobId, 
          user_id: user.id, 
          provider, 
          type: "longvideo", // 新类型：长视频
          prompt,
          status: "queued",
          metadata: JSON.stringify({
            attachedImages: attachedImages.length,
            shotPlan: shotPlan,
            totalShots: shotPlan.shots?.length || 0,
            createdAt: new Date().toISOString()
          })
        });

      if (insertError) {
        console.error("Failed to insert long video job:", insertError);
        return NextResponse.json(
          { error: "failed to create job" }, 
          { status: 500 }
        );
      }

      console.log("🎬 Starting long video generation job:", { 
        jobId, 
        provider, 
        prompt: prompt.substring(0, 100) + "...", 
        attachedImagesCount: attachedImages.length,
        totalShots: shotPlan.shots?.length || 0
      });
      
      try {
        // 更新状态为处理中
        await supa.from("jobs").update({ status: "processing" }).eq("id", jobId);
        console.log("📝 Long video job status updated to processing");

        // 调用长视频生成函数（使用确认的镜头规划）
        const result = await generateLongVideoRunway({
          prompt,
          attachedImages,
          jobId,
          shotPlan, // 传入用户确认的镜头规划
          onProgress: async (progress) => {
            // 更新进度到数据库
            await supa.from("jobs").update({ 
              metadata: JSON.stringify({
                ...JSON.parse((await supa.from("jobs").select("metadata").eq("id", jobId).single()).data?.metadata || "{}"),
                progress: progress.percentage,
                currentStep: progress.step,
                message: progress.message
              })
            }).eq("id", jobId);
          }
        });
        
        console.log("✅ Long video generation completed:", result.url);

        // 更新为完成状态
        await supa.from("jobs").update({ 
          status: "done", 
          result_url: result.url,
          metadata: JSON.stringify({
            ...JSON.parse((await supa.from("jobs").select("metadata").eq("id", jobId).single()).data?.metadata || "{}"),
            progress: 100,
            currentStep: "完成",
            message: "长视频生成完成",
            completedAt: new Date().toISOString()
          })
        }).eq("id", jobId);
        
        console.log("🎉 Long video job completed successfully:", { jobId, url: result.url });
        return NextResponse.json({ 
          id: jobId, 
          status: "done", 
          result_url: result.url,
          type: "longvideo",
          action: "generate"
        });
        
      } catch (processingError) {
        console.error("❌ Long video processing error:", processingError);
        
        // 更新为失败状态
        await supa.from("jobs").update({ 
          status: "failed",
          metadata: JSON.stringify({
            ...JSON.parse((await supa.from("jobs").select("metadata").eq("id", jobId).single()).data?.metadata || "{}"),
            error: processingError.message,
            failedAt: new Date().toISOString()
          })
        }).eq("id", jobId);
        
        return NextResponse.json({ 
          id: jobId, 
          status: "failed", 
          error: processingError.message,
          action: "generate"
        }, { status: 500 });
      }
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

    const metadata = job.metadata ? JSON.parse(job.metadata) : {};
    
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
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}