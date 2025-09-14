'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

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

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length > 0) {
    const { user: foundUser, team: foundTeam } = userWithTeam[0];
    await logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN);
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    const team = userWithTeam.length > 0 ? userWithTeam[0].team : undefined;
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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
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

  // NOTE: The following code is kept but will never be reached during normal signup flow
  // It's only executed when users are already confirmed (which shouldn't happen in signUp action)
  console.log('User already confirmed, creating database records for:', email);

  const newUser: NewUser = {
    email,
    auth_id: signUpData.user.id,
    role: 'owner' // Default role, will be overridden if there's an invitation
  };

  let createdUser;
  try {
    [createdUser] = await db.insert(users).values(newUser).returning();
  } catch (error: any) {
    if (error.code === '23505' && error.constraint_name === 'users_email_unique') {
      return {
        error: 'An account with this email already exists. Please sign in instead.',
        email,
        password
      };
    }
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  if (!createdUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      return { error: 'Invalid or expired invitation.', email, password };
    }
  } else {
    // Create a new team if there's no invitation
    const newTeam: NewTeam = {
      name: `${email}'s Team`
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      return {
        error: 'Failed to create team. Please try again.',
        email,
        password
      };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId,
    role: userRole
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId });
  }

  redirect('/generate');
});

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/sign-in');
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
      email: user.email,
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
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD);

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
      email: user.email,
      password
    });

    if (signInError) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

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
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
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
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);

export async function signInWithGoogle() {
  const supabase = await createSupabaseServer();
  
  // Use localhost explicitly for development
  const baseUrl = 'http://localhost:3005';
  
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
    return {
      error: 'Failed to sign in with Google. Please try again.'
    };
  }

  console.log('🔄 Redirecting to Google OAuth URL:', data.url);
  redirect(data.url);
}

export async function signInWithApple() {
  const supabase = await createSupabaseServer();
  
  // Use localhost explicitly for development
  const baseUrl = 'http://localhost:3005';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${baseUrl}/auth/callback`
    }
  });

  if (error) {
    console.error('Apple OAuth error:', error);
    return {
      error: 'Failed to sign in with Apple. Please try again.'
    };
  }

  redirect(data.url);
}
