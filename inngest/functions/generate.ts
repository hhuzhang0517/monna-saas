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

    // status=processing
    await step.run("mark-processing", async () => {
      const supabase = createSupabaseServer();
      await supabase
        .from("jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", jobId);
    });

    const exec = async () => {
      if (provider === "openai")   return generateImageOpenAI(prompt);
      if (provider === "gemini")   return generateImageGemini(prompt);
      if (provider === "ideogram") return generateImageIdeogram(prompt);
      throw new Error("unknown provider");
    };

    try {
      const { url } = await step.run("call-provider", exec); // 自动重试

      await step.run("persist", async () => {
        const supabase = createSupabaseServer();
        await supabase
          .from("jobs")
          .update({ 
            status: "done", 
            result_url: url, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", jobId);
      });

      return { ok: true, url };
    } catch (error) {
      await step.run("mark-failed", async () => {
        const supabase = createSupabaseServer();
        await supabase
          .from("jobs")
          .update({ 
            status: "failed", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", jobId);
      });
      throw error;
    }
  }
);