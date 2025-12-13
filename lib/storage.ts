import { createClient } from "@supabase/supabase-js";

const s = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function putAndGetUrl(path: string, bytes: Uint8Array, contentType = "image/png") {
  const supa = s();
  
  // 优化上传配置，减少缓存时间，提高上传速度
  const { error } = await supa.storage.from("results").upload(path, bytes, {
    upsert: true, 
    contentType, 
    cacheControl: "3600", // 1小时缓存，减少不必要的长期缓存
  });
  
  if (error) throw error;
  
  // 使用更长时间的签名URL，减少频繁创建的需要
  const { data, error: e2 } = await supa.storage.from("results").createSignedUrl(path, 60 * 60 * 24 * 7); // 7天
  if (e2) throw e2;
  
  return data.signedUrl;
}

// 优化版本：直接返回公共URL，避免签名URL的开销（如果文件是公开的）
export async function putAndGetPublicUrl(path: string, bytes: Uint8Array, contentType = "image/png") {
  const supa = s();
  
  const { error } = await supa.storage.from("results").upload(path, bytes, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  
  if (error) throw error;
  
  // 直接获取公共URL，避免签名URL的额外请求
  const { data } = supa.storage.from("results").getPublicUrl(path);
  
  return data.publicUrl;
}