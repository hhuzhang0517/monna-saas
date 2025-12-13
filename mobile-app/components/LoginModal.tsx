import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import { supabase, signInWithEmail, signUpWithEmail } from '@/lib/supabase/client';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// 从环境变量获取 Google OAuth 客户端 ID
// 注意：即使只做 Android 原生登录，也必须配置 Web Client ID
// 这是 Google/Supabase 的协议设计要求：
// 1. webClientId 用于获取 idToken（Android 原生登录的核心）
// 2. Supabase 使用 Web Client ID 验证 idToken 的合法性
// 3. Android Client ID + SHA-1 只用于系统识别 App 身份
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// 配置 Google Sign-In（当前版本：Android only）
GoogleSignin.configure({
  // 必须：Web 类型的 Client ID，用于拿 idToken + 给 Supabase 验证
  webClientId: GOOGLE_WEB_CLIENT_ID,
  // 只需要 idToken 给 Supabase，不需要 Google 的 refresh token
  offlineAccess: false,
});

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ visible, onClose, onSuccess }: LoginModalProps) {
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
  const [googleSignInReady, setGoogleSignInReady] = useState(false);

  // 检查 Google Sign-In 是否可用
  useEffect(() => {
    const checkGoogleSignIn = async () => {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        setGoogleSignInReady(true);
        console.log('✅ Google Sign-In 服务可用');
      } catch (err) {
        console.log('⚠️ Google Play Services 不可用:', err);
        setGoogleSignInReady(false);
      }
    };
    checkGoogleSignIn();
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!visible) {
      setLoginMethod(null);
      setEmail('');
      setPhone('');
      setCountryCode('+86');
      setVerificationCode('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setSuccessMessage('');
      setAgreedToTerms(false);
      setMode('signin');
      setCountdown(0);
      setCodeSentTime(null);
      setSendingCode(false);
    }
  }, [visible]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    setSendingCode(true);
    setError('');

    try {
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
        setError('发送验证码失败，请检查手机号是否正确');
        setSendingCode(false);
        return;
      }

      console.log('✅ 验证码已发送:', data);
      setSuccessMessage('验证码已发送，请查收短信');
      setCountdown(60);
      setCodeSentTime(Date.now());
      setSendingCode(false);
    } catch (err: any) {
      console.error('发送验证码异常:', err);
      setError(err.message || '网络错误，请重试');
      setSendingCode(false);
    }
  };

  // 处理手机号登录
  const handlePhoneSubmit = async () => {
    if (!agreedToTerms) {
      setError('请先同意用户协议和隐私政策');
      return;
    }

    if (!verificationCode.trim()) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
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
        if (error.message.includes('expired')) {
          setError('验证码已过期，请重新发送');
        } else if (error.message.includes('invalid')) {
          setError('验证码错误，请检查后重试');
        } else {
          setError('验证失败，请重试');
        }
        setLoading(false);
        return;
      }

      console.log('✅ 验证码验证成功:', data);

      if (data.user) {
        setSuccessMessage('登录成功！');
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err: any) {
      console.error('手机登录异常:', err);
      setError(err.message || '网络错误，请重试');
      setLoading(false);
    }
  };

  // 处理邮箱登录/注册
  const handleEmailSubmit = async () => {
    if (!agreedToTerms) {
      setError('请先同意用户协议和隐私政策');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (mode === 'signin') {
        // 登录模式
        const result = await signInWithEmail(email, password);
        
        if (result.user) {
          setSuccessMessage('登录成功！');
          setTimeout(() => {
            onSuccess();
          }, 500);
        }
      } else {
        // 注册模式
        const result = await signUpWithEmail(email, password);
        
        if (result.user) {
          // 检查是否需要邮箱确认
          if (result.user.email_confirmed_at) {
            setSuccessMessage('注册成功！');
            setTimeout(() => {
              onSuccess();
            }, 500);
          } else {
            setSuccessMessage('注册成功！请检查您的邮箱并点击确认链接。');
            // 不关闭弹窗，让用户看到成功消息
          }
        }
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      
      // 友好的错误提示
      if (err.message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误，请重试');
      } else if (err.message.includes('Email not confirmed')) {
        setError('邮箱尚未验证，请检查您的邮箱并点击确认链接');
      } else if (err.message.includes('already registered')) {
        setError('该邮箱已被注册，请直接登录');
      } else {
        setError(err.message || '操作失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理 Google 登录（原生 Android + Supabase）
  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setError('请先同意用户协议和隐私政策');
      return;
    }

    // 检查 Web Client ID 配置（必需！）
    // 即使只做 Android，没有 Web Client ID 也拿不到 idToken
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.warn('⚠️ Google Web Client ID 未配置');
      setError('Google 登录暂不可用，请配置 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('========================================');
      console.log('🚀 启动原生 Google 登录（Android）');
      console.log('📋 配置信息:');
      console.log('  - webClientId:', GOOGLE_WEB_CLIENT_ID);
      console.log('  - Platform:', Platform.OS);
      console.log('========================================');

      // 检查 Google Play Services
      console.log('🔍 检查 Google Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('✅ Google Play Services 可用');

      // 执行原生 Google 登录
      console.log('📱 启动 Google 登录界面...');
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        console.log('⚠️ 用户取消了登录');
        setError('Google 登录已取消');
        setLoading(false);
        return;
      }

      const { data } = response;
      console.log('✅ Google 登录成功（客户端）');
      console.log('📧 Google 用户:', data.user.email);

      // 获取 ID Token（关键！）
      const idToken = data.idToken;

      if (!idToken) {
        console.error('❌ 未获取到 Google ID Token');
        console.error('这通常是因为 webClientId 配置不正确');
        setError('未获取到 Google ID Token，请检查 webClientId 配置');
        setLoading(false);
        return;
      }

      console.log('✅ 已获取 ID Token');
      console.log('🔐 使用 ID Token 向 Supabase 认证...');

      // 使用 ID Token 向 Supabase 认证
      // Supabase 会用配置的 Web Client ID 验证这个 Token
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (authError) {
        console.error('❌ Supabase 认证失败:');
        console.error('  - Message:', authError.message);
        console.error('  - Status:', authError.status);
        setError('登录验证失败: ' + authError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Supabase 认证成功');
      console.log('👤 用户:', authData.user?.email);
      console.log('========================================');
      setSuccessMessage('登录成功！');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      console.error('========================================');
      console.error('❌ Google 登录失败');
      console.error('错误:', err.code || err.message);

      // 处理不同类型的错误
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('ℹ️ 用户取消登录');
            setError('登录已取消');
            break;
          case statusCodes.IN_PROGRESS:
            console.warn('⚠️ 登录正在进行中');
            setError('登录正在进行中，请勿重复点击');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error('❌ Google Play 服务不可用');
            setError('Google Play 服务不可用，请更新或安装');
            break;
          default:
            console.error('❌ 未知错误代码:', err.code);
            setError('Google 登录失败（错误代码: ' + err.code + '）');
        }
      } else {
        console.error('❌ 非标准错误:', err.message || err);
        setError(err.message || 'Google 登录失败，请重试');
      }
      console.error('========================================');
    } finally {
      setLoading(false);
    }
  };

  // 渲染初始选择视图
  const renderInitialView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/figma-designs/monna_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>欢迎使用 Monna AI</Text>
        <Text style={styles.subtitle}>选择登录方式继续</Text>
      </View>

      <View style={styles.methodsContainer}>
        <TouchableOpacity
          style={styles.methodButton}
          onPress={() => setLoginMethod('email')}
        >
          <View style={styles.methodIconContainer}>
            <Ionicons name="mail-outline" size={24} color={colors.orange} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>邮箱登录</Text>
            <Text style={styles.methodDescription}>使用邮箱和密码登录</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodButton,
            (!agreedToTerms || loading || !googleSignInReady) && styles.disabledMethod,
          ]}
          onPress={handleGoogleSignIn}
          disabled={!agreedToTerms || loading || !googleSignInReady}
        >
          <View style={styles.methodIconContainer}>
            <Ionicons name="logo-google" size={24} color="#4285F4" />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>Google 登录</Text>
            <Text style={styles.methodDescription}>
              {!googleSignInReady
                ? '需要开发构建版本'
                : !GOOGLE_WEB_CLIENT_ID
                ? '暂不可用'
                : '使用 Google 账号快速登录'}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Ionicons name="chevron-forward" size={24} color="#999" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodButton}
          onPress={() => setLoginMethod('phone')}
        >
          <View style={styles.methodIconContainer}>
            <Ionicons name="call-outline" size={24} color="#34C759" />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>手机号登录</Text>
            <Text style={styles.methodDescription}>使用手机号验证码登录</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View
            style={[
              styles.checkboxBox,
              agreedToTerms && styles.checkboxBoxChecked,
            ]}
          >
            {agreedToTerms && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.termsText}>
            我已阅读并同意{' '}
            <Text style={styles.termsLink}>用户服务协议</Text> 和{' '}
            <Text style={styles.termsLink}>隐私政策</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 渲染手机号登录视图
  const renderPhoneView = () => (
    <View style={styles.contentContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setLoginMethod(null)}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>手机号登录</Text>
        <Text style={styles.subtitle}>使用手机号和验证码登录</Text>
      </View>

      <View style={styles.formContainer}>
        {/* 手机号输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>手机号</Text>
          <View style={styles.phoneInputContainer}>
            {/* 国家区号选择器 */}
            <View style={styles.countryCodePicker}>
              <TouchableOpacity 
                style={styles.countryCodeButton}
                onPress={() => {
                  // 简化版：只支持中国区号
                  Alert.alert('区号选择', '当前仅支持中国区号 +86');
                }}
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            {/* 手机号输入框 */}
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="请输入手机号"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
        </View>

        {/* 验证码输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>验证码</Text>
          <View style={styles.verificationContainer}>
            <TextInput
              style={[styles.input, styles.verificationInput]}
              placeholder="请输入验证码"
              placeholderTextColor="#999"
              value={verificationCode}
              onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[
                styles.sendCodeButton,
                (!phone || sendingCode || countdown > 0) && styles.sendCodeButtonDisabled,
              ]}
              onPress={handleSendCode}
              disabled={!phone || sendingCode || countdown > 0}
            >
              {sendingCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendCodeButtonText}>
                  {countdown > 0 ? `${countdown}s` : codeSentTime ? '重新发送' : '发送验证码'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!agreedToTerms || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handlePhoneSubmit}
          disabled={!agreedToTerms || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>登录</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // 渲染邮箱登录视图
  const renderEmailView = () => (
    <View style={styles.contentContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setLoginMethod(null)}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'signin' ? '登录账号' : '创建账号'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? '欢迎回来，使用邮箱登录'
            : '创建您的 Monna AI 账号'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入邮箱"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>密码</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="请输入密码 (至少8位)"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!agreedToTerms || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleEmailSubmit}
          disabled={!agreedToTerms || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'signin' ? '登录' : '注册'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>
            {mode === 'signin' ? '还没有账号？' : '已有账号？'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setSuccessMessage('');
            }}
          >
            <Text style={styles.switchModeLink}>
              {mode === 'signin' ? '立即注册' : '立即登录'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
            {!loginMethod && renderInitialView()}
            {loginMethod === 'email' && renderEmailView()}
            {loginMethod === 'phone' && renderPhoneView()}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentWrapper: {
    width: '90%',
    maxWidth: 480,
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '100%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingTop: 24,
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    minHeight: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  methodsContainer: {
    gap: 12,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  disabledMethod: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  termsContainer: {
    marginTop: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.orange,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginBottom: 16,
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#34C759',
  },
  submitButton: {
    height: 48,
    backgroundColor: colors.orange,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  switchModeText: {
    fontSize: 14,
    color: '#666',
  },
  switchModeLink: {
    fontSize: 14,
    color: colors.orange,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodePicker: {
    width: 80,
  },
  countryCodeButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 8,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
  },
  verificationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  verificationInput: {
    flex: 1,
  },
  sendCodeButton: {
    width: 100,
    height: 48,
    backgroundColor: colors.orange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeButtonDisabled: {
    opacity: 0.5,
  },
  sendCodeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

