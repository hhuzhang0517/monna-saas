import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { putAndGetUrl } from "@/lib/storage";

// 模拟视频处理函数（在实际项目中应使用FFmpeg等工具）
async function processVideo(
  buffer: ArrayBuffer,
  originalType: string,
  targetDuration?: number,
  targetResolution?: { width: number; height: number }
): Promise<{ processedBuffer: ArrayBuffer; processedType: string }> {
  // 注意：这里是简化的处理，实际应用中需要使用FFmpeg
  // 由于浏览器环境限制，这里只做基本验证，实际处理交给客户端预处理
  
  console.log("🎬 Processing video:", {
    originalSize: `${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`,
    targetDuration,
    targetResolution
  });
  
  // 在生产环境中，这里应该使用FFmpeg进行实际的视频处理
  // 当前版本直接返回原始buffer
  return {
    processedBuffer: buffer,
    processedType: originalType
  };
}

export async function POST(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    // 获取处理参数
    const needsProcessing = formData.get("needsProcessing") === "true";
    const targetDuration = formData.get("targetDuration") ? parseFloat(formData.get("targetDuration") as string) : undefined;
    const targetResolution = formData.get("targetResolution") ? JSON.parse(formData.get("targetResolution") as string) : undefined;
    
    if (!file) {
      return NextResponse.json(
        { error: "no file provided" }, 
        { status: 400 }
      );
    }

    // 验证文件类型 - 现在支持更多视频格式
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: "only video files are allowed" }, 
        { status: 400 }
      );
    }

    // 验证文件大小 (64MB = 64 * 1024 * 1024 bytes)
    const maxSize = 64 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "file size exceeds 64MB limit" }, 
        { status: 400 }
      );
    }

    console.log("📹 Uploading video file:", {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      needsProcessing,
      targetDuration,
      targetResolution
    });

    // 读取文件内容
    let buffer = await file.arrayBuffer();
    let processedType = file.type;
    
    // 如果需要处理视频
    if (needsProcessing) {
      const { processedBuffer, processedType: newType } = await processVideo(
        buffer,
        file.type,
        targetDuration,
        targetResolution
      );
      buffer = processedBuffer;
      processedType = newType;
    }

    // 生成文件名，保持原扩展名或使用mp4
    const extension = processedType.includes('mp4') ? 'mp4' : 
                     processedType.includes('webm') ? 'webm' : 'mp4';
    const fileName = `videos/${user.id}/${crypto.randomUUID()}.${extension}`;
    
    // 上传到 Supabase Storage
    const url = await putAndGetUrl(fileName, new Uint8Array(buffer), processedType);
    
    console.log("✅ Video uploaded successfully:", url);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}