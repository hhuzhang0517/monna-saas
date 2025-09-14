import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { putAndGetUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
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