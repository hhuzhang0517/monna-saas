import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 获取最近5次成功的生成记录，按创建时间倒序
    const { data: generations, error } = await supa
      .from("jobs")
      .select("id, type, prompt, result_url, created_at")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Failed to fetch user generations:", error);
      return NextResponse.json({ error: "failed to fetch generations" }, { status: 500 });
    }

    return NextResponse.json(generations || []);
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
    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

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