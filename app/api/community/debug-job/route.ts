import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DEBUG ONLY - 查看 job 的实际 result_url 和 Storage 文件列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

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

    let jobData = null;
    if (jobId) {
      // 查询特定 job
      const { data, error } = await supabaseAdmin
        .from('jobs')
        .select('id, user_id, type, status, result_url, created_at')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('[DEBUG Job] Query error:', error);
      }
      jobData = data;
    } else {
      // 查询最近的几个已完成的 job
      const { data, error } = await supabaseAdmin
        .from('jobs')
        .select('id, user_id, type, status, result_url, created_at')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[DEBUG Job] Query error:', error);
      }
      jobData = data;
    }

    // 列出 results bucket 中的文件（示例：runway 和 videos 目录）
    const { data: runwayFiles, error: runwayError } = await supabaseAdmin
      .storage
      .from('results')
      .list('runway/act-two', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    const { data: videosFiles, error: videosError } = await supabaseAdmin
      .storage
      .from('results')
      .list('videos', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    // 测试：尝试为特定路径生成签名URL
    const testPath = 'runway/act-two/4b05773d-e7c9-4d36-a6b7-dea07464a695.mp4';
    const { data: testSignedUrl, error: testError } = await supabaseAdmin
      .storage
      .from('results')
      .createSignedUrl(testPath, 7 * 24 * 60 * 60);

    console.log('[DEBUG] Test signed URL generation:', {
      testPath,
      success: !!testSignedUrl,
      error: testError?.message,
      url: testSignedUrl?.signedUrl
    });

    return NextResponse.json({
      success: true,
      debug_info: {
        jobs: jobData,
        storage: {
          runway_act_two_files: runwayFiles || [],
          runway_error: runwayError?.message,
          videos_files: videosFiles || [],
          videos_error: videosError?.message
        },
        test_signed_url: {
          path: testPath,
          signed_url: testSignedUrl?.signedUrl,
          error: testError?.message
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [DEBUG Job] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
