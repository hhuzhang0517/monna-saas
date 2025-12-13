import { inngest } from "@/inngest/client";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CreditManager } from "@/lib/credits/credit-manager";

export const generateLongVideo = inngest.createFunction(
  {
    id: "generate-long-video",
    // 长视频生成不需要严格的并发限制，因为每个任务耗时很长
    concurrency: { limit: 5 },
    // 限流：每分钟最多10个长视频任务
    throttle: { limit: 10, period: "1m" }
  },
  { event: "app/longVideo.generate.requested" },
  async ({ event, step }) => {
    const {
      jobId,
      provider,
      prompt,
      attachedImages = [],
      shotPlan,
      model,
      teamId,
      requiredCredits
    } = event.data as any;

    console.log("🎬 Inngest long video function triggered:", {
      jobId,
      provider,
      model,
      prompt: prompt.substring(0, 100) + "...",
      attachedImagesCount: attachedImages.length,
      totalShots: shotPlan?.shots?.length || 0
    });

    // Step 1: 标记为处理中
    await step.run("mark-processing", async () => {
      console.log("📝 Updating long video job status to processing:", jobId);
      const supabase = await createSupabaseServer();
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "processing",
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId);

      if (error) {
        console.error("❌ Error updating job status:", error);
        throw error;
      }
      console.log("✅ Job status updated to processing");
    });

    // Step 2: 执行长视频生成
    try {
      const result = await step.run("generate-long-video", async () => {
        console.log(`🎬 Starting long video generation with provider: ${provider}`);

        if (provider === "gemini") {
          // 使用 Google VEO 3.1
          const { generateLongVideoGemini } = await import("@/lib/providers/gemini");

          return await generateLongVideoGemini({
            prompt,
            attachedImages,
            jobId,
            shotPlan,
            model: model || "veo-3.1",
            onProgress: async (progress) => {
              // 在 Inngest 中更新进度
              console.log(`📊 Progress update: ${progress.percentage}% - ${progress.message}`);

              const supabase = await createSupabaseServer();
              const { data: currentJob } = await supabase
                .from("jobs")
                .select("metadata")
                .eq("id", jobId)
                .single();

              const currentMetadata = currentJob?.metadata
                ? JSON.parse(currentJob.metadata)
                : {};

              await supabase.from("jobs").update({
                metadata: JSON.stringify({
                  ...currentMetadata,
                  progress: progress.percentage,
                  currentStep: progress.step,
                  message: progress.message
                })
              }).eq("id", jobId);
            }
          });
        } else if (provider === "runway") {
          // 使用 Runway
          const { generateLongVideoRunway } = await import("@/lib/providers/runway");

          return await generateLongVideoRunway({
            prompt,
            attachedImages,
            jobId,
            shotPlan,
            model: model,
            onProgress: async (progress) => {
              console.log(`📊 Progress update: ${progress.percentage}% - ${progress.message}`);

              const supabase = await createSupabaseServer();
              const { data: currentJob } = await supabase
                .from("jobs")
                .select("metadata")
                .eq("id", jobId)
                .single();

              const currentMetadata = currentJob?.metadata
                ? JSON.parse(currentJob.metadata)
                : {};

              await supabase.from("jobs").update({
                metadata: JSON.stringify({
                  ...currentMetadata,
                  progress: progress.percentage,
                  currentStep: progress.step,
                  message: progress.message
                })
              }).eq("id", jobId);
            }
          });
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }
      });

      console.log("✅ Long video generation completed:", result.url);

      // Step 3: 保存结果
      await step.run("persist-result", async () => {
        console.log("💾 Persisting long video result to database");
        const supabase = await createSupabaseServer();

        const { data: currentJob } = await supabase
          .from("jobs")
          .select("metadata")
          .eq("id", jobId)
          .single();

        const currentMetadata = currentJob?.metadata
          ? JSON.parse(currentJob.metadata)
          : {};

        const { error } = await supabase
          .from("jobs")
          .update({
            status: "done",
            result_url: result.url,
            updated_at: new Date().toISOString(),
            metadata: JSON.stringify({
              ...currentMetadata,
              progress: 100,
              currentStep: "完成",
              message: "长视频生成完成",
              completedAt: new Date().toISOString()
            })
          })
          .eq("id", jobId);

        if (error) {
          console.error("❌ Error persisting result:", error);
          throw error;
        }
        console.log("✅ Result persisted successfully");
      });

      console.log("🎉 Long video job completed successfully:", { jobId, url: result.url });
      return { ok: true, url: result.url };

    } catch (error) {
      console.error("❌ Long video generation failed:", error);

      // 提取用户友好的错误信息
      let userFriendlyMessage = "长视频生成失败，请重试";
      const errorMsg = (error as Error).message || '';

      if (errorMsg.includes('PERMANENT_FAILURE:')) {
        userFriendlyMessage = errorMsg.split('PERMANENT_FAILURE:')[1].trim();
      } else if (errorMsg.length > 0 && errorMsg.length < 200) {
        userFriendlyMessage = errorMsg;
      }

      // Step 4: 标记为失败并退还信用点
      await step.run("handle-failure", async () => {
        const supabase = await createSupabaseServer();

        const { data: currentJob } = await supabase
          .from("jobs")
          .select("metadata")
          .eq("id", jobId)
          .single();

        const currentMetadata = currentJob?.metadata
          ? JSON.parse(currentJob.metadata)
          : {};

        // 更新为失败状态
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            result_url: `ERROR: ${userFriendlyMessage}`,
            updated_at: new Date().toISOString(),
            metadata: JSON.stringify({
              ...currentMetadata,
              error: errorMsg,
              userFriendlyError: userFriendlyMessage,
              failedAt: new Date().toISOString()
            })
          })
          .eq("id", jobId);

        // 退还信用点
        if (teamId && requiredCredits) {
          const refundSuccess = await CreditManager.refundCredits({
            teamId: teamId,
            jobId: jobId,
            amount: requiredCredits,
            reason: `长视频生成失败，自动退还信用点：${userFriendlyMessage}`
          });

          if (refundSuccess) {
            console.log(`💸 Credit refunded: ${requiredCredits} credits due to failure`);
          } else {
            console.error(`❌ Failed to refund credits for job: ${jobId}`);
          }
        }
      });

      throw error;
    }
  }
);
