import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getUser } from '@/lib/db/queries';

/**
 * POST /api/community/likes
 * 点赞或取消点赞
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
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: '缺少分享ID' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // 检查分享是否存在
    const { data: share } = await supabase
      .from('community_shares')
      .select('id, is_active')
      .eq('id', shareId)
      .single();

    if (!share || !share.is_active) {
      return NextResponse.json(
        { error: '分享不存在' },
        { status: 404 }
      );
    }

    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select('id')
      .eq('share_id', shareId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // 取消点赞
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) {
        console.error('Failed to unlike:', error);
        return NextResponse.json(
          { error: '取消点赞失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: false,
        message: '已取消点赞'
      });
    } else {
      // 添加点赞
      const { error } = await supabase
        .from('community_likes')
        .insert({
          share_id: shareId,
          user_id: user.id
        });

      if (error) {
        console.error('Failed to like:', error);
        return NextResponse.json(
          { error: '点赞失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: true,
        message: '点赞成功'
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
