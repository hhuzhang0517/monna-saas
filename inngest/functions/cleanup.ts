import { inngest } from "@/inngest/client";
import { createSupabaseServer } from "@/lib/supabase/server";

export const cleanupJobs = inngest.createFunction(
  {
    id: "cleanup-jobs"
  },
  { cron: "0 * * * *" },
  async () => {
    const supabase = await createSupabaseServer();
    
    // 清理超过24小时的失败任务
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from("jobs")
      .delete()
      .eq("status", "failed")
      .lt("created_at", twentyFourHoursAgo);
    
    // 清理超过7天的已完成任务
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from("jobs")
      .delete()
      .eq("status", "done")
      .lt("created_at", sevenDaysAgo);
    
    return { ok: true };
  }
);