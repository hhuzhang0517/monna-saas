import { NextRequest } from 'next/server';
import { createSupabaseServer } from './server';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

/**
 * 从请求中获取认证用户
 * 支持两种认证方式：
 * 1. Cookie (Web端) - 通过 createSupabaseServer 获取
 * 2. Bearer Token (移动端) - 从 Authorization header 获取
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  // 1. 首先尝试从 Authorization header 获取 Bearer token (移动端)
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    console.log('🔐 Attempting Bearer token authentication');
    
    try {
      // 使用 token 创建 Supabase 客户端
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // 使用 token 获取用户
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('❌ Bearer token authentication failed:', error.message);
      } else if (user) {
        console.log('✅ Bearer token authentication successful:', user.email);
        return user;
      }
    } catch (error) {
      console.error('❌ Bearer token authentication error:', error);
    }
  }
  
  // 2. 如果 Bearer token 认证失败，尝试从 Cookie 获取 (Web端)
  console.log('🍪 Attempting Cookie authentication');
  
  try {
    const supa = await createSupabaseServer();
    const { data: { user }, error } = await supa.auth.getUser();
    
    if (error) {
      console.error('❌ Cookie authentication failed:', error.message);
    } else if (user) {
      console.log('✅ Cookie authentication successful:', user.email);
      return user;
    }
  } catch (error) {
    console.error('❌ Cookie authentication error:', error);
  }
  
  console.log('❌ All authentication methods failed');
  return null;
}

/**
 * 创建带有正确认证的 Supabase 客户端
 * 根据请求类型（Cookie 或 Bearer token）返回相应的客户端
 */
export async function getAuthenticatedSupabaseClient(req: NextRequest) {
  // 检查是否有 Bearer token
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    console.log('🔐 Creating Supabase client with Bearer token');
    
    // 为移动端创建带 token 的客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    
    return { supabase, user: (await supabase.auth.getUser(token)).data.user };
  }
  
  // Web端使用 Cookie
  console.log('🍪 Creating Supabase client with Cookie');
  const supa = await createSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  return { supabase: supa, user };
}

/**
 * 从请求中创建带有正确认证的 Supabase 客户端（用于数据库查询）
 * @param req - NextRequest 对象
 * @returns 带有正确认证上下文的 Supabase 客户端
 */
export async function createAuthenticatedSupabaseFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    console.log('🔐 Creating authenticated Supabase client with Bearer token for database queries');
    
    // 使用 Bearer token 创建客户端
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
  }
  
  // Web端使用 Cookie
  console.log('🍪 Creating authenticated Supabase client with Cookie for database queries');
  return await createSupabaseServer();
}

