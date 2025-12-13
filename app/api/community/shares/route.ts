import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseServiceRole } from '@/lib/supabase/server';
import { getUser } from '@/lib/db/queries';

/**
 * GET /api/community/shares
 * 获取社区分享列表
 * 支持分页和排序
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户（可能为空，允许未登录用户浏览社区）
    const user = await getUser();
    const userId = user?.id || null;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'latest'; // latest, popular

    const offset = (page - 1) * limit;
    const supabase = await createSupabaseServer();

    // 构建排序条件
    let orderBy: { column: string; ascending: boolean };
    if (sortBy === 'popular') {
      orderBy = { column: 'likes_count', ascending: false };
    } else {
      orderBy = { column: 'created_at', ascending: false };
    }

    // 获取分享列表（不包含用户信息，先单独查询）
    const { data: shares, error, count } = await supabase
      .from('community_shares')
      .select('id, video_url, thumbnail_url, title, description, likes_count, views_count, created_at, user_id', { count: 'exact' })
      .eq('is_active', true)
      .order(orderBy.column, { ascending: orderBy.ascending })
      .range(offset, offset + limit - 1);

    console.log('[Community Shares GET] Query result:', { shareCount: shares?.length || 0, totalCount: count, error });

    if (error) {
      console.error('Failed to fetch community shares:', error);
      return NextResponse.json(
        { error: '获取社区分享失败' },
        { status: 500 }
      );
    }

    if (!shares || shares.length === 0) {
      console.log('[Community Shares GET] No shares found');
      return NextResponse.json({
        shares: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      });
    }

    // 获取所有相关用户的信息
    const userIds = shares.map(s => s.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    // 创建用户信息映射
    const profilesMap = new Map(
      profiles?.map(p => [p.id, p]) || []
    );

    // 获取当前用户的点赞记录（如果用户已登录）
    const shareIds = shares.map(s => s.id);
    let likedShareIds = new Set<string>();

    if (userId) {
      const { data: userLikes } = await supabase
        .from('community_likes')
        .select('share_id')
        .eq('user_id', userId)
        .in('share_id', shareIds);

      likedShareIds = new Set(userLikes?.map(l => l.share_id) || []);
    }

    // 组合数据并动态生成签名 URL
    // 🔑 使用 service role 客户端来访问 Storage（拥有完全权限）
    const supabaseAdmin = createSupabaseServiceRole();

    const sharesWithLikeStatus = await Promise.all(shares.map(async (share) => {
      const profile = profilesMap.get(share.user_id);
      // 显示真实用户名：优先name，如果name为空则使用email前缀
      const authorName = profile?.name || profile?.email?.split('@')[0];

      // 提取存储路径的辅助函数（兼容旧的签名URL和新的纯路径）
      function extractStoragePath(url: string): string {
        if (!url) return '';

        // 格式1: .../storage/v1/object/sign/BUCKET/PATH?token=...
        const signedUrlMatch = url.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+?)(\?|$)/);
        if (signedUrlMatch) {
          return decodeURIComponent(signedUrlMatch[1]);
        }

        // 格式2: .../object/sign/BUCKET/PATH?token=...
        const altMatch = url.match(/\/object\/sign\/[^/]+\/(.+?)(\?|$)/);
        if (altMatch) {
          return decodeURIComponent(altMatch[1]);
        }

        // 格式3: 已经是纯路径了（没有域名和token）
        if (!url.startsWith('http')) {
          return url;
        }

        // 无法识别，返回原值
        console.warn('[Community Share] ⚠️ Unable to extract path from URL:', url);
        return url;
      }

      const videoPath = extractStoragePath(share.video_url);
      const thumbnailPath = extractStoragePath(share.thumbnail_url || '');

      console.log('[Community Share] Processing share:', {
        shareId: share.id,
        originalVideoUrl: share.video_url,
        extractedVideoPath: videoPath,
        originalThumbnailUrl: share.thumbnail_url,
        extractedThumbnailPath: thumbnailPath
      });

      // 生成新的签名 URL（7天有效期）- 使用 service role 客户端
      let newVideoUrl = share.video_url;
      let newThumbnailUrl = share.thumbnail_url;

      try {
        if (videoPath) {
          const { data: videoData, error: videoError } = await supabaseAdmin.storage
            .from('results')
            .createSignedUrl(videoPath, 7 * 24 * 60 * 60); // 7天

          if (!videoError && videoData?.signedUrl) {
            newVideoUrl = videoData.signedUrl;
            console.log('[Community Share] ✅ Generated new video URL for path:', videoPath);
          } else {
            console.error('[Community Share] ❌ Failed to generate video URL:', {
              path: videoPath,
              error: videoError?.message,
              fullError: videoError
            });
          }
        }

        if (thumbnailPath) {
          const { data: thumbnailData, error: thumbnailError } = await supabaseAdmin.storage
            .from('results')
            .createSignedUrl(thumbnailPath, 7 * 24 * 60 * 60);

          if (!thumbnailError && thumbnailData?.signedUrl) {
            newThumbnailUrl = thumbnailData.signedUrl;
            console.log('[Community Share] ✅ Generated new thumbnail URL for path:', thumbnailPath);
          } else {
            console.error('[Community Share] ❌ Failed to generate thumbnail URL:', {
              path: thumbnailPath,
              error: thumbnailError?.message
            });
          }
        }
      } catch (error: any) {
        console.error('[Community Share] ❌ Exception generating signed URLs:', {
          error: error.message,
          videoPath,
          thumbnailPath
        });
      }

      return {
        id: share.id,
        videoUrl: newVideoUrl,
        thumbnailUrl: newThumbnailUrl,
        title: share.title,
        description: share.description,
        likesCount: share.likes_count,
        viewsCount: share.views_count,
        createdAt: share.created_at,
        isLiked: likedShareIds.has(share.id),
        author: {
          id: share.user_id,
          name: authorName // 这里会是真实用户名或email前缀
        }
      };
    }));

    return NextResponse.json({
      shares: sharesWithLikeStatus,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error fetching community shares:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/shares
 * 创建新的社区分享
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId, videoUrl, thumbnailUrl, title, description } = body;

    console.log('[Community Share] Request data:', { jobId, videoUrl, thumbnailUrl, title, userId: user.id });

    if (!jobId || !videoUrl) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // 🔑 关键改动：从签名URL中提取存储路径，只存储路径而不是完整的签名URL
    // 这样可以在读取时动态生成新的签名URL，避免过期问题
    function extractStoragePath(url: string): string {
      // Supabase 签名URL格式: .../storage/v1/object/sign/BUCKET/PATH?token=...
      const signedUrlMatch = url.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+?)(\?|$)/);
      if (signedUrlMatch) {
        return decodeURIComponent(signedUrlMatch[1]);
      }

      // 另一种可能的格式: .../object/sign/BUCKET/PATH?token=...
      const altMatch = url.match(/\/object\/sign\/[^/]+\/(.+?)(\?|$)/);
      if (altMatch) {
        return decodeURIComponent(altMatch[1]);
      }

      // 如果不是签名URL，可能已经是路径了，直接返回
      return url;
    }

    const videoPath = extractStoragePath(videoUrl);
    const thumbnailPath = thumbnailUrl ? extractStoragePath(thumbnailUrl) : null;

    console.log('[Community Share] Extracted paths:', { videoPath, thumbnailPath });

    // 验证任务是否属于当前用户
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, user_id, status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    console.log('[Community Share] Job query result:', { job, jobError });

    if (!job) {
      return NextResponse.json(
        { error: '任务不存在或无权限' },
        { status: 403 }
      );
    }

    console.log('[Community Share] Job status:', job.status);

    // 允许分享已完成或正在处理中的任务（因为前端可能在轮询期间就分享）
    if (job.status !== 'done' && job.status !== 'processing') {
      return NextResponse.json(
        { error: '只能分享已完成或处理中的任务' },
        { status: 400 }
      );
    }

    // 检查是否已分享 - 使用maybeSingle()避免没有记录时报错
    const { data: existingShare, error: checkError } = await supabase
      .from('community_shares')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    console.log('[Community Share] Existing share check:', { existingShare, checkError });

    if (existingShare) {
      console.log('[Community Share] Job already shared');
      return NextResponse.json(
        { error: '该任务已经分享过了' },
        { status: 400 }
      );
    }

    // 创建分享 - 存储文件路径而非签名URL
    const shareData = {
      user_id: user.id,
      job_id: jobId,
      video_url: videoPath,  // 只存储路径，不存储签名URL
      thumbnail_url: thumbnailPath,  // 只存储路径
      title: title || '角色迁移作品',
      description: description || ''
    };

    console.log('[Community Share] Creating share with path data:', shareData);

    const { data: share, error } = await supabase
      .from('community_shares')
      .insert(shareData)
      .select()
      .single();

    if (error) {
      console.error('[Community Share] Failed to create share:', error);
      return NextResponse.json(
        { error: '创建分享失败: ' + error.message },
        { status: 500 }
      );
    }

    console.log('[Community Share] Share created successfully:', share);

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        videoUrl: share.video_url,
        thumbnailUrl: share.thumbnail_url,
        title: share.title,
        description: share.description,
        likesCount: share.likes_count,
        createdAt: share.created_at
      }
    });
  } catch (error) {
    console.error('Error creating community share:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
