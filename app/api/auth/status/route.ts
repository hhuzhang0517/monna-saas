import { createSupabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    return NextResponse.json({
      hasUser: !!user,
      user: user?.email || 'No user',
      error: error?.message || (!user ? 'Auth session missing!' : undefined)
    });
  } catch (err) {
    return NextResponse.json({
      hasUser: false,
      user: 'No user',
      error: 'Internal server error'
    }, { status: 500 });
  }
}