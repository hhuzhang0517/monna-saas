import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// 添加内存缓存，避免频繁查询
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2秒缓存

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();

    // 简化认证处理，减少超时问题，添加超时控制
    const authPromise = supa.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 5000)
    );

    const { data: { user }, error: authError } = await Promise.race([
      authPromise,
      timeoutPromise
    ]).catch((error) => {
      console.error("Auth timeout or error:", error);
      return { data: { user: null }, error: new Error('Auth failed') };
    }) as any;
    
    if (authError || !user) {
      console.warn("Auth error or no user");
      return NextResponse.json({ error: "authentication failed" }, { status: 401 });
    }

    // 检查缓存
    const cacheKey = `pending_jobs_${user.id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // 查询用户的待处理任务和最近完成的任务（移除昂贵的清理操作）
    const { data: jobs, error } = await supa
      .from("jobs")
      .select("id, status, type, created_at, result_url")
      .eq("user_id", user.id)
      .in("status", ["queued", "processing", "done", "failed"])
      .order("created_at", { ascending: false })
      .limit(10); // 减少查询数量，只返回最近10条

    if (error) {
      console.error("Failed to fetch pending jobs:", error);
      return NextResponse.json({ error: "failed to fetch jobs" }, { status: 500 });
    }

    const result = jobs || [];
    
    // 更新缓存
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    // 清理过期缓存
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL * 5) {
          cache.delete(key);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching pending jobs:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}