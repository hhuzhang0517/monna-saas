import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();

    // 简化认证处理，减少超时问题
    const { data: { user }, error: authError } = await supa.auth.getUser();
    
    if (authError) {
      console.warn("Auth error:", authError);
      return NextResponse.json({ error: "authentication failed" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 查询用户的待处理任务和最近完成的任务（移除昂贵的清理操作）
    const { data: jobs, error } = await supa
      .from("jobs")
      .select("id, status, type, created_at, result_url")
      .eq("user_id", user.id)
      .in("status", ["queued", "processing", "done", "failed"])
      .order("created_at", { ascending: false })
      .limit(10); // 减少查询数量，只返回最近10条

    // Debug logging removed for production

    if (error) {
      console.error("Failed to fetch pending jobs:", error);
      return NextResponse.json({ error: "failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json(jobs || []);
  } catch (error) {
    console.error("Error fetching pending jobs:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}