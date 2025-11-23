import { createSupabaseServer } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        hasUser: false,
        user: null,
        error: error?.message || 'Auth session missing!'
      });
    }

    // 获取用户 profile 信息
    const profile = await getUserProfile(user.id);
    
    // 返回完整的用户信息
    const userData = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: profile?.name || 'Anonymous',
      gender: profile?.gender || null,
      role: profile?.role || 'member'
    };
    
    return NextResponse.json({
      hasUser: true,
      user: userData,
      error: undefined
    });
  } catch (err) {
    console.error('Auth status error:', err);
    return NextResponse.json({
      hasUser: false,
      user: null,
      error: 'Internal server error'
    }, { status: 500 });
  }
}