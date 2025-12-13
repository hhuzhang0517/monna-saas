import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { putAndGetUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    // 尝试从 Authorization header 获取 token（用于移动端）
    const authHeader = req.headers.get('authorization');
    let user = null;

    if (authHeader?.startsWith('Bearer ')) {
      // 移动端：使用 Bearer token
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
      user = tokenUser;
    } else {
      // Web端：使用 cookie
      const supa = await createSupabaseServer();
      const { data: { user: cookieUser } } = await supa.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "no file provided" }, 
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "file must be an image" }, 
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "file too large, max 10MB allowed" }, 
        { status: 400 }
      );
    }

    console.log("📁 Uploading reference image:", {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: user.id
    });

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Generate filename with user ID and timestamp
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `references/${user.id}/${Date.now()}.${extension}`;
    
    // Upload to storage
    const url = await putAndGetUrl(fileName, bytes, file.type);
    
    console.log("✅ Reference image uploaded successfully:", url);
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}