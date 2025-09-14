import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();

    // 添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout')), 8000);
    });

    const authPromise = supa.auth.getUser();

    let user;
    try {
      const { data: { user: authUser } } = await Promise.race([authPromise, timeoutPromise]) as any;
      user = authUser;
    } catch (authError) {
      console.warn("Auth timeout or error:", authError);
      return NextResponse.json({ error: "authentication timeout" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 自动清理超过1小时的待处理任务
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supa
      .from("jobs")
      .update({ status: "failed" })
      .eq("user_id", user.id)
      .in("status", ["queued", "processing"])
      .lt("created_at", oneHourAgo);

    // 查询用户的待处理任务和最近完成的任务
    const { data: jobs, error } = await supa
      .from("jobs")
      .select("id, status, type, created_at, result_url")
      .eq("user_id", user.id)
      .in("status", ["queued", "processing", "done", "failed"])
      .order("created_at", { ascending: false })
      .limit(50); // 限制返回数量，避免数据过多

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