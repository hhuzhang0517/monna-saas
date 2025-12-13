'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { 
  getUser, 
  getUserWithTeam, 
  logActivity, 
  createUserTeam 
} from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';

// logActivity 函数现在从 queries.ts 导入，无需在此重复定义

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;
  const supabase = await createSupabaseServer();

  // 首先检查用户是否已经登录
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser) {
    console.log('User already logged in:', currentUser.email);
    const redirectTo = formData.get('redirect') as string | null;
    const finalRedirect = redirectTo && redirectTo !== 'checkout' ? decodeURIComponent(redirectTo) : '/generate';
    redirect(finalRedirect);
    return; // 添加return防止继续执行
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Sign in error:', error);
    let errorMessage = 'Invalid email or password. Please try again.';
    
    // Check both error code and message for email confirmation
    const isEmailNotConfirmed = error.code === 'email_not_confirmed' || 
                               error.message.includes('Email not confirmed');
    
    if (isEmailNotConfirmed) {
      errorMessage = 'Your email address has not been confirmed yet. Please check your email and click the confirmation link, or click the link below to resend the confirmation email.';
    } else if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.message.includes('too_many_requests')) {
      errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
    }
    
    return {
      error: errorMessage,
      email,
      password,
      showResendConfirmation: isEmailNotConfirmed
    };
  }

  // 获取当前已认证的用户
  const { data: { user: currentUserData } } = await supabase.auth.getUser();
  if (currentUserData) {
    let userWithTeam = await getUserWithTeam(currentUserData.id);

    // 如果用户在数据库中不存在，创建用户和团队记录
    // 这通常发生在邮件确认回调由于 PKCE 错误而未能创建数据库记录的情况
    if (!userWithTeam) {
      console.log('[signIn] User exists in auth but not in DB, creating records...');
      try {
        const team = await createUserTeam(currentUserData);
        console.log('[signIn] ✅ User and team created:', team.id);
        // 重新获取用户和团队信息
        userWithTeam = await getUserWithTeam(currentUserData.id);
      } catch (createError) {
        console.error('[signIn] Failed to create user/team:', createError);
        // 继续登录流程，即使创建失败
      }
    }

    if (userWithTeam) {
      await logActivity(userWithTeam.teamId, userWithTeam.id, 'SIGN_IN');
    }
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    const userWithTeam = currentUserData ? await getUserWithTeam(currentUserData.id) : null;
    const team = userWithTeam ? { id: userWithTeam.teamId } as any : null;
    return createCheckoutSession({ team, priceId });
  }

  // 如果有重定向URL，使用它；否则默认跳转到generate
  const finalRedirect = redirectTo && redirectTo !== 'checkout' ? decodeURIComponent(redirectTo) : '/generate';
  redirect(finalRedirect);
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;
  const supabase = await createSupabaseServer();

  console.log('Attempting signup for:', email);
  console.log('Email redirect URL:', `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      // 对于邮件确认流程，我们需要使用 pkce flow_type 为 'implicit' 或者直接不使用 PKCE
      // 但 Supabase 默认会使用 PKCE，这在邮件确认场景下会有问题
      // 解决方案：让 Supabase 在邮件链接中包含 access_token（使用 query 参数）
      data: {
        // 自定义用户元数据（如果需要）
      }
    }
  });
  
  console.log('Signup response data:', signUpData);
  console.log('Signup response error:', signUpError);

  if (signUpError || !signUpData.user) {
    console.error('Sign up error:', signUpError);
    let errorMessage = 'Failed to create user. Please try again.';
    
    if (signUpError?.message.includes('already registered')) {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
    }
    
    return {
      error: errorMessage,
      email,
      password
    };
  }

  // Debug: Log the actual signUp response to understand Supabase behavior
  console.log('SignUp response:', {
    hasSession: !!signUpData.session,
    userEmailConfirmed: signUpData.user.email_confirmed_at,
    userEmail: signUpData.user.email,
    userCreatedAt: signUpData.user.created_at,
    userConfirmedAt: signUpData.user.confirmed_at
  });

  // ALWAYS require email confirmation for new signups
  // Don't proceed with database operations for new users
  console.log('New user registration - requiring email confirmation for:', email);
  
  // Important: Sign out immediately to prevent auto-login
  // This ensures user is not logged in until email is confirmed
  await supabase.auth.signOut();
  console.log('Signed out user to require email confirmation');
  
  return {
    success: 'Please check your email and click the confirmation link to complete your registration.',
    email,
    requiresConfirmation: true
  };

  // NOTE: 此部分代码在正常的注册流程中不会被执行
  // 仅在用户已经确认时才会执行（在signUp action中不应该发生）
  console.log('User already confirmed, creating database records for:', email);

  try {
    // 使用 createUserTeam 函数创建用户和团队
    const team = await createUserTeam(signUpData.user!);
    
    // TODO: 处理邀请逻辑（如果需要）
    if (inviteId) {
      console.log('Invitation handling not yet implemented');
      // 这里需要实现邀请处理逻辑
    }

    const redirectTo = formData.get('redirect') as string | null;
    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;
      return createCheckoutSession({ team: team as any, priceId });
    }

    redirect('/generate');
  } catch (error: any) {
    console.error('Failed to create user team:', error);
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }
});

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    const supabase = await createSupabaseServer();

    // First, sign in with the current password to verify it
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Failed to update password. Please try again.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (userWithTeam?.teamId) {
      await logActivity(userWithTeam.teamId, user.id, 'UPDATE_PASSWORD');
    }

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;
    const supabase = await createSupabaseServer();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password
    });

    if (signInError) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    if (userWithTeam?.teamId) {
      await logActivity(
        userWithTeam.teamId,
        user.id,
        'DELETE_ACCOUNT'
      );
    }

    const response = await fetch('/api/user/delete', { 
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const { error } = await response.json();
      return {
        password,
        error: error || 'Failed to delete account. Please try again.'
      };
    }

    await supabase.auth.signOut();

    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  gender: z.string().optional()
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, gender } = data;
    const supabase = await createSupabaseServer();
    const userWithTeam = await getUserWithTeam(user.id);

    // 构建更新对象
    const updateData: any = { name };
    if (gender) {
      updateData.gender = gender;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update account:', error);
      return {
        name,
        gender,
        error: 'Failed to update account. Please try again.'
      };
    }

    if (userWithTeam?.teamId) {
      await logActivity(userWithTeam.teamId, user.id, 'UPDATE_ACCOUNT');
    }

    return { name, gender, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const supabase = await createSupabaseServer();
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', userWithTeam.teamId);

    if (error) {
      console.error('Failed to remove team member:', error);
      return { error: 'Failed to remove team member. Please try again.' };
    }

    await logActivity(
      userWithTeam.teamId,
      user.id,
      'REMOVE_TEAM_MEMBER'
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const supabase = await createSupabaseServer();
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    // 检查是否已经是团队成员
    const { data: existingMember } = await supabase
      .from('team_members')
      .select(`
        profiles (
          email
        )
      `)
      .eq('team_id', userWithTeam.teamId)
      .single();

    const profiles = existingMember?.profiles as any;
    if (profiles && profiles.email === email) {
      return { error: 'User is already a member of this team' };
    }

    // 检查是否已经有待处理的邀请
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('team_id', userWithTeam.teamId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // 创建新邀请
    const { error } = await supabase
      .from('invitations')
      .insert({
        team_id: userWithTeam.teamId,
        email,
        role,
        invited_by: user.id,
        status: 'pending'
      });

    if (error) {
      console.error('Failed to create invitation:', error);
      return { error: 'Failed to send invitation. Please try again.' };
    }

    await logActivity(
      userWithTeam.teamId,
      user.id,
      'INVITE_TEAM_MEMBER'
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);

export async function signInWithGoogle() {
  const supabase = await createSupabaseServer();

  // Use production URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';

  console.log('🔄 Starting Google OAuth with redirect:', `${baseUrl}/auth/callback`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    console.error('Google OAuth error:', error);
    throw new Error('Failed to sign in with Google. Please try again.');
  }

  console.log('🔄 Redirecting to Google OAuth URL:', data.url);
  redirect(data.url);
}

export async function signInWithApple() {
  const supabase = await createSupabaseServer();

  // Use production URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${baseUrl}/auth/callback`
    }
  });

  if (error) {
    console.error('Apple OAuth error:', error);
    throw new Error('Failed to sign in with Apple. Please try again.');
  }

  redirect(data.url);
}
