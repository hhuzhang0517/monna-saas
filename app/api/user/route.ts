import { NextRequest } from 'next/server';
import { getUser, getUserProfile } from '@/lib/db/queries';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper';

export async function GET(req: NextRequest) {
  // 首先尝试通用认证方式（支持移动端 Bearer token）
  const authenticatedUser = await getAuthenticatedUser(req);
  
  // 如果通用认证成功，使用该用户；否则尝试传统的 getUser()
  const user = authenticatedUser || await getUser();
  
  if (!user) {
    console.log('❌ User API - unauthorized');
    return Response.json(null);
  }
  
  console.log('✅ User API - user authenticated:', user.email);

  // 获取用户的 profile 信息
  const profile = await getUserProfile(user.id);

  // 合并 auth user 和 profile 数据
  const userData = {
    ...user,
    name: profile?.name || null,
    gender: profile?.gender || null,
    role: profile?.role || 'member'
  };

  return Response.json(userData);
}
