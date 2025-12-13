import { createSupabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 尝试从 Authorization header 获取 token（用于移动端）
  const authHeader = request.headers.get('authorization');
  let user = null;
  let supabase;

  if (authHeader?.startsWith('Bearer ')) {
    // 移动端：使用 Bearer token + Service Role Key
    const token = authHeader.substring(7);
    const { createClient } = await import('@supabase/supabase-js');

    // 首先验证用户
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: tokenUser } } = await authClient.auth.getUser(token);
    user = tokenUser;

    // 使用 Service Role 客户端进行删除
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  } else {
    // Web端：使用 cookie
    supabase = await createSupabaseServer();
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
