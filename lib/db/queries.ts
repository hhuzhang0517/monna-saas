// 统一的 Supabase 查询层 - 单一数据库架构
import { createSupabaseServer } from '@/lib/supabase/server';
import { User, SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  gender: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_product_id: string | null;
  plan_name: string;
  subscription_status: string | null;
  credits: number;
  total_credits: number;
  credits_consumed: number;
  last_credit_update: string;
}

export interface TeamMember {
  id: number;
  user_id: string;
  team_id: number;
  role: string;
  joined_at: string;
}

export interface CreditTransaction {
  id: number;
  team_id: number;
  user_id: string | null;
  job_id: string | null;
  type: 'charge' | 'consume' | 'refund' | 'bonus';
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CreditBalance {
  credits: number;
  total_credits: number;
  credits_consumed: number;
  last_credit_update: string;
}

export interface DeletionRequest {
  id: string;
  user_id: string | null;
  email: string;
  token: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  reason: string | null;
  lang: string;
  ip_address: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
  expires_at: string;
  metadata: Record<string, any>;
}

/**
 * 获取当前认证用户
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * 获取用户的 Profile
 */
export async function getUserProfile(userId?: string): Promise<Profile | null> {
  const supabase = await createSupabaseServer();
  const targetUserId = userId || (await getUser())?.id;
  
  if (!targetUserId) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .is('deleted_at', null)
    .single();
    
  if (error || !data) return null;
  
  return data as Profile;
}

/**
 * 获取用户的团队（第一个团队）
 * @param providedUser - 可选的已认证用户对象，用于支持Bearer token认证（移动端）
 * @param providedSupabase - 可选的已认证 Supabase 客户端，用于确保正确的认证上下文
 */
export async function getTeamForUser(providedUser?: User | null, providedSupabase?: SupabaseClient): Promise<any | null> {
  const user = providedUser || await getUser();
  if (!user) {
    console.log('getTeamForUser: No user found');
    return null;
  }
  
  console.log('getTeamForUser: Looking for team for user:', user.id);
  const supabase = providedSupabase || await createSupabaseServer();
  
  try {
    // 简化查询，只获取团队基本信息
    const { data: allTeams, error } = await supabase
      .from('team_members')
      .select(`
        joined_at,
        teams (
          id,
          name,
          plan_name,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_product_id,
          credits,
          total_credits,
          credits_consumed,
          last_credit_update,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false }); // 按加入时间排序，最新的在前
      
    console.log('getTeamForUser query result:', { allTeams, error, count: allTeams?.length });
      
    if (error || !allTeams || allTeams.length === 0) {
      console.log('getTeamForUser: No team found for user, will create one. Error:', error);
      return null;
    }
    
    // 优先级策略：
    // 1. 有活跃订阅的团队（subscription_status = 'active' 或 'trialing'）
    // 2. 最新创建的团队
    const activeTeam = allTeams.find(tm => {
      if (!tm.teams) return false;
      const teamData = Array.isArray(tm.teams) ? tm.teams[0] : tm.teams;
      return teamData && (teamData.subscription_status === 'active' || teamData.subscription_status === 'trialing');
    });

    const selectedTeamRaw = activeTeam ? activeTeam.teams : allTeams[0].teams;
    const selectedTeam = selectedTeamRaw ? (Array.isArray(selectedTeamRaw) ? selectedTeamRaw[0] : selectedTeamRaw) : null;
    
    console.log('getTeamForUser: Found', allTeams.length, 'teams, selected team:', selectedTeam?.id, 'with plan:', selectedTeam?.plan_name, 'status:', selectedTeam?.subscription_status);
    
    // 转换字段名以适配前端期望的驼峰式命名
    if (selectedTeam) {
      return {
        ...selectedTeam,
        planName: selectedTeam.plan_name,
        subscriptionStatus: selectedTeam.subscription_status,
        stripeCustomerId: selectedTeam.stripe_customer_id,
        stripeSubscriptionId: selectedTeam.stripe_subscription_id,
        stripeProductId: selectedTeam.stripe_product_id,
        createdAt: selectedTeam.created_at,
        updatedAt: selectedTeam.updated_at,
        totalCredits: selectedTeam.total_credits,
        creditsConsumed: selectedTeam.credits_consumed,
        lastCreditUpdate: selectedTeam.last_credit_update
      };
    }
    
    return selectedTeam;
  } catch (error) {
    console.error('getTeamForUser: Exception occurred:', error);
    return null;
  }
}

/**
 * 通过 Stripe Customer ID 查找团队
 */
export async function getTeamByStripeCustomerId(customerId: string): Promise<Team | null> {
  const supabase = await createSupabaseServer();
  
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();
    
  if (error || !data) return null;
  
  return data as Team;
}

/**
 * 更新团队订阅信息
 */
export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId?: string | null;
    stripeProductId?: string | null;
    planName?: string | null;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date | null;
  }
) {
  const supabase = await createSupabaseServer();

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (subscriptionData.stripeSubscriptionId !== undefined) {
    updateData.stripe_subscription_id = subscriptionData.stripeSubscriptionId;
  }
  if (subscriptionData.stripeProductId !== undefined) {
    updateData.stripe_product_id = subscriptionData.stripeProductId;
  }
  if (subscriptionData.planName !== undefined) {
    updateData.plan_name = subscriptionData.planName;
  }
  if (subscriptionData.subscriptionStatus !== undefined) {
    updateData.subscription_status = subscriptionData.subscriptionStatus;
  }
  if (subscriptionData.subscriptionExpiresAt !== undefined) {
    updateData.subscription_expires_at = subscriptionData.subscriptionExpiresAt?.toISOString() || null;
  }

  const { error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', teamId);

  if (error) {
    console.error('Failed to update team subscription:', error);
    throw error;
  }
}

/**
 * 为用户创建新团队
 * @param user - 用户对象
 * @param providedSupabase - 可选的已认证 Supabase 客户端，用于支持 Bearer Token 认证
 */
export async function createUserTeam(user: User, providedSupabase?: SupabaseClient) {
  // 创建团队需要绕过 RLS，因此使用 Service Role Key
  // 无论是 Web 端还是移动端，都需要管理员权限来创建团队
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('Creating team for user:', user.id, user.email, '(using Service Role)');
  
  try {
    // 首先创建用户 profile
    console.log('Step 1: Creating user profile...');
    
    // 获取用户标识符（优先使用 email，如果没有则使用手机号）
    const userIdentifier = user.email || user.phone || 'User';
    const userName = user.user_metadata?.name || 
                     (user.email ? user.email.split('@')[0] : null) ||
                     (user.phone ? user.phone.slice(-4) : 'User');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || null,
        name: userName,
        role: 'owner'
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    console.log('✓ Profile created successfully');

    // 创建团队（使用 email 或 phone 作为团队名称标识）
    console.log('Step 2: Creating team...');
    const teamName = user.email 
      ? `${user.email}'s Team` 
      : user.phone 
        ? `${user.phone}'s Team`
        : `${user.id.slice(0, 8)}'s Team`;
    
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        plan_name: 'free',
        credits: 20,
        total_credits: 20,
        credits_consumed: 0
      })
      .select()
      .single();

    if (teamError) {
      console.error('Failed to create team:', teamError);
      throw new Error(`Team creation failed: ${teamError.message}`);
    }
    console.log('✓ Team created successfully:', team.id);

    // 添加用户到团队
    console.log('Step 3: Adding user to team...');
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        team_id: team.id,
        role: 'owner'
      });

    if (memberError) {
      console.error('Failed to create team member:', memberError);
      throw new Error(`Team member creation failed: ${memberError.message}`);
    }
    console.log('✓ Team member created successfully');

    // 记录初始信用点
    console.log('Step 4: Recording initial credits...');
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        team_id: team.id,
        user_id: user.id,
        type: 'charge',
        amount: 20,
        balance_before: 0,
        balance_after: 20,
        reason: '新用户注册获得免费信用点'
      });

    if (transactionError) {
      console.warn('Failed to record initial credit transaction:', transactionError);
      // 不抛出错误，因为信用点记录失败不应该阻止团队创建
    } else {
      console.log('✓ Credit transaction recorded successfully');
    }

    // 返回完整的团队信息
    console.log('Step 5: Fetching created team...');
    
    // 直接返回刚创建的团队信息，避免复杂查询
    const fullTeamData = {
      id: team.id,
      name: team.name,
      plan_name: team.plan_name,
      credits: team.credits,
      total_credits: team.total_credits,
      credits_consumed: team.credits_consumed,
      created_at: team.created_at,
      updated_at: team.updated_at
    };
    
    console.log('✓ Team creation completed:', fullTeamData.id);
    return fullTeamData;
  } catch (error) {
    console.error('Failed to create user team:', error);
    throw error;
  }
}

/**
 * 获取团队的信用点余额信息
 */
export async function getTeamCredits(teamId: number, providedSupabase?: SupabaseClient): Promise<CreditBalance | null> {
  const supabase = providedSupabase || await createSupabaseServer();

  const { data, error } = await supabase
    .from('teams')
    .select('credits, total_credits, credits_consumed, last_credit_update')
    .eq('id', teamId)
    .single();

  if (error || !data) return null;

  return data as CreditBalance;
}

/**
 * 获取当前用户团队的信用点余额
 * @param providedUser - 可选的已认证用户对象，用于支持Bearer token认证（移动端）
 */
export async function getUserTeamCredits(providedUser?: User | null): Promise<CreditBalance | null> {
  const team = await getTeamForUser(providedUser);
  if (!team) return null;
  
  return await getTeamCredits(team.id);
}

/**
 * 获取团队信用点交易历史（增强版，包含任务详情）
 */
export async function getTeamCreditHistory(teamId: number, limit: number = 20) {
  // 使用Service Role权限绕过RLS限制
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 使用Service Role Key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  console.log('🔍 Querying credit history for team:', teamId, '(using Service Role)');
  
  // 先获取信用点交易记录
  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select(`
      id,
      type,
      amount,
      balance_before,
      balance_after,
      reason,
      created_at,
      user_id,
      job_id,
      metadata
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);

  console.log('🔍 Credit history query result:', {
    teamId,
    transactionsCount: transactions?.length || 0,
    error: error?.message,
    latestRecords: transactions?.slice(0, 2).map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      reason: t.reason?.substring(0, 20) + '...',
      created_at: t.created_at
    }))
  });
    
  if (error) {
    console.error('Failed to fetch credit history:', error);
    return [];
  }

  if (!transactions) return [];

  // 收集所有有效的job_id
  const jobIds = transactions
    .map(t => {
      const jobId = t.job_id || (t.metadata && typeof t.metadata === 'object' ? t.metadata.original_job_id : null);
      return jobId;
    })
    .filter(Boolean) as string[];

  console.log('🔍 Processing transactions:', {
    totalTransactions: transactions.length,
    withJobIds: jobIds.length,
    jobIds: jobIds.slice(0, 3) // 只显示前3个job_id
  });

  // 如果有job_id，批量查询任务详情（也使用Service Role权限）
  let jobsMap: Record<string, any> = {};
  if (jobIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        type,
        provider,
        video_duration,
        created_at
      `)
      .in('id', jobIds);
    
    console.log('🔍 Jobs linked:', { 
      requested: jobIds.length, 
      found: jobs?.length || 0, 
      error: jobsError?.message
    });
    
    if (jobs) {
      jobsMap = jobs.reduce((acc, job) => {
        acc[job.id] = job;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // 合并交易记录和任务详情
  return transactions.map(transaction => {
    const jobId = transaction.job_id || transaction.metadata?.original_job_id;
    const jobInfo = jobId ? jobsMap[jobId] : null;
    
    return {
      ...transaction,
      job_info: jobInfo
    };
  });
}

/**
 * 获取当前用户团队的信用点交易历史
 * @param limit - 限制返回记录数
 * @param providedUser - 可选的已认证用户对象，用于支持Bearer token认证（移动端）
 */
export async function getUserTeamCreditHistory(limit: number = 20, providedUser?: User | null) {
  const team = await getTeamForUser(providedUser);
  if (!team) return [];
  
  return await getTeamCreditHistory(team.id, limit);
}

/**
 * 获取团队订阅信息和信用点状态
 */
export async function getTeamSubscriptionInfo(teamId: number) {
  const supabase = await createSupabaseServer();
  
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      plan_name,
      subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      credits,
      total_credits,
      credits_consumed,
      last_credit_update
    `)
    .eq('id', teamId)
    .single();
    
  if (error || !data) return null;
  
  return data;
}

/**
 * 获取当前用户团队的订阅信息
 * @param providedUser - 可选的已认证用户对象，用于支持Bearer token认证（移动端）
 * @param providedSupabase - 可选的已认证 Supabase 客户端，用于确保正确的认证上下文
 */
export async function getUserTeamSubscriptionInfo(providedUser?: User | null, providedSupabase?: SupabaseClient) {
  const team = await getTeamForUser(providedUser, providedSupabase);
  if (!team) {
    console.log('getUserTeamSubscriptionInfo: No team found');
    return null;
  }

  console.log('getUserTeamSubscriptionInfo: Found team:', team.id, 'plan:', team.plan_name);

  // getTeamForUser 已经返回了完整的团队信息，直接返回
  // 不需要再次查询 getTeamSubscriptionInfo，避免 RLS 权限问题
  return team;
}

/**
 * 获取用户和团队信息的组合查询 (兼容 Drizzle 迁移)
 */
export async function getUserWithTeam(userId?: string): Promise<{
  id: string;
  email: string;
  name: string | null;
  teamId: number;
  role: string;
} | null> {
  const user = userId ? { id: userId } : await getUser();
  if (!user?.id) return null;
  
  const supabase = await createSupabaseServer();
  
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      role,
      teams (
        id,
        name
      ),
      profiles (
        id,
        email,
        name
      )
    `)
    .eq('user_id', user.id)
    .single();
    
  if (error || !data || !data.profiles || !data.teams) {
    return null;
  }

  // Handle Supabase foreign key array/object type
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const team = Array.isArray(data.teams) ? data.teams[0] : data.teams;

  if (!profile || !team) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    teamId: team.id,
    role: data.role
  };
}

/**
 * 记录活动日志
 */
export async function logActivity(
  teamId: number,
  userId: string,
  action: string,
  ipAddress?: string,
  metadata?: Record<string, any>
) {
  const supabase = await createSupabaseServer();
  
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      team_id: teamId,
      user_id: userId,
      action,
      ip_address: ipAddress,
      metadata
    });
    
  if (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * 获取活动日志
 * @param providedUser - 可选的已认证用户对象，用于支持Bearer token认证（移动端）
 */
export async function getActivityLogs(providedUser?: User | null) {
  const user = providedUser || await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser(user);
  if (!team) {
    return [];
  }

  const supabase = await createSupabaseServer();
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      id,
      action,
      timestamp,
      ip_address,
      profiles (
        name
      )
    `)
    .eq('team_id', team.id)
    .order('timestamp', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Failed to fetch activity logs:', error);
    return [];
  }
  
  return data || [];
}