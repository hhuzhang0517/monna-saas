'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 检查 URL hash 是否包含 session_ready 标记或 access_token
    const hashParam = window.location.hash.substring(1);
    const params = new URLSearchParams(hashParam);
    const tokenFromHash = params.get('access_token');

    if (hashParam === 'session_ready' || tokenFromHash) {
      console.log('✅ Reset token detected in URL, skipping validation');
      if (tokenFromHash) {
        console.log('📝 Storing access token for password update');
        setAccessToken(tokenFromHash);
      }
      setValidating(false);
      // 清除 hash
      window.history.replaceState(null, '', window.location.pathname);
      return () => {
        mounted = false;
      };
    }

    // 检查是否有有效的重置令牌
    const checkToken = async () => {
      try {
        console.log('🔍 Checking session for password reset...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session status:', session ? '✅ Valid' : '❌ Missing');
        console.log('Session details:', session ? { user: session.user.email, expires: session.expires_at } : 'None');

        if (session && mounted) {
          console.log('✅ Valid session found, user can reset password');
          setValidating(false);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Token validation error:', err);
        return false;
      }
    };

    // 立即检查一次
    checkToken().then(hasSession => {
      if (!hasSession && mounted) {
        // 如果没有 session，设置15秒超时（增加等待时间）
        console.log('⏳ No session found initially, waiting for auth state change...');
        console.log('💡 The session might need a moment to be recognized by the client...');

        // 每秒重试一次，最多15次
        let retryCount = 0;
        const maxRetries = 15;
        const retryInterval = setInterval(async () => {
          retryCount++;
          console.log(`🔄 Retry ${retryCount}/${maxRetries}: Checking for session...`);

          const sessionExists = await checkToken();
          if (sessionExists && mounted) {
            console.log('✅ Session found on retry!');
            clearInterval(retryInterval);
            setValidating(false);
          } else if (retryCount >= maxRetries && mounted) {
            console.error(`❌ Timeout: No valid session after ${maxRetries} seconds`);
            clearInterval(retryInterval);
            setError('重置链接无效或已过期，请重新申请密码重置。');
            setValidating(false);
            setTimeout(() => router.push('/forgot-password'), 3000);
          }
        }, 1000);

        timeoutId = retryInterval as any;
      }
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session ? '✅ Has session' : '❌ No session');

      if (event === 'SIGNED_IN' && session && mounted) {
        console.log('✅ User signed in, clearing timeout and allowing reset');
        clearTimeout(timeoutId);
        setValidating(false);
      } else if (event === 'SIGNED_OUT' && mounted) {
        console.log('❌ User signed out');
        setError('会话已过期，请重新申请密码重置。');
        setValidating(false);
        setTimeout(() => router.push('/forgot-password'), 3000);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 客户端验证
    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      // 如果有 access_token，直接使用 Supabase API 更新密码
      if (accessToken) {
        console.log('🔑 Using access token to update password');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '密码更新失败');
        }

        console.log('✅ Password updated successfully via API');
      } else {
        // 否则使用常规的 Supabase 客户端
        console.log('🔑 Using Supabase client to update password');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          console.error('Password update error:', updateError);
          throw updateError;
        }
      }

      setSuccess(true);

      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || '密码重置失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' };
    if (pwd.length < 8) return { strength: 25, label: '太弱', color: 'bg-red-500' };

    let strength = 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/\d/.test(pwd)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(pwd)) strength += 12.5;

    if (strength <= 25) return { strength, label: '弱', color: 'bg-red-500' };
    if (strength <= 50) return { strength, label: '中等', color: 'bg-yellow-500' };
    if (strength <= 75) return { strength, label: '强', color: 'bg-blue-500' };
    return { strength, label: '很强', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">验证重置链接...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl">
            {/* 成功图标 */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-center mb-4 text-white">
              密码重置成功！
            </h1>

            {/* 说明文字 */}
            <p className="text-center text-gray-400 text-sm mb-6">
              您的密码已成功更新。正在跳转到登录页面...
            </p>

            {/* 进度条 */}
            <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>

            {/* 立即登录 */}
            <Link
              href="/sign-in"
              className="block w-full text-center py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
            >
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* 钥匙图标 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold text-center mb-2 text-white">
            设置新密码
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            请输入您的新密码
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 新密码 */}
            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 block">
                新密码
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 个字符"
                  required
                  disabled={loading}
                  className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* 密码强度指示器 */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">密码强度</span>
                    <span className={`font-medium ${
                      passwordStrength.strength <= 25 ? 'text-red-400' :
                      passwordStrength.strength <= 50 ? 'text-yellow-400' :
                      passwordStrength.strength <= 75 ? 'text-blue-400' :
                      'text-green-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300 mb-2 block">
                确认新密码
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                  disabled={loading}
                  className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* 密码匹配提示 */}
              {confirmPassword && (
                <p className={`mt-1 text-xs ${
                  password === confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}>
                  {password === confirmPassword ? '✓ 密码匹配' : '✗ 密码不匹配'}
                </p>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  重置中...
                </>
              ) : (
                '重置密码'
              )}
            </Button>

            {/* 密码要求提示 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">密码要求：</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className={password.length >= 8 ? 'text-green-400' : ''}>
                  • 至少 8 个字符
                </li>
                <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-400' : ''}>
                  • 包含大小写字母（推荐）
                </li>
                <li className={/\d/.test(password) ? 'text-green-400' : ''}>
                  • 包含数字（推荐）
                </li>
                <li className={/[^a-zA-Z\d]/.test(password) ? 'text-green-400' : ''}>
                  • 包含特殊字符（推荐）
                </li>
              </ul>
            </div>
          </form>
        </div>

        {/* 底部链接 */}
        <div className="mt-6 text-center">
          <Link
            href="/sign-in"
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
