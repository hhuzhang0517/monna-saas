import { createClient } from "@supabase/supabase-js";

const s = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function putAndGetUrl(path: string, bytes: Uint8Array, contentType = "image/png") {
  const supa = s();
  const { error } = await supa.storage.from("results").upload(path, bytes, {
    upsert: true, contentType, cacheControl: "31536000",
  });
  if (error) throw error;
  const { data, error: e2 } = await supa.storage.from("results").createSignedUrl(path, 60 * 60 * 24);
  if (e2) throw e2;
  return data.signedUrl;
}