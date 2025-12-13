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

    console.log('[ensureUserInDatabase] Creating new user in database:', authUser.email || authUser.phone || authUser.id);

    // Step 1: 创建用户 profile
    console.log('[ensureUserInDatabase] Step 1: Creating profile...');
    
    // 获取用户标识符（优先使用 email，如果没有则使用手机号）
    const userIdentifier = authUser.email || authUser.phone || 'User';
    const userName = authUser.user_metadata?.name || 
                     (authUser.email ? authUser.email.split('@')[0] : null) ||
                     (authUser.phone ? authUser.phone.slice(-4) : 'User');
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email || null,
        name: userName,
        role: 'owner'
      });

    if (profileError) {
      console.error('[ensureUserInDatabase] Failed to create profile:', profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    console.log('[ensureUserInDatabase] ✓ Profile created');

    // Step 2: 创建团队（使用 email 或 phone 作为团队名称标识）
    console.log('[ensureUserInDatabase] Step 2: Creating team...');
    const teamName = authUser.email 
      ? `${authUser.email}'s Team` 
      : authUser.phone 
        ? `${authUser.phone}'s Team`
        : `${authUser.id.slice(0, 8)}'s Team`;
    
    const { data: team, error: teamError } = await supabaseAdmin
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
  const type = searchParams.get('type') // 检测是否是密码重置
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
    type,
    next,
    allParams: Object.fromEntries(searchParams.entries())
  })

  // 如果 URL 中没有 query 参数但可能有 hash fragment（例如密码重置使用 implicit flow）
  // 返回一个 HTML 页面让客户端 JavaScript 处理 fragment
  if (!code && !error && !error_code && !type) {
    console.log('📝 No query params detected, returning client-side handler for hash fragments');

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>认证中...</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      border: 3px solid #333;
      border-top-color: #f97316;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>正在验证您的身份...</p>
  </div>
  <script type="module">
    // 使用固定版本的 Supabase 客户端，避免版本不兼容
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

    (async function() {
      try {
        console.log('🔄 Client-side auth handler started');
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);

        // 检查 hash 中的参数
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorParam = params.get('error');

        console.log('Hash params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error: errorParam
        });

        // 如果有错误
        if (errorParam) {
          console.error('❌ Error in hash:', errorParam);
          window.location.href = '${baseUrl}/auth/auth-code-error';
          return;
        }

        // 如果是密码重置流程
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('🔑 Password recovery detected');
          console.log('📤 Sending tokens to server for session setup...');

          // 使用服务端 API 来设置 session，避免客户端 CORS 问题
          try {
            const response = await fetch('${baseUrl}/api/auth/set-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken
              }),
              credentials: 'include'  // 重要：包含 cookies
            });

            console.log('📬 Server response status:', response.status);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('❌ Server setSession failed:', errorData);
              window.location.href = '${baseUrl}/forgot-password?error=expired';
              return;
            }

            const result = await response.json();
            console.log('✅ Session set successfully via server:', result);
            console.log('🔄 Redirecting to reset-password page with access token...');

            // 将 access_token 传递到 reset-password 页面，用于直接调用 Supabase API
            window.location.href = '${baseUrl}/reset-password#access_token=' + encodeURIComponent(accessToken);
            return;
          } catch (err) {
            console.error('❌ Failed to call server setSession:', err);
            window.location.href = '${baseUrl}/forgot-password?error=expired';
            return;
          }
        }

        // 如果有 access_token 但不是密码重置（比如邮件确认）
        if (accessToken && refreshToken) {
          console.log('📧 Auth token detected, likely email confirmation');
          window.location.href = '${baseUrl}/generate';
          return;
        }

        // 没有找到有效参数
        console.error('❌ No valid auth parameters found');
        window.location.href = '${baseUrl}/auth/auth-code-error';

      } catch (err) {
        console.error('❌ Client auth handler error:', err);
        window.location.href = '${baseUrl}/auth/auth-code-error';
      }
    })();
  </script>
</body>
</html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }

  // 处理密码重置回调
  if (type === 'recovery' && code) {
    console.log('🔑 Password recovery detected, exchanging code...')
    try {
      const supabase = await createSupabaseServer()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!exchangeError) {
        console.log('✅ Recovery code exchange successful, redirecting to reset-password page')
        return NextResponse.redirect(`${baseUrl}/reset-password`)
      } else {
        console.error('❌ Recovery code exchange failed:', exchangeError)
        return NextResponse.redirect(`${baseUrl}/forgot-password?error=expired`)
      }
    } catch (err) {
      console.error('❌ Recovery callback exception:', err)
      return NextResponse.redirect(`${baseUrl}/forgot-password?error=invalid`)
    }
  }

  // 处理 Supabase 直接返回的错误（URL 参数中的错误）
  if (error || error_code) {
    console.log('⚠️ Received error from Supabase:', { error, error_code, error_description })

    // 检查是否是密码重置相关的错误
    // 如果是 OTP 过期但可能是密码重置类型，先检查 session
    if (error_code === 'otp_expired' || error === 'access_denied') {
      console.log('ℹ️ OTP expired/access denied - checking if user has valid session...')

      try {
        const supabase = await createSupabaseServer()
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          console.log('✅ User has valid session despite error, redirecting to reset-password')
          // 用户已经有有效 session，可能是密码重置流程
          return NextResponse.redirect(`${baseUrl}/reset-password`)
        }
      } catch (err) {
        console.error('Error checking session:', err)
      }

      console.log('ℹ️ No valid session, redirecting to sign-in with message')
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