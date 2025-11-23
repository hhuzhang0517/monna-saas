'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Mail, Phone, X } from 'lucide-react';
import { useTranslation } from '@/lib/contexts/language-context';
import { signIn, signUp, signInWithGoogle } from '@/app/(login)/actions';
import { createSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+86'); // 默认中国区号
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSentTime, setCodeSentTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!open) {
      setLoginMethod(null);
      setEmail('');
      setPhone('');
      setCountryCode('+86');
      setVerificationCode('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setSuccessMessage('');
      setCountdown(0);
      setCodeSentTime(null);
    }
  }, [open]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError(t('enterPhoneNumber'));
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      const supabase = createSupabaseClient();
      const phoneNumber = `${countryCode}${phone}`;
      
      console.log('📱 发送验证码到:', phoneNumber);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          channel: 'sms'
        }
      });

      if (error) {
        console.error('发送验证码失败:', error);
        // 友好的错误提示 - 不直接显示 Twilio 原始错误
        // 隐藏技术细节，提供用户友好的多语言错误消息
        setError(t('phoneNumberError'));
        setSendingCode(false);
        return;
      }

      console.log('✅ 验证码已发送:', data);
      setSuccessMessage(t('codeSent'));
      setCountdown(60);
      setCodeSentTime(Date.now());
      setSendingCode(false);
    } catch (err: any) {
      console.error('发送验证码异常:', err);
      setError(err.message || t('networkError'));
      setSendingCode(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError(t('pleaseAgreeToTerms'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      if (mode === 'signin') {
        // 登录模式
        const result = await signIn(null as any, formData);

        if (result && 'error' in result && result.error) {
          // 登录失败，显示错误
          setError(result.error);
          setLoading(false);
        } else {
          // 登录成功 - 直接跳转，不关闭弹窗（页面会刷新）
          // 注意：不要调用 setLoading(false)，保持加载状态直到页面跳转
          window.location.href = '/generate';
        }
      } else {
        // 注册模式
        const result = await signUp(null as any, formData);

        if (result && 'error' in result && result.error) {
          // 注册失败，显示错误
          setError(result.error);
          setLoading(false);
        } else if (result && 'success' in result && result.success) {
          // 注册成功，显示确认邮件提示，保持弹窗打开
          setError('');
          setSuccessMessage(result.success);
          setLoading(false);
          // 不关闭弹窗，让用户看到成功消息
        }
      }
    } catch (err: any) {
      // 检查是否是 Next.js 的 redirect 错误（这是正常的）
      if (err?.message?.includes('NEXT_REDIRECT')) {
        // 这是登录成功的 redirect，直接跳转
        window.location.href = '/generate';
        return;
      }
      // 其他错误才显示错误消息
      setError(err.message || t('networkError'));
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError(t('pleaseAgreeToTerms'));
      return;
    }

    if (!verificationCode.trim()) {
      setError(t('enterVerificationCode'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createSupabaseClient();
      const phoneNumber = `${countryCode}${phone}`;
      
      console.log('🔐 验证手机号:', phoneNumber);
      
      // 验证 OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: verificationCode,
        type: 'sms'
      });

      if (error) {
        console.error('验证码验证失败:', error);
        // 友好的错误提示 - 不直接显示原始错误
        // 根据错误类型提供多语言的友好提示
        if (error.message.includes('expired')) {
          setError(t('codeExpired') || '验证码已过期，请重新发送。');
        } else if (error.message.includes('invalid')) {
          setError(t('invalidCode') || '验证码错误，请检查后重试。');
        } else {
          // 对于其他错误，也不显示技术细节
          setError(t('phoneNumberError'));
        }
        setLoading(false);
        return;
      }

      console.log('✅ 验证码验证成功:', data);

      // 验证成功后，检查用户是否是新用户，如果是新用户，设置默认 name 为 "Anonymous"
      if (data.user) {
        // 调用后端 API 确保 profile 存在并设置默认 name
        try {
          await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: data.user.id,
              phone: phoneNumber
            })
          });
        } catch (profileError) {
          console.error('设置用户 profile 失败:', profileError);
          // 不阻止登录流程
        }
      }

      // 登录成功，跳转到 generate 页面
      window.location.href = '/generate';
    } catch (err: any) {
      console.error('手机登录异常:', err);
      setError(err.message || t('networkError'));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
      setError(t('pleaseAgreeToTerms'));
      return;
    }

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || t('networkError'));
    }
  };

  // 初始选择界面
  const renderInitialView = () => (
    <div className="space-y-6 py-6">
      {/* Logo and Title */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/figma-designs/monna_logo.png"
            alt="Monna AI Logo"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          {t('welcomeToMonnaAI')}
        </h2>
      </div>

      {/* Login Method Buttons */}
      <div className="space-y-3">
        <Button
          onClick={() => setLoginMethod('email')}
          disabled={!agreedToTerms || loading}
          className={`w-full h-12 border-2 rounded-full text-base font-medium transition-all ${
            agreedToTerms && !loading
              ? 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
          title={!agreedToTerms ? '请先同意用户协议和隐私政策' : ''}
        >
          <Mail className="w-5 h-5 mr-2" />
          {t('continueWithEmail')}
        </Button>

        <Button
          onClick={() => setLoginMethod('phone')}
          disabled={!agreedToTerms || loading}
          className={`w-full h-12 border-2 rounded-full text-base font-medium transition-all ${
            agreedToTerms && !loading
              ? 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
          title={!agreedToTerms ? '请先同意用户协议和隐私政策' : ''}
        >
          <Phone className="w-5 h-5 mr-2" />
          {t('continueWithPhone')}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            {t('or')}
          </span>
        </div>
      </div>

      {/* Google Login */}
      <Button
        onClick={handleGoogleLogin}
        disabled={!agreedToTerms || loading}
        className="w-full h-12 bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-full text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t('continueWithGoogle')}
      </Button>

      {/* Terms Agreement */}
      <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-orange-200 bg-orange-50">
        <Checkbox
          id="terms-initial"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          className="mt-0.5 h-5 w-5 flex-shrink-0"
        />
        <Label
          htmlFor="terms-initial"
          className="text-xs text-gray-700 leading-relaxed cursor-pointer flex-1"
        >
          {t('byContinuing')}
          <Link
            href="/terms"
            target="_blank"
            className="text-orange-600 hover:text-orange-700 font-semibold mx-1 underline"
          >
            {t('termsOfService')}
          </Link>
          {t('and')}
          <Link
            href="/privacy"
            target="_blank"
            className="text-orange-600 hover:text-orange-700 font-semibold mx-1 underline"
          >
            {t('privacyPolicy')}
          </Link>
        </Label>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200 text-center">
          {error}
        </div>
      )}
    </div>
  );

  // 邮箱登录界面
  const renderEmailView = () => (
    <div className="space-y-6 py-6">
      {/* Back Button and Title */}
      <div className="relative">
        <button
          onClick={() => setLoginMethod(null)}
          className="absolute left-0 top-1 text-gray-600 hover:text-gray-900"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          {t('welcomeToMonnaAI')}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            {t('email')}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('enterEmail')}
            required
            className="mt-1 rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            {t('password')}
          </Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              required
              minLength={8}
              className="rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mode === 'signin' && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              {t('forgotPassword')}
            </Link>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-green-700 text-sm bg-green-50 p-3 rounded-md border border-green-200">
            {t('registrationSuccess')}
          </div>
        )}

        <Button
          type="submit"
          disabled={!agreedToTerms || loading}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {t('processing')}
            </>
          ) : (
            mode === 'signin' ? t('signIn') : t('signUp')
          )}
        </Button>

        {/* Switch between Sign In and Sign Up */}
        <div className="text-center text-sm text-gray-600">
          {mode === 'signin' ? (
            <>
              {t('dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setSuccessMessage('');
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {t('signUp')}
              </button>
            </>
          ) : (
            <>
              {t('alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSuccessMessage('');
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {t('signIn')}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );

  // 手机号登录界面
  const renderPhoneView = () => (
    <div className="space-y-6 py-6">
      {/* Back Button and Title */}
      <div className="relative">
        <button
          onClick={() => setLoginMethod(null)}
          className="absolute left-0 top-1 text-gray-600 hover:text-gray-900"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          {t('welcomeToMonnaAI')}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        {/* Phone Number Input with Country Code */}
        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            {t('phoneNumber')}
          </Label>
          <div className="flex gap-2 mt-1">
            {/* Country Code Selector */}
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-28 rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 px-3 text-sm"
            >
              <option value="+86">🇨🇳 +86</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+81">🇯🇵 +81</option>
              <option value="+82">🇰🇷 +82</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+852">🇭🇰 +852</option>
              <option value="+886">🇹🇼 +886</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+39">🇮🇹 +39</option>
              <option value="+7">🇷🇺 +7</option>
            </select>
            {/* Phone Number Input */}
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder={t('enterPhoneNumber')}
              required
              className="flex-1 rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Verification Code Input with Send Button */}
        <div>
          <Label htmlFor="verification-code" className="text-sm font-medium text-gray-700">
            {t('verificationCode')}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('enterVerificationCode')}
              required
              maxLength={6}
              className="flex-1 rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
            <Button
              type="button"
              onClick={handleSendCode}
              disabled={!phone || sendingCode || countdown > 0}
              className="px-4 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              {sendingCode ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : (
                codeSentTime ? t('resendCode') : t('sendCode')
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={!agreedToTerms || loading}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {t('processing')}
            </>
          ) : (
            t('signIn')
          )}
        </Button>
      </form>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
        {!loginMethod && renderInitialView()}
        {loginMethod === 'email' && renderEmailView()}
        {loginMethod === 'phone' && renderPhoneView()}
      </DialogContent>
    </Dialog>
  );
}
