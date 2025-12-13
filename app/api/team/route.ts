import { getTeamForUser } from '@/lib/db/queries';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const team = await getTeamForUser();
    
    if (!team) {
      return Response.json(null);
    }

    // 获取团队成员信息
    const supabase = await createSupabaseServer();
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        joined_at,
        user_id
      `)
      .eq('team_id', team.id);

    if (error) {
      console.error('Failed to fetch team members:', error);
    }

    // 转换团队成员数据格式 - 暂时不包含用户详细信息
    const formattedMembers = teamMembers?.map(member => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joined_at,
      user: {
        id: member.user_id,
        name: '用户',
        email: ''
      }
    })) || [];

    return Response.json({
      ...team,
      teamMembers: formattedMembers
    });
  } catch (error) {
    console.error('API /team error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
