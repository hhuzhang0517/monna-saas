import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getUser } from '@/lib/db/queries';

/**
 * DELETE /api/community/shares/[id]
 * 删除社区分享
 * 权限：用户可以删除自己的分享，超级管理员可以删除任何分享
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { id: shareId } = await params;
    if (!shareId) {
      return NextResponse.json(
        { error: '缺少分享ID' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // 获取分享信息和当前用户信息
    const [shareResult, profileResult] = await Promise.all([
      supabase
        .from('community_shares')
        .select('id, user_id, video_url')
        .eq('id', shareId)
        .single(),
      supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()
    ]);

    const { data: share, error: shareError } = shareResult;
    const { data: profile, error: profileError } = profileResult;

    console.log('[Delete Share] Permission check:', {
      shareId,
      shareUserId: share?.user_id,
      currentUserId: user.id,
      userEmail: user.email,
      profileRole: profile?.role,
      profileError: profileError?.message
    });

    if (shareError || !share) {
      console.error('Failed to fetch share:', shareError);
      return NextResponse.json(
        { error: '分享不存在' },
        { status: 404 }
      );
    }

    // 检查权限：用户本人或超级管理员
    const isSuperAdmin = profile?.role === 'super_admin';
    const isOwner = share.user_id === user.id;

    console.log('[Delete Share] Authorization result:', {
      isSuperAdmin,
      isOwner,
      allowed: isOwner || isSuperAdmin
    });

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: '无权限删除此分享' },
        { status: 403 }
      );
    }

    // 执行删除（RLS策略会再次验证权限）
    const { error: deleteError } = await supabase
      .from('community_shares')
      .delete()
      .eq('id', shareId);

    if (deleteError) {
      console.error('Failed to delete share:', deleteError);
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      );
    }

    console.log(`[Community Share Delete] Share ${shareId} deleted by user ${user.id} (${isSuperAdmin ? 'super_admin' : 'owner'})`);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Error deleting community share:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
