import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 User generations API - request info:', {
      hasAuthHeader: !!req.headers.get('authorization'),
      cookieCount: req.cookies.getAll().length,
    });
    
    // 使用统一的认证函数，支持 Cookie 和 Bearer token
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      console.log('❌ User generations API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    console.log('✅ User generations API - user authenticated:', user.email);
    
    // 对于移动端，使用Service Role客户端查询（绕过RLS）
    // 因为移动端的任务是用Service Role插入的
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('🔑 使用 Service Role 客户端查询历史记录（绕过RLS）');

    // 首先检查该用户有多少条记录
    const { count, error: countError } = await supa
      .from("jobs")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);
    
    console.log(`📊 用户 ${user.email} 共有 ${count} 条任务记录`);

    // 获取最近50次生成记录，按创建时间倒序
    // 注意：不返回prompt字段，避免泄露内部提示词
    const { data: allJobs, error: allError } = await supa
      .from("jobs")
      .select("id, type, result_url, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (allError) {
      console.error("❌ Failed to fetch user jobs:", allError);
      return NextResponse.json({ error: "failed to fetch jobs" }, { status: 500 });
    }

    console.log(`📊 用户所有任务: ${allJobs?.length || 0} 条`);
    if (allJobs && allJobs.length > 0) {
      const statusCount = {};
      allJobs.forEach(job => {
        statusCount[job.status] = (statusCount[job.status] || 0) + 1;
      });
      console.log('📈 按状态统计:', statusCount);
      console.log('📋 前3条记录:', allJobs.slice(0, 3));
    }

    // 只返回done状态且有result_url的记录
    const generations = (allJobs || []).filter(job => 
      job.status === 'done' && job.result_url && !job.result_url.startsWith('ERROR:')
    );

    console.log(`✅ 过滤后完成的记录: ${generations.length} 条`);

    return NextResponse.json(generations);
  } catch (error) {
    console.error("Error fetching user generations:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}

// 清理超过5个的历史记录
export async function DELETE(req: NextRequest) {
  try {
    // 使用统一的认证函数，支持 Cookie 和 Bearer token
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      console.log('❌ Delete generations API - unauthorized');
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    console.log('✅ Delete generations API - user authenticated:', user.email);
    
    // 对于移动端，使用Service Role客户端删除（绕过RLS）
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('🔑 使用 Service Role 客户端删除记录（绕过RLS）');

    // 获取所有成功的生成记录，按创建时间倒序
    const { data: allGenerations, error: fetchError } = await supa
      .from("jobs")
      .select("id, result_url, created_at")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch generations for cleanup:", fetchError);
      return NextResponse.json({ error: "failed to fetch generations" }, { status: 500 });
    }

    if (!allGenerations || allGenerations.length <= 5) {
      return NextResponse.json({ message: "no cleanup needed", deleted: 0 });
    }

    // 保留最新的5个，删除其余的
    const toDelete = allGenerations.slice(5);
    const idsToDelete = toDelete.map(gen => gen.id);
    
    // 从Supabase Storage中删除文件
    // 注意：这里需要实现具体的文件删除逻辑
    let deletedFiles = 0;
    for (const gen of toDelete) {
      if (gen.result_url) {
        try {
          // 从URL中提取文件路径
          const url = new URL(gen.result_url);
          const pathSegments = url.pathname.split('/');
          const fileName = pathSegments[pathSegments.length - 1];
          const bucket = pathSegments[pathSegments.length - 2];
          
          if (bucket && fileName) {
            const { error: storageError } = await supa.storage
              .from(bucket)
              .remove([fileName]);
            
            if (!storageError) {
              deletedFiles++;
            }
          }
        } catch (storageDeleteError) {
          console.warn("Failed to delete storage file:", gen.result_url, storageDeleteError);
        }
      }
    }

    // 从数据库中删除记录
    const { error: deleteError } = await supa
      .from("jobs")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("Failed to delete old generations:", deleteError);
      return NextResponse.json({ error: "failed to delete old generations" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "cleanup completed", 
      deleted: idsToDelete.length,
      filesDeleted: deletedFiles 
    });
  } catch (error) {
    console.error("Error during generation cleanup:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}