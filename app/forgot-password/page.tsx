'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Form submitted, email:', email);
    setLoading(true);
    setError('');

    try {
      console.log('🔧 Creating Supabase client...');
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Has ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      console.log('📍 Base URL:', baseUrl);
      console.log('📧 Calling resetPasswordForEmail...');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${baseUrl}/auth/callback`,
        }
      );

      if (resetError) {
        console.error('❌ Password reset error:', resetError);
        throw resetError;
      }

      console.log('✅ Password reset email sent successfully!');
      setSuccess(true);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              重置邮件已发送
            </h1>

            {/* 说明文字 */}
            <div className="space-y-4 text-gray-400 text-sm mb-6">
              <p className="text-center">
                我们已向 <span className="text-white font-medium">{email}</span> 发送了密码重置链接。
              </p>
              <p className="text-center">
                请查收邮件并点击链接重置您的密码。该链接将在 1 小时后过期。
              </p>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-500">
                  💡 提示：如果没有收到邮件，请检查垃圾邮件文件夹。
                </p>
              </div>
            </div>

            {/* 返回登录 */}
            <Link
              href="/sign-in"
              className="block w-full text-center py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              返回登录
            </Link>

            {/* 重新发送 */}
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="mt-3 block w-full text-center py-3 px-4 text-gray-400 hover:text-white transition-colors text-sm"
            >
              使用其他邮箱
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* 返回按钮 */}
          <Link
            href="/sign-in"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回登录
          </Link>

          {/* 邮件图标 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold text-center mb-2 text-white">
            忘记密码？
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            输入您的邮箱地址，我们将向您发送密码重置链接
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱输入 */}
            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block">
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
              />
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
              disabled={loading || !email}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                '发送重置链接'
              )}
            </Button>

            {/* 提示 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mt-4">
              <p className="text-xs text-gray-500 text-center">
                记起密码了？{' '}
                <Link
                  href="/sign-in"
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  立即登录
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-gray-600 text-xs mt-6">
          密码重置链接将在 1 小时后过期
        </p>
      </div>
    </div>
  );
}
