import OpenAI from "openai";
import { putAndGetUrl } from "@/lib/storage";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateImageOpenAI(prompt: string) {
  const res = await client.images.generate({
    model: "dall-e-3",
    prompt,
    size: "1024x1024",
    response_format: "b64_json",    // 用 base64 便于落库
  });
  const b64 = res.data[0].b64_json!;
  const bytes = Buffer.from(b64, "base64");
  const url = await putAndGetUrl(`openai/${crypto.randomUUID()}.png`, bytes, "image/png");
  return { url };
}