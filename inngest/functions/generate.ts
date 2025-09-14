import { inngest } from "@/inngest/client";
import { generateImageOpenAI } from "@/lib/providers/openai";
import { generateImageGemini } from "@/lib/providers/gemini";
import { generateImageIdeogram } from "@/lib/providers/ideogram";
import { createSupabaseServer } from "@/lib/supabase/server";

export const generateMedia = inngest.createFunction(
  { id: "generate-media", concurrency: { limit: 3 }, throttle: { limit: 30, period: "1m" } },
  { event: "app/generate.requested" },
  async ({ event, step }) => {
    const { jobId, provider, prompt } = event.data as any;
    console.log("🚀 Inngest function triggered:", { jobId, provider, prompt });

    // status=processing
    await step.run("mark-processing", async () => {
      console.log("📝 Updating job status to processing:", jobId);
      const supabase = await createSupabaseServer();
      const { error } = await supabase
        .from("jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) {
        console.error("❌ Error updating job status:", error);
        throw error;
      }
      console.log("✅ Job status updated to processing");
    });

    const exec = async () => {
      if (provider === "openai")   return generateImageOpenAI(prompt);
      if (provider === "gemini")   return generateImageGemini(prompt);
      if (provider === "ideogram") return generateImageIdeogram(prompt);
      throw new Error("unknown provider");
    };

    try {
      console.log("🎨 Calling AI provider:", provider);
      const { url } = await step.run("call-provider", exec); // 自动重试
      console.log("✅ AI provider returned URL:", url);

      await step.run("persist", async () => {
        console.log("💾 Persisting result to database");
        const supabase = await createSupabaseServer();
        const { error } = await supabase
          .from("jobs")
          .update({ 
            status: "done", 
            result_url: url, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", jobId);
        if (error) {
          console.error("❌ Error persisting result:", error);
          throw error;
        }
        console.log("✅ Result persisted successfully");
      });

      console.log("🎉 Job completed successfully:", { jobId, url });
      return { ok: true, url };
    } catch (error) {
      console.error("❌ Job failed:", error);
      await step.run("mark-failed", async () => {
        const supabase = await createSupabaseServer();
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ 
            status: "failed", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", jobId);
        if (updateError) {
          console.error("❌ Error marking job as failed:", updateError);
        }
      });
      throw error;
    }
  }
);