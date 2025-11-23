import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          // 为所有Supabase请求添加超时控制
          return Promise.race([
            fetch(input, init),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error('Supabase request timeout')), 8000)
            ),
          ]);
        },
      },
    }
  );

  try {
    // 添加错误处理，避免认证失败时中断整个请求
    await supabase.auth.getUser();
  } catch (error) {
    // 静默处理认证错误，让请求继续进行
    // 实际的认证会在API路由中再次验证
    console.error('Middleware auth error (non-blocking):', error instanceof Error ? error.message : 'Unknown error');
  }

  return response;
}
