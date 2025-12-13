import { putAndGetUrl } from "@/lib/storage";

interface IdeogramOptions {
  prompt: string;
  referenceImageUrl?: string; // URL to reference image for Image2Image generation
  characterReferenceUrl?: string; // URL to character reference image
  styleReferenceUrls?: string[]; // URLs to style reference images
  renderingSpeed?: "TURBO" | "DEFAULT" | "QUALITY";
  aspectRatio?: string;
  styleType?: "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "FICTION";
  negativePrompt?: string;
}

// Function to download image from URL and return as blob
async function downloadImageAsBlob(url: string): Promise<Blob> {
  console.log("⬇️ Downloading reference image from:", url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download reference image: ${response.status}`);
  }
  return await response.blob();
}

export async function generateImageIdeogram(prompt: string): Promise<{ url: string }>;
export async function generateImageIdeogram(options: IdeogramOptions): Promise<{ url: string }>;
export async function generateImageIdeogram(promptOrOptions: string | IdeogramOptions): Promise<{ url: string }> {
  // Handle both old function signature (string) and new signature (options object)
  const options: IdeogramOptions = typeof promptOrOptions === 'string' 
    ? { prompt: promptOrOptions }
    : promptOrOptions;

  const { 
    prompt, 
    referenceImageUrl, 
    characterReferenceUrl, 
    styleReferenceUrls,
    renderingSpeed = "DEFAULT",
    aspectRatio,
    styleType,
    negativePrompt
  } = options;

  console.log("🎨 Ideogram: Starting image generation with options:", {
    prompt,
    hasReferenceImage: !!referenceImageUrl,
    hasCharacterReference: !!characterReferenceUrl,
    hasStyleReferences: !!(styleReferenceUrls?.length),
    renderingSpeed,
    aspectRatio,
    styleType
  });
  
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("rendering_speed", renderingSpeed);
  
  // Add optional parameters
  if (aspectRatio) {
    form.append("aspect_ratio", aspectRatio);
  }
  if (styleType) {
    form.append("style_type", styleType);
  }
  if (negativePrompt) {
    form.append("negative_prompt", negativePrompt);
  }

  // Handle reference images for Image2Image generation
  if (referenceImageUrl) {
    console.log("🖼️ Ideogram: Adding reference image for Image2Image generation");
    try {
      const referenceBlob = await downloadImageAsBlob(referenceImageUrl);
      // Use as character reference for consistent character generation
      form.append("character_reference_images", referenceBlob, "reference.jpg");
      console.log("✅ Ideogram: Reference image added as character reference");
    } catch (error) {
      console.error("❌ Ideogram: Failed to download reference image:", error);
      throw new Error(`Failed to process reference image: ${error.message}`);
    }
  }

  // Handle character reference images
  if (characterReferenceUrl) {
    console.log("👤 Ideogram: Adding character reference image");
    try {
      const characterBlob = await downloadImageAsBlob(characterReferenceUrl);
      form.append("character_reference_images", characterBlob, "character.jpg");
      console.log("✅ Ideogram: Character reference image added");
    } catch (error) {
      console.error("❌ Ideogram: Failed to download character reference:", error);
      throw new Error(`Failed to process character reference: ${error.message}`);
    }
  }

  // Handle style reference images
  if (styleReferenceUrls && styleReferenceUrls.length > 0) {
    console.log("🎨 Ideogram: Adding style reference images");
    for (let i = 0; i < styleReferenceUrls.length; i++) {
      try {
        const styleBlob = await downloadImageAsBlob(styleReferenceUrls[i]);
        form.append("style_reference_images", styleBlob, `style_${i}.jpg`);
        console.log(`✅ Ideogram: Style reference ${i + 1} added`);
      } catch (error) {
        console.error(`❌ Ideogram: Failed to download style reference ${i + 1}:`, error);
        // Continue with other style references if one fails
      }
    }
  }

  console.log("📡 Ideogram: Calling v3 API...");
  const r = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
    method: "POST",
    headers: { "Api-Key": process.env.IDEOGRAM_API_KEY! },
    body: form,
  });

  console.log("📡 Ideogram: API response status:", r.status);
  if (!r.ok) {
    const errorText = await r.text();
    console.error("❌ Ideogram API error:", { status: r.status, error: errorText });
    throw new Error(`Ideogram error ${r.status}: ${errorText}`);
  }
  
  const json = await r.json();
  console.log("📡 Ideogram: API response data:", JSON.stringify(json, null, 2));
  
  const tmpUrl = json?.data?.[0]?.url as string;
  if (!tmpUrl) {
    console.error("❌ Ideogram: No image URL in response");
    throw new Error("Ideogram empty result");
  }

  console.log("⬇️ Ideogram: Downloading generated image from:", tmpUrl);
  // 下载生成的图片
  const img = await fetch(tmpUrl);
  if (!img.ok) {
    console.error("❌ Ideogram: Failed to download generated image:", img.status);
    throw new Error(`Failed to download generated image: ${img.status}`);
  }
  
  const buf = new Uint8Array(await img.arrayBuffer());
  console.log("⬇️ Ideogram: Downloaded generated image, size:", buf.length, "bytes");
  
  const fileName = `ideogram/${crypto.randomUUID()}.png`;
  console.log("☁️ Ideogram: Uploading to storage as:", fileName);
  
  const url = await putAndGetUrl(fileName, buf, img.headers.get("content-type") || "image/png");
  console.log("✅ Ideogram: Upload successful, URL:", url);
  
  return { url };
}