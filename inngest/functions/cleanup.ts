import { inngest } from "@/inngest/client";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * 定时清理任务
 * 
 * 此函数使用 Inngest 内置的 cron 调度系统，自动定时运行
 * 无需 Vercel Cron 或其他外部触发器
 * 
 * 当前配置：每小时运行一次 (0 * * * *)
 * 
 * 如需修改频率，编辑下方的 cron 表达式：
 * - "0 * * * *"     每小时运行
 * - "0 0 * * *"     每天凌晨运行
 * - "0 2 * * *"     每天凌晨2点运行
 * - "0 0 * * 0"     每周日凌晨运行
 * - "0 0 1 * *"     每月1号凌晨运行
 * 
 * 如需禁用定时运行，删除整个 { cron: "..." } 配置即可
 */
export const cleanupJobs = inngest.createFunction(
  {
    id: "cleanup-jobs"
  },
  { cron: "0 * * * *" }, // ⏰ Inngest 自动调度，每小时运行一次
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