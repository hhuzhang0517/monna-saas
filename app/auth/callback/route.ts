import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function ensureUserInDatabase(authUser: any) {
  try {
    // 使用 service role 客户端绕过 RLS 策略
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

    console.log('[ensureUserInDatabase] Checking if user exists:', authUser.email);

    // 检查用户是否已存在于 profiles 表中
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('id', authUser.id)
      .single();

    if (existingProfile) {
      console.log('[ensureUserInDatabase] User already exists in database:', existingProfile.email);
      return existingProfile;
    }

    console.log('[ensureUserInDatabase] Creating new user in database:', authUser.email);

    // Step 1: 创建用户 profile
    console.log('[ensureUserInDatabase] Step 1: Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        role: 'owner'
      });

    if (profileError) {
      console.error('[ensureUserInDatabase] Failed to create profile:', profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    console.log('[ensureUserInDatabase] ✓ Profile created');

    // Step 2: 创建团队
    console.log('[ensureUserInDatabase] Step 2: Creating team...');
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: `${authUser.email}'s Team`,
        plan_name: 'free',
        credits: 20,
        total_credits: 20,
        credits_consumed: 0
      })
      .select()
      .single();

    if (teamError || !team) {
      console.error('[ensureUserInDatabase] Failed to create team:', teamError);
      throw new Error(`Team creation failed: ${teamError?.message}`);
    }
    console.log('[ensureUserInDatabase] ✓ Team created:', team.id);

    // Step 3: 添加用户到团队
    console.log('[ensureUserInDatabase] Step 3: Adding user to team...');
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        user_id: authUser.id,
        team_id: team.id,
        role: 'owner'
      });

    if (memberError) {
      console.error('[ensureUserInDatabase] Failed to add user to team:', memberError);
      throw new Error(`Team member creation failed: ${memberError.message}`);
    }
    console.log('[ensureUserInDatabase] ✓ User added to team');

    console.log('[ensureUserInDatabase] ✅ User setup completed successfully');
    return {
      id: authUser.id,
      email: authUser.email
    };
  } catch (error) {
    console.error('[ensureUserInDatabase] Error setting up user:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_code = searchParams.get('error_code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/generate'

  // 构建正确的 base URL
  const getBaseUrl = () => {
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        baseUrl = `https://${vercelUrl}`;
      } else {
        baseUrl = 'http://localhost:3005';
      }
    }
    return baseUrl.trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
  };

  const baseUrl = getBaseUrl();

  console.log('🔄 Auth callback debug:', {
    hasCode: !!code,
    codeLength: code?.length,
    baseUrl,
    error_code,
    error,
    error_description,
    next,
    allParams: Object.fromEntries(searchParams.entries())
  })

  // 处理 Supabase 直接返回的错误（URL 参数中的错误）
  if (error || error_code) {
    console.log('⚠️ Received error from Supabase:', { error, error_code, error_description })

    // 如果是 OTP 过期错误，给出友好提示
    if (error_code === 'otp_expired' || error === 'access_denied') {
      console.log('ℹ️ OTP expired - redirecting to sign-in with message')
      const redirectUrl = new URL(`${baseUrl}/sign-in`)
      redirectUrl.searchParams.set('message', 'confirmation_expired')
      return NextResponse.redirect(redirectUrl)
    }

    // 其他错误跳转到错误页面
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${error || error_code}`)
  }

  if (code) {
    try {
      const supabase = await createSupabaseServer()
      console.log('🔄 Attempting code exchange...')

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      console.log('🔍 Code exchange detailed result:', {
        success: !exchangeError,
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        errorCode: exchangeError?.code,
        errorMessage: exchangeError?.message,
        errorStatus: exchangeError?.status
      })

      if (!exchangeError && data?.user) {
        console.log('✅ Auth exchange successful, ensuring user in DB...')
        await ensureUserInDatabase(data.user)
        console.log('✅ User created/found in DB')

        // 成功后重定向到目标页面
        const redirectUrl = new URL(`${baseUrl}${next}`)
        redirectUrl.searchParams.set('auth_success', 'true')

        const redirectResponse = NextResponse.redirect(redirectUrl)

        // 设置缓存控制头，确保页面刷新
        redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        redirectResponse.headers.set('Pragma', 'no-cache')
        redirectResponse.headers.set('Expires', '0')

        console.log('🚀 Redirecting to:', redirectUrl.toString())
        return redirectResponse
      } else if (exchangeError) {
        console.error('❌ Code exchange failed:', {
          error: exchangeError.message,
          code: exchangeError.code,
          status: exchangeError.status
        })

        // 特殊处理：如果是 PKCE validation_failed 错误（code_verifier缺失）
        // 这通常发生在邮件确认链接场景，因为用户从邮件打开链接，没有原始的code_verifier
        if (exchangeError.code === 'validation_failed' &&
            exchangeError.message?.includes('code verifier')) {
          console.log('⚠️ PKCE validation failed - likely email confirmation link')

          // 尝试使用 admin 客户端获取用户信息并创建数据库记录
          try {
            console.log('🔄 Attempting to get user info and create DB records with admin client...')
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

            // 使用 admin 客户端通过 code 获取用户信息
            // 虽然 exchangeCodeForSession 失败了，但我们可以尝试列出最近注册的用户
            console.log('🔍 Searching for recently confirmed users...')

            // 查询最近1分钟内确认邮箱的用户
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
            const { data: recentUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 20
            });

            console.log('📋 Found recent users:', recentUsers?.users?.length || 0);

            if (recentUsers?.users && Array.isArray(recentUsers.users)) {
              // 查找最近确认的用户（email_confirmed_at 最新的）
              const recentlyConfirmedUsers = recentUsers.users
                .filter((u: any) => u.email_confirmed_at && new Date(u.email_confirmed_at) > new Date(oneMinuteAgo))
                .sort((a: any, b: any) => {
                  const dateA = new Date(a.email_confirmed_at!);
                  const dateB = new Date(b.email_confirmed_at!);
                  return dateB.getTime() - dateA.getTime();
                });

              console.log('✅ Recently confirmed users:', recentlyConfirmedUsers.length);

              if (recentlyConfirmedUsers.length > 0) {
                const confirmedUser = recentlyConfirmedUsers[0];
                console.log('🎯 Processing recently confirmed user:', confirmedUser.email);

                // 尝试为该用户创建数据库记录
                await ensureUserInDatabase(confirmedUser);
                console.log('✅ Database records created for user:', confirmedUser.email);
              }
            }

            // 无论是否成功创建数据库记录，都重定向到登录页面
            console.log('🔄 Redirecting to sign-in with explanation...')
            const redirectUrl = new URL(`${baseUrl}/sign-in`)
            redirectUrl.searchParams.set('message', 'confirmation_link_used')
            return NextResponse.redirect(redirectUrl)
          } catch (adminError) {
            console.error('❌ Admin user lookup/creation failed:', adminError)
            // 即使失败也重定向到登录页面
            const redirectUrl = new URL(`${baseUrl}/sign-in`)
            redirectUrl.searchParams.set('message', 'confirmation_link_used')
            return NextResponse.redirect(redirectUrl)
          }
        }

        // 如果是 OTP 相关错误，重定向到登录页面并提示
        if (exchangeError.message?.includes('expired') || exchangeError.code?.includes('otp')) {
          const redirectUrl = new URL(`${baseUrl}/sign-in`)
          redirectUrl.searchParams.set('message', 'confirmation_expired')
          return NextResponse.redirect(redirectUrl)
        }
      }
    } catch (err) {
      console.error('❌ Auth callback exception:', err)
    }
  } else {
    console.log('❌ No authorization code provided')
  }

  console.log('🚨 Redirecting to error page')
  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`)
}