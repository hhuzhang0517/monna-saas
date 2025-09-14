'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp, signInWithGoogle, signInWithApple } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { useAuthStatus } from '@/lib/hooks/use-auth';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const prefilledEmail = searchParams.get('email');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  
  // 检查用户是否已登录
  const { user, loading, refresh } = useAuthStatus();

  // 添加详细调试信息
  console.log('🔍 Login page state:', { 
    user: user?.email || 'No user', 
    loading, 
    mode, 
    redirect,
    shouldRedirect: !loading && user && mode === 'signin'
  });


  // Ensure user is signed out when email confirmation is required
  useEffect(() => {
    if (state?.requiresConfirmation) {
      console.log('Email confirmation required - ensuring user is signed out');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Force sign out on client side to ensure no residual session
      // But DON'T refresh the page - let user see the confirmation message
      supabase.auth.signOut().then(() => {
        console.log('Client-side signout completed for email confirmation');
      });
    }
  }, [state?.requiresConfirmation]);

  // 如果正在加载认证状态，显示加载页面
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-orange-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">检查登录状态...</p>
        </div>
      </div>
    );
  }

  // 如果用户已登录且是登录模式，立即跳转
  if (user && mode === 'signin') {
    const finalRedirect = redirect ? decodeURIComponent(redirect) : '/generate';
    console.log('🚀 FORCE REDIRECT - User logged in, going to:', finalRedirect);
    
    // 立即跳转，不返回任何JSX
    if (typeof window !== 'undefined') {
      // Use router.replace for better navigation handling
      router.replace(finalRedirect);
      // Also set window location as fallback
      setTimeout(() => {
        window.location.href = finalRedirect;
      }, 100);
    }
    
    // 返回加载状态而不是null，避免闪烁
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-orange-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">登录成功，跳转中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin'
            ? 'Sign in to your account'
            : 'Create your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" action={formAction}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state?.email || prefilledEmail || ''}
                required
                maxLength={50}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={state?.password || ''}
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              {state.error}
              {state.showResendConfirmation && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="text-center space-y-3">
                    <p className="text-orange-700 text-xs">
                      Haven't received the confirmation email?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link 
                        href={`/resend-confirmation?email=${encodeURIComponent(state.email || '')}`}
                        className="inline-block bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                      >
                        Resend confirmation email
                      </Link>
                      <Link 
                        href={`/sign-up?email=${encodeURIComponent(state.email || '')}`}
                        className="inline-block bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        Try registering again
                      </Link>
                    </div>
                    <p className="text-xs text-orange-600">
                      If the email still doesn't arrive, try registering with the same email again.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {state?.success && (
            <div className="text-green-600 text-sm bg-green-50 p-4 rounded-md border border-green-200">
              <div className="font-medium text-green-800">{state.success}</div>
              {state.requiresConfirmation && (
                <div className="mt-3 text-xs text-green-700">
                  <strong>Next steps:</strong>
                  <br />
                  1. Check your email inbox (and spam folder)
                  <br />
                  2. Click the confirmation link in the email
                  <br />
                  3. You'll be automatically redirected to start creating AI images
                  <br />
                  <br />
                  <em>Keep this page open - no need to refresh!</em>
                </div>
              )}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={pending || loading || (user && mode === 'signin')}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  处理中...
                </>
              ) : user && mode === 'signin' ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  已登录，跳转中...
                </>
              ) : mode === 'signin' ? (
                '登录'
              ) : (
                '注册'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <form action={signInWithGoogle}>
                <Button
                  type="submit"
                  disabled={pending || loading}
                  className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-full shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Google
                </Button>
              </form>
            </div>
            <div>
              <form action={signInWithApple}>
                <Button
                  type="submit"
                  disabled={pending || loading}
                  className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-full shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  Apple
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                {mode === 'signin'
                  ? 'New to our platform?'
                  : 'Already have an account?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                redirect ? `?redirect=${redirect}` : ''
              }${priceId ? `&priceId=${priceId}` : ''}`}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {mode === 'signin'
                ? 'Create an account'
                : 'Sign in to existing account'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
