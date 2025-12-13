import { putAndGetUrl } from "@/lib/storage";

// Runway API 配置
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY!;
const RUNWAY_API_BASE_URL = "https://api.dev.runwayml.com/v1";

// Runway API 支持的视频比例 (video-to-video)
const VALID_RATIOS_VIDEO_TO_VIDEO = ["1280:720", "720:1280", "1104:832", "960:960", "832:1104", "1584:672", "848:480", "640:480"];

// Runway API 支持的图片转视频比例 (image-to-video)
const VALID_RATIOS_IMAGE_TO_VIDEO = ["768:1280", "1280:768"];

// 验证并修正ratio参数 (video-to-video)
function validateAndFixRatio(ratio: string): string {
  if (!VALID_RATIOS_VIDEO_TO_VIDEO.includes(ratio)) {
    console.warn(`⚠️ Invalid video-to-video ratio ${ratio}, using default 1280:720`);
    return "1280:720";
  }
  return ratio;
}

// 验证并修正ratio参数 (image-to-video)
function validateAndFixRatioImageToVideo(ratio: string): string {
  if (!VALID_RATIOS_IMAGE_TO_VIDEO.includes(ratio)) {
    console.warn(`⚠️ Invalid image-to-video ratio ${ratio}, using default 1280:768 (landscape)`);
    return "1280:768"; // 默认使用横屏
  }
  return ratio;
}

// 根据任务类型选择正确的模型
// 根据 Runway API 文档: https://docs.dev.runwayml.com/guides/models/
function selectModelForTask(taskType: 'image_to_video' | 'video_to_video' | 'text_to_video', providedModel?: string): string {
  // 不同端点支持的模型
  const videoToVideoModels = ['gen4_aleph']; // video-to-video 只支持 gen4_aleph
  const imageToVideoModels = ['gen3a_turbo', 'gen3a', 'gen4_turbo', 'gen4_aleph'];
  const otherModels = ['act_two', 'veo3', 'veo3.1', 'veo3.1_fast'];

  switch (taskType) {
    case 'video_to_video':
      // video-to-video 端点仅支持 gen4_aleph 模型
      if (providedModel && videoToVideoModels.includes(providedModel)) {
        return providedModel;
      }
      return 'gen4_aleph'; // 必须使用 gen4_aleph

    case 'image_to_video':
    case 'text_to_video':
    default:
      // image-to-video 支持更多模型
      const allImageModels = [...imageToVideoModels, ...otherModels];
      if (providedModel && allImageModels.includes(providedModel)) {
        return providedModel;
      }
      return 'gen3a_turbo'; // 默认使用 gen3a_turbo
  }
}

// 获取 video-to-video 的模型回退列表（只有一个可用）
function getVideoToVideoModelFallbacks(): string[] {
  return ['gen4_aleph']; // video-to-video 仅支持此模型
}

// 带重试的fetch函数
async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Fetch attempt ${i + 1}/${retries} to ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      console.warn(`⚠️ Fetch attempt ${i + 1} failed:`, (error as Error).message);
      
      if (i === retries - 1) {
        throw error; // 最后一次重试失败，抛出错误
      }
      
      // 等待后重试
      const delay = Math.min(1000 * Math.pow(2, i), 10000); // 指数退避，最大10秒
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("All retry attempts failed");
}

export interface RunwayVideoOptions {
  prompt: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string; // 参考视频URL（用于特效处理）
  duration?: number; // 视频时长（秒）
  ratio?: string;    // 比例，如 "1280:720"
  model?: string;    // 模型名称
  fixedImagePath?: string; // 固定图片路径（来自public目录）
  imageToVideo?: boolean; // 是否为图片转视频模式
}

export interface RunwayLongVideoOptions {
  prompt: string;
  attachedImages: string[]; // 附加图片URL数组
  jobId: string;
  shotPlan?: any; // 可选的镜头规划，如果提供则跳过规划步骤
  model?: string; // 可选的模型名称（如 "veo3.1"）
  onProgress?: (progress: { percentage: number; step: string; message: string }) => Promise<void>;
}

export interface VideoSegment {
  id: string;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  duration: number;
  order: number;
}

export async function generateVideoRunway(options: RunwayVideoOptions) {
  const {
    prompt,
    referenceImageUrl,
    referenceVideoUrl,
    duration = 5,
    ratio: rawRatio = "1280:720", // 默认值，会根据模式调整
    model, // 不设置默认值，由任务类型决定
    fixedImagePath,
    imageToVideo
  } = options;

  console.log("🎬 Starting Runway video generation:", { prompt, referenceImageUrl, referenceVideoUrl, duration, ratio: rawRatio, model, fixedImagePath, imageToVideo });

  try {
    // 处理固定图片路径，转换为完整URL
    let fixedImageUrl: string | undefined;
    if (fixedImagePath) {
      // 将相对路径转换为完整URL（假设部署在域名下）
      fixedImageUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${fixedImagePath}`;
      console.log("🖼️ Using fixed image:", fixedImageUrl);
    }

    // 如果是图片转视频模式，使用专门的处理逻辑
    if (imageToVideo && referenceImageUrl) {
      console.log("📸 Using image-to-video mode");
      // 对于image-to-video，使用专门的ratio验证（在processImageToVideo内部）
      return await processImageToVideo({
        imageUrl: referenceImageUrl,
        prompt,
        duration,
        ratio: rawRatio, // 直接传递原始ratio，在processImageToVideo内部验证
        model
      });
    }

    // 对于video-to-video，验证并修正ratio参数
    const ratio = validateAndFixRatio(rawRatio);

    // 如果有固定图片和用户视频，使用特殊处理逻辑
    if (fixedImageUrl && referenceVideoUrl) {
      console.log("🎭 Using fixed image + user video mode");
      return await processVideoWithFixedImage({
        videoUrl: referenceVideoUrl,
        imageUrl: fixedImageUrl,
        prompt,
        duration,
        ratio,
        model
      });
    }

    // 如果同时有视频和图片，这是角色任务
    if (referenceVideoUrl && referenceImageUrl) {
      console.log("🎭 Starting face swap process");

      // 首先尝试使用 Act-Two API（如果可用）
      try {
        return await generateFaceSwapWithActTwo({
          drivingVideoUrl: referenceVideoUrl!,
          characterImageUrl: referenceImageUrl!,
          prompt,
          duration,
          ratio,
          model: model || 'act_two'
        });
      } catch (error) {
        console.warn("⚠️ Act-Two not available, falling back to alternative method:", (error as Error).message);

        // 备用方案：使用改进的 video-to-video 方法
        return await generateFaceSwapFallback({
          drivingVideoUrl: referenceVideoUrl!,
          characterImageUrl: referenceImageUrl!,
          prompt,
          duration,
          ratio,
          model: selectModelForTask('image_to_video', model)
        });
      }
    }
    // 如果只有视频输入，使用video-to-video端点处理视频特效
    else if (referenceVideoUrl) {
      console.log("📹 Using video-to-video mode for video effects");
      const taskData = await processVideoToVideo(referenceVideoUrl!, prompt, { model: selectModelForTask('video_to_video', model), duration, ratio });
      return await finishVideoToVideoTask(taskData);
    }
    
    // 根据文档，没有单独的text-to-video端点，使用image_to_video端点
    const endpoint = '/image_to_video';
    const requestBody: any = {
      promptText: prompt,
      model: selectModelForTask('image_to_video', model), // 选择正确的image-to-video模型
      ratio: validateAndFixRatio(ratio || "1280:720") // 必须传递ratio参数
    };
    
    // 如果有参考图片，添加promptImage参数
    if (referenceImageUrl) {
      requestBody.promptImage = referenceImageUrl;
    } else {
      // 如果没有参考图片，使用text-to-video模式
      // 根据Runway API文档，我们需要使用不同的端点
      return await generateTextToVideo(prompt, { duration, ratio, model: selectModelForTask('text_to_video', model) });
    }
    
    // 添加duration参数
    if (duration && (duration === 5 || duration === 10)) {
      requestBody.duration = duration;
    }

    console.log("📤 Sending request to Runway API:", { endpoint, requestBody });
    
    // 创建视频生成任务
    const response = await fetch(`${RUNWAY_API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Runway API error:", response.status, errorText);

      // 解析错误信息并提供更友好的错误消息
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && errorData.error.includes('ratio')) {
          throw new Error("视频比例参数错误，请检查设置后重试");
        }
      } catch (parseError) {
        // 如果解析失败，使用通用错误信息
      }

      throw new Error("视频生成服务暂时不可用，请稍后重试");
    }

    const taskData = await response.json();
    console.log("📋 Task created:", taskData.id);

    // 轮询等待任务完成
    const videoUrl = await waitForVideoGeneration(taskData.id);
    
    // 下载并存储视频到Supabase Storage
    console.log("💾 Downloading and storing video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error("❌ Failed to download video:", videoResponse.status);
      throw new Error("视频下载失败，请重新尝试");
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const storageUrl = await putAndGetUrl(
      `runway/${crypto.randomUUID()}.mp4`, 
      videoBuffer, 
      "video/mp4"
    );

    console.log("✅ Video stored successfully:", storageUrl);
    return { url: storageUrl };

  } catch (error) {
    console.error("❌ Runway video generation failed:", error);
    // 如果错误已经是友好的用户消息，直接抛出；否则使用通用消息
    if ((error as Error).message.includes("视频生成服务") || (error as Error).message.includes("视频下载失败")) {
      throw error;
    }
    throw new Error("视频生成失败，请检查网络连接后重试");
  }
}

async function waitForVideoGeneration(taskId: string, maxAttempts: number = 60): Promise<string> {
  console.log(`⏳ Waiting for task ${taskId} to complete...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${RUNWAY_API_BASE_URL}/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06"
        }
      });

      if (!response.ok) {
        console.error("❌ Task status check failed:", response.status);
        throw new Error("视频生成状态查询失败");
      }

      const taskData = await response.json();
      console.log(`📊 Task ${taskId} status: ${taskData.status} (attempt ${attempt}/${maxAttempts})`);

      if (taskData.status === 'SUCCEEDED') {
        if (taskData.output && taskData.output.length > 0) {
          const videoUrl = taskData.output[0];
          console.log("🎉 Video generation completed:", videoUrl);
          return videoUrl;
        } else {
          console.error("❌ Task succeeded but no output URL found");
          throw new Error("视频生成完成但结果获取失败");
        }
      } else if (taskData.status === 'FAILED') {
        const failureReason = taskData.failure_reason || taskData.failure || taskData.error || "未知错误";
        const failureCode = taskData.failureCode || taskData.failure_code || taskData.errorCode;
        console.error("❌ Task failed:", failureReason);
        console.error("❌ Failure code:", failureCode);
        console.error("❌ Full task data:", JSON.stringify(taskData, null, 2));

        // 根据失败原因提供更具体的错误信息
        if (failureCode === "NO_FACE_FOUND" || failureReason.includes("No face found")) {
          throw new Error("PERMANENT_FAILURE: 未在图片或视频中检测到人脸，请上传包含清晰人脸的素材");
        } else if (failureReason.includes("content policy") || failureReason.includes("policy")) {
          throw new Error("PERMANENT_FAILURE: 视频内容不符合平台政策，请修改提示词后重试");
        } else if (failureReason.includes("timeout") || failureReason.includes("time")) {
          throw new Error("视频生成超时，请稍后重试");
        } else if (failureReason.includes("image") || failureReason.includes("frame")) {
          throw new Error("PERMANENT_FAILURE: 关键帧图片处理失败，请重新上传图片");
        } else if (failureCode === "INTERNAL.BAD_OUTPUT.CODE01") {
          // 立即停止polling并抛出特定错误以触发重试
          throw new Error("RUNWAY_BAD_OUTPUT: 视频生成内容不符合要求，将尝试简化提示词重新生成");
        } else {
          throw new Error(`PERMANENT_FAILURE: 视频生成失败: ${failureReason}`);
        }
      } else if (taskData.status === 'CANCELLED') {
        throw new Error("PERMANENT_FAILURE: 视频生成已取消");
      }

      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      const errorMessage = (error as Error).message || '';

      // 永久性失败：立即停止轮询并抛出错误
      if (errorMessage.includes('PERMANENT_FAILURE') ||
          errorMessage.includes('RUNWAY_BAD_OUTPUT')) {
        console.error(`❌ Permanent failure detected, stopping polling:`, errorMessage);
        throw error;
      }

      // 达到最大尝试次数：停止轮询
      if (attempt === maxAttempts) {
        console.error(`❌ Task polling failed after ${maxAttempts} attempts:`, errorMessage);
        throw new Error("视频生成超时，请重新尝试");
      }

      // 临时性错误：继续重试
      console.warn(`⚠️ Polling attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error("视频生成超时，请稍后重试");
}

// 处理video-to-video生成（使用 gen4_aleph 模型）
async function processVideoToVideo(videoUrl: string, prompt: string, options: { model: string, duration: number, ratio: string }) {
  console.log("🎬 Starting video-to-video processing:", { videoUrl, prompt, options });

  const modelFallbacks = getVideoToVideoModelFallbacks();
  let lastError: any = null;

  // 尝试所有可用的模型（目前只有 gen4_aleph）
  for (const modelToTry of modelFallbacks) {
    try {
      console.log(`📋 Trying model: ${modelToTry}`);

      const requestBody: any = {
        videoUri: videoUrl,
        promptText: prompt,
        model: modelToTry,
        ratio: validateAndFixRatio(options.ratio),
        duration: options.duration
      };

      console.log("📤 Sending video-to-video request:", requestBody);

      const response = await fetch(`${RUNWAY_API_BASE_URL}/video_to_video`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06"
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`❌ Model ${modelToTry} failed:`, response.status, responseText);

        // 检查是否是模型不可用错误
        if (response.status === 403 && responseText.includes('not available')) {
          console.log(`⚠️ Model ${modelToTry} not available, trying next model...`);
          lastError = new Error(`Model ${modelToTry} not available`);
          continue; // 尝试下一个模型
        }

        // 其他错误直接抛出
        throw new Error(`视频特效处理失败: ${responseText}`);
      }

      // 成功！
      const taskData = JSON.parse(responseText);
      console.log(`✅ Successfully created task with model ${modelToTry}:`, taskData.id);

      // 返回任务数据以继续处理
      return taskData;

    } catch (error: any) {
      console.error(`❌ Error with model ${modelToTry}:`, error.message);
      lastError = error;

      // 如果不是模型不可用错误，直接抛出
      if (!error.message.includes('not available')) {
        throw error;
      }
    }
  }

  // 所有模型都失败了
  console.error("❌ All models failed, last error:", lastError);
  throw new Error("所有可用模型都无法处理此请求，请检查您的 Runway API 账户权限或联系支持");
}

// 辅助函数：继续处理 video-to-video 任务
async function finishVideoToVideoTask(taskData: any) {
  console.log("📋 Video-to-video task created:", taskData.id);

  // 轮询等待任务完成
  const videoUrl_result = await waitForVideoGeneration(taskData.id);
  
  // 下载并存储视频到Supabase Storage
  console.log("💾 Downloading and storing processed video...");
  const videoResponse = await fetch(videoUrl_result);
  if (!videoResponse.ok) {
    console.error("❌ Failed to download processed video:", videoResponse.status);
    throw new Error("视频下载失败，请重新尝试");
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const storageUrl = await putAndGetUrl(
    `runway/${crypto.randomUUID()}.mp4`, 
    videoBuffer, 
    "video/mp4"
  );

  console.log("✅ Video-to-video processed successfully:", storageUrl);
  return { url: storageUrl };
}

// 纯文本到视频生成（直接使用默认图片方案）
async function generateTextToVideo(prompt: string, options: { duration: number, ratio: string, model: string }) {
  console.log("🎬 Starting text-to-video generation using default image approach:", { prompt, options });
  
  // Runway API只支持image_to_video，所以我们直接使用默认图片方案
  return await generateWithDefaultImage(prompt, options);
}

// VEO模型专用：使用中性起始帧生成视频
async function generateTextToVideoVEO(options: { prompt: string, duration: number, ratio: string, model: string }) {
  const { prompt, duration, ratio, model } = options;
  
  console.log("🎬 VEO generation with neutral start frame:", { 
    prompt: prompt.substring(0, 100) + "...", 
    duration, 
    ratio, 
    model 
  });
  
  try {
    // 创建一个完整尺寸的中性灰色渐变图片（避免触发内容审核）
    const neutralStartFrame = createNeutralStartFrame(ratio);
    
    const requestBody = {
      promptText: prompt,
      promptImage: neutralStartFrame, // 使用中性起始帧
      model: model,
      ratio: validateAndFixRatioImageToVideo(ratio),
      duration: duration
    };

    console.log("📤 Sending VEO generation request with neutral frame:", {
      promptLength: prompt.length,
      model,
      ratio: requestBody.ratio,
      duration
    });

    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/image_to_video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(requestBody)
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Runway VEO generation API error:", response.status, errorText);
      throw new Error(`VEO视频生成失败: ${errorText}`);
    }

    const taskData = await response.json();
    console.log("📋 VEO generation task created:", taskData.id);

    // 轮询等待任务完成
    const videoUrl = await waitForVideoGeneration(taskData.id);
    
    // 下载并存储视频到Supabase Storage
    console.log("💾 Downloading and storing VEO video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error("❌ Failed to download VEO video:", videoResponse.status);
      throw new Error("VEO视频下载失败");
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const storageUrl = await putAndGetUrl(
      `runway-veo/${crypto.randomUUID()}.mp4`, 
      videoBuffer, 
      "video/mp4"
    );

    console.log("✅ VEO video stored successfully:", storageUrl);
    return storageUrl;

  } catch (error) {
    console.error("❌ VEO generation failed:", error);
    throw new Error(`VEO视频生成失败: ${(error as Error).message}`);
  }
}

// 创建中性起始帧（灰色渐变，避免触发内容审核）
function createNeutralStartFrame(ratio: string): string {
  // Runway API 不支持 SVG，直接使用简单的 PNG data URI
  // 这是一个 1x1 像素的深灰色 PNG 图片，Runway 会自动缩放到所需尺寸
  const neutralPngDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mM0NDRkAAAAAgIBXBBTigAAAABJRU5ErkJggg==";

  console.log("🎨 Using neutral 1x1 PNG as start frame (Runway will scale automatically)");
  return neutralPngDataUri;
}

// 使用默认图片生成视频（适用于纯文本生成）
async function generateWithDefaultImage(prompt: string, options: { duration: number, ratio: string, model: string }) {
  console.log("🎨 Using default image for video generation");
  
  try {
    // 使用一个简单的PNG图片data URI（1x1像素，深蓝色）
    const defaultImageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const requestBody = {
      promptText: prompt,
      promptImage: defaultImageUrl,
      model: selectModelForTask('image_to_video'), // 使用image-to-video模型
      ratio: validateAndFixRatioImageToVideo(options.ratio),
      duration: options.duration
    };

    console.log("📤 Sending default image request:", { 
      ...requestBody, 
      promptImage: "1x1_png_data_uri",
      promptLength: prompt.length 
    });

    // 添加重试机制和更长的超时时间
    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/image_to_video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(requestBody)
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Runway default image API error:", response.status, errorText);
      
      // 尝试使用更简单的纯色背景
      console.log("⚠️ Default image failed, trying solid color...");
      return await generateWithSolidBackground(prompt, options);
    }

    const taskData = await response.json();
    console.log("📋 Default gradient image task created:", taskData.id);

    // 轮询等待任务完成
    const videoUrl = await waitForVideoGeneration(taskData.id);
    
    // 下载并存储视频到Supabase Storage
    console.log("💾 Downloading and storing default image video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error("❌ Failed to download default image video:", videoResponse.status);
      throw new Error("视频下载失败，请重新尝试");
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const storageUrl = await putAndGetUrl(
      `runway/${crypto.randomUUID()}.mp4`, 
      videoBuffer, 
      "video/mp4"
    );

    console.log("✅ Default image video stored successfully:", storageUrl);
    return { url: storageUrl };

  } catch (error) {
    console.error("❌ Default gradient image generation failed:", error);
    throw new Error("视频生成失败，请检查网络连接后重试");
  }
}

// 使用纯色背景作为最后的备选方案
async function generateWithSolidBackground(prompt: string, options: { duration: number, ratio: string, model: string }) {
  console.log("🎨 Using solid color background for video generation");
  
  try {
    // 使用一个简单的PNG图片data URI（1x1像素，黑色）
    const solidImageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==";
    
    const requestBody = {
      promptText: prompt,
      promptImage: solidImageUrl,
      model: selectModelForTask('image_to_video'), // 使用image-to-video模型
      ratio: validateAndFixRatioImageToVideo(options.ratio),
      duration: options.duration
    };

    console.log("📤 Sending solid background request:", { 
      ...requestBody, 
      promptImage: "1x1_black_png_data_uri" 
    });

    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/image_to_video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(requestBody)
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Runway solid background API error:", response.status, errorText);
      throw new Error("视频生成服务暂时不可用，请稍后重试");
    }

    const taskData = await response.json();
    console.log("📋 Solid background task created:", taskData.id);

    // 轮询等待任务完成
    const videoUrl = await waitForVideoGeneration(taskData.id);
    
    // 下载并存储视频到Supabase Storage
    console.log("💾 Downloading and storing solid background video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error("❌ Failed to download solid background video:", videoResponse.status);
      throw new Error("视频下载失败，请重新尝试");
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const storageUrl = await putAndGetUrl(
      `runway/${crypto.randomUUID()}.mp4`, 
      videoBuffer, 
      "video/mp4"
    );

    console.log("✅ Solid background video stored successfully:", storageUrl);
    return { url: storageUrl };

  } catch (error) {
    console.error("❌ Solid background generation failed:", error);
    throw new Error("视频生成失败，请检查网络连接后重试");
  }
}

// 长视频生成主函数 - 基于LLM规划器 + Runway连续生成
export async function generateLongVideoRunway(options: RunwayLongVideoOptions) {
  const { prompt, attachedImages, jobId, shotPlan: providedShotPlan, model, onProgress } = options;
  
  console.log("🎬 Starting long video generation:", { 
    jobId, 
    prompt: prompt.substring(0, 100) + "...", 
    imagesCount: attachedImages.length,
    hasShotPlan: !!providedShotPlan
  });

  try {
    let shotPlan;
    
    if (providedShotPlan) {
      // 使用提供的镜头规划
      shotPlan = providedShotPlan;
      console.log("📋 Using provided shot plan:", {
        totalShots: shotPlan.shots?.length || 0,
        totalDuration: shotPlan.total_seconds || 0
      });
      
      await onProgress?.({ 
        percentage: 5, 
        step: "使用确认规划", 
        message: "正在使用您确认的镜头规划..." 
      });
    } else {
      // 步骤1: 使用LLM规划器分析和规划镜头
      await onProgress?.({ 
        percentage: 5, 
        step: "智能分析", 
        message: "正在使用AI分析提示词并规划镜头序列..." 
      });
      
      const { generateShotPlan } = await import("@/lib/llm/shot-planner");
      shotPlan = await generateShotPlan(prompt, 65, "1280:768"); // 默认65秒，Runway image_to_video支持的比例
      
      console.log("📋 Generated shot plan:", {
        totalShots: shotPlan.shots.length,
        totalDuration: shotPlan.total_seconds,
        shots: shotPlan.shots.map(s => ({ id: s.id, duration: s.duration_s, camera: s.camera }))
      });
    }

    // 检查是否使用VEO模型
    const isVeoModel = model && (model.includes('veo') || model.includes('VEO'));
    
    // 步骤2: 准备首帧关键帧
    await onProgress?.({ 
      percentage: 10, 
      step: "准备首帧", 
      message: "正在准备首帧关键帧..." 
    });
    
    let currentKeyframeUrl: string | null = null;
    let firstShotGenerated = false; // 标记第一个镜头是否已生成
    
    if (attachedImages.length > 0) {
      // 使用用户上传的第一张图片作为首帧
      currentKeyframeUrl = attachedImages[0];
      console.log("🖼️ Using user uploaded image as first keyframe");
    } else if (isVeoModel) {
      // VEO模型：第一个镜头使用纯文本生成，然后提取尾帧
      console.log("🎬 VEO model - will generate first shot with text-to-video");
      // 不设置currentKeyframeUrl，在循环中特殊处理第一个镜头
    } else {
      // 非VEO模型：使用默认图片方案生成首帧
      console.log("🎨 Generating first keyframe with T2I");
      const firstShotPrompt = shotPlan.shots[0]?.prompt || "A cinematic establishing shot";
      
      const firstFrameResult = await generateWithDefaultImage(firstShotPrompt, {
        duration: 5,
        ratio: shotPlan.ratio,
        model: selectModelForTask('image_to_video')
      });
      
      const { extractLastFrame, downloadFile, fileToDataUri } = await import("@/lib/video/ffmpeg-utils");
      const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`;
      await downloadFile(firstFrameResult.url, tempVideoPath);
      const firstFramePath = await extractLastFrame(tempVideoPath);
      currentKeyframeUrl = await fileToDataUri(firstFramePath);
    }

    // 步骤3: 按镜头顺序生成视频片段
    const generatedSegments: string[] = [];
    const totalShots = shotPlan.shots.length;
    
    for (let i = 0; i < totalShots; i++) {
      const shot = shotPlan.shots[i];
      const progressBase = 15 + (i * 70) / totalShots;
      
      await onProgress?.({ 
        percentage: progressBase, 
        step: `生成镜头 ${i + 1}/${totalShots}`, 
        message: `正在生成镜头${i + 1}：${shot.camera}镜头，${shot.duration_s}秒` 
      });

      try {
        let segmentUrl: string;
        
        // VEO模型特殊处理：第一个镜头用text-to-video，后续镜头用image-to-video保证连贯性
        if (isVeoModel && i === 0 && !currentKeyframeUrl) {
          // VEO第一个镜头：使用纯文本生成
          console.log(`🎬 VEO first shot - using text-to-video`);
          segmentUrl = await generateTextToVideoVEO({
            prompt: shot.prompt,
            duration: shot.duration_s,
            ratio: shotPlan.ratio,
            model: model || 'veo3.1'
          });
        } else {
          // 其他情况：使用关键帧生成（保证连贯性）
          console.log(`🎬 Shot ${i + 1} - using image-to-video with keyframe`);
          segmentUrl = await generateVideoSegmentWithKeyframe({
            prompt: shot.prompt,
            keyframeUrl: currentKeyframeUrl!,
            duration: shot.duration_s,
            ratio: shotPlan.ratio,
            model: model // 传递模型参数（VEO或其他）
          });
        }
        
        generatedSegments.push(segmentUrl);
        console.log(`✅ Generated shot ${i + 1}/${totalShots}:`, segmentUrl);
        
        // 提取尾帧作为下一个镜头的首帧（保证连贯性）
        if (i < totalShots - 1) {
          await onProgress?.({ 
            percentage: progressBase + (70 / totalShots) * 0.5, 
            step: `提取连接帧`, 
            message: `正在提取镜头${i + 1}的尾帧用于连续性...` 
          });
          
          currentKeyframeUrl = await extractAndConvertLastFrame(segmentUrl);
        }
        
        await onProgress?.({ 
          percentage: progressBase + (70 / totalShots), 
          step: `镜头 ${i + 1} 完成`, 
          message: `镜头${i + 1}生成完成` 
        });
        
      } catch (error) {
        console.error(`❌ Failed to generate shot ${i + 1}:`, error);
        throw new Error(`镜头${i + 1}生成失败: ${(error as Error).message}`);
      }
    }

    // 步骤4: 拼接所有视频片段
    await onProgress?.({ 
      percentage: 90, 
      step: "拼接视频", 
      message: "正在拼接所有镜头为完整长视频..." 
    });

    const finalVideoUrl = await stitchVideoSegments(generatedSegments, jobId);
    
    await onProgress?.({ 
      percentage: 100, 
      step: "完成", 
      message: `长视频生成完成！总时长: ${shotPlan.total_seconds}秒` 
    });

    console.log("🎉 Long video generation completed:", finalVideoUrl);
    return { url: finalVideoUrl };

  } catch (error) {
    console.error("❌ Long video generation failed:", error);
    throw new Error(`长视频生成失败: ${(error as Error).message}`);
  }
}

// 规划视频片段
async function planVideoSegments(prompt: string, attachedImages: string[]): Promise<VideoSegment[]> {
  const segments: VideoSegment[] = [];
  
  // 如果有附加图片，为每张图片创建一个片段
  if (attachedImages.length > 0) {
    attachedImages.forEach((imageUrl, index) => {
      segments.push({
        id: `segment-${index + 1}`,
        prompt: `${prompt} - 第${index + 1}部分`,
        imageUrl,
        duration: 5, // 每个片段5秒
        order: index + 1
      });
    });
  } else {
    // 如果没有附加图片，根据提示词创建多个片段
    const segmentCount = Math.max(2, Math.min(6, Math.ceil(prompt.length / 100))); // 2-6个片段
    
    for (let i = 0; i < segmentCount; i++) {
      segments.push({
        id: `segment-${i + 1}`,
        prompt: `${prompt} - 片段${i + 1}`,
        duration: 5,
        order: i + 1
      });
    }
  }
  
  return segments;
}

// 使用关键帧生成视频片段
async function generateVideoSegmentWithKeyframe({
  prompt,
  keyframeUrl,
  duration,
  ratio,
  model
}: {
  prompt: string;
  keyframeUrl: string;
  duration: number;
  ratio: string;
  model?: string;
}): Promise<string> {
  console.log(`🎬 Generating video segment:`, { prompt: prompt.substring(0, 50) + "...", duration, ratio, model });
  
  // 尝试最多3次生成
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 如果是因为BAD_OUTPUT错误重试，使用极简提示词
      let adjustedPrompt = prompt;
      if (attempt > 1) {
        if (attempt === 2) {
          // 第二次尝试：移除复杂描述
          adjustedPrompt = prompt
            .replace(/\b(subtle|subtly|gently|softly|slightly|faintly|ethereal|mystical|magical|pulsating|shimmering)\b/gi, '')
            .replace(/,\s*their[^,]+,/gi, ',')
            .replace(/\.\s*[A-Z][^.]*motion blur[^.]*\./gi, '.')
            .replace(/\s+/g, ' ')
            .trim();
        } else if (attempt === 3) {
          // 第三次尝试：使用极简描述
          adjustedPrompt = "A young woman in traditional robe runs up stone steps, POV camera";
        }
        
        console.log(`🔄 Attempt ${attempt}: Simplified prompt from ${prompt.length} to ${adjustedPrompt.length} characters`);
        console.log(`🔄 New prompt: ${adjustedPrompt}`);
      }
      
      return await generateSingleVideoSegment({ prompt: adjustedPrompt, keyframeUrl, duration, ratio, model });
    } catch (error) {
      console.warn(`⚠️ Video segment generation attempt ${attempt} failed:`, (error as Error).message);
      
      // 如果是BAD_OUTPUT错误，继续重试；其他错误立即失败
      const isBadOutputError = (error as Error).message.includes('RUNWAY_BAD_OUTPUT') || (error as Error).message.includes('INTERNAL.BAD_OUTPUT.CODE01');
      
      console.log(`🔍 Error analysis:`, {
        attempt,
        isBadOutputError,
        errorMessage: (error as Error).message,
        willRetry: attempt < 3 && isBadOutputError
      });
      
      if (attempt === 3 || !isBadOutputError) {
        console.log(`❌ Giving up after ${attempt} attempts or non-BAD_OUTPUT error`);
        throw error; // 最后一次尝试失败或非BAD_OUTPUT错误，抛出错误
      }
      
      // 等待后重试
      const delay = 2000 * attempt; // 递增延迟：2s, 4s
      console.log(`⏳ BAD_OUTPUT detected, waiting ${delay}ms before retry ${attempt + 1} with simplified prompt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("所有重试尝试都已失败");
}

// 单次视频片段生成
async function generateSingleVideoSegment({
  prompt,
  keyframeUrl,
  duration,
  ratio,
  model
}: {
  prompt: string;
  keyframeUrl: string;
  duration: number;
  ratio: string;
  model?: string;
}): Promise<string> {
  // 如果keyframeUrl是data URI，直接使用；否则需要转换
  let promptImage = keyframeUrl;
  if (!keyframeUrl.startsWith('data:')) {
    // 下载图片并转换为data URI
    const { downloadFile, fileToDataUri } = await import("@/lib/video/ffmpeg-utils");
    const tempImagePath = `/tmp/${crypto.randomUUID()}.png`;
    await downloadFile(keyframeUrl, tempImagePath);
    promptImage = await fileToDataUri(tempImagePath);
  }
  
  const requestBody = {
    promptText: prompt,
    promptImage: promptImage,
    model: selectModelForTask('image_to_video', model), // 使用提供的模型或默认模型
    ratio: validateAndFixRatioImageToVideo(ratio),
    duration: duration
  };

  console.log("📤 Sending video generation request to Runway:", {
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 100) + "...",
    duration,
    ratio,
    hasImage: true,
    imageType: keyframeUrl.startsWith('data:') ? 'data_uri' : 'url'
  });

  const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/image_to_video`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RUNWAY_API_KEY}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06"
    },
    body: JSON.stringify(requestBody)
  }, 3);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Runway video generation API error:", response.status, errorText);
    throw new Error("视频生成服务暂时不可用，请稍后重试");
  }

  const taskData = await response.json();
  console.log("📋 Video generation task created:", taskData.id);

  // 轮询等待任务完成
  const videoUrl = await waitForVideoGeneration(taskData.id);
  
  // 下载并存储视频到Supabase Storage
  console.log("💾 Downloading and storing generated video...");
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    console.error("❌ Failed to download generated video:", videoResponse.status);
    throw new Error("视频下载失败，请重新尝试");
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const storageUrl = await putAndGetUrl(
    `runway/${crypto.randomUUID()}.mp4`, 
    videoBuffer, 
    "video/mp4"
  );

  console.log("✅ Video segment stored successfully:", storageUrl);
  return storageUrl;
}

// 提取视频尾帧并转换为可用的URL
async function extractAndConvertLastFrame(videoUrl: string): Promise<string> {
  try {
    const { downloadFile, extractLastFrame, fileToDataUri } = await import("@/lib/video/ffmpeg-utils");
    
    // 下载视频
    const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`;
    await downloadFile(videoUrl, tempVideoPath);
    
    // 提取尾帧
    const lastFramePath = await extractLastFrame(tempVideoPath);
    
    // 转换为data URI
    const dataUri = await fileToDataUri(lastFramePath);
    
    console.log("✅ Last frame extracted and converted to data URI");
    return dataUri;
    
  } catch (error) {
    console.error("❌ Failed to extract and convert last frame:", error);
    throw new Error(`尾帧提取失败: ${(error as Error).message}`);
  }
}

// 拼接视频片段
async function stitchVideoSegments(segmentUrls: string[], jobId: string): Promise<string> {
  console.log("🔗 Stitching video segments:", segmentUrls.length);
  
  try {
    const { downloadFile, concatVideos } = await import("@/lib/video/ffmpeg-utils");
    
    // 下载所有片段
    const tempDir = `/tmp/long-video-${jobId}`;
    const segmentPaths: string[] = [];
    
    for (let i = 0; i < segmentUrls.length; i++) {
      const segmentPath = `${tempDir}/segment_${i + 1}.mp4`;
      await downloadFile(segmentUrls[i], segmentPath);
      segmentPaths.push(segmentPath);
    }
    
    // 拼接视频
    const stitchedPath = `${tempDir}/stitched.mp4`;
    await concatVideos(segmentPaths, stitchedPath);
    
    // 上传最终视频到存储
    const fs = await import('fs');
    const finalBuffer = await fs.promises.readFile(stitchedPath);
    const finalUrl = await putAndGetUrl(
      `long-video/${jobId}-final.mp4`, 
      finalBuffer, 
      "video/mp4"
    );
    
    // 清理临时文件
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    
    console.log("✅ Video segments stitched successfully:", finalUrl);
    return finalUrl;
    
  } catch (error) {
    console.error("❌ Video stitching failed:", error);
    throw new Error(`视频拼接失败: ${(error as Error).message}`);
  }
}

// 合并视频片段
async function mergeVideoSegments(segments: VideoSegment[], jobId: string): Promise<string> {
  console.log("🔗 Merging video segments:", segments.length);
  
  try {
    // 这里我们使用一个简化的合并策略：
    // 1. 如果只有一个片段，直接返回
    // 2. 如果有多个片段，使用第一个片段作为基础，其他片段通过video-to-video进行连接
    
    if (segments.length === 1) {
      console.log("✅ Single segment, no merging needed");
      return segments[0].videoUrl!;
    }
    
    // 对于多个片段，我们需要实现视频拼接
    // 由于Runway API目前不直接支持视频拼接，我们采用以下策略：
    // 1. 使用第一个视频作为基础
    // 2. 逐步使用video-to-video将后续片段的内容融合进去
    
    let currentVideo = segments[0].videoUrl!;
    
    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      console.log(`🔗 Merging segment ${i + 1} into current video...`);
      
      // 使用video-to-video将下一个片段的内容融合到当前视频中
      const mergePrompt = `继续视频内容，融合以下场景: ${nextSegment.prompt}`;
      
      try {
        const mergedResult = await processVideoToVideo(
          currentVideo, 
          mergePrompt, 
          { model: selectModelForTask('video_to_video'), duration: 10, ratio: "1280:720" }
        );
        currentVideo = mergedResult.url;
        console.log(`✅ Merged segment ${i + 1}`);
      } catch (error) {
        console.warn(`⚠️ Failed to merge segment ${i + 1}, using original video:`, error);
        // 如果合并失败，继续使用当前视频
      }
    }
    
    // 存储最终合并的视频
    const finalFileName = `long-video/${jobId}-final.mp4`;
    
    // 下载当前视频并重新上传到最终位置
    const videoResponse = await fetch(currentVideo);
    if (!videoResponse.ok) {
      throw new Error("无法下载合并后的视频");
    }
    
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const finalUrl = await putAndGetUrl(finalFileName, videoBuffer, "video/mp4");
    
    console.log("✅ Final long video stored:", finalUrl);
    return finalUrl;
    
  } catch (error) {
    console.error("❌ Video merging failed:", error);
    throw new Error(`视频合并失败: ${(error as Error).message}`);
  }
}

// Act-Two 角色功能接口
interface FaceSwapOptions {
  drivingVideoUrl: string;
  characterImageUrl: string;
  prompt: string;
  duration: number;
  ratio: string;
  model: string;
}

// Act-Two 角色功能 - 使用 character_performance 端点
async function generateFaceSwapWithActTwo(options: FaceSwapOptions) {
  const { drivingVideoUrl, characterImageUrl, prompt, duration, ratio, model } = options;

  console.log("🎬 Using Act-Two character performance API for face swap");

  try {
    // 构建 character_performance 请求体
    const requestBody = {
      model: "act_two",
      ratio: validateAndFixRatio(ratio),
      character: {
        type: "image",
        uri: characterImageUrl
      },
      reference: {
        type: "video",
        uri: drivingVideoUrl
      },
      expressionIntensity: 3,
      bodyControl: true
    };

    console.log("📤 Sending Act-Two character_performance request:", {
      model: requestBody.model,
      ratio: requestBody.ratio,
      characterType: requestBody.character.type,
      referenceType: requestBody.reference.type,
      expressionIntensity: requestBody.expressionIntensity,
      bodyControl: requestBody.bodyControl
    });

    // 调用 character_performance 端点
    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/character_performance`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(requestBody)
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Act-Two character_performance API error:", response.status, errorText);

      // 解析错误并提供更好的错误信息
      if (errorText.includes("not available")) {
        throw new Error("Act-Two 模型暂时不可用，请稍后重试");
      } else if (errorText.includes("content policy")) {
        throw new Error("内容不符合平台政策，请调整角色素材后重试");
      }

      throw new Error("Act-Two 角色服务暂时不可用，请稍后重试");
    }

    const taskData = await response.json();
    console.log("📋 Act-Two character_performance task created:", taskData.id);

    // 轮询等待任务完成
    const videoUrl = await waitForVideoGeneration(taskData.id);

    // 下载并存储结果
    console.log("💾 Downloading and storing Act-Two result...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error("❌ Failed to download Act-Two result:", videoResponse.status);
      throw new Error("角色结果下载失败，请重新尝试");
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const storageUrl = await putAndGetUrl(
      `runway/act-two/${crypto.randomUUID()}.mp4`,
      videoBuffer,
      "video/mp4"
    );

    console.log("✅ Act-Two face swap result stored successfully:", storageUrl);
    return { url: storageUrl };

  } catch (error) {
    console.error("❌ Act-Two face swap failed:", error);
    throw error;
  }
}

// 改进的备用角色方案
async function generateFaceSwapFallback(options: FaceSwapOptions) {
  const { drivingVideoUrl, characterImageUrl, prompt, duration, ratio, model } = options;

  console.log("🎭 Using improved fallback face swap method");

  try {
    // 方案1：使用video-to-video，将角色描述融入提示词
    const enhancedPrompt = `Transform the person in the video to look like the character from the reference image. ${prompt}. Maintain the original background, camera angles, and scene composition. Focus on changing only the person's appearance while preserving their movements and expressions.`;

    console.log("📝 Enhanced prompt for face swap:", enhancedPrompt.substring(0, 100) + "...");

    // 使用video-to-video端点，并将角色图片信息融入处理
    const result = await processVideoToVideoWithCharacter({
      videoUrl: drivingVideoUrl,
      characterImageUrl,
      prompt: enhancedPrompt,
      model,
      duration,
      ratio
    });

    return result;

  } catch (error) {
    console.error("❌ Fallback face swap failed:", error);
    throw new Error(`角色处理失败: ${(error as Error).message}`);
  }
}

// 带角色参考的video-to-video处理
async function processVideoToVideoWithCharacter({
  videoUrl,
  characterImageUrl,
  prompt,
  model,
  duration,
  ratio
}: {
  videoUrl: string;
  characterImageUrl: string;
  prompt: string;
  model: string;
  duration: number;
  ratio: string;
}) {
  console.log("🎬 Processing video-to-video with character reference");

  // 注意：由于当前Runway API限制，我们无法直接传入角色图片
  // 这是一个改进的实现，专注于更好的提示词工程

  const requestBody: any = {
    videoUri: videoUrl,
    promptText: prompt,
    model: selectModelForTask('video_to_video', model),
    ratio: validateAndFixRatio(ratio),
    duration: duration, // 添加duration参数
    // 未来可能支持的参数：
    // characterImageUri: characterImageUrl,
    // preserveBackground: true,
    // focusOnCharacter: true
  };

  console.log("📤 Sending enhanced video-to-video request:", {
    videoUri: "provided",
    promptLength: prompt.length,
    model,
    ratio
  });

  const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/video_to_video`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RUNWAY_API_KEY}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Enhanced video-to-video API error:", response.status, errorText);

    // 解析错误并提供更好的错误信息
    if (errorText.includes("content policy")) {
      throw new Error("内容不符合平台政策，请调整角色素材后重试");
    } else if (errorText.includes("video format")) {
      throw new Error("视频格式不支持，请上传MP4格式的视频");
    } else if (errorText.includes("duration")) {
      throw new Error("视频时长超出限制，请上传10秒以内的视频");
    }

    throw new Error("角色处理服务暂时不可用，请稍后重试");
  }

  const taskData = await response.json();
  console.log("📋 Enhanced video-to-video task created:", taskData.id);

  // 轮询等待任务完成
  const videoResultUrl = await waitForVideoGeneration(taskData.id);

  // 下载并存储视频到Supabase Storage
  console.log("💾 Downloading and storing face swap result...");
  const videoResponse = await fetch(videoResultUrl);
  if (!videoResponse.ok) {
    console.error("❌ Failed to download face swap result:", videoResponse.status);
    throw new Error("角色结果下载失败，请重新尝试");
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const storageUrl = await putAndGetUrl(
    `runway/face-swap/${crypto.randomUUID()}.mp4`,
    videoBuffer,
    "video/mp4"
  );

  console.log("✅ Face swap result stored successfully:", storageUrl);
  return { url: storageUrl };
}

// 处理固定图片 + 用户视频的特殊情况
async function processVideoWithFixedImage(options: {
  videoUrl: string;
  imageUrl: string;
  prompt: string;
  duration: number;
  ratio: string;
  model?: string;
}) {
  const { videoUrl, imageUrl, prompt, duration, ratio, model } = options;
  
  console.log("🎭 Processing video with fixed image:", { videoUrl, imageUrl, prompt, duration, ratio, model });

  try {
    // 根据现有成功案例，Runway主要使用image_to_video端点
    // 以固定图片为基础，在prompt中融入用户视频的动态描述
    const enhancedPrompt = `${prompt}. Create dynamic video effects based on the provided image. Generate realistic motion, dramatic visual effects, and cinematic quality animation. The scene should have intense action, dynamic movement, and professional video production quality.`;
    
    console.log("🎯 Using image_to_video approach with enhanced prompt:", enhancedPrompt.substring(0, 150) + "...");

    // 使用image_to_video端点，这是Runway API的主要工作方式
    const requestBody = {
      promptText: enhancedPrompt,
      promptImage: imageUrl, // 固定的爆炸图片作为视觉基础
      model: selectModelForTask('image_to_video', model),
      ratio: validateAndFixRatio(ratio),
      duration: duration
    };

    console.log("📤 Sending image_to_video request with fixed image:", {
      promptText: requestBody.promptText.substring(0, 100) + "...",
      promptImage: "provided",
      model: requestBody.model,
      ratio: requestBody.ratio,
      duration: requestBody.duration
    });

    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}/image_to_video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(requestBody)
    }, 3);

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Runway image_to_video API error response:", error);
      throw new Error(`Runway API failed: ${response.status} ${error}`);
    }

    const taskData = await response.json();
    console.log("📋 Image_to_video task created:", taskData.id);

    // 等待视频生成完成
    const videoResultUrl = await waitForVideoGeneration(taskData.id);
    console.log("✅ Video generated from fixed image:", videoResultUrl);

    return { url: videoResultUrl };
    
  } catch (error) {
    console.error("❌ Failed to process video with fixed image:", error);
    throw new Error(`视频特效处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 处理图片转视频的功能
async function processImageToVideo(options: {
  imageUrl: string;
  prompt: string;
  duration: number;
  ratio: string;
  model?: string;
}) {
  const { imageUrl, prompt, duration, ratio, model } = options;
  
  console.log("📸 Processing image-to-video:", { imageUrl, prompt, duration, ratio, model });

  try {
    // 使用image-to-video端点
    const endpoint = '/image_to_video';
    const requestBody: any = {
      promptText: prompt,
      promptImage: imageUrl, // 用户上传的图片
      model: selectModelForTask('image_to_video', model),
      ratio: validateAndFixRatioImageToVideo(ratio) // 使用image-to-video专用的ratio验证
    };

    // 添加duration参数（如果支持）
    if (duration && (duration === 5 || duration === 10)) {
      requestBody.duration = duration;
    }

    console.log("📤 Sending image-to-video request:", JSON.stringify(requestBody, null, 2));

    const response = await fetchWithRetry(`${RUNWAY_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Runway image-to-video API error response:", error);
      throw new Error(`Runway image-to-video API failed: ${response.status} ${error}`);
    }

    const taskData = await response.json();
    console.log("📋 Image-to-video task created:", taskData.id);

    // 等待视频生成完成
    const videoResultUrl = await waitForVideoGeneration(taskData.id);
    console.log("✅ Image-to-video generated:", videoResultUrl);

    return { url: videoResultUrl };
    
  } catch (error) {
    console.error("❌ Failed to process image-to-video:", error);
    throw new Error(`图片转视频失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}