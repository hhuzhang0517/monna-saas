import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const { type = "image", provider, prompt } = await req.json();
    
    if (!provider || !prompt) {
      return NextResponse.json(
        { error: "provider and prompt are required" }, 
        { status: 400 }
      );
    }

    if (!["openai", "gemini", "ideogram"].includes(provider)) {
      return NextResponse.json(
        { error: "invalid provider" }, 
        { status: 400 }
      );
    }

    const supa = createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // TODO: 校验订阅/额度
    const jobId = crypto.randomUUID();
    
    // 插入任务到数据库
    const { error: insertError } = await supa
      .from("jobs")
      .insert({ 
        id: jobId, 
        user_id: user.id, 
        provider, 
        type, 
        prompt,
        status: "queued"
      });

    if (insertError) {
      return NextResponse.json(
        { error: "failed to create job" }, 
        { status: 500 }
      );
    }

    // 发送事件到Inngest
    await inngest.send({ 
      name: "app/generate.requested", 
      data: { jobId, provider, prompt } 
    });

    return NextResponse.json({ id: jobId, status: "queued" });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supa = createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supa
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}