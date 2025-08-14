import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies, headers }
  );
}