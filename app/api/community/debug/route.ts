import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DEBUG ONLY - 用于调试社区分享数据
 * 使用 service role 绕过 RLS 策略直接查询数据库
 */
export async function GET(request: NextRequest) {
  try {
    // 使用 service role 客户端（绕过 RLS）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 [DEBUG] Checking community_shares table...');

    // 1. 查询所有分享（绕过 RLS）
    const { data: allShares, error: allError, count: totalCount } = await supabaseAdmin
      .from('community_shares')
      .select('*', { count: 'exact' });

    console.log('📊 [DEBUG] All shares count:', totalCount);
    console.log('📊 [DEBUG] All shares data:', allShares);

    // 2. 查询活跃的分享
    const { data: activeShares, error: activeError, count: activeCount } = await supabaseAdmin
      .from('community_shares')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    console.log('✅ [DEBUG] Active shares count:', activeCount);
    console.log('✅ [DEBUG] Active shares data:', activeShares);

    // 3. 查询 RLS 策略
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'community_shares');

    console.log('🔐 [DEBUG] RLS policies:', policies);

    // 4. 检查表是否启用了 RLS（可选，如果RPC函数不存在会跳过）
    let tableInfo = null;
    try {
      const result = await supabaseAdmin
        .rpc('check_rls_status', { table_name: 'community_shares' })
        .single();
      tableInfo = result.data;
    } catch (error) {
      console.log('[DEBUG] RPC function check_rls_status not available');
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        total_shares: totalCount || 0,
        active_shares: activeCount || 0,
        all_shares_sample: allShares?.slice(0, 2) || [],
        active_shares_sample: activeShares?.slice(0, 2) || [],
        rls_policies: policies || [],
        errors: {
          all_error: allError?.message,
          active_error: activeError?.message,
          policies_error: policiesError?.message
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
