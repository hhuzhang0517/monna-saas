import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/styles/commonStyles';
import { LoginModal } from './LoginModal';
import { getApiUrl } from '@/config/api';
import { useTranslation } from '@/lib/contexts/i18n-context';

interface UserMenuProps {
  onOpenLoginModal?: () => void;
}

export function UserMenu({ onOpenLoginModal }: UserMenuProps) {
  const { user, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [planName, setPlanName] = useState('free');

  // 加载用户积分
  useEffect(() => {
    if (user && menuVisible) {
      loadUserCredits();
    }
  }, [user, menuVisible]);

  const loadUserCredits = async () => {
    try {
      setLoadingCredits(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      // 调用API获取用户统计信息
      const response = await fetch(getApiUrl('api/user/stats'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.remainingCredits || 0);
        setPlanName(data.planName || 'free');
      }
    } catch (error) {
      console.error('加载积分失败:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  // 获取用户名首字母
  const getUserInitial = () => {
    if (!user) return 'U';
    
    // 优先使用 user_metadata 中的 name
    const name = user.user_metadata?.name || user.user_metadata?.full_name;
    if (name && typeof name === 'string') {
      return name.charAt(0).toUpperCase();
    }
    
    // 其次使用 email
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    // 最后使用 phone (如果是手机号登录)
    if (user.phone) {
      return 'P';
    }
    
    return 'U';
  };

  // 获取显示名称
  const getDisplayName = () => {
    if (!user) return t('common.signIn', 'Sign In');

    console.log('User data:', user); // 调试日志

    // 优先使用 user_metadata 中的 name
    const name = user.user_metadata?.name || user.user_metadata?.full_name;
    if (name && typeof name === 'string') {
      return name;
    }

    // 其次使用 email 用户名部分
    if (user.email) {
      return user.email.split('@')[0];
    }

    // 如果是手机号登录，显示手机号
    if (user.phone) {
      // 脱敏显示手机号
      const phone = user.phone;
      if (phone.length > 7) {
        return phone.slice(0, 3) + '****' + phone.slice(-4);
      }
      return phone;
    }

    return t('common.signIn', 'User');
  };

  // 处理登出
  const handleSignOut = async () => {
    Alert.alert(
      t('settings.confirmSignOut', 'Confirm Sign Out'),
      t('settings.confirmSignOutMessage', 'Are you sure you want to sign out?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              setMenuVisible(false);
              router.replace('/welcome');
            } catch (error) {
              console.error('登出失败:', error);
              Alert.alert(
                t('common.error', 'Error'),
                t('settings.signOutFailed', 'Sign out failed, please try again')
              );
            }
          },
        },
      ]
    );
  };

  // 处理登录按钮点击
  const handleLoginPress = () => {
    if (onOpenLoginModal) {
      onOpenLoginModal();
    } else {
      setShowLoginModal(true);
    }
  };

  // 如果未登录，显示登录按钮
  if (!user && !loading) {
    return (
      <>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLoginPress}
        >
          <Ionicons name="log-in-outline" size={20} color={colors.orange} />
          <Text style={styles.loginButtonText}>{t('common.signIn', 'Sign In')}</Text>
        </TouchableOpacity>

        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* 用户头像按钮 */}
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => setMenuVisible(true)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getUserInitial()}</Text>
        </View>
      </TouchableOpacity>

      {/* 下拉菜单 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {/* 用户信息区域 */}
            <View style={styles.userInfoSection}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{getUserInitial()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{getDisplayName()}</Text>
                <View style={styles.badgeContainer}>
                  <Ionicons name="star" size={12} color={colors.orange} />
                  <Text style={styles.badgeText}>
                    {planName === 'free' ? t('dashboard.freeUser', 'Free User') : `${planName.toUpperCase()} ${t('dashboard.freeUser', 'User').split(' ')[1] || 'User'}`}
                  </Text>
                </View>
                {/* 剩余积分 */}
                <Text style={styles.creditsText}>
                  {t('dashboard.remainingCreditsLabel', 'Credits Left')}:{' '}
                  {loadingCredits ? (
                    <ActivityIndicator size="small" color={colors.orange} />
                  ) : (
                    <Text style={styles.creditsNumber}>{credits !== null ? credits : '--'}</Text>
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* 菜单项 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/profile/edit');
              }}
            >
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('dashboard.userInfo', 'User Info')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/history');
              }}
            >
              <Ionicons name="time-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('dashboard.generationHistory', 'Generation History')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/(tabs)/subscription');
              }}
            >
              <Ionicons name="diamond-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('subscription.title', 'Subscription Plans')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/settings');
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('settings.title', 'Settings')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 登出按钮 */}
            <TouchableOpacity
              style={[styles.menuItem, styles.signOutItem]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, styles.signOutText]}>
                {t('settings.signOut', 'Sign Out')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF5F0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  userInfoSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTextLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '500',
  },
  creditsText: {
    fontSize: 12,
    color: '#666',
  },
  creditsNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  signOutItem: {
    backgroundColor: '#FFF5F5',
  },
  signOutText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
});

