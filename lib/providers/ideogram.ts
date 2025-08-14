import { putAndGetUrl } from "@/lib/storage";

export async function generateImageIdeogram(prompt: string) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("rendering_speed", "DEFAULT");

  const r = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
    method: "POST",
    headers: { "Api-Key": process.env.IDEOGRAM_API_KEY! },
    body: form as any,
  });

  if (!r.ok) throw new Error(`Ideogram error ${r.status}`);
  const json = await r.json();
  const tmpUrl = json?.data?.[0]?.url as string;
  if (!tmpUrl) throw new Error("Ideogram empty result");

  // 下载临时链接
  const img = await fetch(tmpUrl);
  const buf = new Uint8Array(await img.arrayBuffer());
  const url = await putAndGetUrl(`ideogram/${crypto.randomUUID()}.png`, buf, img.headers.get("content-type") || "image/png");
  return { url };
}