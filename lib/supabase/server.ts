import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          // 为所有Supabase请求添加10秒超时
          return Promise.race([
            fetch(input, init),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error('Supabase request timeout after 10s')), 10000)
            ),
          ]);
        },
      },
    }
  );
}

/**
 * 创建 Supabase Service Role 客户端
 * 用于服务器端操作，绕过 RLS 策略
 * ⚠️ 警告：仅在服务器端使用，切勿暴露给客户端
 */
export function createSupabaseServiceRole() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          // 为所有Supabase请求添加10秒超时
          return Promise.race([
            fetch(input, init),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error('Supabase request timeout after 10s')), 10000)
            ),
          ]);
        },
      },
    }
  );
}