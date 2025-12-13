'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function AuthCodeError() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkHashParams = async () => {
      try {
        // 设置10秒超时
        timeoutId = setTimeout(() => {
          console.error('⏱️ Timeout: Session setup took too long');
          setError('认证超时，请重试');
          setChecking(false);
        }, 10000);

        // 检查 URL hash 中是否有认证参数
        const hash = window.location.hash.substring(1);
        if (!hash) {
          clearTimeout(timeoutId);
          setChecking(false);
          return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorParam = params.get('error');

        console.log('🔍 Checking hash params on error page:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error: errorParam
        });

        // 如果有错误参数，显示错误
        if (errorParam) {
          console.log('❌ Error in hash:', errorParam);
          clearTimeout(timeoutId);
          setError(errorParam);
          setChecking(false);
          return;
        }

        // 如果有 access_token，尝试恢复会话
        if (accessToken && refreshToken) {
          console.log('🔑 Found auth tokens in hash, attempting to set session...');
          console.log('Token details:', {
            accessTokenLength: accessToken.length,
            refreshTokenLength: refreshToken.length,
            type
          });

          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            console.log('📞 Calling setSession...');
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            console.log('📬 setSession response:', {
              hasData: !!data,
              hasUser: !!data?.user,
              hasSession: !!data?.session,
              error: sessionError
            });

            if (sessionError) {
              console.error('❌ Failed to set session:', sessionError);
              setError(sessionError.message);
              setChecking(false);
              return;
            }

            if (!data?.session) {
              console.error('❌ No session returned');
              setError('无法创建会话');
              setChecking(false);
              return;
            }

            console.log('✅ Session set successfully for user:', data.user?.email);

            // 根据 type 参数决定重定向位置
            if (type === 'recovery') {
              console.log('🔄 Redirecting to reset-password page...');
              window.location.href = '/reset-password';
            } else {
              console.log('🔄 Redirecting to generate page...');
              window.location.href = '/generate';
            }
            return;
          } catch (sessionErr) {
            console.error('❌ Exception during setSession:', sessionErr);
            setError(sessionErr instanceof Error ? sessionErr.message : '设置会话失败');
            setChecking(false);
            return;
          }
        }

        // 没有找到有效的认证参数
        setChecking(false);
      } catch (err) {
        console.error('❌ Error checking hash params:', err);
        setError('检查认证参数时出错');
        setChecking(false);
      }
    };

    checkHashParams();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">正在验证认证信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="text-center max-w-md mx-auto p-6 bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl">
        <h1 className="text-2xl font-bold text-red-500 mb-4">认证错误</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="text-gray-400 mb-6">
          认证过程中出现错误，可能的原因：
        </p>
        <ul className="text-left text-gray-500 mb-6 space-y-2 text-sm">
          <li>• 确认链接已过期</li>
          <li>• 链接已被使用</li>
          <li>• OAuth 提供商配置问题</li>
          <li>• 技术问题</li>
        </ul>
        <div className="space-y-3">
          <Link
            href="/sign-in"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            重新登录
          </Link>
          <Link
            href="/forgot-password"
            className="block w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            重置密码
          </Link>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          如果使用 Google 或 Apple 登录遇到问题，请尝试使用邮箱和密码登录。
        </p>
      </div>
    </div>
  );
}
