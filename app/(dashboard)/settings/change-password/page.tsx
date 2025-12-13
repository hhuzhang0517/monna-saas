'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import Link from 'next/link';
import { updatePassword } from '@/app/(login)/actions';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 客户端验证
    if (newPassword.length < 8) {
      setError('新密码至少需要 8 个字符');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmPassword', confirmPassword);

      const result = await updatePassword({}, formData);

      if (result?.error) {
        setError(result.error);
      } else if ('success' in result && result.success) {
        setSuccess(true);
        // 3秒后返回设置页面
        setTimeout(() => {
          router.push('/dashboard/settings');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError('修改密码失败，请重试。');
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

  const passwordStrength = getPasswordStrength(newPassword);

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
              密码修改成功！
            </h1>

            {/* 说明文字 */}
            <p className="text-center text-gray-400 text-sm mb-6">
              您的密码已成功更新。正在返回设置页面...
            </p>

            {/* 进度条 */}
            <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>

            {/* 立即返回 */}
            <Link
              href="/dashboard/settings"
              className="block w-full text-center py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
            >
              返回设置
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回设置
        </Link>

        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* 头部 */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mr-4">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">修改密码</h1>
              <p className="text-gray-400 text-sm">保护您的账户安全</p>
            </div>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 当前密码 */}
            <div>
              <Label htmlFor="currentPassword" className="text-gray-300 mb-2 block">
                当前密码
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码"
                  required
                  disabled={loading}
                  className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                <Link href="/forgot-password" className="text-orange-500 hover:text-orange-400">
                  忘记当前密码？
                </Link>
              </p>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-gray-800" />

            {/* 新密码 */}
            <div>
              <Label htmlFor="newPassword" className="text-gray-300 mb-2 block">
                新密码
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 8 个字符"
                  required
                  disabled={loading}
                  className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* 密码强度指示器 */}
              {newPassword && (
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

            {/* 确认新密码 */}
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
                  newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}>
                  {newPassword === confirmPassword ? '✓ 密码匹配' : '✗ 密码不匹配'}
                </p>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 密码要求提示 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">密码要求：</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className={newPassword.length >= 8 ? 'text-green-400' : ''}>
                  • 至少 8 个字符
                </li>
                <li className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-green-400' : ''}>
                  • 包含大小写字母（推荐）
                </li>
                <li className={/\d/.test(newPassword) ? 'text-green-400' : ''}>
                  • 包含数字（推荐）
                </li>
                <li className={/[^a-zA-Z\d]/.test(newPassword) ? 'text-green-400' : ''}>
                  • 包含特殊字符（推荐）
                </li>
              </ul>
            </div>

            {/* 按钮组 */}
            <div className="flex gap-3">
              <Link
                href="/dashboard/settings"
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-center font-medium"
              >
                取消
              </Link>
              <Button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    修改中...
                  </>
                ) : (
                  '确认修改'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* 安全提示 */}
        <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-400 mb-1">安全提示</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 定期更换密码可以提高账户安全性</li>
                <li>• 不要与他人分享您的密码</li>
                <li>• 使用强密码可以更好地保护您的账户</li>
                <li>• 修改密码后，您将在所有设备上重新登录</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
