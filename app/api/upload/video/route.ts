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

    const fileSizeMB = file.size / 1024 / 1024;
    const isMobile = req.headers.get('user-agent')?.toLowerCase().includes('mobile') ||
                     req.headers.get('user-agent')?.toLowerCase().includes('iphone') ||
                     req.headers.get('user-agent')?.toLowerCase().includes('android');

    console.log("📹 Uploading video file:", {
      name: file.name,
      size: `${fileSizeMB.toFixed(2)}MB`,
      type: file.type,
      needsProcessing,
      targetDuration,
      targetResolution,
      userAgent: req.headers.get('user-agent')?.substring(0, 100) || 'unknown',
      isMobile,
      warning: fileSizeMB < 3 ? '⚠️ 视频文件过小，可能被移动端浏览器压缩或截断' : null
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

    const uploadedSizeMB = buffer.byteLength / 1024 / 1024;
    const sizeWarning = uploadedSizeMB < 3 ?
      '⚠️ 警告：视频文件小于3MB，可能被浏览器压缩。实际生成的视频时长可能很短（2-3秒）' : null;

    console.log("✅ Video uploaded successfully:", {
      url,
      finalSize: `${uploadedSizeMB.toFixed(2)}MB`,
      fileName,
      targetDuration,
      isMobile,
      sizeWarning,
      note: '⚠️ 角色功能将使用视频的完整时长（Act-Two不支持duration参数）'
    });

    return NextResponse.json({
      url,
      metadata: {
        originalSize: file.size,
        uploadedSize: buffer.byteLength,
        targetDuration,
        isMobile,
        sizeWarning,
        note: 'Act-Two will use the full duration of the uploaded video'
      }
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "internal server error" }, 
      { status: 500 }
    );
  }
}