import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 确保用户 profile 存在
 * 用于手机登录后，确保新用户有默认的 profile 记录
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { userId, phone } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 检查 profile 是否已存在
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = 没有找到记录，这是正常的
      console.error('查询 profile 失败:', profileError);
      return NextResponse.json(
        { error: 'Failed to query profile' },
        { status: 500 }
      );
    }

    // 如果 profile 已存在
    if (existingProfile) {
      console.log('✅ Profile 已存在:', existingProfile);
      // 如果没有 name，设置为 Anonymous
      if (!existingProfile.name) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ name: 'Anonymous' })
          .eq('id', userId);

        if (updateError) {
          console.error('更新 profile name 失败:', updateError);
        } else {
          console.log('✅ 已设置默认 name: Anonymous');
        }
      }
      return NextResponse.json({ success: true, profile: existingProfile });
    }

    // 如果 profile 不存在，创建新的 profile
    console.log('📝 创建新 profile:', userId);
    
    // 获取用户的 email（如果有）
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || phone || `${userId}@phone.user`;

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        name: 'Anonymous',
        role: 'member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('创建 profile 失败:', createError);
      return NextResponse.json(
        { error: 'Failed to create profile', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ Profile 创建成功:', newProfile);

    // 同时确保用户有 team 和 team_members 记录
    await ensureUserTeam(supabase, userId);

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error: any) {
    console.error('Ensure profile 异常:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 确保用户有 team 和 team_members 记录
 */
async function ensureUserTeam(supabase: any, userId: string) {
  try {
    // 检查是否已有 team_members 记录
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      console.log('✅ User 已有 team:', existingMember.team_id);
      return;
    }

    // 创建新 team
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: `Anonymous's Team`,
        plan_name: 'free',
        subscription_status: 'active',
        credits: 20, // 新用户赠送 20 credits（与邮箱注册保持一致）
        total_credits: 20,
        credits_consumed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_credit_update: new Date().toISOString()
      })
      .select()
      .single();

    if (teamError) {
      console.error('创建 team 失败:', teamError);
      return;
    }

    console.log('✅ Team 创建成功:', newTeam.id);

    // 创建 team_members 记录
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        team_id: newTeam.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('创建 team_members 失败:', memberError);
      return;
    }

    console.log('✅ Team member 创建成功');
  } catch (error) {
    console.error('Ensure user team 异常:', error);
  }
}

