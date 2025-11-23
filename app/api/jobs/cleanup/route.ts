import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 读取请求参数，支持强制清理所有待处理任务
    const body = await req.json().catch(() => ({}));
    const forceAll = body.forceAll === true;

    let query = supa
      .from("jobs")
      .select("id, created_at, status")
      .eq("user_id", user.id)
      .in("status", ["queued", "processing"]);

    // 如果不是强制清理所有，则只清理超过1小时的任务
    if (!forceAll) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query.lt("created_at", oneHourAgo);
    }

    const { data: expiredJobs, error: fetchError } = await query;

    if (fetchError) {
      console.error("Failed to fetch expired jobs:", fetchError);
      return NextResponse.json({ error: "failed to fetch expired jobs" }, { status: 500 });
    }

    console.log(`🧹 Found ${forceAll ? 'all pending' : 'expired'} jobs to clean:`, expiredJobs);

    if (expiredJobs && expiredJobs.length > 0) {
      const jobIds = expiredJobs.map(job => job.id);
      
      const { error: updateError } = await supa
        .from("jobs")
        .update({ status: "failed" })
        .in("id", jobIds);

      if (updateError) {
        console.error("Failed to update expired jobs:", updateError);
        return NextResponse.json({ error: "failed to cleanup jobs" }, { status: 500 });
      }

      console.log("✅ Cleaned up expired jobs:", jobIds);
      return NextResponse.json({ 
        message: "cleanup completed", 
        cleaned: expiredJobs.length,
        jobIds 
      });
    }

    return NextResponse.json({ message: "no expired jobs found", cleaned: 0 });
  } catch (error) {
    console.error("Error during job cleanup:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}